// Builds the Arabic site (website/ar/) from the English pages and i18n/ar.json.
//
//   node i18n/build-arabic.mjs            write website/ar/*.html; exit 1 if any text is untranslated
//   node i18n/build-arabic.mjs --extract  add new English strings to ar.json (empty values) and stop
//
// The English pages stay the only hand-edited markup. Each Arabic page is its English page with the
// visible text and the text-bearing attributes swapped for their ar.json entries, so the two can't
// drift apart in structure: edit the English page, rerun, and the build lists anything new to
// translate instead of shipping it in English. No dependencies; the parser below only needs to
// understand this site's own hand-written HTML.

import { readFileSync, writeFileSync, mkdirSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const site = join(here, "..", "website");
const out = join(site, "ar");
const dictPath = join(here, "ar.json");
const SITE_URL = "https://mostafaessam7.github.io/MeCodex/";

// 404.html is left out: GitHub Pages serves the one at the site root for every missing path.
const PAGES = readdirSync(site).filter((f) => f.endsWith(".html") && f !== "404.html").sort();

const VOID = new Set(["area", "base", "br", "col", "embed", "hr", "img", "input", "link", "meta", "source", "track", "wbr"]);
const RAW = new Set(["script", "style"]);
const OPAQUE = new Set(["svg", "canvas"]);
const INLINE = new Set(["a", "span", "strong", "em", "b", "i", "br", "code", "small", "abbr", "time", "mark", "sup", "sub", "kbd"]);
const TEXT_ATTRS = new Set(["alt", "aria-label", "title", "placeholder"]);
const META_TEXT = /^(description|og:title|og:description|twitter:title|twitter:description|og:image:alt)$/;
const LETTERS = /[A-Za-z]/;

// ---------- parsing ----------

function parse(src) {
  const root = { type: "el", tag: "#root", attrs: [], children: [], innerStart: 0, innerEnd: src.length };
  const stack = [root];
  const token = /<!--[\s\S]*?-->|<!DOCTYPE[^>]*>|<\/([a-zA-Z][\w-]*)\s*>|<([a-zA-Z][\w-]*)((?:\s+[^\s=>\/]+(?:\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+))?)*)\s*(\/?)>/gi;
  let last = 0;
  let m;
  const top = () => stack[stack.length - 1];
  const text = (start, end) => { if (end > start) top().children.push({ type: "text", start, end }); };

  while ((m = token.exec(src))) {
    text(last, m.index);
    last = token.lastIndex;
    if (m[0].startsWith("<!")) continue;

    if (m[1]) { // closing tag
      const tag = m[1].toLowerCase();
      for (let i = stack.length - 1; i > 0; i--) {
        if (stack[i].tag === tag) {
          stack[i].innerEnd = m.index;
          stack.length = i;
          break;
        }
      }
      continue;
    }

    const tag = m[2].toLowerCase();
    const attrStart = m.index + 1 + m[2].length;
    const el = { type: "el", tag, attrs: parseAttrs(m[3], attrStart), children: [], parent: top(), start: m.index, innerStart: last };
    top().children.push(el);

    if (RAW.has(tag) || OPAQUE.has(tag)) { // skip to the matching close; nothing inside is translated
      const close = src.toLowerCase().indexOf(`</${tag}`, last);
      el.innerEnd = close;
      el.opaque = true;
      last = src.indexOf(">", close) + 1;
      token.lastIndex = last;
    } else if (!VOID.has(tag) && !m[4]) {
      stack.push(el);
    }
  }
  text(last, src.length);
  return root;
}

function parseAttrs(chunk, offset) {
  const attrs = [];
  const attr = /([^\s=>\/]+)(?:\s*=\s*("([^"]*)"|'([^']*)'|([^\s>]+)))?/g;
  let m;
  while ((m = attr.exec(chunk))) {
    const value = m[3] ?? m[4] ?? m[5] ?? null;
    let valueStart = -1;
    if (value !== null) {
      const quoted = m[3] !== undefined || m[4] !== undefined;
      valueStart = offset + m.index + m[0].length - value.length - (quoted ? 1 : 0);
    }
    attrs.push({ name: m[1].toLowerCase(), value, valueStart, valueEnd: valueStart + (value?.length ?? 0) });
  }
  return attrs;
}

const attrOf = (el, name) => el.attrs.find((a) => a.name === name);

// ---------- finding the text to translate ----------

const norm = (s) => s.replace(/\s+/g, " ").trim();

function phrasingOnly(el, src) {
  if (el.opaque) return false;
  return el.children.every((c) => c.type === "text" || (INLINE.has(c.tag) && phrasingOnly(c, src)));
}

function hasLetters(node, src) {
  if (node.type === "text") return LETTERS.test(src.slice(node.start, node.end));
  if (node.opaque) return false;
  return node.children.some((c) => hasLetters(c, src));
}

