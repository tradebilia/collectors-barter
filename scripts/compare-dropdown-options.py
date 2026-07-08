#!/usr/bin/env python3
"""Compare category page filter dropdown options with the form's field definition dropdown options."""
import re
import json

src = open('/home/ubuntu/collectors-barter/client/src/lib/fieldDefinitionsGenerated.ts').read()

# Parse each exported const block
blocks = re.split(r'^export const (\w+): FieldDefinition\[\] = \[', src, flags=re.M)

# Fields we care about (filter -> form field name candidates)
targets = {
    'rarity': ['rarity'],
    'platform/system': ['platform'],
    'region': ['region'],
    'format (movies)': ['format'],
    'medium (autographs)': ['signedItemType', 'autographCategory'],
    'denomination (coins)': ['denomination'],
    'country (stamps)': ['country'],
    'genre (vintage toys)': ['packagingType', 'toyType'],
    'series (disney pins)': ['edition', 'series'],
    'sport': ['sport'],
    'condition': ['condition'],
}

# Extract dropdownOptions per field per item type
field_options = {}  # field_name -> {const_name: options}
for i in range(1, len(blocks), 2):
    const_name = blocks[i]
    body = blocks[i+1]
    # Split body into field objects by "name: '...'"
    field_chunks = re.split(r"\{\s*\n\s*name: '(\w+)'", body)
    for j in range(1, len(field_chunks), 2):
        fname = field_chunks[j]
        fbody = field_chunks[j+1]
        m = re.search(r"dropdownOptions: \[([^\]]*)\]", fbody)
        if m:
            opts = re.findall(r"'([^']*)'", m.group(1))
            field_options.setdefault(fname, {})[const_name] = opts

for filter_name, candidates in targets.items():
    print(f"\n=== FILTER: {filter_name} ===")
    for c in candidates:
        if c in field_options:
            for const_name, opts in field_options[c].items():
                print(f"  form field '{c}' in {const_name}:")
                print(f"    {opts}")
        else:
            print(f"  form field '{c}': NOT FOUND or not a dropdown")
