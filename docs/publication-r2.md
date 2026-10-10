# Checked coloring-page publication

The site stays on Vercel. Coloring originals and matching thumbnails live in the existing `kidslovecolor-images` R2 bucket. Existing `/img/kleurplaten/` links are preserved through the first Vercel rewrite to `https://media.kidslovecolor.com`.

`node scripts/build-static.cjs` builds `dist` without the image collection. Do not remove source originals until an independent recovery strategy exists. Keep all existing pages and serverless APIs.

## Publishing a new reviewed batch

1. Generate original black-on-white printable artwork, with no color or shading. Only explicitly requested theme lettering, such as month names or checked educational species names, belongs inside the artwork. Inspect anatomy, lettering, accidental fills and duplicates before publication.
2. Prepare original JPGs and matching JPG thumbnails in `img/kleurplaten/` and `img/kleurplaten/thumbs/`. Keep five-language metadata in `.titles.json`.
3. Publish those assets to GitHub without adding them to the live page index yet.
4. Manually run `sync-r2-images.yml`. It uses existing GitHub secrets, never generates pictures, never calls Magnific and never deletes remote objects. Wait for success and verify public HTTPS images before proceeding. Also wait for the asset commit's Vercel deployment to finish before publishing the metadata commit. Otherwise an older asset deployment can finish later and replace the newer production pages.
5. Add unique IDs and slugs to `js/data.js` with complete Dutch, English, French, Spanish and Chinese metadata. Use a category defined in `CATEGORIES`. Add sitemap entries and run `node generate-kleurplaat-pages.js --new-only`. Preserve the existing `vercel.json` unless an intentional routing change is being reviewed: the detail generator also rewrites that file.
6. Build and test locally, publish metadata and detail pages, verify Vercel success, then check live pages, originals and thumbnails. Verify the production domain's content against the published files, not only a deployment preview or GitHub success status. If an older deployment replaced production, restore the reviewed metadata deployment before marking the batch published. Record the actual published links.

Do not enable the old Daily Coloring Pages Magnific workflow. Image generation is handled separately by the approved Codex automation. Never put credentials in source or output logs.

## Page-filling print composition

Artwork should make generous use of the printable A4 page rather than sitting as a tiny central picture with large empty bands. Keep the whole subject and safe printer margins. Where the subject leaves excessive blank space, add suitable inkleurbare outline scenery such as clouds, sky elements, plants or ground; never fill the sky with color or grey. Larger compositions must not cut off tails, feet, leaves, rocks or other scene elements. Replacing published artwork requires versioned filenames and matching thumbnails so old links and cached images remain valid. Keep existing IDs, slugs, translations and detail URLs.

## Theme landing pages

The named dinosaur collection is available at `/dinosaurussen`, `/en/dinosaurs`, `/fr/dinosaures`, `/es/dinosaurios` and `/zh/dinosaurs`. It uses the existing collection model: records retain their primary category and add `collections: ['dinosaurussen']`. Do not create duplicate records or rename old image paths to add them to a theme.

Reusable theme copy and routes live in `lib/theme-pages.cjs`. `node scripts/generate-theme-pages.cjs` generates static HTML with visible card links, species notes, canonical URLs, reciprocal hreflang links and CollectionPage/ItemList metadata. The compact build regenerates and includes these pages automatically, but still excludes the image collection. Include any new theme routes in the sitemap when adding a theme; adding pictures to an existing theme does not require new landing URLs.

The first dinosaur series has checked scientific names in hollow lettering on the pictures. For new educational records, provide `scientificName`, a trusted museum `referenceUrl` and a short `learningFact` in all five languages. The illustrations are simplified original artwork, not exact scientific reconstructions. Never assign a scientific species name to an unverified older fantasy dinosaur. Keep other themes and the separate news rubric in rotation.

## Mandala quality rule

Every mandala must fit completely on one flat white A4 page, including every outer petal, point and decoration. Keep at least 6% of page width as pure white safety margin on both sides, plus suitable top and bottom printer margins. Never crop the pattern or allow stray elements to run off the page. No simulated scan, paper edge, second page, fold, curl, shadow, texture, perspective, table, hands or scan marks. Use crisp black outlines on uniform white. Inspect the complete artwork at full size before publication; margin measurements alone are not sufficient. Repair or regenerate incomplete artwork before placing it on a print canvas. Preserve originals and use versioned asset filenames when replacing published artwork.

## Verified first publication

On 3 October 2026, 50 reviewed new coloring pages and the corrected safari artwork were published. R2 synchronization verified 179 uploaded files and 1,142 unchanged files. The compact static build was about 18 MB. The deployment and all 50 new detail pages, originals and thumbnails were checked successfully.
