#!/bin/bash
# Test the synced dropdown filters against the live tRPC API
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
    print(f'{len(listings)} results: ' + '; '.join(titles[:4]))
except Exception as e:
    print('ERROR:', str(e)[:100])
")
  echo "[$desc] $result"
}

# Movies format is stored as VHS for Star Wars listing
test_filter "movies keyword=VHS (Format channel)" '{"json":{"category":"movies","keyword":"VHS"}}'
# Video games: Super Mario 3 is on NES with NTSC-U region
test_filter "video_games keyword=NES (System channel)" '{"json":{"category":"video_games","keyword":"NES"}}'
test_filter "video_games team=NTSC-U (Region channel)" '{"json":{"category":"video_games","team":"NTSC-U"}}'
# Stamps country: stored as country=United States (dropdown from COUNTRIES_LIST)
test_filter "stamps manufacturer=United States (Country channel)" '{"json":{"category":"stamps","manufacturer":"United States"}}'
# Coins denomination free text (collection lot has none, expect 0) and mint mark
test_filter "coins team=denomination-test (expect 0)" '{"json":{"category":"coins","team":"Eagle"}}'
# Disney pins series free text: stored series field
test_filter "disney_pins series=Easter (series/franchise channel)" '{"json":{"category":"disney_pins","series":"Easter"}}'
# Autographs medium: signedItemType stored — Trump card is a signed Card
test_filter "autographs keyword=Card (Medium channel)" '{"json":{"category":"autographs","keyword":"Card"}}'
# Pokemon rarity — stored rarity for Charizard is "Holo Rare" (verify against data)
test_filter "pokemon keyword=Holo (Rarity via keyword)" '{"json":{"category":"pokemon","keyword":"Holo"}}'
