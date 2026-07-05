"""Audit all image URLs referenced by listings via the running dev server.

Categorizes each photo URL by storage location and verifies each resolves
with HTTP 200 (following redirects), reporting broken links.
"""
import json
import urllib.request
import urllib.error
from collections import Counter

BASE = "http://localhost:3000"
FEED_URL = (
    BASE
    + "/api/trpc/market.feed?batch=1&input=%7B%220%22%3A%7B%22json%22%3Anull%2C%22meta%22%3A%7B%22values%22%3A%5B%22undefined%22%5D%7D%7D%7D"
)


def classify(url: str) -> str:
    if "githubusercontent" in url:
        return "GitHub raw"
    if "manus-storage" in url:
        return "S3 via manus-storage proxy"
    if url.startswith("/images/"):
        return "Local /images folder"
    if "cloudfront" in url:
        return "CloudFront direct"
    return "Other"


def check(url: str) -> tuple[int, str]:
    full = url if url.startswith("http") else BASE + urllib.parse.quote(url)
    req = urllib.request.Request(full, method="GET", headers={"User-Agent": "audit"})
    try:
        with urllib.request.urlopen(req, timeout=20) as resp:
            return resp.status, ""
    except urllib.error.HTTPError as e:
        return e.code, str(e)
    except Exception as e:  # noqa: BLE001
        return 0, str(e)


def main() -> None:
    import urllib.parse

    with urllib.request.urlopen(FEED_URL, timeout=30) as resp:
        feed = json.load(resp)
    listings = feed[0]["result"]["data"]["json"]["listings"]

    print(f"Total active listings: {len(listings)}")
    sources: Counter[str] = Counter()
    broken: list[tuple[int, str, str, int]] = []

    for l in listings:
        url = l.get("primaryPhotoUrl")
        if not url:
            sources["(no photo)"] += 1
            continue
        src = classify(url)
        sources[src] += 1
        status, err = check(url)
        ok = "OK" if status == 200 else f"BROKEN ({status} {err})"
        print(f"  [{l['id']}] {l['title'][:40]:40s} {src:28s} {ok}")
        if status != 200:
            broken.append((l["id"], l["title"], url, status))

    print("\n--- Storage source breakdown ---")
    for k, v in sources.most_common():
        print(f"  {k}: {v}")

    print(f"\n--- Broken links: {len(broken)} ---")
    for lid, title, url, status in broken:
        print(f"  listing {lid} '{title}': {url} -> HTTP {status}")


if __name__ == "__main__":
    main()
