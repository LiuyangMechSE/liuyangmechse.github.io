#!/usr/bin/env node
// Offline merge only: retrieval and identity verification happen before this tool.
import { readFile, writeFile, rename, unlink, stat } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { randomUUID } from 'node:crypto';

const PROFILE_ID = 'MMkH8L0AAAAJ';
const titleKey = value => value.normalize('NFKD').replace(/\p{M}/gu, '').toLowerCase().replace(/[^\p{L}\p{N}]/gu, '');
const nonempty = value => typeof value === 'string' && value.trim().length > 0 && !/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(value);
const fail = message => { throw new Error(message); };

function doiKey(value) {
  if (typeof value !== 'string') return '';
  const bare = value.replace(/^https?:\/\/(?:dx\.)?doi\.org\//i, '').trim();
  return /^10\.\d{4,9}\/[^\s?#<>"{}|\\^`]+$/i.test(bare) ? bare.toLowerCase() : '';
}

function arxivKey(value) {
  if (typeof value !== 'string') return '';
  const bare = value.replace(/^https?:\/\/(?:www\.)?arxiv\.org\/(?:abs|pdf)\//i, '').replace(/\.pdf$/i, '').replace(/v\d+$/, '');
  return /^(?:\d{4}\.\d{4,5}|[a-z-]+(?:\.[A-Z]{2})?\/\d{7})$/i.test(bare) ? bare.toLowerCase() : '';
}

function safeLink(link) {
  if (!link || !nonempty(link.label) || !nonempty(link.url)) fail('Every link needs a label and URL.');
  let url;
  try { url = new URL(link.url); } catch { fail('Invalid publication URL.'); }
  if (url.protocol !== 'https:' || url.username || url.password) fail('New publication links must be HTTPS URLs without credentials.');
  if (link.label.trim().length > 80 || url.href.length > 2000) fail('Publication link label/URL exceeds website limits.');
  return { label: link.label.trim(), url: url.href };
}

const metadataFor = record => [record.venue.trim(), /preprint/i.test(record.status) ? 'Preprint' : '', record.year].filter(Boolean).join(' · ');
const canonicalJson = value => JSON.stringify(value, (_, item) => item && !Array.isArray(item) && typeof item === 'object' ? Object.fromEntries(Object.entries(item).sort(([a], [b]) => a.localeCompare(b))) : item);

// Mirrors the dependency-free portions of src/lib/content.ts. Existing manual
// links may use the site's media/mailto forms; newly supplied links require HTTPS.
export function validateSiteContent(site) {
  const string = (value, max, location, min = 0) => {
    if (typeof value !== 'string' || value.length < min || value.length > max) fail(`Invalid website ${location}: expected a string of ${min}–${max} characters.`);
  };
  const array = (value, max, location) => { if (!Array.isArray(value) || value.length > max) fail(`Invalid website ${location}: expected at most ${max} entries.`); };
  const url = (value, location) => {
    string(value, 2000, location);
    if (value && !/^https:\/\/[^\s]+$/i.test(value) && !/^media\/[a-zA-Z0-9.-]+$/.test(value) && !/^mailto:[^\s@]+@[^\s@]+$/.test(value)) fail(`Invalid website URL at ${location}.`);
  };
  const links = (value, location) => {
    array(value, 10, location);
    value.forEach((link, index) => { if (!link || typeof link !== 'object') fail(`Invalid link at ${location}.`); string(link.label, 80, `${location}[${index}].label`); url(link.url, `${location}[${index}].url`); });
  };
  if (!site || typeof site !== 'object') fail('Invalid website content.');
  for (const [key, max, min] of [['name',120,1],['field',200],['affiliation',400],['bio',6000]]) string(site[key],max,key,min);
  url(site.portrait,'portrait'); links(site.links,'links'); array(site.sections,20,'sections');
  const ids = new Set();
  const id = (value, location) => { string(value,100,location,1); if (ids.has(value)) fail(`Duplicate global website ID: ${value}.`); ids.add(value); };
  site.sections.forEach((section, sectionIndex) => {
    const where = `sections[${sectionIndex}]`;
    if (!section || typeof section !== 'object') fail(`Invalid ${where}.`);
    id(section.id,`${where}.id`); string(section.title,200,`${where}.title`); string(section.intro,3000,`${where}.intro`);
    if (section.page !== undefined && !['home','research'].includes(section.page)) fail(`Invalid page at ${where}.`);
    array(section.items,500,`${where}.items`);
    section.items.forEach((item, itemIndex) => {
      const at = `${where}.items[${itemIndex}]`;
      if (!item || typeof item !== 'object') fail(`Invalid ${at}.`);
      id(item.id,`${at}.id`);
      for (const [key,max] of [['title',400],['text',6000],['authors',2000],['meta',300],['caption',600]]) string(item[key],max,`${at}.${key}`);
      if (!['antagonist','joint','running','coil','curve','lights','none'].includes(item.demo) || !['image','video'].includes(item.mediaType) || !['left','right','wide'].includes(item.layout)) fail(`Invalid demo, media type, or layout at ${at}.`);
      url(item.media,`${at}.media`); links(item.links,`${at}.links`);
      if (item.figure !== undefined) {
        if (!item.figure || typeof item.figure !== 'object') fail(`Invalid figure at ${at}.`);
        url(item.figure.src,`${at}.figure.src`); url(item.figure.sourceUrl,`${at}.figure.sourceUrl`);
        for (const [key,max] of [['alt',1000],['caption',1000],['sourceLabel',400]]) string(item.figure[key],max,`${at}.figure.${key}`);
      }
    });
  });
  return site;
}

function keysFor(record) {
  const keys = new Set([`title:${titleKey(record.title)}`]);
  const doi = doiKey(record.doi);
  const arxiv = arxivKey(record.arxiv);
  if (doi) keys.add(`doi:${doi}`);
  if (arxiv) keys.add(`arxiv:${arxiv}`);
  for (const link of record.links || []) {
    if (/^https?:\/\/(?:dx\.)?doi\.org\//i.test(link.url || '')) keys.add(`doi:${doiKey(link.url)}`);
    if (/^https?:\/\/(?:www\.)?arxiv\.org\/(?:abs|pdf)\//i.test(link.url || '')) keys.add(`arxiv:${arxivKey(link.url)}`);
  }
  keys.delete('doi:'); keys.delete('arxiv:');
  return keys;
}

const overlaps = (left, right) => [...left].some(key => right.has(key));

function mergeLinks(primary, existing, incoming) {
  const result = [];
  const seen = new Set();
  for (const link of [primary, ...existing, ...incoming]) {
    // Keep manual link objects and labels intact whenever the primary URL exists.
    const key = link.url.replace(/\/$/, '');
    if (!seen.has(key)) { result.push(link); seen.add(key); }
  }
  return result;
}

export function validateInput(input) {
  if (!input || input.profileId !== PROFILE_ID) fail(`Expected profileId ${PROFILE_ID}.`);
  if (typeof input.completeScholarList !== 'boolean' || !Array.isArray(input.publications) || input.publications.length === 0 || input.publications.length > 500) fail('Input needs completeness status and 1–500 verified publications.');
  const records = [];
  for (const raw of input.publications) {
    if (!raw || !nonempty(raw.id) || !/^[a-zA-Z0-9][a-zA-Z0-9._-]*$/.test(raw.id) || !nonempty(raw.title) || !titleKey(raw.title)) fail('Publication ID/title is invalid.');
    if (!Array.isArray(raw.authors) || raw.authors.length === 0 || !raw.authors.every(nonempty)) fail('Publication authors must be a nonempty string array.');
    if (!Number.isInteger(raw.year) || raw.year < 1000 || raw.year > 2100 || !nonempty(raw.venue) || !nonempty(raw.status)) fail('Publication year, venue, or status is invalid.');
    if (!Array.isArray(raw.links) || raw.links.length === 0) fail('Every publication needs at least one verified link.');
    if (raw.doi !== undefined && !doiKey(raw.doi)) fail('Invalid DOI.');
    if (raw.arxiv !== undefined && !arxivKey(raw.arxiv)) fail('Invalid arXiv ID.');
    const record = { ...raw, title: raw.title.trim(), authors: raw.authors.map(a => a.trim()), links: raw.links.map(safeLink) };
    if (record.id.length > 100 || record.title.length > 400 || record.authors.join(', ').length > 2000 || metadataFor(record).length > 300 || record.links.length > 10) fail('Publication ID, title, authors, metadata, or links exceed website limits.');
    const collisions = records.filter(other => overlaps(keysFor(record), keysFor(other)));
    if (collisions.length > 1) fail('Ambiguous duplicate records in input.');
    if (collisions.length === 1) {
      const first = collisions[0];
      if (titleKey(first.title) !== titleKey(record.title) || first.year !== record.year || first.authors.join('|') !== record.authors.join('|') || first.venue !== record.venue || first.status !== record.status || (first.doi && record.doi && doiKey(first.doi) !== doiKey(record.doi)) || (first.arxiv && record.arxiv && arxivKey(first.arxiv) !== arxivKey(record.arxiv))) fail('Conflicting duplicate publications; resolve the input before merging.');
      first.links = mergeLinks(first.links[0], first.links, record.links);
      first.doi ||= record.doi; first.arxiv ||= record.arxiv;
    } else {
      if (records.some(other => other.id === record.id)) fail('An input ID refers to different publications.');
      records.push(record);
    }
  }
  return records;
}

export function mergePublications(content, records) {
  validateSiteContent(content);
  if (!content || !Array.isArray(content.sections)) fail('Target has no sections array.');
  const matches = content.sections.filter(section => section.id === 'publications');
  if (matches.length !== 1 || !Array.isArray(matches[0].items)) fail('Target must contain one publications section.');
  const output = structuredClone(content);
  const section = output.sections.find(candidate => candidate.id === 'publications');
  if (section.items.some(item => !item || !nonempty(item.id) || !nonempty(item.title) || !Array.isArray(item.links))) fail('An existing publication has an invalid ID, title, or links.');
  const seenIds = new Set();
  for (const item of section.items) { if (seenIds.has(item.id)) fail('Existing publication IDs are duplicated.'); seenIds.add(item.id); }
  const years = new Map(section.items.map(item => [item.id, Number(item.meta?.match(/\b(?:19|20)\d{2}\b/g)?.at(-1) || 0)]));
  for (const record of records) {
    const candidates = section.items.filter(item => overlaps(keysFor(item), keysFor(record)));
    if (candidates.length > 1) fail('A verified record matches multiple existing publications. Resolve duplicates first.');
    let item = candidates[0];
    if (!item) {
      if (seenIds.has(record.id)) fail('A new publication ID collides with another existing paper.');
      item = { id: record.id, title: record.title, authors: '', text: '', meta: '', demo: 'none', mediaType: 'image', media: '', caption: '', links: [], layout: 'left' };
      section.items.push(item); seenIds.add(item.id);
    }
    const primaryUrl = record.doi ? `https://doi.org/${doiKey(record.doi)}` : record.arxiv ? `https://arxiv.org/abs/${arxivKey(record.arxiv)}` : record.links[0].url;
    const priorPrimary = item.links.find(link => link.url === primaryUrl);
    const primary = priorPrimary || record.links.find(link => link.url === primaryUrl) || { label: record.doi ? 'Paper' : 'Preprint', url: primaryUrl };
    item.title = record.title;
    item.authors = record.authors.join(', ');
    item.meta = metadataFor(record);
    item.links = mergeLinks(primary, item.links, record.links);
    years.set(item.id, record.year);
  }
  // ECMAScript stable sort keeps the owner’s ordering within each year.
  section.items.sort((a, b) => years.get(b.id) - years.get(a.id));
  return validateSiteContent(output);
}

export async function syncPublications({ inputPath, root = process.cwd() }) {
  const records = validateInput(JSON.parse(await readFile(inputPath, 'utf8')));
  const targets = [];
  for (const relative of ['content.json', 'source/public/content.json', 'public/content.json']) {
    const filename = path.resolve(root, relative);
    try { if ((await stat(filename)).isFile()) targets.push(filename); } catch (error) { if (error.code !== 'ENOENT') throw error; }
  }
  if (targets.length === 0) fail('No supported content.json targets found beneath --root.');
  // Read and validate every target before staging or modifying any file.
  const loaded = [];
  for (const filename of targets) {
    const original = await readFile(filename, 'utf8');
    const parsed = JSON.parse(original);
    validateSiteContent(parsed);
    loaded.push({ filename, original, parsed });
  }
  const canonicalBaseline = canonicalJson(loaded[0].parsed);
  if (loaded.some(target => canonicalJson(target.parsed) !== canonicalBaseline)) fail('Content targets disagree. Reconcile the published and source copies before syncing; no files were changed.');
  const changes = [];
  for (const {filename, original, parsed} of loaded) {
    const merged = mergePublications(parsed, records);
    if (JSON.stringify(parsed) !== JSON.stringify(merged)) changes.push({ filename, original, next: JSON.stringify(merged, null, 2) + '\n', temporary: `${filename}.${randomUUID()}.tmp` });
  }
  const committed = [];
  try {
    for (const change of changes) await writeFile(change.temporary, change.next, { flag: 'wx', mode: (await stat(change.filename)).mode });
    // Detect intervening edits before starting the replacement phase.
    for (const change of changes) if (await readFile(change.filename, 'utf8') !== change.original) fail('Content changed during sync; retry from the latest files.');
    for (const change of changes) { await rename(change.temporary, change.filename); committed.push(change); }
  } catch (error) {
    for (const change of committed.reverse()) {
      await writeFile(change.temporary, change.original);
      await rename(change.temporary, change.filename);
    }
    throw error;
  } finally {
    for (const change of changes) await unlink(change.temporary).catch(error => { if (error.code !== 'ENOENT') throw error; });
  }
  return { verifiedRecords: records.length, targets: targets.length, changedFiles: changes.length, deletedPublications: 0 };
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  try {
    const args = process.argv.slice(2);
    const options = { root: process.cwd() };
    for (let i = 0; i < args.length; i += 2) {
      if (!['--input', '--root'].includes(args[i]) || !args[i + 1]) fail('Usage: node scripts/sync-publications.mjs --input verified-records.json [--root repository-root]');
      options[args[i] === '--input' ? 'inputPath' : 'root'] = args[i + 1];
    }
    if (!options.inputPath) fail('--input is required.');
    console.log(JSON.stringify(await syncPublications(options)));
  } catch (error) { console.error(`Publication sync failed: ${error.message}`); process.exitCode = 1; }
}
