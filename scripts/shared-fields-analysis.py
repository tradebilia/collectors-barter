#!/usr/bin/env python3
"""Compute shared fields across all item types, per category, from fieldDefinitionsGenerated.ts"""
import re
from collections import defaultdict

src = open('/home/ubuntu/collectors-barter/client/src/lib/fieldDefinitionsGenerated.ts').read()

# Split into exported const blocks
blocks = re.split(r'^export const (\w+): FieldDefinition\[\] = \[', src, flags=re.M)
# blocks[0] is header; then pairs of (name, body)
itemtype_fields = {}
for i in range(1, len(blocks), 2):
    const_name = blocks[i]
    body = blocks[i+1]
    # body extends to next export or EOF; fields have name: '...'
    names = re.findall(r"name: '(\w+)'", body)
    labels = dict(re.findall(r"name: '(\w+)',\s*\n\s*label: '([^']+)'", body))
    itemtype_fields[const_name] = (names, labels)

# Group by category prefix
category_map = defaultdict(dict)
for const_name, (names, labels) in itemtype_fields.items():
    # e.g. AUTOGRAPHS_COLLECTION_LOT_FIELDS -> category AUTOGRAPHS
    m = re.match(r'(AUTOGRAPHS|SPORTS_CARDS|COINS|COMICS|VIDEO_GAMES|VINTAGE_TOYS|POKEMON|DISNEY_PINS|STAMPS|MOVIES)_(.+)_FIELDS', const_name)
    if not m:
        print('UNMATCHED:', const_name)
        continue
    cat, itype = m.group(1), m.group(2)
    category_map[cat][itype] = (set(names), labels)

all_labels = {}
print('=' * 70)
per_cat_shared = {}
for cat, types in sorted(category_map.items()):
    shared = None
    for itype, (names, labels) in types.items():
        all_labels.update(labels)
        shared = names if shared is None else (shared & names)
    per_cat_shared[cat] = shared
    print(f'\n### {cat} ({len(types)} item types: {", ".join(sorted(types))})')
    print('Shared fields:', ', '.join(sorted(shared)))

# Global intersection across every item type of every category
global_shared = None
for cat, shared in per_cat_shared.items():
    global_shared = shared if global_shared is None else (global_shared & shared)
print('\n' + '=' * 70)
print('GLOBAL shared across ALL item types of ALL categories:', ', '.join(sorted(global_shared)))
print('\nLabels:')
for f in sorted(set().union(*per_cat_shared.values())):
    print(f'  {f}: {all_labels.get(f, "?")}')
