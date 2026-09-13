# Verified publication merge

This dependency-free Node.js 20+ utility merges an already verified bibliography into the website. It performs no network requests, Scholar scraping, authentication, scheduling, Git operations, or deployment. A connected automation must collect and verify publication records before running it.

From the published repository root:

```sh
node source/scripts/sync-publications.mjs --input /tmp/verified-records.json --root .
```

From the standalone source project:

```sh
node scripts/sync-publications.mjs --input /tmp/verified-records.json --root .
```

`--root` defaults to the current working directory. Every existing target among `content.json`, `source/public/content.json`, and `public/content.json` is updated. Thus a deployment checkout updates the published and source copies together; the standalone project updates its `public/content.json`. The script requires an existing section with `id: "publications"` in every target.

## Input contract

```json
{
  "profileId": "MMkH8L0AAAAJ",
  "completeScholarList": false,
  "publications": [
    {
      "id": "tcpa-mechanics-2024",
      "title": "The mechanics and physics of twisted and coiled polymer actuators",
      "authors": ["Qiong Wang", "Anan Ghrayeb", "Seong Hyeon Kim", "Liuyang Cheng", "Sameh Tawfick"],
      "year": 2024,
      "venue": "International Journal of Mechanical Sciences",
      "status": "Journal article",
      "doi": "10.1016/j.ijmecsci.2024.109440",
      "arxiv": "2404.00802",
      "links": [
        {"label": "Paper", "url": "https://doi.org/10.1016/j.ijmecsci.2024.109440"},
        {"label": "Preprint", "url": "https://arxiv.org/abs/2404.00802"}
      ]
    }
  ]
}
```

The profile ID must match exactly. The completeness flag must reflect whether the complete Scholar list was actually obtained; it never authorizes deletion. The publications array must contain 1–500 records. All shown fields except `doi` and `arxiv` are required. IDs contain letters, digits, `.`, `_`, or `-`, begin with a letter or digit, and have at most 100 characters. IDs must remain unique across all site sections and items. Authors must be a nonempty array of names. Years are integers from 1000 through 2100. New links must be HTTPS URLs without embedded credentials. A DOI or arXiv ID must be valid when supplied.

Website limits are enforced before any write: publication titles have at most 400 characters, joined author names 2,000, generated venue/year metadata 300, and link labels 80. URLs have at most 2,000 characters. Each item may have at most 10 links after merging, and a section at most 500 items. Existing manual links may retain the website's allowed `media/` or `mailto:` forms. The complete resulting document is checked against the current website's field, enum, figure, array, and global-ID constraints. A limit failure rejects the entire operation; the utility does not silently truncate content or discard links.

The caller is responsible for identity and source verification. Passing schema validation does not establish that a paper belongs to this author. Inaccessible Scholar pages must be recorded as incomplete by the caller, not substituted with an invented complete list.

## Merge behavior

Records match by DOI, arXiv ID (ignoring version), or normalized title. Existing website IDs remain unchanged. The utility updates only publication titles, author strings, venue/year metadata, and bibliography links. Manual descriptions, media, figures, layout, and other custom item properties remain intact. Every other section and top-level field remains intact.

The primary paper link is placed first: DOI when supplied, otherwise arXiv, otherwise the first verified link. Existing links remain available; exact URL duplicates are collapsed, retaining an existing label when the canonical primary URL already exists. New verified links are appended. New papers receive the website’s plain publication-item defaults. Papers are sorted by year descending, retaining previous order within each year and appending newly discovered papers after existing same-year papers. A paper omitted from the input is retained, whether the input is complete or incomplete.

Repeated equivalent input records are collapsed. Conflicting duplicates, ambiguous matches against multiple existing records, and ID collisions are rejected for manual resolution. Repeated runs with unchanged data do not rewrite files.

All input and every target are validated before any target is changed. Existing target documents must agree semantically (object key order and JSON formatting may differ). If published and source copies differ, the utility fails without changes so the owner can reconcile them first. Updates are staged in sibling temporary files, then renamed atomically per file. The utility checks for intervening edits before replacement and attempts rollback if a later replacement fails. Separate files cannot form one crash-atomic filesystem transaction; run this on an isolated checkout, review the resulting diff, and publish the source and compiled copies in one Git commit.
