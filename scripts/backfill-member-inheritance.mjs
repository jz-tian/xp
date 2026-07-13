import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { backfillInheritance } from "../src/lib/memberInheritance.js";

const SEED = "xp-legacy-2026-07-13";
const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const dbPath = path.join(projectRoot, "server/data/db.json");
const shouldWrite = process.argv.includes("--write");
const shouldCheck = process.argv.includes("--check") || !shouldWrite;

const db = JSON.parse(fs.readFileSync(dbPath, "utf8"));
const clearedMembers = db.members.map((member) => {
  const copy = { ...member };
  delete copy.inheritanceSuccessorId;
  delete copy.inheritancePending;
  return copy;
});
const members = backfillInheritance(clearedMembers, db.singles, { seed: SEED });
const membersById = new Map(members.map((member) => [member.id, member]));

for (const member of members) {
  if (member.inheritanceSuccessorId) {
    const successor = membersById.get(member.inheritanceSuccessorId);
    console.log(`${member.name} -> ${successor?.name || member.inheritanceSuccessorId}`);
  } else if (member.inheritancePending) {
    console.log(`${member.name} -> 传承待定`);
  }
}

const projection = (items) => items.map((member) => ({
  id: member.id,
  inheritanceSuccessorId: member.inheritanceSuccessorId ?? "",
  inheritancePending: member.inheritancePending === true,
}));
const matchesCurrent = JSON.stringify(projection(db.members)) === JSON.stringify(projection(members));

if (shouldCheck) {
  console.log(matchesCurrent ? "Inheritance data is current." : "Inheritance data needs backfill.");
}

if (shouldWrite) {
  fs.writeFileSync(
    dbPath,
    `${JSON.stringify({ ...db, members }, null, 2)}\n`,
  );
  console.log(`Wrote ${members.length} members using seed ${SEED}.`);
}
