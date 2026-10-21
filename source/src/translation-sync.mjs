/** Dependency-free bilingual state, shared by the editor and offline updaters.
 * A pending entry names the authoritative language. The previous counterpart
 * remains stored for review; until confirmed, neither page shows stale facts.
 */
export function rawText(record, key, language) {
  const value = language === 'zh' ? (key === 'label' ? record.zhLabel : record.zh?.[key]) : record[key];
  return typeof value === 'string' ? value : '';
}
export function textFor(record, key, language) {
  const source = record.pendingTranslation?.[key];
  if (source) return rawText(record, key, source);
  const translated = key === 'label' ? record.zhLabel : record.zh?.[key];
  return language === 'zh' && typeof translated === 'string' ? translated : rawText(record, key, 'en');
}
export function editText(record, key, language, value) {
  if (rawText(record, key, language) === value) return record;
  const next = language === 'en' ? {...record, [key]: value} : key === 'label' ? {...record, zhLabel: value} : {...record, zh: {...record.zh, [key]: value}};
  return {...next, pendingTranslation: {...record.pendingTranslation, [key]: language}};
}
export function editTranslation(record, key, language, value) {
  const source = record.pendingTranslation?.[key];
  const next = editText(record, key, language, value);
  return source && source !== language ? {...next, pendingTranslation: {...next.pendingTranslation, [key]: source}} : next;
}
export function chooseSource(record, key, language) {
  return {...record, pendingTranslation: {...record.pendingTranslation, [key]: language}};
}
export function reviewText(record, key, useSameText = false) {
  let next = {...record};
  if (useSameText) {
    const value = textFor(record, key, 'en');
    next = key === 'label' ? {...next, label: value, zhLabel: value} : {...next, [key]: value, zh: {...record.zh, [key]: value}};
  }
  const pending = {...next.pendingTranslation};
  delete pending[key];
  if (Object.keys(pending).length) next.pendingTranslation = pending;
  else delete next.pendingTranslation;
  return next;
}
export function editSharedText(record, key, value) {
  const next = {...record, [key]: value};
  // Legacy translated spellings remain stored; shared-field rendering ignores
  // them instead of letting them shadow a newly edited factual value.
  return reviewText(next, key);
}
export function isCvLink(link) {
  return link.kind === 'cv' || /^(?:CV(?:\s*\(PDF\))?|curriculum vitae|简历(?:\s*\(PDF\))?)$/i.test(link.label.trim()) || /(?:^|\/)cv-[a-zA-Z0-9-]+\.pdf$/i.test(link.url) || /(?:^|\/)Liuyang-Cheng-CV(?:-zh)?\.pdf$/i.test(link.url);
}
export function editLinkUrl(link, language, value) {
  if (isCvLink(link)) return {...link, kind: 'cv', [language === 'zh' ? 'zhUrl' : 'url']: value};
  const {zhUrl: _legacy, ...shared} = link;
  return {...shared, url: value};
}
export function pendingTranslations(value, targetLanguage) {
  if (!value || typeof value !== 'object') return 0;
  if (Array.isArray(value)) return value.reduce((sum, entry) => sum + pendingTranslations(entry, targetLanguage), 0);
  const own = Object.values(value.pendingTranslation || {}).filter(source => !targetLanguage || source !== targetLanguage).length;
  return own + Object.entries(value).filter(([key]) => key !== 'pendingTranslation' && key !== 'zh').reduce((sum, [, entry]) => sum + pendingTranslations(entry, targetLanguage), 0);
}

/** Keep a legacy entry's semantics when it moves away from its original section. */
export function preserveItemKind(item, sourceSectionId) {
  return item.kind ? item : {...item, kind: sourceSectionId === 'publications' ? 'publication' : 'research'};
}
