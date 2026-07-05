#!/usr/bin/env python3
"""Reproduce the 'Unexpected token <' error on listing submission.

Tests createListing through both localhost and the public proxy URL with
increasing photo payload sizes to find where HTML replaces JSON.
"""
import base64
import json
import os
import sys
import requests

LOCAL = "http://localhost:3000"
PUBLIC = "https://3000-izk4kavl1eqqzaq4j2ubq-bc5e6b7b.us1.manus.computer"

USERNAME = "reprotester1"
PASSWORD = "ReproPass123"


def signup_or_signin(session, base):
    r = session.post(
        f"{base}/api/trpc/auth.signup?batch=1",
        json={"0": {"json": {"username": USERNAME, "password": PASSWORD, "displayName": "Repro Tester"}}},
        timeout=30,
    )
    if r.status_code != 200:
        r = session.post(
            f"{base}/api/trpc/auth.signin?batch=1",
            json={"0": {"json": {"username": USERNAME, "password": PASSWORD}}},
            timeout=30,
        )
    return r.status_code


def make_photo(size_bytes):
    # random-ish bytes -> base64 (simulates a photo of given size)
    raw = os.urandom(size_bytes)
    return base64.b64encode(raw).decode()


def submit(session, base, photo_b64, label):
    payload = {
        "0": {
            "json": {
                "title": "Repro Comic Test",
                "category": "comics",
                "itemType": "Comic Book",
                "condition": "mint",
                "description": "Reproduction test for submit bug - please ignore",
                "estimatedValue": 10,
                "photos": [
                    {"name": "test-photo.jpg", "type": "image/jpeg", "contentBase64": photo_b64}
                ],
                "itemDetails": {"publisher": "Test", "issueNumber": "1"},
                "grade": "ungraded",
            }
        }
    }
    body = json.dumps(payload)
    try:
        r = session.post(
            f"{base}/api/trpc/market.createListing?batch=1",
            data=body,
            headers={"Content-Type": "application/json"},
            timeout=120,
        )
        ct = r.headers.get("content-type", "?")
        first = r.text[:120].replace("\n", " ")
        print(f"[{label}] payload={len(body)/1024/1024:.2f}MB -> HTTP {r.status_code}, ct={ct}")
        print(f"    body starts: {first}")
        return r
    except Exception as e:
        print(f"[{label}] payload={len(body)/1024/1024:.2f}MB -> EXCEPTION {type(e).__name__}: {e}")
        return None


def main():
    for base, name in [(LOCAL, "local"), (PUBLIC, "public")]:
        print(f"\n===== {name}: {base} =====")
        s = requests.Session()
        code = signup_or_signin(s, base)
        print(f"auth: HTTP {code}")
        # test sizes: 0.5MB, 3MB, 9MB (base64 inflates by ~33%)
        for mb in [0.5, 3, 9]:
            photo = make_photo(int(mb * 1024 * 1024))
            submit(s, base, photo, f"{name} {mb}MB-photo")


if __name__ == "__main__":
    main()
