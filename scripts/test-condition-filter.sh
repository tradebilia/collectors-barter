#!/bin/bash
# Test the condition filter: graded items should pass through, ungraded items filtered strictly
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
    print(f'{len(listings)} results: ' + '; '.join(titles[:6]))
except Exception as e:
    print('ERROR:', str(e)[:100])
")
  echo "[$desc] $result"
}

# Disney pins: Chip Pin is UNGRADED with condition=near_mint
# Filtering disney_pins by condition=mint should EXCLUDE it (ungraded, wrong condition)
test_filter "disney_pins condition=mint (expect 0 - Chip Pin is near_mint ungraded)" '{"json":{"category":"disney_pins","condition":"mint"}}'
# Filtering disney_pins by condition=near_mint should INCLUDE it
test_filter "disney_pins condition=near_mint (expect 1 - Chip Pin)" '{"json":{"category":"disney_pins","condition":"near_mint"}}'
# Sports cards: all 5 are graded. Filtering by ANY condition should return all 5 (pass-through)
test_filter "sports_cards condition=near_mint (expect 5 - all graded pass through)" '{"json":{"category":"sports_cards","condition":"near_mint"}}'
test_filter "sports_cards condition=poor (expect 5 - all graded pass through)" '{"json":{"category":"sports_cards","condition":"poor"}}'
# Vintage toys: Megatron is graded (AFA 6). Condition filter should pass it through
test_filter "vintage_toys condition=poor (expect 1 - Megatron graded passes)" '{"json":{"category":"vintage_toys","condition":"poor"}}'