// A unit is a source range whose text is translated as one string, inline markup included, so a
// sentence with a link or a highlighted word keeps its Arabic word order.
function collectUnits(root, src) {
  const units = [];
  const addRange = (start, end) => {
    const raw = src.slice(start, end);
    const lead = raw.length - raw.trimStart().length;
    const trail = raw.length - raw.trimEnd().length;
    if (LETTERS.test(raw)) units.push({ start: start + lead, end: end - trail, key: norm(raw) });
  };

  const visit = (el) => {
    if (el.opaque) return;
    for (const c of el.children) {
      if (c.type === "text") {
        addRange(c.start, c.end);
        continue;
      }
      collectAttrs(c, src, units);
      if (c.opaque || !hasLetters(c, src)) continue;
      // An element with no loose text of its own is a container, not a sentence: <li><a>Home</a></li>
      // should give "Home", and a row of chips or a button's label-plus-icon spans one string each.
      const ownText = c.children.some((k) => k.type === "text" && LETTERS.test(src.slice(k.start, k.end)));
      if (!ownText) {
        visit(c);
      } else if (phrasingOnly(c, src)) {
        addRange(c.innerStart, c.innerEnd);
        c.children.forEach((k) => k.type === "el" && collectAttrsDeep(k, src, units));
      } else {
        visit(c);
      }
    }
  };
  visit(root);
  return units;
}

function collectAttrs(el, src, units) {
  for (const a of el.attrs) {
    if (a.value === null || !LETTERS.test(a.value)) continue;
    const isMetaText = el.tag === "meta" && a.name === "content" &&
      META_TEXT.test(attrOf(el, "name")?.value ?? attrOf(el, "property")?.value ?? "");
    if (TEXT_ATTRS.has(a.name) || isMetaText) {
      units.push({ start: a.valueStart, end: a.valueEnd, key: norm(a.value), attr: true });
    }
  }
}

function collectAttrsDeep(el, src, units) {
  collectAttrs(el, src, units);
  el.children.forEach((k) => k.type === "el" && collectAttrsDeep(k, src, units));
}

// ---------- building ----------

const escapeAttr = (s) => s.replace(/&(?!(?:[a-z]+|#\d+);)/g, "&amp;").replace(/"/g, "&quot;");

function localise(page, src, dict, missing) {
  const root = parse(src);
  const edits = [];
  for (const u of collectUnits(root, src)) {
    const ar = dict[u.key];
    if (!ar) {
      missing.add(u.key);
      continue;
    }
    edits.push({ start: u.start, end: u.end, text: u.attr ? escapeAttr(ar) : ar });
  }
  rewriteAttrs(root, page, edits);

  edits.sort((a, b) => b.start - a.start);
  let html = src;
  for (const e of edits) html = html.slice(0, e.start) + e.text + html.slice(e.end);

  return html
    .replace(/<html lang="en">/, '<html lang="ar" dir="rtl">')
    // Inter and IBM Plex Mono have no Arabic glyphs; style.css puts this family first under :lang(ar).
    .replace("family=IBM+Plex+Mono", "family=IBM+Plex+Sans+Arabic:wght@400;500;600;700&family=IBM+Plex+Mono");
}

function rewriteAttrs(el, page, edits) {
  for (const a of el.attrs) {
    if (a.value === null) continue;
    const set = (value) => edits.push({ start: a.valueStart, end: a.valueEnd, text: value });
    if ((a.name === "href" || a.name === "src" || a.name === "content") && /^(css|js|assets)\//.test(a.value)) {
      set("../" + a.value);
    } else if (el.tag === "meta" && attrOf(el, "property")?.value === "og:url" && a.name === "content") {
      set(a.value.replace(SITE_URL, SITE_URL + "ar/"));
    } else if (el.tag === "meta" && attrOf(el, "property")?.value === "og:locale" && a.name === "content") {
      set("ar_EG");
    }
  }
  // The language switch points the other way: English page ⇄ its Arabic twin.
  if (el.tag === "a" && /\blang-switch\b/.test(attrOf(el, "class")?.value ?? "")) {
    for (const a of el.attrs) {
      if (a.name === "href") edits.push({ start: a.valueStart, end: a.valueEnd, text: "../" + a.value.replace(/^ar\//, "") });
      if (a.name === "lang" || a.name === "hreflang") edits.push({ start: a.valueStart, end: a.valueEnd, text: "en" });
    }
    edits.push({ start: el.innerStart, end: el.innerEnd, text: "English" });
    return;
  }
  // An opaque element's own attributes still count (<script src>); only its content is skipped.
  if (el.opaque) return;
  for (const c of el.children ?? []) if (c.type === "el") rewriteAttrs(c, page, edits);
}

// ---------- main ----------

const dict = JSON.parse(readFileSync(dictPath, "utf8"));
const sources = Object.fromEntries(PAGES.map((p) => [p, readFileSync(join(site, p), "utf8")]));

if (process.argv.includes("--extract")) {
  let added = 0;
  for (const [page, src] of Object.entries(sources)) {
    for (const u of collectUnits(parse(src), src)) {
      if (!(u.key in dict)) { dict[u.key] = ""; added++; }
    }
  }
  writeFileSync(dictPath, JSON.stringify(dict, null, 2) + "\n");
  console.log(`${added} new string(s) added to i18n/ar.json`);
  process.exit(0);
}

const missing = new Set();
const built = Object.entries(sources).map(([page, src]) => [page, localise(page, src, dict, missing)]);
if (missing.size) {
  console.error(`${missing.size} string(s) have no Arabic in i18n/ar.json:`);
  for (const k of missing) console.error("  - " + (k.length > 100 ? k.slice(0, 100) + "…" : k));
  process.exit(1);
}

mkdirSync(out, { recursive: true });
for (const [page, html] of built) writeFileSync(join(out, page), html);
console.log(`Wrote ${built.length} Arabic page(s) to website/ar/`);
