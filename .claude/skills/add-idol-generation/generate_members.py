#!/usr/bin/env python3
"""Merge a new XP idol generation into server/data/db.json.

Handles every mechanical field (ids, electionRanks, selectionHistory,
timestamps, boilerplate structure) and validates the judgment-call fields
(favoriteSongs must be real track titles, admireSenior/friends must be real
member ids, friends must be currently-active members) so a bad manual edit
can't silently corrupt the data file.

Usage:
    python3 generate_members.py spec.json [--db path/to/db.json]

spec.json shape:
{
  "generation": "12",                 // digits only, becomes "12期"
  "members": [
    {
      "name": "大久保 七瀬",
      "romaji": "NANASE OKUBO",
      "origin": "千葉県・柏市",
      "birthday": "2006-02-14",
      "height": "158cm",
      "blood": "O",
      "hobby": "...",
      "skill": "...",
      "catchphrase": "...",
      "favoriteSongs": ["Real Track (A-side)", "...", "..."],
      "favoritePokemon": 135,
      "admireSenior": ["m_7j6tcyhr", "m_9gen_6"],
      "friends": ["m_11gen_4", "m_10gen_2"]
    },
    ...
  ]
}

New members are inserted at the FRONT of the members array (newest
generation first), per project convention.
"""
import argparse
import datetime
import json
import sys


def load_db(path):
    with open(path, encoding="utf-8") as f:
        return json.load(f)


def save_db(db, path):
    with open(path, "w", encoding="utf-8") as f:
        json.dump(db, f, ensure_ascii=False, indent=2)
        f.write("\n")


def build_member(gen_label, idx, spec, single_ids, editions, member_ids, active_ids, now):
    errors = []

    for key in ("name", "romaji", "origin", "birthday", "height", "blood",
                "hobby", "skill", "catchphrase", "favoriteSongs", "favoritePokemon"):
        if key not in spec:
            errors.append(f"missing field: {key}")

    fav_songs = spec.get("favoriteSongs", [])
    if len(fav_songs) != 3:
        errors.append(f"favoriteSongs must have exactly 3 entries, got {len(fav_songs)}")

    fav_pokemon = spec.get("favoritePokemon")
    if fav_pokemon is not None and not (1 <= fav_pokemon <= 151):
        errors.append(f"favoritePokemon {fav_pokemon} out of range 1-151")

    for mid in spec.get("admireSenior", []):
        if mid not in member_ids:
            errors.append(f"admireSenior id not found in db: {mid}")

    for mid in spec.get("friends", []):
        if mid not in member_ids:
            errors.append(f"friends id not found in db: {mid}")
        elif mid not in active_ids:
            errors.append(f"friends id is not an active member: {mid}")

    if errors:
        raise ValueError(f"member #{idx} ({spec.get('name', '?')}): " + "; ".join(errors))

    gen_num = gen_label.rstrip("期")
    member_id = f"m_{gen_num}gen_{idx}"

    return {
        "id": member_id,
        "name": spec["name"],
        "romaji": spec["romaji"],
        "origin": spec["origin"],
        "generation": gen_label,
        "avatar": "",
        "officialPhotos": [],
        "isActive": True,
        "graduationDate": "",
        "graduationSongTitle": "",
        "inheritanceSuccessorId": "",
        "inheritancePending": False,
        "electionRanks": [{"edition": e, "rank": "加入前"} for e in editions],
        "admireSenior": spec.get("admireSenior", []),
        "friends": spec.get("friends", []),
        "favoriteSong": fav_songs[0],
        "favoriteSongs": fav_songs,
        "favoritePokemon": fav_pokemon,
        "profile": {
            "height": spec["height"],
            "birthday": spec["birthday"],
            "blood": spec["blood"],
            "hobby": spec["hobby"],
            "skill": spec["skill"],
            "catchphrase": spec["catchphrase"],
        },
        "selectionHistory": {sid: "加入前" for sid in single_ids},
        "createdAt": now,
        "updatedAt": now,
        "group": "XP",
    }


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("spec_path")
    ap.add_argument("--db", default="server/data/db.json")
    args = ap.parse_args()

    with open(args.spec_path, encoding="utf-8") as f:
        spec = json.load(f)

    db = load_db(args.db)

    single_ids = [s["id"] for s in db["singles"]]
    all_track_titles = {t["title"] for s in db["singles"] for t in s["tracks"]}
    editions = sorted(
        {e["edition"] for m in db["members"] for e in m["electionRanks"]},
        key=lambda x: int(x.replace("第", "").replace("届", "")),
    )
    member_ids = {m["id"] for m in db["members"]}
    active_ids = {m["id"] for m in db["members"] if m.get("isActive")}

    gen_label = spec["generation"].rstrip("期") + "期"
    now = datetime.datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%S.000Z")

    # Validate favorite songs are real tracks before touching the file.
    song_errors = []
    for i, m in enumerate(spec["members"], start=1):
        for title in m.get("favoriteSongs", []):
            if title not in all_track_titles:
                song_errors.append(f"member #{i} ({m.get('name')}): unknown track title {title!r}")
    if song_errors:
        sys.exit("favoriteSongs validation failed:\n" + "\n".join(song_errors))

    new_members = [
        build_member(gen_label, i, m, single_ids, editions, member_ids, active_ids, now)
        for i, m in enumerate(spec["members"], start=1)
    ]

    db["members"] = new_members + db["members"]
    save_db(db, args.db)
    print(f"Inserted {len(new_members)} members for {gen_label} into {args.db}")


if __name__ == "__main__":
    main()
