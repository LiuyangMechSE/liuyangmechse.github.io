import type {Language} from './language';
import type {Item,Section,SiteContent} from './lib/content';
import {textFor,isCvLink} from './translation-sync.mjs';
const labels:Record<string,string>={'CV (PDF)':'简历 (PDF)','CV':'简历 (PDF)','Google Scholar':'Google 学术','Paper':'论文','Preprint':'预印本','Paper preprint':'论文预印本','Open access':'开放获取','Related paper':'相关论文'};
function textFields<T extends object>(value:T,fields:string[],language:Language):T {return {...value,...Object.fromEntries(fields.map(key=>[key,textFor(value,key,language)]))};}
export function localizedLinks(links:Item['links'],language:Language):Item['links'] {return links.map(link=>({...link,label:link.pendingTranslation?.label?textFor(link,'label',language):language==='zh'?link.zhLabel??labels[link.label]??link.label:link.label,url:language==='zh'&&isCvLink(link)?link.zhUrl??link.url:link.url}));}
export function localizedItem(item:Item,language:Language,bibliography=false):Item {
 const fields=bibliography?['text','caption']:['title','text','meta','caption'];
 const view=textFields(item,fields,language);
 if(bibliography)view.meta=language==='zh'?item.meta.replace(/\bpreprint\b/gi,'预印本').replace(/\bAccepted\b/g,'已接收'):item.meta;
 else if(language==='zh'&&!item.zh?.meta&&!item.pendingTranslation?.meta)view.meta=view.meta.replace(/\bpreprint\b/gi,'预印本');
 return {...view,authors:item.authors,links:localizedLinks(item.links,language),figure:item.figure?textFields(item.figure,['alt','caption','sourceLabel'],language):undefined};
}
export function localizedSection(section:Section,language:Language):Section {return {...textFields(section,['title','intro'],language),items:section.items.map(item=>localizedItem(item,language,item.kind?item.kind==='publication':section.id==='publications'))};}
export function localizedContent(content:SiteContent,language:Language):SiteContent {return {...textFields(content,['name','field','affiliation','bio'],language),links:localizedLinks(content.links,language),sections:content.sections.map(section=>localizedSection(section,language))};}
