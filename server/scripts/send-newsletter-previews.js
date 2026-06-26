import fs from "fs";
import path from "path";
import { fileURLToPath, pathToFileURL } from "url";
import nodemailer from "nodemailer";

import {
  buildFormationRows,
  buildGraduationNewsletterSubject,
  buildGraduationNewsletterSummary,
  buildSingleNewsletterSubject,
  buildSingleNewsletterSummary,
  pickGraduationBlessing,
} from "../../src/lib/newsletter.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const serverDir = path.resolve(__dirname, "..");

export function readEnv() {
  const envPath = path.join(serverDir, ".env");
  if (!fs.existsSync(envPath)) throw new Error("Missing server/.env");

  const env = {};
  for (const rawLine of fs.readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const index = line.indexOf("=");
    if (index === -1) continue;
    const key = line.slice(0, index).trim();
    let value = line.slice(index + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    env[key] = value;
  }

  if (env.SMTP_PASS) env.SMTP_PASS = env.SMTP_PASS.replace(/\s+/g, "");
  return env;
}

function requireEnv(env, key) {
  if (!env[key]) throw new Error(`Missing ${key} in server/.env`);
  return env[key];
}

function readDB() {
  return JSON.parse(fs.readFileSync(path.join(serverDir, "data/db.json"), "utf8"));
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function latestByDate(items = [], dateKey = "release") {
  return [...items].sort((a, b) => {
    const tb = Date.parse(b?.[dateKey] || b?.releaseDate || "");
    const ta = Date.parse(a?.[dateKey] || a?.releaseDate || "");
    if (Number.isFinite(tb) && Number.isFinite(ta) && tb !== ta) return tb - ta;
    if (Number.isFinite(tb)) return -1;
    if (Number.isFinite(ta)) return 1;
    return String(b?.title || b?.name || "").localeCompare(String(a?.title || a?.name || ""));
  })[0] || null;
}

function latestGraduate(members = []) {
  const graduated = members.filter((member) => !member?.isActive && member?.graduationDate);
  return latestByDate(graduated, "graduationDate") || members.find((member) => !member?.isActive) || members[0] || null;
}

function memberPhoto(member) {
  const photos = Array.isArray(member?.officialPhotos) ? member.officialPhotos : [];
  return photos.at(-1)?.url || member?.avatar || "";
}

function makeAssetRegistry() {
  const attachments = [];
  const byFile = new Map();

  function localUploadPath(src) {
    if (!src || typeof src !== "string") return "";
    const uploadMatch = src.match(/\/uploads\/.+$/);
    if (!uploadMatch) return "";
    const filePath = path.join(serverDir, uploadMatch[0]);
    return fs.existsSync(filePath) ? filePath : "";
  }

  return {
    image(src, label = "image") {
      const filePath = localUploadPath(src);
      if (!filePath) return src || "";
      if (byFile.has(filePath)) return `cid:${byFile.get(filePath)}`;

      const cid = `xp-${attachments.length + 1}-${Date.now()}@xp-news`;
      byFile.set(filePath, cid);
      attachments.push({
        filename: `${label}-${path.basename(filePath)}`,
        path: filePath,
        cid,
      });
      return `cid:${cid}`;
    },
    attachments,
  };
}

const styles = {
  page: "margin:0;padding:0;background:#f8f4e8;color:#19160f;font-family:'Avenir Next','Helvetica Neue','Hiragino Sans','Yu Gothic',Arial,sans-serif;",
  shell: "max-width:680px;margin:0 auto;padding:28px 16px;",
  subject: "background:#19160f;color:#fffdf8;border:1px solid #b99438;padding:15px 18px;margin:0 0 14px;font-size:15px;line-height:1.45;text-align:center;",
  email: "background:#fffdf8;border:1px solid #d8c692;overflow:hidden;",
  head: "padding:28px;border-bottom:1px solid #e9dfc5;text-align:center;background:repeating-linear-gradient(118deg,rgba(185,148,56,.08) 0 1px,transparent 1px 7px),#fffdf8;",
  kicker: "font-size:11px;letter-spacing:.22em;text-transform:uppercase;color:#b99438;font-weight:700;",
  brand: "margin-top:8px;font-size:44px;font-weight:300;line-height:1;color:#19160f;",
  marker: "display:inline-block;margin-top:20px;border:1px solid #d8c692;background:#fff;padding:8px 12px;color:#82631f;font-size:11px;letter-spacing:.16em;text-transform:uppercase;",
  section: "padding:28px;border-top:1px solid #e9dfc5;",
  title: "margin:0 0 16px;font-size:12px;letter-spacing:.20em;text-transform:uppercase;color:#19160f;font-weight:700;",
  body: "margin:0;color:#6f6654;font-size:15px;line-height:1.9;",
  chip: "display:inline-block;border:1px solid rgba(185,148,56,.38);background:#fff;padding:7px 10px;margin:0 6px 8px 0;color:#6d5317;font-size:13px;line-height:1.2;",
  stat: "border:1px solid #e9dfc5;background:#fff;padding:12px;margin:0 0 10px;",
  statLabel: "display:block;color:#9b8d69;font-size:10px;letter-spacing:.14em;text-transform:uppercase;font-weight:700;",
  statValue: "display:block;margin-top:5px;color:#19160f;font-size:14px;line-height:1.45;",
  footer: "background:#19160f;color:rgba(255,253,248,.78);padding:18px 24px;font-size:11px;line-height:1.5;",
};

function emailShell({ subject, marker, body }) {
  return `<!doctype html>
<html>
  <head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
  <body style="${styles.page}">
    <div style="${styles.shell}">
      <div style="${styles.subject}">${escapeHtml(subject)}</div>
      <div style="${styles.email}">
        <div style="${styles.head}">
          <div style="${styles.kicker}">XP Official News</div>
          <div style="${styles.brand}">XP</div>
          <div style="${styles.marker}">${escapeHtml(marker)}</div>
        </div>
        ${body}
        <div style="${styles.footer}">
          <div>XP PRODUCED BY GONG &amp; YUE</div>
          <div style="margin-top:6px;">宮脇奈 / 月琴音</div>
        </div>
      </div>
    </div>
  </body>
</html>`;
}

function renderStat(label, value) {
  return `<div style="${styles.stat}"><span style="${styles.statLabel}">${escapeHtml(label)}</span><span style="${styles.statValue}">${escapeHtml(value || "—")}</span></div>`;
}

export function renderSingleNewsletter(single, members, singles) {
  const assets = makeAssetRegistry();
  const summary = buildSingleNewsletterSummary(single, members, singles);
  const subject = buildSingleNewsletterSubject(single);
  const membersById = new Map(members.map((member) => [member.id, member]));
  const rows = buildFormationRows(single, members);

  const body = `
    <div style="padding:30px 28px;text-align:center;background:linear-gradient(90deg,rgba(255,255,255,.9),rgba(249,244,231,.75));">
      <img src="${assets.image(summary.cover, "single-cover")}" alt="${escapeHtml(summary.title)}" style="display:block;width:100%;max-width:330px;margin:0 auto 24px;border:1px solid #e9dfc5;background:#f8f4e8;">
      <div style="${styles.kicker}">Release Announcement</div>
      <div style="margin-top:18px;color:#7c7464;font-size:13px;text-transform:uppercase;">${escapeHtml(summary.prefix || "XP Single")}</div>
      <h1 style="margin:10px 0 18px;font-size:42px;line-height:1.05;font-weight:300;color:#19160f;">${escapeHtml(summary.name || summary.title)}</h1>
      <div style="width:86px;height:1px;background:#19160f;margin:0 auto 20px;"></div>
      ${renderStat("Release", summary.releaseLabel)}
      ${renderStat("Senbatsu", `${summary.selectionCount} members`)}
      ${renderStat("Center", summary.centerSummary)}
      ${renderStat("Tracks", `${summary.tracks.length} tracks`)}
    </div>
    <div style="${styles.section}">
      <div style="${styles.title}">INTRODUCTION</div>
      <p style="${styles.body}">${escapeHtml(summary.notes || `${summary.title} 正式发布。XP 带来新的音乐章节，感谢所有成员和粉丝一起迎接这次 release。`)}</p>
    </div>
    <div style="${styles.section}">
      <div style="${styles.title}">SENBATSU</div>
      <div>${summary.selectionNames.map((name) => `<span style="${styles.chip}">${escapeHtml(name)}</span>`).join("")}</div>
    </div>
    <div style="${styles.section}">
      <div style="${styles.title}">FORMATION</div>
      ${rows.map((row) => `
        <div style="margin-bottom:18px;">
          <div style="margin-bottom:9px;color:#9b8d69;font-size:12px;">${escapeHtml(row.label)}</div>
          <div>
            ${row.members.map((slot) => {
              const member = membersById.get(slot.id);
              const border = slot.role === "center" ? "#b99438" : slot.role === "guardian" ? "#97d7c4" : "#e9dfc5";
              return `
                <span style="display:inline-block;width:92px;vertical-align:top;border:1px solid ${border};background:#fff;margin:0 7px 10px 0;padding:7px;text-align:center;">
                  ${member ? `<img src="${assets.image(memberPhoto(member), `member-${slot.id}`)}" alt="${escapeHtml(slot.name)}" style="display:block;width:100%;height:82px;object-fit:contain;background:#f8f4e8;">` : `<span style="display:block;width:100%;height:82px;background:#f8f4e8;"></span>`}
                  <span style="display:block;margin-top:7px;color:#19160f;font-size:12px;line-height:1.25;">${escapeHtml(slot.name)}</span>
                  ${slot.role ? `<span style="display:inline-block;margin-top:5px;border:1px solid rgba(185,148,56,.34);background:#fff8df;padding:2px 5px;color:#82631f;font-size:9px;line-height:1;">${escapeHtml(slot.role)}</span>` : ""}
                </span>`;
            }).join("")}
          </div>
        </div>
      `).join("")}
    </div>
    <div style="${styles.section}">
      <div style="${styles.title}">TRACKLIST</div>
      ${summary.tracks.map((track) => `
        <div style="border-bottom:1px solid #e9dfc5;padding:12px 0;">
          <span style="color:#9b8d69;font-size:12px;">${String(track.no || "").padStart(2, "0")}</span>
          <strong style="margin-left:14px;color:#19160f;font-size:15px;font-weight:500;">${escapeHtml(track.title)}</strong>
          ${track.isAside ? `<em style="margin-left:10px;color:#b99438;font-size:11px;font-style:normal;">A-side</em>` : ""}
        </div>
      `).join("")}
    </div>`;

  return {
    subject,
    html: emailShell({ subject, marker: "NEW SINGLE", body }),
    text: `${subject}\n\n${summary.title}\nRelease: ${summary.releaseLabel}\nSenbatsu: ${summary.selectionNames.join("、")}`,
    attachments: assets.attachments,
  };
}

const badgeStyles = {
  gold: "border-color:#fde68a;background:#fef3c7;color:#92400e;",
  silver: "border-color:#e0e0e0;background:#f0f0f0;color:#1c1c1c;",
  rose: "border-color:#fecdd3;background:#fff1f2;color:#be123c;",
  sky: "border-color:#bae6fd;background:#f0f9ff;color:#075985;",
  violet: "border-color:#ddd6fe;background:#f5f3ff;color:#5b21b6;",
  soft: "border-color:#e5e5e5;background:#f5f5f5;color:#7a7a7a;",
  muted: "border-color:#e0e0e0;background:#f0f0f0;color:#6b6b6b;",
  neutral: "border-color:#e0e0e0;background:#f0f0f0;color:#6b6b6b;",
};

function renderElectionBadge(entry) {
  const badge = entry.badge || { text: entry.rank, tone: "muted" };
  return `<span style="display:inline-block;min-width:70px;border:1px solid #e0e0e0;padding:3px 8px;font-size:11px;font-weight:700;text-align:center;white-space:nowrap;${badgeStyles[badge.tone] || badgeStyles.muted}">${escapeHtml(badge.text)}</span>`;
}

export function renderGraduationNewsletter(member, singles) {
  const assets = makeAssetRegistry();
  const summary = buildGraduationNewsletterSummary(member, singles);
  const subject = buildGraduationNewsletterSubject(member);
  const blessing = pickGraduationBlessing(summary.name);

  const body = `
    <div style="padding:30px 28px;text-align:center;background:linear-gradient(90deg,rgba(215,125,140,.16),rgba(255,255,255,0) 58%),#fffdf8;">
      <div style="${styles.kicker}">Graduation Letter</div>
      <h1 style="margin:12px 0 18px;font-size:44px;line-height:1.05;font-weight:300;color:#19160f;">${escapeHtml(summary.name)}</h1>
      <div style="margin-bottom:24px;">
        <span style="${styles.chip}">${escapeHtml(summary.generation || "XP")}</span>
        <span style="${styles.chip}">${escapeHtml(summary.graduationDateLabel)}</span>
        <span style="${styles.chip}">${escapeHtml(summary.graduationSongTitle && summary.graduationSongTitle !== "无" ? summary.graduationSongTitle : "No graduation song")}</span>
      </div>
      <img src="${assets.image(summary.officialPhotoUrls.at(-1), "graduation-portrait")}" alt="${escapeHtml(summary.name)}" style="display:block;width:100%;max-width:260px;margin:0 auto;border:1px solid #e9dfc5;background:#f8f4e8;">
    </div>
    <div style="${styles.section}">
      <div style="${styles.title}">OFFICIAL PHOTOS</div>
      <div>
        ${summary.officialPhotoUrls.map((url, index) => `
          <span style="display:inline-block;width:31%;min-width:150px;vertical-align:top;border:1px solid #e9dfc5;background:#fff;margin:0 8px 12px 0;padding:8px;text-align:center;">
            <img src="${assets.image(url, `official-${index + 1}`)}" alt="${escapeHtml(summary.name)} official ${index + 1}" style="display:block;width:100%;height:auto;background:#f8f4e8;">
            <span style="display:block;margin-top:7px;color:#9b8d69;font-size:11px;">公式照 ${index + 1}</span>
          </span>
        `).join("")}
      </div>
    </div>
    <div style="${styles.section}">
      ${renderStat("Best Election", summary.bestElectionRank)}
      ${renderStat("Senbatsu", `${summary.selectionCount} times`)}
      ${renderStat("Center", `${summary.centerCount} times`)}
      ${renderStat("Graduation", summary.graduationDateLabel)}
    </div>
    <div style="${styles.section}">
      <div style="${styles.title}">ELECTION MEMORY</div>
      ${summary.electionRanks.map((entry) => `
        <div style="max-width:280px;margin:0 auto;border-bottom:1px solid #e9dfc5;padding:7px 0;display:flex;align-items:center;justify-content:space-between;gap:16px;">
          <span style="color:#6b6b6b;font-size:13px;">${escapeHtml(entry.edition)}</span>
          ${renderElectionBadge(entry)}
        </div>
      `).join("")}
    </div>
    <div style="${styles.section}">
      <div style="${styles.title}">CAREER REVIEW</div>
      <p style="${styles.body}">
        ${escapeHtml(summary.name)} 在 XP 的偶像生涯中共进入 A 面选拔 ${summary.selectionCount} 次，担任 C 位 ${summary.centerCount} 次。
        ${summary.bestElectionRank !== "—" ? `总选最高名次为 ${escapeHtml(summary.bestElectionRank)}。` : ""}
        ${summary.centerSingles.length ? `她的 C 位作品包括 ${escapeHtml(summary.centerSingles.slice(0, 6).join("、"))}。` : ""}
      </p>
    </div>
    <div style="margin:0 28px 34px;border-left:3px solid #d77d8c;background:#fff;padding:20px 22px;">
      <p style="${styles.body}">${escapeHtml(blessing.text)}</p>
      <div style="margin-top:14px;color:#82631f;font-size:13px;text-align:right;">${escapeHtml(blessing.signature)}</div>
    </div>`;

  return {
    subject,
    html: emailShell({ subject, marker: "GRADUATION", body }),
    text: `${subject}\n\n${summary.name} 卒业\n${blessing.text}\n${blessing.signature}`,
    attachments: assets.attachments,
  };
}

function recipientsFromEnv(env) {
  const to = requireEnv(env, "NEWSLETTER_RECIPIENTS")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);

  if (!to.length) throw new Error("NEWSLETTER_RECIPIENTS is empty");
  return to;
}

async function sendMessages(messages, options = {}) {
  const env = options.env || readEnv();
  const dryRun = Boolean(options.dryRun);
  const logger = options.logger || console;
  const from = env.MAIL_FROM || `XP News <${requireEnv(env, "SMTP_USER")}>`;
  const to = recipientsFromEnv(env);

  logger.log(`Mode: ${dryRun ? "dry-run" : "send"}`);
  logger.log(`From: ${from}`);
  logger.log(`To: ${to.join(", ")}`);
  for (const message of messages) {
    logger.log(`Prepared: ${message.subject} (${message.attachments.length} inline images)`);
  }

  if (dryRun) return { sent: [], prepared: messages.map((message) => message.subject) };

  const transporter = nodemailer.createTransport({
    host: requireEnv(env, "SMTP_HOST"),
    port: Number(env.SMTP_PORT || 465),
    secure: String(env.SMTP_SECURE ?? "true") === "true",
    auth: {
      user: requireEnv(env, "SMTP_USER"),
      pass: requireEnv(env, "SMTP_PASS"),
    },
  });

  await transporter.verify();

  const sent = [];
  for (const message of messages) {
    const info = await transporter.sendMail({
      from,
      to,
      subject: message.subject,
      text: message.text,
      html: message.html,
      attachments: message.attachments,
    });
    logger.log(`Sent: ${message.subject} (${info.messageId})`);
    sent.push({ subject: message.subject, messageId: info.messageId });
  }

  return { sent, prepared: messages.map((message) => message.subject) };
}

export function buildNewsletterMessagesForEvents(events = [], db = {}) {
  const members = Array.isArray(db.members) ? db.members : [];
  const singles = Array.isArray(db.singles) ? db.singles : [];
  const singlesById = new Map(singles.filter((single) => single?.id).map((single) => [single.id, single]));
  const membersById = new Map(members.filter((member) => member?.id).map((member) => [member.id, member]));

  return events.map((event) => {
    if (event?.type === "single-release") {
      const single = singlesById.get(event.id);
      if (!single) throw new Error(`Newsletter single not found: ${event.id}`);
      return renderSingleNewsletter(single, members, singles);
    }

    if (event?.type === "member-graduation") {
      const member = membersById.get(event.id);
      if (!member) throw new Error(`Newsletter member not found: ${event.id}`);
      return renderGraduationNewsletter(member, singles);
    }

    throw new Error(`Unknown newsletter event: ${event?.type || "unknown"}`);
  });
}

export async function sendNewsletterEvents(events = [], db = {}, options = {}) {
  if (!events.length) return { sent: [], prepared: [] };
  const messages = buildNewsletterMessagesForEvents(events, db);
  return sendMessages(messages, options);
}

export async function sendNewsletterPreviews(options = {}) {
  const db = readDB();
  const members = Array.isArray(db.members) ? db.members : [];
  const singles = Array.isArray(db.singles) ? db.singles : [];
  const single = latestByDate(singles);
  const graduate = latestGraduate(members);

  if (!single) throw new Error("No single found in db.json");
  if (!graduate) throw new Error("No graduate member found in db.json");

  return sendMessages([
    renderSingleNewsletter(single, members, singles),
    renderGraduationNewsletter(graduate, singles),
  ], options);
}

async function main() {
  await sendNewsletterPreviews({ dryRun: process.argv.includes("--dry-run") });
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error(error.message);
    process.exit(1);
  });
}
