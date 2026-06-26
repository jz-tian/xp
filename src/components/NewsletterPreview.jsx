import React, { useMemo } from "react";
import { CalendarDays, Mail, Medal, Music, Sparkles, Star, Users } from "lucide-react";

import {
  buildGraduationNewsletterSubject,
  buildGraduationNewsletterSummary,
  buildSingleNewsletterSubject,
  buildSingleNewsletterSummary,
  pickGraduationBlessing,
} from "@/lib/newsletter.js";

const mediaSrc = (src) => src || "";

const latestByDate = (items = [], dateKey = "release") => {
  return [...items].sort((a, b) => {
    const tb = Date.parse(b?.[dateKey] || "");
    const ta = Date.parse(a?.[dateKey] || "");
    if (Number.isFinite(tb) && Number.isFinite(ta) && tb !== ta) return tb - ta;
    if (Number.isFinite(tb)) return -1;
    if (Number.isFinite(ta)) return 1;
    return String(b?.title || b?.name || "").localeCompare(String(a?.title || a?.name || ""));
  })[0] || null;
};

const latestGraduate = (members = []) => {
  const graduated = members.filter((member) => !member?.isActive && member?.graduationDate);
  return latestByDate(graduated, "graduationDate") || members.find((member) => !member?.isActive) || members[0] || null;
};

const memberPhoto = (member) => {
  const photos = Array.isArray(member?.officialPhotos) ? member.officialPhotos : [];
  return photos.at(-1)?.url || member?.avatar || "";
};

function PreviewIntro() {
  return (
    <section className="mx-auto max-w-6xl px-4 pb-7 pt-9 md:px-8">
      <div className="grid gap-5 md:grid-cols-[1fr_auto] md:items-end">
        <div>
          <div className="text-[10px] uppercase tracking-[0.38em] text-[#b99438]">XP mail design preview</div>
          <h1 className="mt-3 text-4xl font-light tracking-normal text-[#19160f] md:text-6xl">
            XP NEWSLETTER
          </h1>
          <div className="mt-5 h-px w-24 bg-[#19160f]" />
        </div>
        <div className="max-w-sm border-l border-[#d8c692] pl-5 text-xs leading-6 tracking-[0.08em] text-[#7c7464]">
          Desktop and mobile preview for the release mail and graduation mail.
        </div>
      </div>
    </section>
  );
}

function InboxSubject({ subject }) {
  return (
    <div className="newsletter-subject-bar">
      <Mail className="h-4 w-4" />
      <span>{subject}</span>
    </div>
  );
}

function EmailShell({ subject, marker, children }) {
  return (
    <section className="newsletter-preview-shell">
      <InboxSubject subject={subject} />
      <article className="newsletter-email">
        <header className="newsletter-email-head">
          <div>
            <div className="newsletter-kicker">XP Official News</div>
            <div className="newsletter-brand">XP</div>
          </div>
          <div className="newsletter-marker">{marker}</div>
        </header>
        {children}
        <footer className="newsletter-footer">
          <span>XP PRODUCED BY GONG & YUE</span>
          <span>宮脇奈 / 月琴音</span>
        </footer>
      </article>
    </section>
  );
}

function StatPill({ icon, label, value }) {
  const iconNode = React.createElement(icon, { className: "h-4 w-4 text-[#b99438]" });

  return (
    <div className="newsletter-stat">
      {iconNode}
      <div>
        <div className="newsletter-stat-label">{label}</div>
        <div className="newsletter-stat-value">{value || "—"}</div>
      </div>
    </div>
  );
}

