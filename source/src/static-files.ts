import {initialContent,siteSchema,type SiteContent} from './lib/content';

// Unsaved uploads are temporary, tab-local drafts until exported and committed.
const uploads=new Map<string,File>();
const previews=new Map<string,string>();
export const mediaSource=(path:string)=>previews.get(path)??path;
export async function loadPage(){
 const response=await fetch('./content.json',{cache:'no-store'});
 if(!response.ok)throw Error('Your content could not be loaded. Refresh before editing.');
 return siteSchema.parse(await response.json());
}
export async function importPage(file:File){
 if(file.size>500000)throw Error('Choose a content.json file smaller than 500 KB.');
 return siteSchema.parse(JSON.parse(await file.text()));
}
export async function stageMedia(file:File){
 const types:Record<string,string>={'image/jpeg':'jpg','image/png':'png','image/webp':'webp','image/gif':'gif','video/mp4':'mp4','video/webm':'webm'};
 const extension=types[file.type];if(!extension)throw Error('Choose a JPG, PNG, WebP, GIF, MP4 or WebM file.');
 if(!file.size||file.size>25*1024*1024)throw Error('Choose a nonempty file smaller than 25 MB.');
 const url='media/'+crypto.randomUUID()+'.'+extension;uploads.set(url,file);previews.set(url,URL.createObjectURL(file));
 return {url,type:file.type.startsWith('video/')?'video' as const:'image' as const};
}
export function mediaPaths(content:SiteContent){return Array.from(new Set([content.portrait,...content.sections.flatMap(s=>s.items.map(i=>i.media))].filter(p=>p.startsWith('media/'))));}
const encoder=new TextEncoder();
const table=Uint32Array.from({length:256},(_,n)=>{let c=n;for(let k=0;k<8;k++)c=(c&1)?0xedb88320^(c>>>1):c>>>1;return c>>>0;});
export function crc32(data:Uint8Array){let c=0xffffffff;for(const b of data)c=table[(c^b)&255]^(c>>>8);return (c^0xffffffff)>>>0;}
function header(size:number){const bytes=new Uint8Array(size),v=new DataView(bytes.buffer);return {bytes,v};}
export function zipFiles(files:{name:string;data:Uint8Array}[]){
 const local:Uint8Array[]=[],central:Uint8Array[]=[];let offset=0,centralSize=0;
 for(const file of files){
  const name=encoder.encode(file.name),crc=crc32(file.data),h=header(30+name.length),c=header(46+name.length);
  h.v.setUint32(0,0x04034b50,true);h.v.setUint16(4,20,true);h.v.setUint16(6,0x0800,true);h.v.setUint16(12,33,true);h.v.setUint32(14,crc,true);h.v.setUint32(18,file.data.length,true);h.v.setUint32(22,file.data.length,true);h.v.setUint16(26,name.length,true);h.bytes.set(name,30);
  c.v.setUint32(0,0x02014b50,true);c.v.setUint16(4,20,true);c.v.setUint16(6,20,true);c.v.setUint16(8,0x0800,true);c.v.setUint16(14,33,true);c.v.setUint32(16,crc,true);c.v.setUint32(20,file.data.length,true);c.v.setUint32(24,file.data.length,true);c.v.setUint16(28,name.length,true);c.v.setUint32(42,offset,true);c.bytes.set(name,46);
  local.push(h.bytes,file.data);central.push(c.bytes);offset+=h.bytes.length+file.data.length;centralSize+=c.bytes.length;
 }
 const end=header(22);end.v.setUint32(0,0x06054b50,true);end.v.setUint16(8,files.length,true);end.v.setUint16(10,files.length,true);end.v.setUint32(12,centralSize,true);end.v.setUint32(16,offset,true);
 return new Blob([...local,...central,end.bytes] as BlobPart[],{type:'application/zip'});
}
function download(blob:Blob,name:string){const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),30000);}
export async function exportWebsite(content:SiteContent){
 const checked=siteSchema.parse(content);
 const response=await fetch('./export-manifest.json',{cache:'no-store'});if(!response.ok)throw Error('The export files could not be loaded. Try again.');
 const manifest=await response.json() as {files:string[]};
 if(!Array.isArray(manifest.files)||manifest.files.some(p=>typeof p!=='string'||p.startsWith('/')||p.includes('..')||p.includes(':')))throw Error('The export file list is invalid.');
 const entries:{name:string;data:Uint8Array}[]=[];
 for(const path of manifest.files.filter(p=>p!=='content.json')){const r=await fetch('./'+path);if(!r.ok)throw Error('Could not export '+path);entries.push({name:path,data:new Uint8Array(await r.arrayBuffer())});}
 entries.push({name:'content.json',data:encoder.encode(JSON.stringify(checked,null,2)+'\n')});
 for(const path of mediaPaths(checked)){const staged=uploads.get(path);let blob:Blob;if(staged)blob=staged;else{const r=await fetch('./'+path);if(!r.ok)throw Error('Could not load '+path);blob=await r.blob();}entries.push({name:path,data:new Uint8Array(await blob.arrayBuffer())});}
 download(zipFiles(entries),'liuyangmechse.github.io-update.zip');
}
