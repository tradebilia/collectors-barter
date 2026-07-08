#!/bin/bash
# Test keyword search coverage including grade and cert number
BASE="http://localhost:3000/api/trpc/market.feed"

test_kw() {
  local desc="$1"
  local json="$2"
  local input=$(python3 -c "import urllib.parse; print(urllib.parse.quote('$json'))")
  local result=$(curl -s "$BASE?input=$input" | python3 -c "
import sys, json
try:
    data = json.load(sys.stdin)
    listings = data['result']['data']['json']['listings']
    titles = [l['title'] for l in listings]
    print(f'{len(listings)} results: ' + '; '.join(titles[:4]))
except Exception as e:
    print('ERROR:', str(e)[:100])
")
  echo "[$desc] $result"
}

test_kw "keyword=9.4 (grade column)" '{"json":{"keyword":"9.4"}}'
test_kw "keyword=9.6 (grade column)" '{"json":{"keyword":"9.6"}}'
test_kw "keyword=Spider-Gwen (itemDetails)" '{"json":{"keyword":"Spider-Gwen"}}'
test_kw "keyword=Charizard (itemDetails)" '{"json":{"keyword":"Charizard"}}'
test_kw "keyword=06584115 (cert number Griffey)" '{"json":{"keyword":"06584115"}}'
test_kw "keyword=PSA (cert company)" '{"json":{"keyword":"PSA"}}'
