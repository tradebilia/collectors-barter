#!/bin/bash
# Test the fixed category filters against the live tRPC API
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
    print('ERROR:', str(e)[:100])
")
  echo "[$desc] $result"
}

test_filter "sports_cards year=1989 (Griffey)" '{"json":{"category":"sports_cards","year":"1989"}}'
test_filter "sports_cards year=1996 (Kobe)" '{"json":{"category":"sports_cards","year":"1996"}}'
test_filter "sports_cards series=Upper Deck (setName)" '{"json":{"category":"sports_cards","series":"Upper Deck"}}'
test_filter "sports_cards rookie=Yes (rookieCard)" '{"json":{"category":"sports_cards","rookie":"Yes"}}'
test_filter "sports_cards manufacturer=Topps" '{"json":{"category":"sports_cards","manufacturer":"Topps"}}'
test_filter "comics year=1984 (publicationYear)" '{"json":{"category":"comics","year":"1984"}}'
test_filter "comics issueNumber=168" '{"json":{"category":"comics","issueNumber":"168"}}'
test_filter "movies year=1990 (releaseYear)" '{"json":{"category":"movies","year":"1990"}}'
test_filter "sports_cards value 1000-3000" '{"json":{"category":"sports_cards","valueMin":1000,"valueMax":3000}}'
test_filter "movies value 100-200" '{"json":{"category":"movies","valueMin":100,"valueMax":200}}'
test_filter "coins value 400-500" '{"json":{"category":"coins","valueMin":400,"valueMax":500}}'
