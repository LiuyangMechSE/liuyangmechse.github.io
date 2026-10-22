# Chinese CV source

`cv-zh.html` retains all substantive content from the published October 21 Chinese CV and sets the October 22 section order. It is the editable structured content input, not a pixel-exact preview. `build.py` produces a fully editable DOCX with consistent title and institution/date rows. Run with Python and python-docx/lxml:

    python build.py --output-dir /path/to/output

Render and export the DOCX with LibreOffice, then inspect every page before copying the exported PDF into the website. The PDF supplied with this revision is already verified. Do not use the older PyMuPDF HTML build script, which flattened alignment rows.

The formatting update moves Awards & Honors immediately before Academic Service and Technical Skills to the end. Every other section's relative order and all substantive content are preserved. Each education degree repeats its institution/location so its metadata row follows the same convention as research, teaching, and awards. The current layout is three Letter pages with embedded Chinese fonts in the PDF. DOCX has no image-only content.

Only the verified PDF is a website publication artifact. Keep Word and private review files off the public website.
