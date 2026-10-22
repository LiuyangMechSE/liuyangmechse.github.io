from pathlib import Path
from collections import Counter
from zipfile import ZipFile
from lxml import etree
import re,json,hashlib,fitz
R=Path(__file__).resolve().parent
old=json.loads((R/'content.json').read_text()); new=json.loads((R/'records.json').read_text())
def sections(records):
 out={}; name='front'
 for r in records:
  if r['type']=='heading': name=r['text']
  out.setdefault(name,[]).append(r)
 return out
O,N=sections(old),sections(new)
def words(rs): return Counter(re.findall(r'\S+', ' '.join(r['text'] for r in rs).replace('|',' ')))
for name in O:
 expected=words(O[name]); actual=words(N[name])
 if name=='Education': expected.update('University of Illinois Urbana-Champaign Illinois, USA'.split())
 assert expected==actual,(name,expected-actual,actual-expected)
order=list(N)[1:]
assert order==['Research Profile','Research Interests','Education','Publications','Conference Presentations','Awards & Honors','Academic Service','Research Projects','Teaching Experience','Technical Skills']
counts={'projects':sum(r['type']=='entry' for r in N['Research Projects']),'papers':sum(r['type']=='bullet' for r in N['Publications']),'talks':sum(r['type']=='bullet' for r in N['Conference Presentations']),'teaching':sum(r['type']=='entry' for r in N['Teaching Experience'])}
assert counts==dict(projects=8,papers=6,talks=3,teaching=4)
norm=lambda s: re.sub(r'\s+',' ',s).strip()
expected=norm(' '.join(r['text'] for r in new))
with ZipFile(R/'Liuyang-Cheng-CV-en-20261022.docx') as z:
 tree=etree.fromstring(z.read('word/document.xml')); ns={'w':'http://schemas.openxmlformats.org/wordprocessingml/2006/main'}; pars=[]
 for p in tree.findall('.//w:body/w:p',ns):
  st=''
  for e in p.iter():
   if e.tag=='{'+ns['w']+'}t': st+=e.text or ''
   elif e.tag=='{'+ns['w']+'}tab': st+=' '
  pars.append(st.replace('○','').strip())
 assert norm(' '.join(pars))==expected
 for i,r in enumerate(new):
  if r['type'] in ('metadata','service'):
   p=tree.findall('.//w:body/w:p',ns)[i]
   tabs=p.findall('w:pPr/w:tabs/w:tab',ns)
   assert any(t.get('{'+ns['w']+'}val')=='right' and t.get('{'+ns['w']+'}pos')=='9360' for t in tabs)
pdf=fitz.open(R/'Liuyang-Cheng-CV-en-20261022.pdf'); actual=norm(' '.join(p.get_text() for p in pdf).replace('○',''))
assert expected==actual
assert len(pdf)==4
assert 'under review' not in actual
assert actual.count('accepted by PNAS')==2
assert 'Oct. 5, 2026' in actual and 'Oct. 12, 2026' in actual
checks=[]
for r in new:
 if r['type'] not in ('metadata','service'): continue
 date=r['text'].split('\t')[-1]; boxes=[box for p in pdf for box in p.search_for(date)]
 assert boxes, date
 if r['type']=='service': boxes=[b for b in boxes if abs(b.x1-540)<.5]
 assert boxes, date
 assert all(abs(b.x1-540)<.5 for b in boxes),(date,boxes)
 checks.append({'date':date,'right_edge':round(boxes[0].x1,3)})
for i,p in enumerate(pdf):
 for b in p.get_text('dict')['blocks']:
  for l in b.get('lines',[]):
   for s in l['spans']:
    if not s['text'].strip(): continue
    x0,y0,x1,y1=s['bbox']; assert x0>=60 and x1<=550 and y0>=20 and y1<=750,(i,s)
report={'pages':len(pdf),'counts':counts,'section_order':order,'wording_preserved':'Every section word-for-word retained; UIUC institution and Illinois location duplicated once to make each degree self-contained. Existing service pipe replaced by date tab; three school/location layout pipes added. No factual content changes.','docx_pdf_match':True,'all_17_dates_right_aligned':len(checks)==17,'date_right_edges':checks,'visual_QA':'All four final page PNGs inspected at full-page resolution; no overlaps, clipping, missing glyphs, split entries, or orphan headings.','font_note':'Times New Roman specified in DOCX; PDF embeds compatible Liberation Serif.'}
for ext in ('pdf','docx'):
 p=R/f'Liuyang-Cheng-CV-en-20261022.{ext}';report[ext+'_sha256']=hashlib.sha256(p.read_bytes()).hexdigest()
(R/'validation-report.json').write_text(json.dumps(report,ensure_ascii=False,indent=2))
print(json.dumps(report,ensure_ascii=False,indent=2))
