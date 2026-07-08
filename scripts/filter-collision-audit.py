#!/usr/bin/env python3
"""Detect same-page filter state collisions."""
# Filter label -> state variable (from CategoryPage.tsx render code)
bindings = {
    "Keyword": "keyword",   # fallback branch
    "Title": "team",
    "Issue Number": "issueNumber",
    "Manufacturer": "manufacturer",
    "Year / era": "year",
    "Team": "team",
    "Set / series": "series",
    "Name": "keyword",
    "Franchise": "series",
    "Issuer": "manufacturer",
    "Mint mark": "team",
    "Pokémon": "keyword",
    "Signer": "keyword",
    "Pin name": "keyword",
    "Denomination": "team",
    "Series": "series",
    "Set": "series",
    "Edition": "team",
    "Park or event": "manufacturer",
    "Year": "year",
    "Grade": "grade",
    "Value Range": "valueMin/valueMax",
    # dropdowns
    "Sport": "sport",
    "Grading service": "gradingService",
    "Grading company": "gradingService",
    "Certification": "gradingService",
    "Authentication": "gradingService",
    "Rookie": "rookie",
    "Autographed": "autographed",
    "Signed": "signed",
    "Facsimile": "facsimile",
    "Rarity": "rarity",
    "System": "keyword",
    "Region": "team",
    "Country": "manufacturer",
    "Format": "keyword",
    "Medium": "keyword",
}

presets = {
    "comics": ["Keyword", "Title", "Issue Number", "Grading service", "Grade", "Value Range", "Signed", "Facsimile"],
    "sports_cards": ["Keyword", "Manufacturer", "Sport", "Grading service", "Year / era", "Team", "Set / series", "Grade", "Value Range", "Rookie", "Autographed"],
    "vintage_toys": ["Keyword", "Grading service", "Franchise", "Value Range"],
    "video_games": ["Keyword", "System", "Region", "Grading company", "Value Range"],
    "stamps": ["Keyword", "Year", "Issuer", "Country", "Grading company", "Value Range"],
    "coins": ["Keyword", "Year", "Denomination", "Mint mark", "Grading service", "Value Range"],
    "pokemon": ["Keyword", "Set", "Rarity", "Grading service", "Value Range"],
    "movies": ["Keyword", "Format", "Franchise", "Certification", "Value Range"],
    "autographs": ["Keyword", "Medium", "Authentication", "Franchise", "Value Range"],
    "disney_pins": ["Keyword", "Park or event", "Series", "Edition", "Value Range"],
}

print("COLLISION AUDIT (same state var used by 2+ filters on the SAME page):\n")
for cat, labels in presets.items():
    seen = {}
    collisions = []
    for label in labels:
        state = bindings.get(label, "??")
        if state in seen and state not in ("valueMin/valueMax",):
            collisions.append(f"  '{seen[state]}' and '{label}' BOTH use state '{state}'")
        else:
            seen[state] = label
    if collisions:
        print(f"### {cat}")
        for c in collisions:
            print(c)
        print()
print("Done.")
