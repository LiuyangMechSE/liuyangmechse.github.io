# English CV source

Formatting update dated October 22, 2026.

- content.json is the complete preserved October 21 English CV source.
- build.py reads content.json, applies section ordering and the consistent title / institution-and-date layout, and generates the editable DOCX plus records.json.
- records.json is the generated reading-order content, useful for downstream verification.
- validate.py checks per-section wording preservation, approved metadata repetition, section order, counts, DOCX/PDF text equality, 17 right-aligned date fields, and page bounds.

Run with Python containing python-docx. Render the DOCX using LibreOffice. The verified export is Liuyang-Cheng-CV-en-20261022.pdf. The source specifies Times New Roman; the verified PDF embeds metrically compatible Liberation Serif.

The source changes only layout and section order. PNAS acceptance status and October 5, 2026 date, all SES presentation wording, and all other substantive content remain unchanged. Each degree repeats its associated school and location for a self-contained, consistently formatted entry.
