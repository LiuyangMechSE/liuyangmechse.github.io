import {beforeEach,afterEach,it,expect,vi} from 'vitest';
import {render,screen,fireEvent,waitFor,within,cleanup} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {initialContent,siteSchema} from '../src/lib/content';
import {localizedContent,localizedItem,localizedLinks} from '../src/localized-content';
import {editText,editTranslation,chooseSource,reviewText,textFor,rawText,editLinkUrl,editSharedText,pendingTranslations,preserveItemKind} from '../src/translation-sync.mjs';
import {LanguageProvider} from '../src/language';
import Portfolio from '../src/portfolio';
import {clearDraft,loadDraft,saveDraft} from '../src/static-files';
import {mergeWebsiteContent} from '../src/github-publish';
import {mergePublications,validateSiteContent} from '../scripts/sync-publications.mjs';
const copy=()=>structuredClone(initialContent);
const mount=()=>render(<LanguageProvider><Portfolio canEdit/></LanguageProvider>);
const loaded=()=>waitFor(()=>expect(document.querySelector('main')?.getAttribute('aria-busy')).toBe('false'));
beforeEach(async()=>{cleanup();localStorage.clear();window.history.replaceState({},'','/editor.html?lang=en');await clearDraft();vi.stubGlobal('fetch',vi.fn(async()=>new Response(JSON.stringify(copy()),{status:200})));});
afterEach(()=>{cleanup();vi.restoreAllMocks();});
it('synchronizes both directions without overwriting the stored counterpart',()=>{
 for(const language of ['en','zh'] as const){const old=copy();const updated=editText(old,'bio',language,'new source');for(const target of ['en','zh'] as const)expect(localizedContent(updated,target).bio).toBe('new source');expect(rawText(updated,'bio',language==='en'?'zh':'en')).toBe(rawText(old,'bio',language==='en'?'zh':'en'));expect(updated.zh?.name).toBe('成刘阳');expect(siteSchema.parse(updated)).toEqual(updated);expect(pendingTranslations(updated)).toBe(1);}
});
it('keeps partial translation drafts off both public views until explicit review',()=>{
 let record=editText(copy(),'bio','en','New source');record=editTranslation(record,'bio','zh','部分译文');expect(record.pendingTranslation?.bio).toBe('en');expect(localizedContent(record,'zh').bio).toBe('New source');record=editTranslation(record,'bio','zh','完整译文');expect(localizedContent(record,'zh').bio).toBe('New source');record=reviewText(record,'bio');expect(localizedContent(record,'zh').bio).toBe('完整译文');expect(localizedContent(record,'en').bio).toBe('New source');record=editText(record,'bio','en','Newer source');expect(localizedContent(record,'zh').bio).toBe('Newer source');expect(record.zh?.bio).toBe('完整译文');
});
it('handles unchanged saves, intentional new source, equal copies and deletion',()=>{
 const original=copy();expect(editText(original,'bio','en',original.bio)).toBe(original);let record=editText(original,'bio','en','New source');record=editTranslation(record,'bio','zh','中文源文');record=chooseSource(record,'bio','zh');expect(textFor(record,'bio','en')).toBe('中文源文');record=reviewText(record,'bio',true);expect(record.bio).toBe('中文源文');expect(record.zh?.bio).toBe('中文源文');expect(record.pendingTranslation).toBeUndefined();record=editText(record,'bio','zh','');expect(textFor(record,'bio','en')).toBe('');expect(record.bio).toBe('中文源文');record=reviewText(record,'bio',true);expect(record.bio).toBe('');expect(record.zh?.bio).toBe('');
});
it('shares regular URLs and keeps a renamed CV language-specific',()=>{
 const ordinary={label:'Paper',url:'https://example.com/old',zhUrl:'https://example.com/stale',zhLabel:'论文'};for(const source of ['en','zh'] as const){const link=editLinkUrl(ordinary,source,'https://example.com/new');expect(link.zhUrl).toBeUndefined();for(const language of ['en','zh'] as const)expect(localizedLinks([link],language)[0].url).toBe('https://example.com/new');}
 const cv={...copy().links[2],label:'Resume',kind:'cv' as const};const updated=editLinkUrl(cv,'zh','files/new-chinese.pdf');expect(updated.url).toBe(cv.url);expect(localizedLinks([updated],'zh')[0].url).toBe('files/new-chinese.pdf');
});
it('links all figure prose and custom labels, keeping old translations for review',()=>{
 let item=copy().sections.find(s=>s.id==='artificial-ligaments')!.items[0];item={...item,figure:editText(item.figure!,'caption','zh','最新图注'),links:[editText(item.links[0],'label','zh','最新名称')]};for(const language of ['en','zh'] as const){const view=localizedItem(item,language);expect(view.figure?.caption).toBe('最新图注');expect(view.links[0].label).toBe('最新名称');}expect(item.figure?.caption).not.toBe('最新图注');expect(pendingTranslations(item)).toBe(2);
});
it('keeps bibliographic identity, authors, venue and years shared',()=>{
 const c=copy();let item=c.sections.find(s=>s.id==='publications')!.items[0];item={...item,zh:{title:'旧标题',authors:'旧作者',meta:'旧年份 2025'}};item=editSharedText(item,'meta','New Journal · 2027');item=editSharedText(item,'authors','Liuyang Cheng, New Author');c.sections.find(s=>s.id==='publications')!.items[0]=item;for(const language of ['en','zh'] as const){const view=localizedContent(c,language).sections.find(s=>s.id==='publications')!.items[0];expect(view.meta).toBe('New Journal · 2027');expect(view.authors).toBe('Liuyang Cheng, New Author');expect(view.title).toBe(item.title);}expect(item.zh?.meta).toBe('旧年份 2025');
});
it('rejects malformed pending state in both validators',()=>{
 const a=copy() as any;a.pendingTranslation={bio:'de'};expect(siteSchema.safeParse(a).success).toBe(false);expect(()=>validateSiteContent(a)).toThrow();const b=copy() as any;delete b.zh;b.pendingTranslation={bio:'zh'};expect(siteSchema.safeParse(b).success).toBe(false);expect(()=>validateSiteContent(b)).toThrow();const c=copy() as any;c.zh.bio=2;expect(siteSchema.safeParse(c).success).toBe(false);expect(()=>validateSiteContent(c)).toThrow();
});
it('conflicts concurrent source changes and translation review, but merges unrelated facts',()=>{
 const base=editText(copy(),'bio','en','A');const local=editText(base,'bio','en','B');const remote=reviewText(editTranslation(base,'bio','zh','甲'),'bio');expect(()=>mergeWebsiteContent(base,local,remote)).toThrow(/changed on GitHub/);const independent={...base,portrait:'https://example.com/new.jpg'};expect(mergeWebsiteContent(base,local,independent).portrait).toBe(independent.portrait);const opposite=editText(base,'bio','zh','乙');expect(()=>mergeWebsiteContent(base,local,opposite)).toThrow();
});
it('preserves the pending pair across saved draft reload and explicit review',async()=>{
 mount();await loaded();await userEvent.click(screen.getByRole('button',{name:'Edit introduction, CV & links'}));fireEvent.change(screen.getByLabelText('Biography'),{target:{value:'Updated English biography'}});const group=screen.getByLabelText('Biography').closest('fieldset')!;expect(within(group).getByText(/Both pages now/)).toBeTruthy();await userEvent.click(screen.getByRole('button',{name:'Save changes',exact:true}));await waitFor(async()=>expect((await loadDraft())?.content.pendingTranslation?.bio).toBe('en'));cleanup();window.history.replaceState({},'','/editor.html?lang=zh');mount();await loaded();expect(screen.getByText('Updated English biography')).toBeTruthy();await userEvent.click(screen.getByRole('button',{name:'编辑简介、简历与链接'}));expect((screen.getByLabelText('个人简介') as HTMLTextAreaElement).value).toBe(initialContent.zh?.bio);fireEvent.change(screen.getByLabelText('个人简介'),{target:{value:'核对后的中文简介'}});await userEvent.click(screen.getByRole('button',{name:'保存更改',exact:true}));expect(screen.getByText('Updated English biography')).toBeTruthy();await userEvent.click(screen.getByRole('button',{name:'编辑简介、简历与链接'}));const pair=screen.getByLabelText('个人简介').closest('fieldset')!;await userEvent.click(within(pair).getByRole('button',{name:'确认这组译文'}));await userEvent.click(screen.getByRole('button',{name:'保存更改',exact:true}));expect(screen.getByText('核对后的中文简介')).toBeTruthy();await waitFor(async()=>expect((await loadDraft())?.content.pendingTranslation).toBeUndefined());await userEvent.click(screen.getByRole('button',{name:'EN',exact:true}));expect(screen.getByText('Updated English biography')).toBeTruthy();
});
it('saving unchanged pending prose does not mark it reviewed, and cancel/undo preserve status',async()=>{
 const pending=editText(copy(),'bio','zh','最新中文');await saveDraft(pending,copy());mount();await loaded();await userEvent.click(screen.getByRole('button',{name:'Edit introduction, CV & links'}));await userEvent.click(screen.getByRole('button',{name:'Save changes',exact:true}));expect((await loadDraft())?.content.pendingTranslation?.bio).toBe('zh');await userEvent.click(screen.getByRole('button',{name:'Edit introduction, CV & links'}));fireEvent.change(screen.getByLabelText('Biography'),{target:{value:'discarded translation'}});await userEvent.click(screen.getByRole('button',{name:'Cancel',exact:true}));expect((await loadDraft())?.content.bio).toBe(initialContent.bio);
});
it('ordinary link edits from Chinese update English without changing either CV',async()=>{
 window.history.replaceState({},'','/editor.html?lang=zh');mount();await loaded();await userEvent.click(screen.getByRole('button',{name:'编辑简介、简历与链接'}));fireEvent.change(screen.getByLabelText('链接 1 网址 · 共用'),{target:{value:'https://example.com/shared'}});await userEvent.click(screen.getByRole('button',{name:'保存更改',exact:true}));await waitFor(async()=>expect((await loadDraft())?.content.links[0].url).toBe('https://example.com/shared'));await userEvent.click(screen.getByRole('button',{name:'EN',exact:true}));expect(screen.getByRole('link',{name:'GitHub',exact:true}).getAttribute('href')).toBe('https://example.com/shared');expect((await loadDraft())?.content.links[2]).toEqual(initialContent.links[2]);
});
it('publication sync remains idempotent and ignores legacy stale bibliographic translations',()=>{
 const data=copy();const item=data.sections.find(s=>s.id==='publications')!.items[2];item.zh={meta:'Old 2024'};const record={id:'p2026',title:item.title,authors:['Qiong Wang','Liuyang Cheng'],venue:'Advanced Intelligent Systems',year:2026,status:'published',doi:'10.1002/aisy.70490',links:[{label:'Paper',url:'https://doi.org/10.1002/aisy.70490'}]};const next=mergePublications(data,[record]);expect(mergePublications(next,[record])).toEqual(next);expect(localizedContent(next,'zh').sections.find(s=>s.id==='publications')!.items.find(i=>i.id===item.id)?.meta).toBe('Advanced Intelligent Systems · 2026');expect(next.sections.find(s=>s.id==='artificial-ligaments')!).toEqual(data.sections.find(s=>s.id==='artificial-ligaments')!);
});

