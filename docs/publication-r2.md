# Checked coloring-page publication

The site stays on Vercel. Coloring originals and matching thumbnails live in the existing `kidslovecolor-images` R2 bucket. Existing `/img/kleurplaten/` links are preserved through the first Vercel rewrite to `https://media.kidslovecolor.com`.

`node scripts/build-static.cjs` builds `dist` without the image collection. Do not remove source originals until an independent recovery strategy exists. Keep all existing pages and serverless APIs.

## Publishing a new reviewed batch

1. Generate original black-on-white printable artwork, with no color or shading. Only explicitly requested month lettering belongs inside the artwork. Inspect anatomy, lettering, accidental fills and duplicates before publication.
2. Prepare original JPGs and matching JPG thumbnails in `img/kleurplaten/` and `img/kleurplaten/thumbs/`. Keep five-language metadata in `.titles.json`.
3. Publish those assets to GitHub without adding them to the live page index yet.
4. Manually run `sync-r2-images.yml`. It uses existing GitHub secrets, never generates pictures, never calls Magnific and never deletes remote objects. Wait for success and verify public HTTPS images before proceeding.
5. Add unique IDs and slugs to `js/data.js` with complete Dutch, English, French, Spanish and Chinese metadata. Use a category defined in `CATEGORIES`. Add sitemap entries and run `node generate-kleurplaat-pages.js --new-only`.
6. Build and test locally, publish metadata and detail pages, verify Vercel success, then check live pages, originals and thumbnails. Record the actual published links.

Do not enable the old Daily Coloring Pages Magnific workflow. Image generation is handled separately by the approved Codex automation. Never put credentials in source or output logs.

## Verified first publication

On 3 October 2026, 50 reviewed new coloring pages and the corrected safari artwork were published. R2 synchronization verified 179 uploaded files and 1,142 unchanged files. The compact static build was about 18 MB. The deployment and all 50 new detail pages, originals and thumbnails were checked successfully.
