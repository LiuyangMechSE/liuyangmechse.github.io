# English CV source

Publication update dated November 11, 2026, preserving the October 22 layout.

- content.json is the authoritative structured CV content.
- build.py reads content.json and generates the editable DOCX plus records.json.
- records.json is the generated reading-order content.
- validate.py checks content, section order, counts, DOCX/PDF equality, all 17 date-field alignments, and page bounds.

Run build.py with Python containing python-docx. Render the DOCX with LibreOffice and inspect every page. The verified export is Liuyang-Cheng-CV-en-20261111-r2.pdf (four pages). DOCX specifies Times New Roman; the PDF embeds compatible Liberation Serif.

The J-curve paper is now the first published journal article, with PNAS 123(46), e2604227123 (2026), DOI 10.1073/pnas.2604227123, and publisher-verified author order. The overview now counts five published journal articles, and the project description says published. The empty Accepted category was removed. All unrelated content and section ordering are preserved.

Publisher: https://www.pnas.org/doi/10.1073/pnas.2604227123
Only PDFs are website publication artifacts. Keep generated Word documents off the public website.

Further revision on November 11, 2026: expected graduation changed to February 2027 at the author’s request; CM3 manuscript bibliographic details are added from the current manuscript source, without implying journal submission or publication.
