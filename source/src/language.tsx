import {createContext,useContext,useEffect,useState,type ReactNode} from 'react';
export type Language = 'en'|'zh';
const STORAGE_KEY='liuyang-website-language';
function fromUrl():Language|null {const value=new URLSearchParams(window.location.search).get('lang');return value==='en'||value==='zh'?value:null;}
function initialLanguage():Language {const url=fromUrl();if(url)return url;try{return localStorage.getItem(STORAGE_KEY)==='zh'?'zh':'en';}catch{return 'en';}}
const LanguageContext=createContext({language:'en' as Language,setLanguage:(_language:Language)=>{},t:(en:string,_zh:string)=>en});
export function LanguageProvider({children}:{children:ReactNode}) {
 const [language,setCurrent]=useState<Language>(initialLanguage);
 function setLanguage(next:Language) {setCurrent(next);const url=new URL(window.location.href);url.searchParams.set('lang',next);window.history.replaceState(window.history.state,'',url);}
 useEffect(()=>{document.documentElement.lang=language==='zh'?'zh-CN':'en';try{localStorage.setItem(STORAGE_KEY,language);}catch{/* Preference is optional; switching still works without storage. */}},[language]);
 useEffect(()=>{const pop=()=>setCurrent(fromUrl()??initialLanguage());window.addEventListener('popstate',pop);return()=>window.removeEventListener('popstate',pop);},[]);
 return <LanguageContext.Provider value={{language,setLanguage,t:(en,zh)=>language==='zh'?zh:en}}>{children}</LanguageContext.Provider>;
}
export const useLanguage=()=>useContext(LanguageContext);
export function LanguageToggle({disabled=false}:{disabled?:boolean}) {const {language,setLanguage}=useLanguage();return <div className="language-toggle" role="group" aria-label="Language / 语言"><button type="button" lang="en" aria-pressed={language==='en'} disabled={disabled} onClick={()=>setLanguage('en')}>EN</button><span aria-hidden="true">/</span><button type="button" lang="zh-CN" aria-pressed={language==='zh'} disabled={disabled} onClick={()=>setLanguage('zh')}>中文</button></div>;}
export function languageHref(path:string,language:Language){const [base,hash]=path.split('#');return `${base}${base.includes('?')?'&':'?'}lang=${language}${hash===undefined?'':'#'+hash}`;}