function SingleNewsletter({ single, members, singles }) {
  if (!single) return null;

  const summary = buildSingleNewsletterSummary(single, members, singles);
  const subject = buildSingleNewsletterSubject(single);

  return (
    <EmailShell subject={subject} marker="NEW SINGLE">
      <section className="newsletter-release-hero">
        <div className="newsletter-cover-frame">
          <img src={mediaSrc(summary.cover)} alt={summary.title} />
        </div>
        <div className="newsletter-release-copy">
          <div className="newsletter-kicker">Release Announcement</div>
          <div className="newsletter-single-prefix">{summary.prefix || "XP Single"}</div>
          <h2>{summary.name || summary.title}</h2>
          <div className="newsletter-release-line" />
          <div className="newsletter-stat-grid">
            <StatPill icon={CalendarDays} label="Release" value={summary.releaseLabel} />
            <StatPill icon={Users} label="Senbatsu" value={`${summary.selectionCount} members`} />
            <StatPill icon={Star} label="Center" value={summary.centerSummary} />
            <StatPill icon={Music} label="Tracks" value={`${summary.tracks.length} tracks`} />
          </div>
        </div>
      </section>

      <section className="newsletter-section">
        <div className="newsletter-section-title">INTRODUCTION</div>
        <p className="newsletter-body-copy">
          {summary.notes || "XP 的新单曲已经正式上架。封面、A 面选拔、发行日与站位信息整理如下。"}
        </p>
      </section>

      <section className="newsletter-section">
        <div className="newsletter-section-title">SENBATSU</div>
        <div className="newsletter-chip-cloud">
          {summary.selectionNames.map((name) => (
            <span key={name}>{name}</span>
          ))}
        </div>
      </section>

      <section className="newsletter-section">
        <div className="newsletter-section-title">FORMATION</div>
        <div className="newsletter-formation">
          {summary.formationRows.map((row) => (
            <div key={row.label} className="newsletter-row">
              <div className="newsletter-row-label">{row.label}</div>
              <div className="newsletter-row-members">
                {row.members.map((slot) => (
                  <div
                    key={`${row.label}-${slot.slotIndex}`}
                    className={
                      "newsletter-member-tile " +
                      (slot.role === "center" ? "is-center" : slot.role === "guardian" ? "is-guardian" : "")
                    }
                  >
                    {slot.member ? (
                      <img src={mediaSrc(memberPhoto(slot.member))} alt={slot.name} />
                    ) : (
                      <div className="newsletter-empty-photo" />
                    )}
                    <div>{slot.name}</div>
                    {slot.role ? <span>{slot.role === "center" ? "CENTER" : "护法"}</span> : null}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="newsletter-section">
        <div className="newsletter-section-title">TRACKLIST</div>
        <div className="newsletter-tracklist">
          {summary.tracks.map((track) => (
            <div key={track.no || track.title}>
              <span>{String(track.no || "").padStart(2, "0")}</span>
              <strong>{track.title || "Untitled"}</strong>
              <em>{track.isAside ? "A-side" : "B-side"}</em>
            </div>
          ))}
        </div>
      </section>
    </EmailShell>
  );
}

function GraduationNewsletter({ member, singles }) {
  const summary = useMemo(
    () => member ? buildGraduationNewsletterSummary(member, singles) : null,
    [member, singles]
  );
  const blessing = useMemo(
    () => pickGraduationBlessing(summary?.name),
    [summary?.name]
  );

  if (!member || !summary) return null;

  const subject = buildGraduationNewsletterSubject(member);

  return (
    <EmailShell subject={subject} marker="GRADUATION">
      <section className="newsletter-grad-hero">
        <div>
          <div className="newsletter-kicker">Graduation Letter</div>
          <h2>{summary.name}</h2>
          <div className="newsletter-grad-meta">
            <span>{summary.generation || "XP"}</span>
            <span>{summary.graduationDateLabel}</span>
            <span>{summary.graduationSongTitle && summary.graduationSongTitle !== "无" ? summary.graduationSongTitle : "No graduation song"}</span>
          </div>
        </div>
        <div className="newsletter-grad-portrait">
          <img src={mediaSrc(summary.officialPhotoUrls.at(-1))} alt={summary.name} />
        </div>
      </section>

      <section className="newsletter-section">
        <div className="newsletter-section-title">OFFICIAL PHOTOS</div>
        <div className="newsletter-photo-strip">
          {summary.officialPhotoUrls.map((url, index) => (
            <figure key={`${url}-${index}`}>
              <img src={mediaSrc(url)} alt={`${summary.name} official ${index + 1}`} />
              <figcaption>公式照 {index + 1}</figcaption>
            </figure>
          ))}
        </div>
      </section>

      <section className="newsletter-career-grid">
        <StatPill icon={Medal} label="Best Election" value={summary.bestElectionRank} />
        <StatPill icon={Users} label="Senbatsu" value={`${summary.selectionCount} times`} />
        <StatPill icon={Star} label="Center" value={`${summary.centerCount} times`} />
        <StatPill icon={Sparkles} label="Graduation" value={summary.graduationDateLabel} />
      </section>

      <section className="newsletter-section">
        <div className="newsletter-section-title">ELECTION MEMORY</div>
        <div className="newsletter-election-list">
          {summary.electionRanks.map((entry) => (
            <div className="newsletter-election-row" key={`${entry.edition}-${entry.rank}`}>
              <span className="newsletter-election-edition">{entry.edition}</span>
              <span className={`newsletter-election-badge rank-${entry.badge?.tone || "muted"}`}>
                {entry.badge?.text || entry.rank}
              </span>
            </div>
          ))}
        </div>
      </section>

      <section className="newsletter-section">
        <div className="newsletter-section-title">CAREER REVIEW</div>
        <p className="newsletter-body-copy">
          {summary.name} 在 XP 的偶像生涯中共进入 A 面选拔 {summary.selectionCount} 次，
          担任 C 位 {summary.centerCount} 次。{summary.bestElectionRank !== "—" ? `总选最高名次为 ${summary.bestElectionRank}。` : ""}
          {summary.centerSingles.length ? `她的 C 位作品包括 ${summary.centerSingles.slice(0, 4).join("、")}。` : ""}
        </p>
      </section>

      <section className="newsletter-blessing">
        <p>{blessing.text}</p>
        <div>{blessing.signature}</div>
      </section>
    </EmailShell>
  );
}

export default function NewsletterPreviewPage({ data }) {
  const single = useMemo(() => latestByDate(data?.singles || []), [data?.singles]);
  const graduate = useMemo(() => latestGraduate(data?.members || []), [data?.members]);
  const previewMode = useMemo(() => {
    if (typeof window === "undefined") return "all";
    return new URLSearchParams(window.location.search).get("preview") || "all";
  }, []);
  const singleNewsletter = <SingleNewsletter single={single} members={data?.members || []} singles={data?.singles || []} />;
  const graduationNewsletter = <GraduationNewsletter member={graduate} singles={data?.singles || []} />;

  return (
    <main className="newsletter-preview-page">
      <PreviewIntro />
      <div className="mx-auto grid max-w-6xl gap-12 px-4 pb-16 md:px-8">
        {previewMode === "graduation" ? (
          <>
            {graduationNewsletter}
            {singleNewsletter}
          </>
        ) : (
          <>
            {singleNewsletter}
            {graduationNewsletter}
          </>
        )}
      </div>
    </main>
  );
}
