import {Input} from './components/ui/input';
import {Textarea} from './components/ui/textarea';
import {useLanguage,type Language} from './language';
import {rawText,editTranslation,reviewText,chooseSource} from './translation-sync.mjs';

/** Both stored versions stay visible. Reviewing is explicit, never inferred. */
export function BilingualField<T extends object>({record,field,label,onChange,multiline=false}:{record:T;field:string;label:string;onChange:(next:T)=>void;multiline?:boolean}) {
 const {language,t}=useLanguage();
 const pending=(record as {pendingTranslation?:Record<string,Language>}).pendingTranslation?.[field];
 const other=language==='en'?'zh':'en';
 const languages:Language[]=[language,other];
 const incomplete=!!rawText(record,field,'en')!==!!rawText(record,field,'zh');
 return <fieldset className="bilingual-field"><legend>{label}</legend><div className="bilingual-fields">{languages.map((locale,index)=><label className="field" key={locale}><span>{locale==='en'?'English':'中文'}{pending===locale?t(' · latest source',' · 最新源文'):pending?t(' · saved translation',' · 保留的旧译文'):''}</span>{multiline?<Textarea aria-label={index===0?label:`${label} · ${locale==='en'?'English':'中文'}`} lang={locale==='zh'?'zh-CN':'en'} value={rawText(record,field,locale)} rows={4} onChange={e=>onChange(editTranslation(record,field,locale,e.target.value))}/>:<Input aria-label={index===0?label:`${label} · ${locale==='en'?'English':'中文'}`} lang={locale==='zh'?'zh-CN':'en'} value={rawText(record,field,locale)} onChange={e=>onChange(editTranslation(record,field,locale,e.target.value))}/>}{pending&&pending!==locale&&<button className="source-choice" type="button" disabled={!rawText(record,field,locale)} onClick={()=>onChange(chooseSource(record,field,locale))}>{t('Use this version as the latest source','改以此版本作为最新源文')}</button>}</label>)}</div>{pending&&<div className="translation-review"><p role="status">{t('Both pages now use the latest source above. The old translation is preserved here until you review the pair.','两个页面现均使用上方最新源文。旧译文保留在此，待您核对后再使用。')}</p><div><button type="button" disabled={incomplete} onClick={()=>onChange(reviewText(record,field))}>{t('Confirm this translation pair','确认这组译文')}</button><button type="button" onClick={()=>onChange(reviewText(record,field,true))}>{t('Use latest text in both languages','两种语言均使用最新原文')}</button></div>{incomplete&&<small>{t('Complete both versions, or use the same text in both.','请补全两种文字，或选择两种语言使用同一原文。')}</small>}</div>}</fieldset>;
}
