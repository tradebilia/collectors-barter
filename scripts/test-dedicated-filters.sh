#!/bin/bash
# Test the new dedicated per-filter parameters against the live tRPC API
BASE="http://localhost:3000/api/trpc/market.feed"

test_filter() {
  local desc="$1"
  local json="$2"
  local input=$(python3 -c "import urllib.parse; print(urllib.parse.quote('$json'))")
  local result=$(curl -s "$BASE?input=$input" | python3 -c "
import sys, json
try:
    data = json.load(sys.stdin)
    listings = data['result']['data']['json']['listings']
    titles = [l['title'] for l in listings]
    print(f'{len(listings)} results: ' + '; '.join(titles[:5]))
except Exception as e:
    print('ERROR:', str(e)[:150])
")
  echo "[$desc] $result"
}

echo "=== Dedicated parameter tests ==="
test_filter "comics title=Amazing Spider-Man" '{"json":{"category":"comics","title":"Amazing Spider-Man"}}'
test_filter "video_games system=NES" '{"json":{"category":"video_games","system":"NES"}}'
test_filter "video_games region=NTSC-U" '{"json":{"category":"video_games","region":"NTSC-U"}}'
test_filter "stamps country=United States" '{"json":{"category":"stamps","country":"United States"}}'
test_filter "movies format=VHS" '{"json":{"category":"movies","format":"VHS"}}'
test_filter "autographs medium=Card" '{"json":{"category":"autographs","medium":"Card"}}'
test_filter "coins mintMark=S (expect 0 or match)" '{"json":{"category":"coins","mintMark":"S"}}'
test_filter "pokemon rarity=Holo" '{"json":{"category":"pokemon","rarity":"Holo"}}'
test_filter "disney_pins parkOrEvent=Epcot (expect 0 - no event stored)" '{"json":{"category":"disney_pins","parkOrEvent":"Epcot"}}'
test_filter "vintage_toys franchise=Transformers" '{"json":{"category":"vintage_toys","franchise":"Transformers"}}'

echo ""
echo "=== Regression: existing channels still work ==="
test_filter "sports_cards manufacturer=Topps" '{"json":{"category":"sports_cards","manufacturer":"Topps"}}'
test_filter "sports_cards team=Oilers" '{"json":{"category":"sports_cards","team":"Oilers"}}'
test_filter "sports_cards series=Upper Deck" '{"json":{"category":"sports_cards","series":"Upper Deck"}}'
test_filter "sports_cards year=1989" '{"json":{"category":"sports_cards","year":"1989"}}'
test_filter "comics keyword=Punisher" '{"json":{"category":"comics","keyword":"Punisher"}}'
