# English CV revision source

The original English CV was provided only as a PDF. `original-text.txt` is its layout-preserving text extraction; `build.py` reconstructs a Times-style editable document, changing only the two PNAS “under review” references to “accepted” and adding the verified SES 2026 oral presentation. `records.json` records the resulting content.

Run `python build.py` with python-docx installed to regenerate a local DOCX, then export to PDF with a compatible Office renderer. The published PDF is `files/Liuyang-Cheng-CV-en-20261021.pdf`; it was rendered and visually checked across all four pages using an embedded Times-compatible Liberation Serif font. Do not publish the generated DOCX automatically.

Any further content changes must be reviewed before updating the public PDF. Earlier PDFs remain unchanged in `files/`.
