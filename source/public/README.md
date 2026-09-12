# Liuyang Cheng — personal website

This is a complete static website for **LiuyangMechSE/liuyangmechse.github.io**. The intended address is **https://liuyangmechse.github.io/**. It is ready for GitHub Pages and needs no server, database, build action, or API key.

## Publish the first version

1. Sign in to GitHub as **LiuyangMechSE**. Create a **public** repository named **liuyangmechse.github.io**, with **Add README** enabled.
2. Upload the contents of this package to the repository root. `index.html`, `editor.html`, `content.json`, `assets/`, and `.nojekyll` should be at the root, not inside an extra folder. Keep all filenames and directories intact. Uploading through GitHub's **Add file → Upload files** works after extracting the ZIP.
3. Open **Settings → Pages**. Select **Deploy from a branch**, then **main** and **/(root)**. Save.
4. GitHub will show the published address when deployment finishes. It can take several minutes.

## Edit without coding

Open **Edit a copy** on the website (or open `editor.html`). The visual editor supports:

- Dragging sections and entries, including between sections; arrows provide an alternative.
- Editing your introduction, portrait, text, authors, publication details, and links.
- Changing media placement: left, right, or full width.
- Replacing sketches with JPG, PNG, WebP, GIF, MP4, or WebM files up to 25 MB each.
- Adding or removing entries and sections, with Undo.

Choose **Apply changes** in a dialog, then **Download website**. Extract the downloaded ZIP and upload its files to the repository root, committing the update. GitHub Pages republishes from that commit. The downloaded ZIP contains your changed content and media.

**The editor changes a draft in the current tab. It does not save to GitHub automatically.** Download before closing the tab. Anyone can edit their own copy, but only people with write access to your GitHub repository can publish changes. No GitHub token is requested or stored.

Use media URLs only for assets you are comfortable making public. Direct MP4 and WebM URLs work as videos; YouTube watch-page URLs are not direct media URLs.

## Research content

The included helix, J-curve, and 32-light sketches are explicitly illustrative. They are not experimental measurements or validated actuator predictions. The scientific assumptions are shown under each sketch's **About this sketch** control.

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
