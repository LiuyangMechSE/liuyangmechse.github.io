# Liuyang Cheng — personal website

This is a complete static website for **LiuyangMechSE/liuyangmechse.github.io**. The intended address is **https://liuyangmechse.github.io/**. It is ready for GitHub Pages and needs no application server. Public viewing needs no account; direct publishing from the editor requires GitHub repository authorization.

## Publishing updates

The website is published at **https://liuyangmechse.github.io/** from the repository's `main` branch and root folder. Committing updated deployment files to that location triggers GitHub Pages. Keep `index.html`, `research.html`, `editor.html`, `content.json`, `assets/`, `media/`, and `.nojekyll` at the root.

## English and Chinese

Use **EN / 中文** in the navigation to change language. The choice is saved on this browser; `?lang=en` or `?lang=zh` in a shared link overrides it. Home, Research, paper captions and interactive demo controls follow the selected language. Publication titles, author names and journal names retain their original bibliographic spelling. If a new entry has no Chinese text yet, it safely falls back to English.

The English CV is preserved at its existing URL. Chinese mode opens `files/Liuyang-Cheng-CV-zh.pdf`. Both versions are included in backups. The Chinese PDF uses embedded CJK fonts; its editable source and reproducible renderer are `source/scripts/cv-zh.html` and `source/scripts/build-cv-zh.py`.

In the owner editor, both text versions appear side by side. A content edit in either language becomes the **latest source** and appears on both pages after publishing. Its previous translation remains stored in the editor, not shown as outdated content. This is **translation review, not automatic translation**: no translation service, API key or extra account is used.

### Review an update

1. Open the relevant **Edit introduction**, **Edit section**, or **Edit entry** dialog. A **to review / 待核对** badge identifies pending fields. Each pair shows its **latest source / 最新源文**.
2. Edit the other-language box to match the latest source. This translation remains a draft until confirmed. If you intend it to become the new source content instead, explicitly choose **Use this version as the latest source**.
3. Click **Confirm this translation pair / 确认这组译文**, then **Save changes / 保存更改**. The two pages now display their respective reviewed text. For identical names or wording, use **Use latest text in both languages** instead. Opening, saving unchanged, or switching language never confirms a translation.
4. **Save to GitHub / 保存至 GitHub** publishes both versions and review state together. Until then, only your local draft changes. Cancel, Undo, draft restoration and backups preserve review state. Visitors see a brief notice when pending updates appear in their source language.

Ordinary link URLs, authors, media, layout, entry/section order, page assignment, and additions/deletions are shared. Publication titles keep their bibliographic spelling; venue/status/year metadata is shared too. Dates embedded in other prose follow the source-and-review workflow, rather than being guessed or separately rewritten. Link labels and figure descriptions/captions use paired review. English and Chinese **CV files remain distinct**, so replacing one never replaces the other.

Both languages live in one `content.json`: original fields and `zh`/`zhLabel` values are retained, while `pendingTranslation` names the authoritative language for pending fields. CV links carry `kind: "cv"`; items carry stable `kind: "publication"` or `"research"` so moving an entry does not change its text semantics. Legacy drafts are supported. Concurrent profile source edits and translation confirmations are merged atomically or rejected as conflicts, never silently mixed.

Run `npm test`, `npm run typecheck` and `npm run build` in `source/` before publishing code changes. The tests cover language switching, persistence, navigation, bilingual drafts, unchanged English content, private editor access and mocked atomic GitHub publishing.

## Edit without coding

The public pages do not show an editing link. Bookmark **https://liuyangmechse.github.io/editor.html** to open the editor. Enter a GitHub token from the **LiuyangMechSE** account to unlock the controls; authorization stays in memory for the current tab and is also used for publishing. Refreshing or closing the tab locks the controls again. Saved drafts remain on this device.

The visual editor supports:

- Switching between Home and Research, with drafts and uploaded images restored after refreshing or reopening the editor in the same browser.
- Dragging projects, sections, and entries, including between sections on the same page; arrows provide an alternative.
- Moving a section between Home and Research in its edit dialog.
- Editing the paper figure, caption, and source beside a demo.
- Editing your introduction, portrait, text, authors, publication details, and links.
- Replacing your CV with a PDF up to 25 MB, with a preview, saved draft, and permanent GitHub publishing.
- Changing media placement: left, right, or full width.
- Replacing animations with JPG, PNG, WebP, GIF, MP4, or WebM files up to 25 MB each.
- Adding or removing entries and sections, with Undo.

To update your CV, open **Home → Edit introduction, CV & links → Choose CV PDF** (or drop the PDF into the CV box). Use **Open selected CV (PDF)** to review it, choose **Save changes**, then **Save to GitHub**. The existing CV link is updated in place. Uploaded PDFs are saved with your local draft and included in **Download backup**; publishing saves each PDF in both `files/` and `source/public/files/`. Previous PDFs remain in the repository so older links keep working.

Entry titles open the first HTTPS link in that entry. In **Edit entry → Links**, put the publisher page or preprint first to choose the title’s destination. Additional links remain available beneath the entry.

Choose **Save changes** in a dialog to keep the edit in your draft. Text, layout, and uploaded portraits/media/CVs are automatically saved on this device using IndexedDB. The editor waits for the storage transaction before reporting that the draft is saved, and shows an error if browser storage is unavailable or full. Browser data clearing or private browsing can remove these local drafts; **Download backup** keeps an independent ZIP copy.

Choose **Save to GitHub** to make your edits permanent on the public website. In the publishing dialog, create a GitHub fine-grained personal access token for **only `liuyangmechse.github.io`**, with repository **Contents: Read and write**. Paste it into the editor's password field. The token is used only for authenticated requests to GitHub, remains in memory for the current tab, and is never written to browser storage, content files, downloads, URLs, or repository commits. Refreshing/closing the page clears authorization. Never place a token in `content.json` or send it in chat.

Publishing verifies repository write access, checks the latest content for conflicting changes, uploads new media, updates root and source `content.json` copies plus the export manifest, and saves them in one commit on `main`. GitHub Pages then deploys that commit. The editor reports the actual GitHub result and links to the saved commit and deployment page. Publishing failure preserves your local draft. Downloading a backup does not mark changes as published.

The editor UI checks the GitHub account identity and repository access before loading drafts or showing editing controls. This is a client-side convenience gate: GitHub Pages still serves the static editor files publicly, and the URL is not a confidential resource. GitHub enforces write authorization for all published changes. Public Home and Research pages always load published content and never display another browser's local draft.

As an alternative, extract **Download backup** and commit its files to the repository root. Keep root `content.json` and `source/public/content.json` synchronized if publishing an exported ZIP manually. **Discard draft** resets only your device's draft to the published version last loaded by the editor.

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

To rebuild, install Node.js 22.13 or later, open `source/`, run `npm install`, then `npm run build`. Copy `source/dist/` contents to the repository root. Before rebuilding a previously edited website, copy your current root `content.json`, `media/`, and `files/` (if present) into `source/public/` so they are preserved.

For a local preview of the compiled website, run `python -m http.server 8000` in the repository root, then open `http://localhost:8000`. The editor fetches local files, so opening the HTML directly through `file://` is not supported.

## References

The layout was independently implemented with inspiration from:
- https://github.com/leonidk/leonidk.github.io
- https://jonbarron.info/
- https://haochengyin.github.io/

GitHub setup documentation:
- https://docs.github.com/en/pages/getting-started-with-github-pages/creating-a-github-pages-site
- https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site
