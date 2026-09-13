# Liuyang Cheng — personal website

This is a complete static website for **LiuyangMechSE/liuyangmechse.github.io**. The intended address is **https://liuyangmechse.github.io/**. It is ready for GitHub Pages and needs no server, database, build action, or API key.

## Publishing updates

The website is published at **https://liuyangmechse.github.io/** from the repository's `main` branch and root folder. Committing updated deployment files to that location triggers GitHub Pages. Keep `index.html`, `research.html`, `editor.html`, `content.json`, `assets/`, `media/`, and `.nojekyll` at the root.

## Edit without coding

Open **Edit a copy** on the website (or open `editor.html`). The visual editor supports:

- Switching between Home and Research while keeping drafts in the same tab.
- Dragging projects, sections, and entries, including between sections on the same page; arrows provide an alternative.
- Moving a section between Home and Research in its edit dialog.
- Editing the paper figure, caption, and source beside a demo.
- Editing your introduction, portrait, text, authors, publication details, and links.
- Changing media placement: left, right, or full width.
- Replacing animations with JPG, PNG, WebP, GIF, MP4, or WebM files up to 25 MB each.
- Adding or removing entries and sections, with Undo.

Entry titles open the first HTTPS link in that entry. In **Edit entry → Links**, put the publisher page or preprint first to choose the title’s destination. Additional links remain available beneath the entry.

Choose **Apply changes** in a dialog, then **Download website**. Extract the downloaded ZIP and upload its files to the repository root, committing the update. GitHub Pages republishes from that commit. The downloaded ZIP contains your changed content and media.

**The editor changes a draft in the current tab. It does not save to GitHub automatically.** Download before closing the tab. Anyone can edit their own copy, but only people with write access to your GitHub repository can publish changes. No GitHub token is requested or stored.

Use media URLs only for assets you are comfortable making public. Direct MP4 and WebM URLs work as videos; YouTube watch-page URLs are not direct media URLs.

## Research content

The separate `research.html` page groups work into projects. The Artificial ligaments project contains three active animations: antagonistic translation, a rotary joint, and a running leg with a parallel passive spring and actuator. Each has a matching paper figure beside it. The first two figures are Fig. 5b and 5e in the [public preprint](https://arxiv.org/abs/2602.00260). The running figure is Fig. 6g in the author-supplied August 30, 2026 revised manuscript; that panel is absent from the public v1 preprint. Only the requested figure extract is included, not the revised PDF. The TCPA project includes Fig. 1 from its [public preprint](https://arxiv.org/abs/2404.00802).

The animations use a normalized material law and prescribed gait. They are explanatory schematics, not experimental measurements or a validated dynamic running simulation. Each includes model details and pause/tuning controls. Reduced-motion preferences are respected.

The portrait is the photograph labelled Liuyang Cheng on the [Kinetic Materials Research Group people page](https://tawfick.mechse.illinois.edu/people/), retrieved September 12, 2026.

## Publication updates

The home page contains six verified papers/preprints as of September 13, 2026. `publication-sources.json` records their primary-source evidence. Direct access to Google Scholar profile `MMkH8L0AAAAJ` and its portrait was blocked (403/429), so the initial import is **not verified as a complete Scholar list** and the existing lab portrait remains.

A weekly ChatGPT automation checks this Scholar profile and updates the site through the connected GitHub account. If Scholar is blocked, it leaves the existing records intact and reports the block. It must not remove entries based on an incomplete result or attribute another author's work by name alone. This is a scheduled ChatGPT task; it is not a browser timer or GitHub Actions scraper.

The authoritative data is root `content.json`. Keep `source/public/content.json` identical when updating publications; the source build imports the same JSON seed and the live page fetches the current root JSON. `source/scripts/sync-publications.mjs` can safely merge independently verified records; see `source/scripts/PUBLICATION-SYNC.md` for its input contract. No site rebuild is needed for publication-only JSON updates. Research content, existing IDs, uploaded media, and manual links should be preserved.

## Source code

The first package includes a `source/` folder with the React/TypeScript source, styles, and build configuration. The compiled files at the repository root can be published immediately; source compilation is optional.

To rebuild, install Node.js 22.13 or later, open `source/`, run `npm install`, then `npm run build`. Copy `source/dist/` contents to the repository root. Before rebuilding a previously edited website, copy your current root `content.json` and `media/` (if present) into `source/public/` so they are preserved.

For a local preview of the compiled website, run `python -m http.server 8000` in the repository root, then open `http://localhost:8000`. The editor fetches local files, so opening the HTML directly through `file://` is not supported.

## References

The layout was independently implemented with inspiration from:
- https://github.com/leonidk/leonidk.github.io
- https://jonbarron.info/
- https://haochengyin.github.io/

GitHub setup documentation:
- https://docs.github.com/en/pages/getting-started-with-github-pages/creating-a-github-pages-site
- https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site
