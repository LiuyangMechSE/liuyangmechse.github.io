import type {Language} from './language';
import type {Item,Section,SiteContent} from './lib/content';
const labels:Record<string,string>={'CV (PDF)':'简历 (PDF)','CV':'简历 (PDF)','Google Scholar':'Google 学术','Paper':'论文','Preprint':'预印本','Paper preprint':'论文预印本','Open access':'开放获取','Related paper':'相关论文'};
export function localizedLinks(links:Item['links'],language:Language):Item['links'] {return language==='en'?links:links.map(link=>({...link,label:link.zhLabel??labels[link.label]??link.label,url:link.zhUrl??link.url}));}
export function localizedItem(item:Item,language:Language):Item {return language==='en'?item:{...item,...item.zh,meta:item.zh?.meta??item.meta.replace(/\bpreprint\b/gi,'预印本'),links:localizedLinks(item.links,language),figure:item.figure?{...item.figure,...item.figure.zh}:undefined};}
export function localizedSection(section:Section,language:Language):Section {return language==='en'?section:{...section,...section.zh,items:section.items.map(item=>localizedItem(item,language))};}
export function localizedContent(content:SiteContent,language:Language):SiteContent {return language==='en'?content:{...content,...content.zh,links:localizedLinks(content.links,language),sections:content.sections.map(section=>localizedSection(section,language))};}
