import {createContext,useContext,useEffect,useState,type ReactNode} from 'react';
import {isChineseSite,isEditorPage,siteFile} from './site-paths';
export type Language = 'en'|'zh';
const STORAGE_KEY='liuyang-website-language';
function initialLanguage():Language {
 if(!isEditorPage())return isChineseSite()?'zh':'en';
 const value=new URLSearchParams(window.location.search).get('lang');
 if(value==='en'||value==='zh')return value;
 if(isChineseSite())return 'zh';
 try{return localStorage.getItem(STORAGE_KEY)==='zh'?'zh':'en';}catch{return 'en';}
}
const LanguageContext=createContext({language:'en' as Language,setLanguage:(_language:Language)=>{},t:(en:string,_zh:string)=>en});
export function LanguageProvider({children}:{children:ReactNode}) {
 const [language,setCurrent]=useState<Language>(initialLanguage);
 function setLanguage(next:Language) {if(!isEditorPage())return;setCurrent(next);const url=new URL(window.location.href);url.searchParams.set('lang',next);window.history.replaceState(window.history.state,'',url);}
 useEffect(()=>{document.documentElement.lang=language==='zh'?'zh-CN':'en';if(isEditorPage())try{localStorage.setItem(STORAGE_KEY,language);}catch{/* Editor preference is optional. */}},[language]);
 useEffect(()=>{const pop=()=>setCurrent(initialLanguage());window.addEventListener('popstate',pop);return()=>window.removeEventListener('popstate',pop);},[]);
 return <LanguageContext.Provider value={{language,setLanguage,t:(en,zh)=>language==='zh'?zh:en}}>{children}</LanguageContext.Provider>;
}
export const useLanguage=()=>useContext(LanguageContext);
export function LanguageToggle({disabled=false}:{disabled?:boolean}) {const {language,setLanguage}=useLanguage();return <div className="language-toggle" role="group" aria-label="Language / 语言"><button type="button" lang="en" aria-pressed={language==='en'} disabled={disabled} onClick={()=>setLanguage('en')}>EN</button><span aria-hidden="true">/</span><button type="button" lang="zh-CN" aria-pressed={language==='zh'} disabled={disabled} onClick={()=>setLanguage('zh')}>中文</button></div>;}
export function languageHref(path:string,language:Language){
 const [base,hash]=path.split('#');const clean=base.replace(/^\.\//,'');
 return siteFile((language==='zh'?'zh/':'')+clean)+(hash===undefined?'':'#'+hash);
}
