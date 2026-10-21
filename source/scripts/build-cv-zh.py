"""Build the Chinese CV from cv-zh.html with embedded fonts, without a browser.

Requirements: PyMuPDF, fontTools; Noto Sans CJK Regular/Bold collections.
Run from any directory: python source/scripts/build-cv-zh.py
The original English PDFs are never modified.
"""
from pathlib import Path
from html.parser import HTMLParser
from html import escape
import re
import shutil
import tempfile
import fitz
from fontTools.ttLib import TTFont
from fontTools import subset

ROOT = Path(__file__).resolve().parents[2]
SOURCE = Path(__file__).with_name('cv-zh.html')

class Node:
    def __init__(self, tag='', attrs=None, parent=None):
        self.tag, self.attrs, self.parent, self.children = tag, dict(attrs or []), parent, []
    def cls(self, value):
        return value in self.attrs.get('class', '').split()

class Parser(HTMLParser):
    def __init__(self):
        super().__init__(); self.root = Node(); self.stack = [self.root]
    def handle_starttag(self, tag, attrs):
        node = Node(tag, attrs, self.stack[-1]); self.stack[-1].children.append(node)
        if tag not in ('br', 'meta', 'link', 'img', 'hr'): self.stack.append(node)
    def handle_endtag(self, tag):
        for i in range(len(self.stack)-1, 0, -1):
            if self.stack[i].tag == tag:
                self.stack = self.stack[:i]; break
    def handle_data(self, data): self.stack[-1].children.append(data)

def descendants(node):
    yield node
    for child in node.children:
        if isinstance(child, Node): yield from descendants(child)

def render(node):
    if isinstance(node, str): return escape(node)
    if node.tag == 'footer' or node.cls('running-header'): return ''
    if node.cls('row'):
        parts = [c for c in node.children if isinstance(c, Node)]
        if node.parent and node.parent.cls('teaching'):
            course = next(x for x in descendants(node) if x.cls('course'))
            school = next(x for x in descendants(node) if x.cls('school'))
            date = next(x for x in descendants(node) if x.cls('date'))
            return '<p class="teaching-entry">' + render(course) + ' · 助教 | ' + render(date) + '<br>' + render(school) + '</p>'
        return '<div class="row">' + ' <span class="separator"> | </span> '.join(render(c) for c in parts) + '</div>'
    if node.tag == 'header':
        return '<div class="cv-header">' + ''.join(render(c) for c in node.children) + '</div>'
    attrs = ''.join(f' {k}="{escape(v, quote=True)}"' for k,v in node.attrs.items())
    return f'<{node.tag}{attrs}>' + ''.join(render(c) for c in node.children) + ('' if node.tag in ('br','meta','img','link') else f'</{node.tag}>')

CSS = """
@font-face { font-family: CVChinese; src: url(CVChinese-Regular.otf); }
@font-face { font-family: CVChinese; src: url(CVChinese-Bold.otf); font-weight: bold; }
body { font-family: CVChinese; font-size: 9.8pt; line-height: 1.45; color:#171717; margin:0; }
.cv-header { text-align:center; margin-bottom:12pt; }
h1 { font-size:21pt; line-height:1.2; color:#000; margin:0 0 5pt; }
.document-title { font-size:11pt; margin-bottom:4pt; }
.cv-header a { font-size:9.5pt; }
h2 { font-size:12.2pt; color:#000; margin:11pt 0 4pt; }
h3 { font-size:10.2pt; color:#000; margin:6pt 0 2pt; }
p { margin:0 0 3pt; }
a { color:inherit; text-decoration:none; }
ul { margin:3pt 0 5pt; padding-left:14pt; }
li { margin:0 0 2pt; padding-left:1pt; }
.row { margin:0 0 1pt; }
.separator { color:#777; }
.date { font-size:9pt; font-weight:normal; }
.institution, .advisors { font-size:9.2pt; }
.education { margin:4pt 0 7pt; }
.education ul { margin:2pt 0 0; }
.education li { margin-bottom:0; }
.bibliography { font-size:8.7pt; line-height:1.35; }
.bibliography li { margin-bottom:4pt; }
.bibliography h3 { font-size:10pt; margin:4pt 0 2pt; }
.project { margin-bottom:8pt; }
.project h3 { margin-bottom:0; }
.en-title { font-size:8.4pt; line-height:1.25; color:#4a4a4a; margin-bottom:3pt; }
.advisors { margin-bottom:2pt; }
.project ul { margin-top:3pt; margin-bottom:0; }
.page-three { font-size:9.5pt; line-height:1.4; }
.page-three h2 { margin-top:8pt; }
.page-three .project { margin-bottom:6pt; }
.skills li { margin-bottom:2pt; }
.teaching .row { margin:3pt 0; font-size:9.1pt; }
.teaching-entry { margin:3pt 0; font-size:9.1pt; }
.school { color:#484848; font-size:8.5pt; }
.award { font-size:9.2pt; }
"""

def main():
    parser = Parser(); parser.feed(SOURCE.read_text())
    sections = [x for x in descendants(parser.root) if x.tag == 'section' and x.cls('page')]
    out = ROOT / 'files/Liuyang-Cheng-CV-zh.pdf'
    out.parent.mkdir(exist_ok=True, parents=True)
    with tempfile.TemporaryDirectory(prefix='cv-zh-fonts-') as temp:
        for weight in ('Regular', 'Bold'):
            font = TTFont(f'/usr/share/fonts/opentype/noto/NotoSansCJK-{weight}.ttc', fontNumber=2)
            options = subset.Options()
            options.desubroutinize = True
            options.layout_features = []
            subsetter = subset.Subsetter(options=options)
            subsetter.populate(text=SOURCE.read_text() + ''.join(chr(i) for i in range(32,127)) + '•・')
            subsetter.subset(font)
            font.save(Path(temp) / f'CVChinese-{weight}.otf')
        archive = fitz.Archive(temp)
        doc = fitz.open()
        for index, section in enumerate(sections):
            page = doc.new_page(width=612, height=792)
            contents = ''.join(render(x) for x in section.children)
            if section.cls('page-three'): contents = f'<div class="page-three">{contents}</div>'
            top = 35 if index == 0 else 54
            free, scale = page.insert_htmlbox(fitz.Rect(43, top, 569, 748), contents, css=CSS, archive=archive, scale_low=1)
            if free < 0: raise RuntimeError(f'Page {index+1} overflows; scale required: {scale}')
            print(f'Page {index+1}: free height {free:.2f} pt; scale {scale:.3f}')
            if index:
                page.insert_text((43, 35), 'Liuyang Cheng', fontname='helv', fontsize=8.5, color=(.35,.35,.35))
            page.insert_text((43, 771), 'Liuyang Cheng', fontname='helv', fontsize=8, color=(.4,.4,.4))
            page.insert_text((548, 771), f'{index+1} / {len(sections)}', fontname='helv', fontsize=8, color=(.4,.4,.4))
        doc.set_metadata({'title': 'Liuyang Cheng 学术简历', 'author': 'Liuyang Cheng', 'subject': 'Chinese translation of the original academic CV'})
        doc.save(out, garbage=4, deflate=True)
    public = ROOT / 'source/public/files/Liuyang-Cheng-CV-zh.pdf'
    public.parent.mkdir(exist_ok=True, parents=True)
    shutil.copyfile(out, public)
    print(out)

if __name__ == '__main__': main()
