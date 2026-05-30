#!/bin/bash

# Array of background URLs from CategoryPage.tsx
declare -a urls=(
  "https://d2xsxph8kpxj0f.cloudfront.net/310519663570115757/nAx6ATm2BH4G46yabuMZgM/video-games-background-kyx4vVUqTYCMC3kMbtokYU.webp"
  "https://d2xsxph8kpxj0f.cloudfront.net/310519663570115757/nAx6ATm2BH4G46yabuMZgM/comics-background-YZiiH2cyV8YJx6GFQj4PKC.webp"
  "https://d2xsxph8kpxj0f.cloudfront.net/310519663570115757/nAx6ATm2BH4G46yabuMZgM/pokemon-background-J6h7Mte6BSYA3GfQ4vtdFj.webp"
  "https://d2xsxph8kpxj0f.cloudfront.net/310519663570115757/nAx6ATm2BH4G46yabuMZgM/disney-pins-background-F6yUvFLVrhmnaWk6GsFMZ8.webp"
)

echo "Downloading ${#urls[@]} background images..."
for url in "${urls[@]}"; do
  filename=$(basename "$url" | cut -d'?' -f1)
  echo "Downloading: $filename"
  curl -s -L "$url" -o "$filename" 2>/dev/null && echo "✓ $filename" || echo "✗ Failed: $filename"
done

echo "Done! Downloaded files:"
ls -lh *.webp *.png 2>/dev/null | wc -l
