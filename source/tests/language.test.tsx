import {afterEach,beforeEach,describe,it,expect,vi} from 'vitest';
import {cleanup,render,screen,fireEvent,waitFor,within} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {LanguageProvider} from '../src/language';
import {siteFile} from '../src/site-paths';
import Portfolio from '../src/portfolio';
import OwnerEditor from '../src/owner-editor';
import {initialContent,siteSchema,type SiteContent} from '../src/lib/content';
import {localizedContent} from '../src/localized-content';
import {mediaPaths,mediaSource,clearDraft,loadDraft,saveDraft} from '../src/static-files';
import {mergeWebsiteContent} from '../src/github-publish';
import {mergePublications,validateSiteContent,validateInput} from '../scripts/sync-publications.mjs';
const copy=()=>structuredClone(initialContent);
const section=(content:SiteContent,id:string)=>content.sections.find(s=>s.id===id)!;
const cv=(content:SiteContent)=>content.links.find(link=>link.kind==='cv')!;
const mount=(editor=false)=>render(<LanguageProvider><Portfolio canEdit={editor}/></LanguageProvider>);
const waitLoaded=()=>waitFor(()=>expect(document.querySelector('main')?.getAttribute('aria-busy')).toBe('false'));
beforeEach(async()=>{cleanup();localStorage.clear();window.history.replaceState({},'','/');await clearDraft();vi.stubGlobal('fetch',vi.fn(async()=>new Response(JSON.stringify(copy()),{status:200,headers:{'Content-Type':'application/json'}})));});
afterEach(()=>{cleanup();vi.restoreAllMocks();});
describe('bilingual site',()=>{
 it('keeps the author-confirmed PNAS acceptance distinct from the preprint link in both languages and future publication merges',()=>{const base=copy();const item=section(base,'publications').items.find(i=>i.id==='p-jcurve')!;expect(item.meta).toBe('Proceedings of the National Academy of Sciences · Accepted 2026-10-05');expect(section(localizedContent(base,'zh'),'publications').items.find(i=>i.id==='p-jcurve')!.meta).toContain('已接收 2026-10-05');const record={id:'jcurve-2026',title:item.title,authors:item.authors.split(', '),year:2026,venue:'Proceedings of the National Academy of Sciences',status:'Accepted',acceptedDate:'2026-10-05',arxiv:'2602.00260',links:item.links};const merged=mergePublications(base,[record]);expect(section(merged,'publications').items.find(i=>i.id==='p-jcurve')!.meta).toBe(item.meta);expect(item.links[0].url).toBe('https://arxiv.org/abs/2602.00260');expect(section(mergePublications(base,[{...record,venue:'arXiv',status:'Preprint',acceptedDate:undefined}]),'publications').items.find(i=>i.id==='p-jcurve')!.meta).toBe(item.meta);expect(section(mergePublications(base,[{...record,venue:'arXiv',status:'Preprint',acceptedDate:undefined,doi:'10.48550/arXiv.2602.00260'}]),'publications').items.find(i=>i.id==='p-jcurve')!.meta).toBe(item.meta);expect(section(mergePublications(base,[{...record,status:'accepted ',acceptedDate:undefined}]),'publications').items.find(i=>i.id==='p-jcurve')!.meta).toBe(item.meta);expect(()=>validateInput({profileId:'MMkH8L0AAAAJ',completeScholarList:false,publications:[{...record,acceptedDate:'2026-02-30'}]})).toThrow('Invalid acceptance date');});
 it('keeps compact verified News before Publications without duplicating a conference section',async()=>{
  const base=copy(),talkTitle='Soft Spiral Octopus Tentacles Driven by Concentric Coiled Artificial Muscles';
  expect(base.sections.find(s=>s.id==='conference-presentations')).toBeUndefined();
  expect(base.sections.findIndex(s=>s.id==='news')).toBeLessThan(base.sections.findIndex(s=>s.id==='publications'));
  for(const language of ['en','zh'] as const){
   const view=localizedContent(base,language),news=section(view,'news');
   if(language==='en')expect(news.title).toBe('News');else expect(news.title).toMatch(/[\u4e00-\u9fff]/);
   const talk=news.items.find(i=>i.id==='news-ses-2026')!,accepted=news.items.find(i=>i.id==='news-pnas-accepted')!;
   expect(talk.meta).toBe('2026-10-12');expect(talk.text).toContain(talkTitle);expect(talk.authors).toBe('');
   expect(talk.links.some(link=>link.url.includes('5683bc8cbbae4d2c9a051bfaaae1e0f1.pdf'))).toBe(true);
   expect(accepted.meta).toBe('2026-10-05');expect(accepted.title+' '+accepted.text).toMatch(/PNAS|Proceedings of the National Academy of Sciences/);
   expect(section(view,'octopus-arm').items[0].text).toContain(talkTitle);
  }
  mount();await waitLoaded();
  const ids=Array.from(document.querySelectorAll('main > section')).map(element=>element.id);
  expect(ids.indexOf('news')).toBeLessThan(ids.indexOf('publications'));
 });
 it('preserves English data and separate PDFs while displaying Chinese',()=>{
  const base=copy(),snapshot=JSON.stringify(base),en=localizedContent(base,'en'),zh=localizedContent(base,'zh');
  expect(en).toEqual(base);expect(cv(en).url).toBe(cv(base).url);expect(cv(zh).url).toBe(cv(base).zhUrl);
  expect(cv(en).url).not.toBe(cv(zh).url);expect(cv(en).url).toMatch(/^files\/.+\.pdf$/);
  expect(zh.bio).toContain('博士候选人');expect(section(zh,'artificial-ligaments').title).toBe('人工韧带');
  expect(section(zh,'publications').items[0].title).toBe(section(base,'publications').items[0].title);
  expect(JSON.stringify(base)).toBe(snapshot);expect(siteSchema.parse(base)).toEqual(base);
  expect(mediaPaths(base)).toContain(cv(en).url);expect(mediaPaths(base)).toContain(cv(zh).url);
 });
 it.each(['/', '/index.html', '/research.html'])('keeps %s English despite old Chinese preferences and links',async(path)=>{
  localStorage.setItem('liuyang-website-language','zh');window.history.replaceState({},'',path+'?lang=zh');
  mount();await waitLoaded();expect(document.documentElement.lang).toBe('en');
  expect(screen.queryByRole('group',{name:'Language / 语言'})).toBeNull();
  expect(screen.queryByRole('button',{name:'中文',exact:true})).toBeNull();
  expect(screen.queryByRole('button',{name:'EN',exact:true})).toBeNull();
  const navigation=screen.getByRole('navigation',{name:'Main navigation'});
  expect(within(navigation).getByRole('link',{name:'Home'}).getAttribute('href')).toBe('./');
  expect(within(navigation).getByRole('link',{name:'Research'}).getAttribute('href')).toBe('./research.html');
  expect(within(navigation).getByRole('link',{name:'Publications'}).getAttribute('href')).toBe('./#publications');
  if(path.includes('research'))expect(screen.getByRole('heading',{level:1}).textContent).toBe('Research');
  else expect(screen.getByRole('link',{name:'CV (PDF)'}).getAttribute('href')).toBe('./'+cv(initialContent).url);
  expect(fetch).toHaveBeenCalledWith('./content.json',expect.objectContaining({cache:'no-store'}));
 });
 it.each(['/zh/', '/zh/index.html', '/zh/research.html'])('keeps %s Chinese with independent navigation and shared assets',async(path)=>{
  localStorage.setItem('liuyang-website-language','en');window.history.replaceState({},'',path+'?lang=en');
  mount();await waitLoaded();expect(document.documentElement.lang).toBe('zh-CN');
  expect(screen.queryByRole('group',{name:'Language / 语言'})).toBeNull();
  const navigation=screen.getByRole('navigation',{name:'主导航'});
  expect(new URL(within(navigation).getByRole('link',{name:'首页'}).getAttribute('href')!,window.location.href).pathname).toBe('/zh/');
  expect(new URL(within(navigation).getByRole('link',{name:'研究'}).getAttribute('href')!,window.location.href).pathname).toBe('/zh/research.html');
  const publications=new URL(within(navigation).getByRole('link',{name:'论文'}).getAttribute('href')!,window.location.href);expect(publications.pathname).toBe('/zh/');expect(publications.hash).toBe('#publications');expect(publications.search).toBe('');
  expect(fetch).toHaveBeenCalledWith('../content.json',expect.objectContaining({cache:'no-store'}));
  if(path.includes('research')){
   expect(screen.getByRole('heading',{level:1}).textContent).toBe('研究');
   expect(screen.getByText('人工韧带',{selector:'h2'})).toBeTruthy();
   expect(screen.getAllByText('模型与论文').length).toBe(3);
   for(const asset of document.querySelectorAll<HTMLImageElement|HTMLVideoElement>('main img,main video')){
    if(asset.getAttribute('src')?.includes('media/'))expect(asset.getAttribute('src')).toMatch(/^\.\.\/media\//);
   }
  }else{
   expect(screen.getByRole('link',{name:'简历 (PDF)'}).getAttribute('href')).toBe('../'+cv(initialContent).zhUrl);
   expect(document.querySelector('.portrait')?.getAttribute('src')).toBe('../'+initialContent.portrait);
  }
 });
 it('keeps public language fixed across popstate and works without browser storage',async()=>{
  const get=vi.spyOn(Storage.prototype,'getItem').mockImplementation(()=>{throw Error('blocked storage');});
  const set=vi.spyOn(Storage.prototype,'setItem').mockImplementation(()=>{throw Error('blocked storage');});
  window.history.replaceState({},'','/?lang=invalid');mount();await waitLoaded();
  for(const query of ['?lang=zh','?lang=en','?lang=invalid']){window.history.replaceState({},'','/'+query);fireEvent.popState(window);expect(document.documentElement.lang).toBe('en');}
  cleanup();window.history.replaceState({},'','/zh/?lang=en');mount();await waitLoaded();
  window.history.replaceState({},'','/zh/?lang=invalid');fireEvent.popState(window);expect(document.documentElement.lang).toBe('zh-CN');
  get.mockRestore();set.mockRestore();
 });
 it('resolves shared files for each site without rewriting external URLs or staged blobs',()=>{
  for(const pathname of ['/', '/editor.html', '/zh/', '/zh/research.html']){
   window.history.replaceState({},'',pathname);const prefix=pathname.startsWith('/zh/')?'../':'./';
   for(const path of ['content.json','export-manifest.json','media/figure.webp','files/cv.pdf','zh/index.html'])expect(siteFile(path)).toBe(prefix+path);
   expect(mediaSource('media/figure.webp')).toBe(prefix+'media/figure.webp');
   expect(mediaSource('https://example.com/figure.webp')).toBe('https://example.com/figure.webp');
  }
 });
 it('keeps editor language switching, query priority, persistence and popstate',async()=>{
  localStorage.setItem('liuyang-website-language','zh');window.history.replaceState({},'','/editor.html?lang=en');mount(true);await waitLoaded();
  expect(document.documentElement.lang).toBe('en');
  for(let i=0;i<3;i++){
   await userEvent.click(screen.getByRole('button',{name:'中文',exact:true}));expect(document.documentElement.lang).toBe('zh-CN');expect(location.search).toContain('lang=zh');
   await userEvent.click(screen.getByRole('button',{name:'EN',exact:true}));expect(document.documentElement.lang).toBe('en');
  }
  await userEvent.click(screen.getByRole('button',{name:'中文',exact:true}));expect(localStorage.getItem('liuyang-website-language')).toBe('zh');
  cleanup();window.history.replaceState({},'','/editor.html');mount(true);await waitLoaded();expect(document.documentElement.lang).toBe('zh-CN');
  window.history.replaceState({},'','/editor.html?lang=en');fireEvent.popState(window);expect(document.documentElement.lang).toBe('en');
  window.history.replaceState({},'','/editor.html?lang=zh');fireEvent.popState(window);expect(document.documentElement.lang).toBe('zh-CN');
 });
 it('reveals the shared email address without launching a mail client',async()=>{
  const data=copy();expect(data.email).toBe('liuyang5@illinois.edu');mount();await waitLoaded();
  expect(screen.queryByText(data.email!)).toBeNull();expect(document.querySelector('a[href^="mailto:"]')).toBeNull();
  const button=screen.getByRole('button',{name:'Email',exact:true});await userEvent.click(button);
  expect(screen.getByText(data.email!)).toBeTruthy();expect(document.querySelector('a[href^="mailto:"]')).toBeNull();
 });
 it('supports keyboard activation of Email and shares the announcement on both home pages',async()=>{
  const data=copy();expect(data.announcement).toBe('I am actively seeking a postdoctoral position. Please feel free to get in touch.');
  for(const path of ['/', '/zh/']){
   cleanup();window.history.replaceState({},'',path);mount();await waitLoaded();
   expect(screen.getByText(data.announcement!)).toBeTruthy();
   const button=screen.getByRole('button',{name:/^(Email|邮箱)$/});button.focus();await userEvent.keyboard('{Enter}');
   expect(screen.getByText(data.email!)).toBeTruthy();expect(document.querySelector('a[href^="mailto:"]')).toBeNull();
  }
 });
 it('renders official biography links safely without HTML injection',async()=>{
  mount();await waitLoaded();const biography=document.querySelector('.bio')!;
  const links=Array.from(biography.querySelectorAll<HTMLAnchorElement>('a'));
  expect(links.some(link=>new URL(link.href).hostname.endsWith('illinois.edu'))).toBe(true);
  expect(links.some(link=>/Tawfick/i.test(link.textContent??'')&&new URL(link.href).hostname.endsWith('illinois.edu'))).toBe(true);
  cleanup();const data=copy();data.bio='[Safe](https://example.com/profile) [Unsafe](javascript:alert(1)) <img src=x onerror=alert(1)>';
  vi.stubGlobal('fetch',vi.fn(async()=>new Response(JSON.stringify(data),{status:200})));mount();await waitLoaded();
  expect(screen.getByRole('link',{name:'Safe'}).getAttribute('href')).toBe('https://example.com/profile');
  expect(document.querySelector('.bio a[href^="javascript:"]')).toBeNull();expect(document.querySelector('.bio img')).toBeNull();
 });
 it('public Home and Research never expose editing controls or load private drafts',async()=>{mount();await waitLoaded();expect(screen.queryByText('Edit page')).toBeNull();expect(document.querySelector('.editor-bar')).toBeNull();expect(document.querySelector('a[href*="editor.html"]')).toBeNull();expect(await loadDraft()).toBeNull();cleanup();window.history.replaceState({},'','/research.html?lang=zh');mount();await waitLoaded();expect(document.querySelector('.entry-tools')).toBeNull();expect(document.querySelector('.inline-edit')).toBeNull();expect(await loadDraft()).toBeNull();});
 it('keeps owner gate locked in Chinese without an authorization attempt',()=>{window.history.replaceState({},'','/editor.html?lang=zh');render(<LanguageProvider><OwnerEditor/></LanguageProvider>);expect(screen.getByRole('heading',{name:'网站编辑器'})).toBeTruthy();expect(document.querySelector('.editor-bar')).toBeNull();expect(screen.getByRole('button',{name:'打开编辑器'}).hasAttribute('disabled')).toBe(true);expect(fetch).not.toHaveBeenCalled();});
 it('preserves stored English, displays changed Chinese in both views, and supports cancel/undo',async()=>{window.history.replaceState({},'','/editor.html?lang=zh');mount(true);await waitLoaded();await userEvent.click(screen.getByRole('button',{name:'编辑简介、简历与链接'}));const dialog=screen.getByRole('dialog');expect(within(dialog).getByRole('link',{name:'打开所选简历 (PDF)'}).getAttribute('href')).toBe('./'+cv(initialContent).zhUrl);expect(screen.getByRole('button',{name:'EN',exact:true,hidden:true}).hasAttribute('disabled')).toBe(true);fireEvent.change(within(dialog).getByLabelText('个人简介'),{target:{value:'中文测试简介'}});await userEvent.click(within(dialog).getByRole('button',{name:'保存更改'}));expect(screen.getByText('中文测试简介')).toBeTruthy();await waitFor(async()=>expect((await loadDraft())?.content.zh?.bio).toBe('中文测试简介'));expect((await loadDraft())?.content.bio).toBe(initialContent.bio);await userEvent.click(screen.getByRole('button',{name:'EN',exact:true}));expect(screen.getByText('中文测试简介')).toBeTruthy();await userEvent.click(screen.getByRole('button',{name:'Edit introduction, CV & links'}));fireEvent.change(screen.getByLabelText('Biography'),{target:{value:'Cancelled English change'}});await userEvent.click(screen.getByRole('button',{name:'Cancel',exact:true}));expect(screen.queryByText('Cancelled English change')).toBeNull();await userEvent.click(screen.getByRole('button',{name:'Undo',exact:true}));await waitFor(async()=>expect((await loadDraft())?.content.zh?.bio).toBe(initialContent.zh?.bio));});
 it('reorders Chinese sections without writing Chinese over English',async()=>{window.history.replaceState({},'','/editor.html?page=research&lang=zh');mount(true);await waitLoaded();await userEvent.click(screen.getByRole('button',{name:'下移人工韧带'}));await waitFor(async()=>expect((await loadDraft())?.content.sections.filter(s=>s.page==='research')[0].id).toBe('polymer-actuators'));const draft=(await loadDraft())!.content;expect(draft.sections.find(s=>s.id==='artificial-ligaments')?.title).toBe('Artificial ligaments');expect(draft.sections.find(s=>s.id==='polymer-actuators')?.title).toBe('Twisted and coiled polymer actuators');await userEvent.click(screen.getByRole('link',{name:'首页',exact:true}));expect(location.search).toContain('page=home');window.history.replaceState({},'','/editor.html?page=research&lang=zh');fireEvent.popState(window);expect(screen.getByRole('heading',{level:1}).textContent).toBe('研究');});
 it('uploads and previews a Chinese CV without changing English; both survive draft restoration',async()=>{window.history.replaceState({},'','/editor.html?lang=zh');mount(true);await waitLoaded();await userEvent.click(screen.getByRole('button',{name:'编辑简介、简历与链接'}));const dialog=screen.getByRole('dialog');const selectedCv=new File(['%PDF-1.7\nChinese test CV\n%%EOF'],'Chinese-CV.pdf',{type:'application/pdf'});fireEvent.change(within(dialog).getByLabelText('CV PDF'),{target:{files:[selectedCv]}});await waitFor(()=>expect(within(dialog).getByRole('link',{name:'打开所选简历 (PDF)'}).getAttribute('href')).toBe('blob:local-test-pdf'));await userEvent.click(within(dialog).getByRole('button',{name:'保存更改'}));await waitFor(async()=>expect(cv((await loadDraft())!.content).zhUrl).toMatch(/^files\/cv-/));const draft=await loadDraft();expect(cv(draft!.content).url).toBe(cv(initialContent).url);cleanup();mount(true);await waitLoaded();expect(screen.getByRole('link',{name:'简历 (PDF)'}).getAttribute('href')).toBe('blob:local-test-pdf');await userEvent.click(screen.getByRole('button',{name:'EN',exact:true}));expect(screen.getByRole('link',{name:'CV (PDF)'}).getAttribute('href')).toBe('./'+cv(initialContent).url);});
 it('never shows a private local draft on public pages',async()=>{const privateDraft=copy();privateDraft.bio='LOCAL PRIVATE DRAFT';privateDraft.zh!.bio='本地私人草稿';await saveDraft(privateDraft,copy());window.history.replaceState({},'','/zh/');mount(false);await waitLoaded();expect(screen.queryByText('本地私人草稿')).toBeNull();expect(screen.queryByText('LOCAL PRIVATE DRAFT')).toBeNull();expect(document.querySelector('.bio')?.textContent).toContain('博士候选人');});
 it('creates Chinese sections without replacing the English defaults',async()=>{window.history.replaceState({},'','/editor.html?lang=zh');mount(true);await waitLoaded();await userEvent.click(screen.getByRole('button',{name:'栏目',exact:true}));const dialog=screen.getByRole('dialog');fireEvent.change(within(dialog).getByLabelText('标题'),{target:{value:'新增中文栏目'}});await userEvent.click(within(dialog).getByRole('button',{name:'保存更改'}));await waitFor(async()=>expect((await loadDraft())?.content.sections.at(-1)?.zh?.title).toBe('新增中文栏目'));expect((await loadDraft())?.content.sections.at(-1)?.title).toBe('New section');});
 it('merges a new Chinese translation field and preserves independent publication changes',()=>{const base=copy();delete base.zh;const local=structuredClone(base);local.zh={bio:'中文'};const remote=structuredClone(base);section(remote,'publications').intro='Independent update';const result=mergeWebsiteContent(base,local,remote);expect(result.zh?.bio).toBe('中文');expect(section(result,'publications').intro).toBe('Independent update');});
 it('publication sync accepts both PDFs and keeps existing Chinese profile/research translations',()=>{const data=copy();expect(validateSiteContent(data)).toEqual(data);const merged=mergePublications(data,[{id:'p2026',title:section(data,'publications').items.find(i=>i.id==='p2026')!.title,authors:['Qiong Wang','Liuyang Cheng'],venue:'Advanced Intelligent Systems',year:2026,status:'published',doi:'10.1002/aisy.70490',links:[{label:'Paper',url:'https://doi.org/10.1002/aisy.70490'}]}]);expect(merged.zh).toEqual(data.zh);expect(section(merged,'artificial-ligaments')).toEqual(section(data,'artificial-ligaments'));expect(section(merged,'news')).toEqual(section(data,'news'));expect(cv(merged).zhUrl).toBe(cv(data).zhUrl);});
});
