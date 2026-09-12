# Liuyang Cheng — personal website

This is a complete static website for **LiuyangMechSE/liuyangmechse.github.io**. The intended address is **https://liuyangmechse.github.io/**. It is ready for GitHub Pages and needs no server, database, build action, or API key.

## Publishing updates

The website is published at **https://liuyangmechse.github.io/** from the repository's `main` branch and root folder. Committing updated deployment files to that location triggers GitHub Pages. Keep `index.html`, `editor.html`, `content.json`, `assets/`, `media/`, and `.nojekyll` at the root.

## Edit without coding

Open **Edit a copy** on the website (or open `editor.html`). The visual editor supports:

- Dragging sections and entries, including between sections; arrows provide an alternative.
- Editing your introduction, portrait, text, authors, publication details, and links.
- Changing media placement: left, right, or full width.
- Replacing animations with JPG, PNG, WebP, GIF, MP4, or WebM files up to 25 MB each.
- Adding or removing entries and sections, with Undo.

Entry titles open the first HTTPS link in that entry. In **Edit entry → Links**, put the publisher page or preprint first to choose the title’s destination. Additional links remain available beneath the entry.

Choose **Apply changes** in a dialog, then **Download website**. Extract the downloaded ZIP and upload its files to the repository root, committing the update. GitHub Pages republishes from that commit. The downloaded ZIP contains your changed content and media.

**The editor changes a draft in the current tab. It does not save to GitHub automatically.** Download before closing the tab. Anyone can edit their own copy, but only people with write access to your GitHub repository can publish changes. No GitHub token is requested or stored.

Use media URLs only for assets you are comfortable making public. Direct MP4 and WebM URLs work as videos; YouTube watch-page URLs are not direct media URLs.

## Research content

The three active animations explain antagonistic translation, a rotary joint, and a running leg with a parallel passive spring and actuator, based on Figure 6 of [Principles of Use of Tensile J-Curve Materials in Antagonistic Arrangements](https://arxiv.org/abs/2602.00260). The material law is a normalized illustration and the gait is prescribed; these are not experimental measurements or a validated dynamic running simulation. Each animation includes model details and pause/tuning controls. Reduced-motion preferences are respected.

The portrait is the photograph labelled Liuyang Cheng on the [Kinetic Materials Research Group people page](https://tawfick.mechse.illinois.edu/people/), retrieved September 12, 2026.

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
