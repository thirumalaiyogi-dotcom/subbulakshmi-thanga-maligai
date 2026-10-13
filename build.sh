#!/bin/sh
# Static build for any host (Cloudflare Pages, Netlify, ...): publish only the app.
# supabase/ (SQL), tests/ (test-only mock) and docs are NOT published.
set -e
rm -rf dist
mkdir -p dist
cp -r index.html admin.html css js _headers dist/
echo "dist/ ready: $(find dist -type f | wc -l) files"
