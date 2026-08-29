# Value display verification

- Desktop representative captures of `/`, `/search`, `/rankings/top-trade-values`, `/category/sports_cards`, and `/trade-vote/demo` completed successfully.
- Mobile representative captures of `/`, `/search`, `/rankings/top-trade-values`, `/category/video_games`, and `/trade-vote/demo` completed successfully.
- Homepage and ranking surfaces visibly show whole-dollar values; the mobile ranking card remains readable and responsive.
- The Video Games category capture loaded its listing image and controls; the value text is below the captured viewport and requires signed-in/detail inspection for a direct sub-dollar visual case.
- No screenshot operation exposed a cents-formatted listing value or layout overflow attributable to the formatter changes.
- Authentication-gated trade/inventory surfaces remain inaccessible in the signed-out preview; automated tests cover their shared formatting and normalization paths.
