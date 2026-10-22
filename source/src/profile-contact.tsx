import {useId,useState,type ReactNode} from 'react';
export function EmailReveal({email}:{email:string}) {
 const [open,setOpen]=useState(false);const id=useId();
 return <span className="email-contact"><button type="button" aria-expanded={open} aria-controls={id} onClick={()=>setOpen(value=>!value)}>Email</button><span id={id} hidden={!open}>{open?email:''}</span></span>;
}
/** Only explicit HTTPS links are interpreted. Everything else stays plain text. */
export function LinkedText({text}:{text:string}) {
 const parts:ReactNode[]=[];const pattern=/\[([^\]\n]+)\]\((https:\/\/[^\s)]+)\)/g;let at=0;let match:RegExpExecArray|null;
 while((match=pattern.exec(text))){
  parts.push(text.slice(at,match.index));
  let valid=false;try{const url=new URL(match[2]);valid=url.protocol==='https:'&&!url.username&&!url.password;}catch{/* Show malformed markup as text. */}
  parts.push(valid?<a key={match.index} href={match[2]} target="_blank" rel="noopener noreferrer">{match[1]}</a>:match[0]);at=pattern.lastIndex;
 }
 parts.push(text.slice(at));return <>{parts}</>;
}
