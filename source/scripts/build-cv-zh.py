"""Deprecated entry point: use the editable DOCX-based CV builder.

The old HTML-to-PDF path flattened metadata/date alignment. The verified PDFs
are copied into the website only after DOCX rendering and full-page inspection.
"""
raise SystemExit("Use python source/scripts/cv-zh/build.py --output-dir <private-output>, then render with LibreOffice and visually inspect the PDF. See source/scripts/cv-zh/README.md. This retired builder never overwrites published PDFs.")