it('validates source presence and keeps item identity when moving between sections',()=>{
 const invalid=copy() as any;delete invalid.zh.name;invalid.pendingTranslation={name:'zh'};expect(siteSchema.safeParse(invalid).success).toBe(false);invalid.pendingTranslation={caption:'en'};expect(siteSchema.safeParse(invalid).success).toBe(false);
 const c=copy();const research=editText(c.sections.find(s=>s.id==='artificial-ligaments')!.items[0],'title','zh','新研究标题');c.sections.find(s=>s.id==='publications')!.items.push(research);expect(localizedContent(c,'en').sections.find(s=>s.id==='publications')!.items.at(-1)?.title).toBe('新研究标题');const publication={...c.sections.find(s=>s.id==='publications')!.items[0],zh:{title:'旧标题',meta:'旧年份'}};c.sections.find(s=>s.id==='artificial-ligaments')!.items.push(publication);expect(localizedContent(c,'zh').sections.find(s=>s.id==='artificial-ligaments')!.items.at(-1)?.title).toBe(publication.title);
});
it('publication sync clears resolved last markers rather than retaining false pending state',()=>{
 const data=copy();const item=data.sections.find(s=>s.id==='publications')!.items[2];item.pendingTranslation={title:'en'};const merged=mergePublications(data,[{id:'p2026',title:item.title,authors:['Qiong Wang','Liuyang Cheng'],venue:'Advanced Intelligent Systems',year:2026,status:'published',doi:'10.1002/aisy.70490',links:[{label:'Paper',url:'https://doi.org/10.1002/aisy.70490'}]}]);expect(merged.sections.find(s=>s.id==='publications')!.items.find(i=>i.id===item.id)?.pendingTranslation).toBeUndefined();expect(pendingTranslations(merged)).toBe(0);
});

it('stamps legacy entry identity before a cross-section move',()=>{
 const c=copy();const legacyPublication={...c.sections.find(s=>s.id==='publications')!.items[0],zh:{title:'Legacy stale title'}};delete legacyPublication.kind;const movedPublication=preserveItemKind(legacyPublication,'publications');c.sections.find(s=>s.id==='artificial-ligaments')!.items.push(movedPublication);expect(localizedContent(c,'zh').sections.find(s=>s.id==='artificial-ligaments')!.items.at(-1)?.title).toBe(legacyPublication.title);
 const legacyResearch=editText(c.sections.find(s=>s.id==='artificial-ligaments')!.items[0],'title','zh','新研究');delete legacyResearch.kind;c.sections.find(s=>s.id==='publications')!.items.push(preserveItemKind(legacyResearch,'artificial-ligaments'));expect(localizedContent(c,'en').sections.find(s=>s.id==='publications')!.items.at(-1)?.title).toBe('新研究');
});
it('published pending source is visible to visitors without exposing review controls',async()=>{
 const data=editText(copy(),'bio','zh','已更新的中文源文');vi.stubGlobal('fetch',vi.fn(async()=>new Response(JSON.stringify(data),{status:200})));render(<LanguageProvider><Portfolio canEdit={false}/></LanguageProvider>);await loaded();expect(screen.getByText('已更新的中文源文')).toBeTruthy();expect(screen.getByText(/Recently updated text may appear/)).toBeTruthy();expect(document.querySelector('.editor-bar')).toBeNull();expect(screen.queryByText('Confirm this translation pair')).toBeNull();
});
