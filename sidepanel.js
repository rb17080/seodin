/* ============================================================
   SEOdin — side panel logic
   - orchestrates the scrape injection
   - holds a data-driven tab registry
   - renders each tab from the audit object
   ============================================================ */

"use strict";

/* ---------------- tiny DOM helper (hyperscript) ---------------- */
function h(tag, props, ...children) {
  const el = document.createElement(tag);
  if (props) {
    for (const [k, v] of Object.entries(props)) {
      if (v == null || v === false) continue;
      if (k === "class") el.className = v;
      else if (k === "text") el.textContent = v;
      else if (k === "html") el.innerHTML = v; // only used with trusted static SVG
      else if (k === "style" && typeof v === "object") Object.assign(el.style, v);
      else if (k.startsWith("on") && typeof v === "function")
        el.addEventListener(k.slice(2).toLowerCase(), v);
      else el.setAttribute(k, v);
    }
  }
  for (const c of children.flat()) {
    if (c == null || c === false) continue;
    el.appendChild(
      typeof c === "string" || typeof c === "number"
        ? document.createTextNode(String(c))
        : c
    );
  }
  return el;
}

/* ---------------- inline icons (static, trusted) ---------------- */
const ICON = {
  restricted: `<svg viewBox="0 0 24 24" width="40" height="40" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M5.6 5.6l12.8 12.8"/></svg>`,
  error: `<svg viewBox="0 0 24 24" width="40" height="40" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"><path d="M10.3 3.8 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.8a2 2 0 0 0-3.4 0z"/><path d="M12 9v4"/><path d="M12 17h.01"/></svg>`,
  empty: `<svg viewBox="0 0 24 24" width="40" height="40" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/></svg>`,
  check: `<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>`,
  copy: `<svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5 15V5a2 2 0 0 1 2-2h10"/></svg>`,
  sun: `<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>`,
  moon: `<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.8A9 9 0 1 1 11.2 3 7 7 0 0 0 21 12.8z"/></svg>`,
  target: `<svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="7"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3"/><circle cx="12" cy="12" r="1.6" fill="currentColor" stroke="none"/></svg>`,
  download: `<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="M7 10l5 5 5-5"/><path d="M12 15V3"/></svg>`,
  fileText: `<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/><path d="M9 13h6M9 17h6M9 9h1"/></svg>`,
  search: `<svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/></svg>`,
  x: `<svg viewBox="0 0 24 24" width="11" height="11" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18M6 6l12 12"/></svg>`,

  /* ---- card-head category icons (rendered inside .card-icon chips) ---- */
  bookOpen: `<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M12 7v14"/><path d="M3 18a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h5a4 4 0 0 1 4 4 4 4 0 0 1 4-4h5a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1h-6a3 3 0 0 0-3 3 3 3 0 0 0-3-3z"/></svg>`,
  braces: `<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M8 3c-2 0-3 1-3 3v2c0 1.6-.8 2.6-2 3 1.2.4 2 1.4 2 3v2c0 2 1 3 3 3"/><path d="M16 3c2 0 3 1 3 3v2c0 1.6.8 2.6 2 3-1.2.4-2 1.4-2 3v2c0 2-1 3-3 3"/></svg>`,
  helpCircle: `<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M9.1 9a3 3 0 0 1 5.8 1c0 2-3 3-3 3"/><path d="M12 17h.01"/></svg>`,
  listTree: `<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M8 6h13M8 12h13M8 18h13"/><path d="M3 6h.01M3 12h.01M3 18h.01"/></svg>`,
  globe: `<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M3 12h18"/><path d="M12 3a14 14 0 0 1 0 18 14 14 0 0 1 0-18z"/></svg>`,
  gauge: `<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M3.3 17a9 9 0 1 1 17.4 0"/><path d="M12 14l3.5-3.5"/><circle cx="12" cy="14" r="1.3" fill="currentColor" stroke="none"/></svg>`,
  accessibility: `<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="4.4" r="1.6"/><path d="M5 8h14"/><path d="M12 8v6"/><path d="M9 21l3-7 3 7"/></svg>`,
  shieldCheck: `<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3l7 3v6c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6z"/><path d="M9 12l2 2 4-4"/></svg>`,
  share: `<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><circle cx="18" cy="5" r="2.5"/><circle cx="6" cy="12" r="2.5"/><circle cx="18" cy="19" r="2.5"/><path d="M8.2 10.8 15.8 6.2M8.2 13.2l7.6 4.6"/></svg>`,
  link: `<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M10 13a5 5 0 0 0 7 0l2-2a5 5 0 0 0-7-7l-1 1"/><path d="M14 11a5 5 0 0 0-7 0l-2 2a5 5 0 0 0 7 7l1-1"/></svg>`,
  image: `<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="9" cy="9" r="1.6"/><path d="m21 15-4.5-4.5L5 21"/></svg>`,
  checkCircle: `<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="m8.5 12 2.5 2.5 4.5-5"/></svg>`,
  hash: `<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M5 9h14M5 15h14M10 4 8 20M16 4l-2 16"/></svg>`,
  tagIco: `<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M3 11.5V5a2 2 0 0 1 2-2h6.5L21 12.5 12.5 21z"/><circle cx="7.5" cy="7.5" r="1.3" fill="currentColor" stroke="none"/></svg>`,
  clipboard: `<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><rect x="6" y="4" width="12" height="17" rx="2"/><path d="M9 4a3 3 0 0 1 6 0"/><path d="M9 11h6M9 15h4"/></svg>`,
  alert: `<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M10.3 3.8 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.8a2 2 0 0 0-3.4 0z"/><path d="M12 9v4"/><path d="M12 17h.01"/></svg>`,
  history: `<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 4v4h4"/><path d="M12 8v4l3 1.7"/></svg>`,
  trending: `<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M3 17 9 11l4 4 8-8"/><path d="M16 7h5v5"/></svg>`,
};

/* Resolve a card-head icon by keyword in the card's title. Order matters —
   more specific patterns come first. Falls back to a document icon. */
function iconForLabel(label) {
  const s = (label || "").toLowerCase();
  const rules = [
    [/target/, "target"],
    [/readab|flesch|reading ease/, "bookOpen"],
    [/detected types|\btypes?\b|schema|json|structured|markup/, "braces"],
    [/answer|extractab|faq|q&a|question/, "helpCircle"],
    [/heading|outline|landmark/, "listTree"],
    [/index|robots|crawl/, "search"],
    [/hreflang|canonical|\blang\b/, "globe"],
    [/\bload\b/, "history"],
    [/vital|performance|speed/, "gauge"],
    [/accessib|a11y/, "accessibility"],
    [/trust|e-?e-?a-?t|author|byline|signal/, "shieldCheck"],
    [/link preview|unfurl/, "image"],
    [/social|open graph|twitter|preview/, "share"],
    [/\blink|anchor/, "link"],
    [/image|\bimg\b|\balt\b|picture/, "image"],
    [/issue|fix|critical|warning|fail/, "alert"],
    [/complete|\bcheck|pass|healthy/, "checkCircle"],
    [/count|\bstats\b|resource/, "hash"],
    [/title|description/, "tagIco"],
    [/attribute|label|aria|\brel\b|name/, "tagIco"],
    [/since last|\bdelta\b/, "trending"],
    [/history/, "history"],
    [/triage|finding|scan/, "clipboard"],
    [/keyword|term|content|word|\btext\b|document/, "fileText"],
  ];
  for (const [re, key] of rules) if (re.test(s)) return ICON[key];
  return ICON.fileText;
}

/* ---------------- state ---------------- */
// Single source of truth for the version is the manifest (falls back for the
// dev preview, whose chrome stub has no getManifest).
const VERSION = (() => {
  try {
    return chrome.runtime.getManifest().version;
  } catch {
    return "1.5";
  }
})();
let currentAudit = null;
let currentTabId = "triage";
let panelState = "loading"; // loading | ready | restricted | error
let activeBrowserTab = null;
const viewModes = { schema: "tree" }; // per-card view toggles

// Feature 2 — audit history. Populated by applyHistory() before each render.
// { prev: snapshot|null, cur: snapshot|null, list: snapshot[], unavailable: bool }
let historyState = null;

// Feature 3 — target keyword for the Content tab (remembered across sessions).
let keyword = (() => {
  try {
    return localStorage.getItem("seodin.keyword") || "";
  } catch {
    return "";
  }
})();

// Quick win — auto re-scan on tab switch/load (on by default).
let autoRefresh = (() => {
  try {
    return localStorage.getItem("seodin.autoRefresh") !== "false";
  } catch {
    return true;
  }
})();

// Copy-for-LLM: include the raw JSON-LD blocks? Remembered across sessions.
let includeJsonLd = (() => {
  try {
    const v = localStorage.getItem("seodin.includeJsonLd");
    return v === null ? true : v === "true";
  } catch {
    return true;
  }
})();

/* ---------------- DOM refs ---------------- */
const els = {
  favicon: document.getElementById("favicon"),
  pageTitle: document.getElementById("page-title"),
  pageUrl: document.getElementById("page-url"),
  copyBtn: document.getElementById("copy-btn"),
  jsonldToggle: document.getElementById("jsonld-toggle"),
  themeToggle: document.getElementById("theme-toggle"),
  settingsBtn: document.getElementById("settings-btn"),
  refreshBtn: document.getElementById("refresh-btn"),
  tabbar: document.getElementById("tabbar"),
  underline: document.getElementById("tab-underline"),
  content: document.getElementById("content"),
  toast: document.getElementById("toast"),
};

/* ============================================================
   formatting helpers
   ============================================================ */
const fmtMs = (v) => {
  if (v == null || isNaN(v)) return "—";
  if (v < 1000) return Math.round(v) + " ms";
  return (v / 1000).toFixed(2) + " s";
};
const fmtBytes = (v) => {
  if (v == null || isNaN(v) || v === 0) return "—";
  if (v < 1024) return v + " B";
  if (v < 1024 * 1024) return (v / 1024).toFixed(1) + " KB";
  return (v / 1024 / 1024).toFixed(2) + " MB";
};
const truncate = (s, n) => (s && s.length > n ? s.slice(0, n - 1) + "…" : s || "");
function fmtDate(s) {
  if (!s) return null;
  const d = new Date(s);
  if (isNaN(d.getTime())) return String(s);
  return d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}
function domainOf(url) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}

/* ============================================================
   reusable components
   ============================================================ */
function statusDot(status) {
  return h("span", { class: "dot dot--" + status });
}

function card(label, { right = null, tight = false } = {}, ...children) {
  const head = label
    ? h(
        "div",
        { class: "card-head" },
        h(
          "div",
          { class: "card-head-left" },
          h("span", { class: "card-icon", html: iconForLabel(label) }),
          h("span", { class: "section-label", text: label })
        ),
        right
      )
    : null;
  return h("section", { class: "card" + (tight ? " card--tight" : "") }, head, ...children);
}

function checkRow({ status, label, detail, value }) {
  return h(
    "div",
    { class: "check" },
    statusDot(status || "neutral"),
    h(
      "div",
      { class: "check-body" },
      h("div", { class: "check-label", text: label }),
      detail ? h("div", { class: "check-detail", text: detail }) : null
    ),
    value != null ? h("span", { class: "check-value", text: String(value) }) : null
  );
}

function pill(text, variant) {
  return h("span", { class: "pill" + (variant ? " pill--" + variant : ""), text });
}

function tag(text, variant) {
  return h("span", { class: "tag" + (variant ? " tag--" + variant : ""), text });
}

function metric(label, value, { sub, band } = {}) {
  return h(
    "div",
    { class: "metric" },
    h(
      "div",
      { class: "metric-top" },
      band ? statusDot(band) : null,
      h("span", { class: "metric-label", text: label })
    ),
    h(
      "div",
      { class: "metric-value" + (band ? " is-" + band : ""), text: value }
    ),
    sub ? h("span", { class: "metric-sub", text: sub }) : null
  );
}

function makeSegmented(options, activeId, onChange) {
  const wrap = h("div", { class: "segmented" });
  const chip = h("div", { class: "seg-chip" });
  wrap.appendChild(chip);
  options.forEach((opt) => {
    const b = h("button", { type: "button", text: opt.label });
    if (opt.id === activeId) b.classList.add("is-active");
    b.addEventListener("click", () => {
      if (b.classList.contains("is-active")) return;
      wrap.querySelectorAll("button").forEach((x) => x.classList.remove("is-active"));
      b.classList.add("is-active");
      position();
      onChange(opt.id);
    });
    wrap.appendChild(b);
  });
  function position() {
    const a = wrap.querySelector("button.is-active");
    if (!a) return;
    chip.style.width = a.offsetWidth + "px";
    chip.style.transform = `translateX(${a.offsetLeft}px)`;
  }
  requestAnimationFrame(position);
  return wrap;
}

function linkButton(label, url) {
  return h("button", {
    class: "mono-inline",
    style: { cursor: "pointer", border: "none" },
    text: label,
    onclick: () => chrome.tabs.create({ url }),
  });
}

async function copyText(text, okMsg) {
  try {
    await navigator.clipboard.writeText(text);
    showToast(okMsg || "Copied");
  } catch {
    const ta = h("textarea", { style: { position: "fixed", opacity: "0" } });
    ta.value = text;
    document.body.appendChild(ta);
    ta.select();
    try {
      document.execCommand("copy");
      showToast(okMsg || "Copied");
    } catch {
      showToast("Copy failed");
    }
    ta.remove();
  }
}

// a copyable code block with a header bar + Copy button
function codeBlock(code, label) {
  const copyBtn = h(
    "button",
    { class: "codeblock-copy", type: "button", onclick: () => copyText(code, "Snippet copied") },
    h("span", { class: "codeblock-copy-ico", html: ICON.copy }),
    "Copy"
  );
  return h(
    "div",
    { class: "codeblock" },
    h(
      "div",
      { class: "codeblock-bar" },
      h("span", { class: "codeblock-label", text: label || "JSON-LD" }),
      copyBtn
    ),
    h("pre", { class: "codeblock-pre", text: code })
  );
}

/* ---- score helpers (LLM readability) ---- */
const clampScore = (n) => Math.max(0, Math.min(100, Math.round(n)));
const scoreBand = (s) => (s == null ? "neutral" : s >= 80 ? "green" : s >= 50 ? "amber" : "red");
function scoreBar(score) {
  const band = scoreBand(score);
  return h(
    "div",
    { class: "bar" },
    h("div", { class: "bar-fill is-" + band, style: { width: (score || 0) + "%" } })
  );
}

/* ---- shared check helpers ---- */
// URL equality for canonical checks — ignore hash, trailing slash and case.
function normalizeForCompare(u) {
  try {
    const x = new URL(u);
    x.hash = "";
    return (x.origin + x.pathname.replace(/\/+$/, "") + x.search).toLowerCase();
  } catch {
    return String(u || "").trim().toLowerCase();
  }
}

// og:image that external scrapers can't resolve (not absolute, not data:).
function relativeOgImage(a) {
  const v = ((a.openGraph || {})["og:image"] || "").trim();
  if (!v) return null;
  return /^(?:https?:)?\/\//i.test(v) || /^data:/i.test(v) ? null : v;
}

// Alt text that is just a filename or camera default ("IMG_4032.jpg").
const FILENAME_ALT_RE =
  /^(?:img|image|dsc[nf]?|screenshot|photo|untitled|pic)[-_ ]?\d*$|\.(?:jpe?g|png|gif|webp|avif|svg|bmp)\s*$/i;

// Memoize a compute(audit) function so each scan derives it once, no matter
// how many surfaces (tab badges, renderers, history snapshots) ask for it.
function memo1(fn) {
  const cache = new WeakMap();
  return (a) => {
    if (!cache.has(a)) cache.set(a, fn(a));
    return cache.get(a);
  };
}

// hreflang sanity lint — pure compute on what the scraper collected.
// `triage: true` marks the two failures serious enough for the Triage feed.
function computeHreflangIssues(a) {
  const list = a.hreflang || [];
  if (!list.length) return [];
  const issues = [];
  const codes = list.map((x) => (x.lang || "").trim());
  const lower = codes.map((c) => c.toLowerCase());
  const VALID = /^(?:x-default|[a-z]{2,3}(?:-[a-z]{4})?(?:-(?:[a-z]{2}|\d{3}))?)$/i;
  const bad = [...new Set(codes.filter((c) => c && !VALID.test(c)))];
  if (bad.length)
    issues.push({
      status: "red",
      triage: true,
      label: `Invalid hreflang code${bad.length > 1 ? "s" : ""}`,
      detail:
        bad.slice(0, 6).join(", ") +
        " — use ISO language (+ optional script/region), e.g. en, en-GB, sr-Latn.",
    });
  const dupes = [...new Set(lower.filter((c, i) => c && lower.indexOf(c) !== i))];
  if (dupes.length)
    issues.push({
      status: "amber",
      label: "Duplicate hreflang entries",
      detail: dupes.slice(0, 6).join(", "),
    });
  if (!lower.includes("x-default"))
    issues.push({
      status: "amber",
      label: "No x-default alternate",
      detail: "Recommended fallback for users matching none of the listed languages.",
    });
  const self = list.some(
    (x) => x.href && normalizeForCompare(x.href) === normalizeForCompare(a.url)
  );
  if (!self)
    issues.push({
      status: "amber",
      triage: true,
      label: "Set doesn't reference this page",
      detail:
        "Every page in an hreflang set must list its own URL, or search engines may ignore the whole set.",
    });
  return issues;
}

/* ============================================================
   Feature 1 — click-to-highlight findings on the page
   ============================================================ */

// Self-contained function injected into the active tab. Re-finds the element
// from its { kind, index } locator (re-running the SAME querySelectorAll the
// scraper used), scrolls to it, and flashes a temporary outline that removes
// itself after ~1.6s. It MUST NOT reference anything from this module's scope.
function highlightFn(locator) {
  try {
    var SEL = {
      img: "img",
      heading: "h1,h2,h3,h4,h5,h6",
      link: "a[href]",
      field: "input:not([type=hidden]),select,textarea",
      interactive: "a[href],button,input:not([type=hidden]),select,textarea,[role=button]",
    };
    var sel = SEL[locator && locator.kind];
    if (!sel) return { ok: false };
    var els = document.querySelectorAll(sel);

    // Prefer a stable-signature match (href/src/text/name) so the highlight
    // lands on the right element even if the DOM shifted since the scan moved
    // its index (lazy images, injected widgets, etc.). Fall back to the index.
    var match = null;
    if (locator.href != null) {
      match = function (e) {
        var hv = e.getAttribute && e.getAttribute("href");
        if (hv == null) return false;
        try {
          return new URL(hv, location.href).href === locator.href;
        } catch (err) {
          return hv === locator.href;
        }
      };
    } else if (locator.src != null) {
      match = function (e) {
        return (e.currentSrc || e.src || (e.getAttribute && e.getAttribute("src")) || "") === locator.src;
      };
    } else if (locator.name != null) {
      match = function (e) {
        return (e.getAttribute && e.getAttribute("name")) === locator.name;
      };
    } else if (locator.text != null) {
      match = function (e) {
        return (e.textContent || "").trim() === locator.text;
      };
    }

    var el = null;
    if (match) {
      for (var i = 0; i < els.length; i++) {
        if (match(els[i])) {
          el = els[i];
          break;
        }
      }
    }
    if (!el) el = els[locator.index];
    if (!el) return { ok: false };

    try {
      el.scrollIntoView({ behavior: "smooth", block: "center", inline: "nearest" });
    } catch (e) {
      el.scrollIntoView();
    }

    var PAD = 4;
    var box = document.createElement("div");
    var place = function () {
      var r = el.getBoundingClientRect();
      box.style.left = r.left - PAD + "px";
      box.style.top = r.top - PAD + "px";
      box.style.width = Math.max(0, r.width) + PAD * 2 + "px";
      box.style.height = Math.max(0, r.height) + PAD * 2 + "px";
    };
    box.style.cssText = [
      "position:fixed",
      "border:2px solid #0a84ff",
      "border-radius:6px",
      "background:rgba(10,132,255,0.10)",
      "box-shadow:0 0 0 3px rgba(10,132,255,0.22),0 0 22px 5px rgba(10,132,255,0.45)",
      "z-index:2147483647",
      "pointer-events:none",
      "opacity:1",
      "transition:opacity 0.4s ease",
    ].join(";");
    place();

    if (locator.label) {
      var lab = document.createElement("div");
      lab.textContent = locator.label;
      lab.style.cssText = [
        "position:absolute",
        "left:-2px",
        "top:-22px",
        "font:600 11px/1.4 -apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif",
        "color:#fff",
        "background:#0a84ff",
        "padding:1px 7px",
        "border-radius:5px",
        "white-space:nowrap",
        "box-shadow:0 1px 4px rgba(0,0,0,0.3)",
      ].join(";");
      box.appendChild(lab);
    }

    (document.body || document.documentElement).appendChild(box);

    // The smooth scroll is animated and its duration depends on distance, so a
    // single fixed-delay reposition often measures mid-scroll and lands the box
    // off-target. Instead, keep the overlay glued to the element every frame
    // until the scroll settles (its rect stops moving), then hold, fade, remove.
    var nowMs = function () {
      return window.performance && performance.now ? performance.now() : Date.now();
    };
    var startTs = nowMs();
    var settleTs = null;
    var prevTop = null;
    var steady = 0;

    var frame = function () {
      if (!box.parentNode) return;
      place(); // re-measure + reposition against the element's live position

      var top = el.getBoundingClientRect().top;
      if (prevTop != null && Math.abs(top - prevTop) < 0.5) steady++;
      else steady = 0;
      prevTop = top;

      var t = nowMs();
      if (settleTs == null) {
        // Still waiting for the smooth scroll to finish (cap at 1.5s as a guard).
        if (steady >= 3 || t - startTs > 1500) settleTs = t;
        requestAnimationFrame(frame);
      } else if (t - settleTs < 1100) {
        // Settled — hold the highlight, still tracking in case the user scrolls.
        requestAnimationFrame(frame);
      } else {
        box.style.opacity = "0";
        setTimeout(function () {
          if (box.parentNode) box.parentNode.removeChild(box);
        }, 450);
      }
    };
    requestAnimationFrame(frame);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: String(e && e.message ? e.message : e) };
  }
}

// Inject highlightFn into the active tab. Toasts if the element is gone or the
// page is no longer reachable (e.g. it navigated away).
async function highlightOnPage(locator, label) {
  const tab = activeBrowserTab;
  if (!locator || !tab || !tab.id) {
    showToast("Couldn't find it — the page may have changed");
    return;
  }
  try {
    const results = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: highlightFn,
      // Pass the WHOLE locator through (kind, index + any href/src/text/name
      // signature) so highlightFn can re-find the element even if it moved.
      args: [Object.assign({}, locator, { label: label || locator.label || null })],
    });
    const r = results && results[0] && results[0].result;
    if (!r || !r.ok) showToast("Couldn't find it — the page may have changed");
  } catch (e) {
    showToast("Couldn't find it — the page may have changed");
  }
}

// Decorate a row so clicking (or Enter/Space) highlights its element on the
// page. Adds a keyboard focus target and a hover crosshair affordance.
function attachHighlight(row, locator, label) {
  if (!locator) return row;
  row.classList.add("is-hl");
  row.setAttribute("tabindex", "0");
  row.setAttribute("role", "button");
  row.setAttribute("aria-label", "Show on page" + (label ? ": " + label : ""));
  row.appendChild(h("span", { class: "hl-target", html: ICON.target }));
  const fire = (e) => {
    e.preventDefault();
    e.stopPropagation();
    highlightOnPage(locator, label);
  };
  row.addEventListener("click", fire);
  row.addEventListener("keydown", (e) => {
    if (e.key === "Enter" || e.key === " ") fire(e);
  });
  return row;
}

/* ---- relative time (for history) ---- */
function timeAgo(ts) {
  const s = Math.max(0, Math.round((Date.now() - ts) / 1000));
  if (s < 45) return "just now";
  if (s < 90) return "1 min ago";
  const m = Math.round(s / 60);
  if (m < 60) return `${m} min ago`;
  const hr = Math.round(m / 60);
  if (hr < 24) return `${hr} hr ago`;
  const d = Math.round(hr / 24);
  if (d < 30) return `${d} day${d > 1 ? "s" : ""} ago`;
  return new Date(ts).toLocaleDateString();
}

/* ---- live-filterable list (links / images) ----
   rows: [{ el, text }]. Returns a wrapper with a filter box, a "showing X of Y"
   count, and the list; typing live-hides non-matching rows. */
function filterableList(rows, { placeholder, noun, segments }) {
  const listWrap = h("div", { class: "item-list" });
  rows.forEach((r) => listWrap.appendChild(r.el));

  const input = h("input", {
    class: "filter-input",
    type: "text",
    placeholder,
    "aria-label": placeholder,
    spellcheck: "false",
  });
  const clearBtn = h("button", { class: "filter-clear", type: "button", title: "Clear filter" });
  clearBtn.innerHTML = ICON.x;
  const countEl = h("div", { class: "filter-count" });
  const box = h(
    "div",
    { class: "filter-box" },
    h("span", { class: "filter-ico", html: ICON.search }),
    input,
    clearBtn
  );

  // optional region segmented control (e.g. All · Content · Nav · Footer)
  let activeSeg = segments && segments.length ? segments[0].id : null;
  const segTest = () => {
    if (!segments) return () => true;
    const s = segments.find((x) => x.id === activeSeg);
    return s ? s.test : () => true;
  };

  const apply = () => {
    const q = input.value.trim().toLowerCase();
    const inSeg = segTest();
    let shown = 0;
    let bucket = 0;
    rows.forEach((r) => {
      const segMatch = inSeg(r);
      if (segMatch) bucket++;
      const match = segMatch && (!q || (r.text || "").toLowerCase().includes(q));
      r.el.style.display = match ? "" : "none";
      if (match) shown++;
    });
    countEl.textContent = q
      ? `Showing ${shown} of ${bucket} ${noun}`
      : `${bucket} ${noun}`;
    clearBtn.style.visibility = q ? "visible" : "hidden";
  };
  input.addEventListener("input", apply);
  clearBtn.addEventListener("click", () => {
    input.value = "";
    apply();
    input.focus();
  });

  const segEl = segments
    ? makeSegmented(
        segments.map((s) => ({ id: s.id, label: s.label })),
        activeSeg,
        (id) => {
          activeSeg = id;
          apply();
        }
      )
    : null;

  apply();

  return h(
    "div",
    {},
    segEl ? h("div", { class: "list-seg" }, segEl) : null,
    box,
    countEl,
    listWrap
  );
}

/* ============================================================
   schema helpers (lint + tree)
   ============================================================ */
const PLACEHOLDER_RE =
  /(\[year\])|(\[month\])|(\[day\])|(\{\{[^}]*\}\})|(%%[^%]+%%)|(\$\{[^}]*\})|(\[\[[^\]]*\]\])/i;

// FAQ rich results were deprecated by Google on 2026-05-07. Honest justification:
const FAQ_DEPRECATION_NOTE =
  "FAQ rich results were removed in May 2026. FAQPage markup no longer earns a SERP enhancement, but it's still valid and may help AI/machine parsing — only if the content is genuinely Q&A.";
const FAQ_VERIFY_NOTE =
  "FAQ heading found but no Q&A detected — verify before marking up.";

// SERP title truncation is a pixel-width limit, not a character count. Google's
// desktop title column is ~600px at 20px Arial; the ellipsis lands around ~580px.
const TITLE_PX_LIMIT = 580;

const RECOMMENDED = {
  Article: ["headline", "author", "datePublished", "image"],
  NewsArticle: ["headline", "author", "datePublished", "image"],
  BlogPosting: ["headline", "author", "datePublished", "image"],
  Product: ["name", "image", "offers"],
  FAQPage: ["mainEntity"],
  QAPage: ["mainEntity"],
  Organization: ["name", "url", "logo"],
  Person: ["name"],
  WebSite: ["name", "url"],
  WebPage: ["name"],
  BreadcrumbList: ["itemListElement"],
  Recipe: ["name", "image", "recipeIngredient"],
  Event: ["name", "startDate", "location"],
  VideoObject: ["name", "thumbnailUrl", "uploadDate"],
  LocalBusiness: ["name", "address"],
  Review: ["reviewRating", "author"],
};

function collectTypes(obj, set) {
  if (Array.isArray(obj)) return obj.forEach((o) => collectTypes(o, set));
  if (!obj || typeof obj !== "object") return;
  if (obj["@type"]) {
    const t = obj["@type"];
    (Array.isArray(t) ? t : [t]).forEach((x) => set.add(String(x)));
  }
  Object.values(obj).forEach((v) => collectTypes(v, set));
}

function collectTypedNodes(obj, out) {
  if (Array.isArray(obj)) return obj.forEach((o) => collectTypedNodes(o, out));
  if (!obj || typeof obj !== "object") return;
  if (obj["@type"]) out.push(obj);
  Object.values(obj).forEach((v) => collectTypedNodes(v, out));
}

function collectIds(obj, defined, referenced) {
  if (Array.isArray(obj)) return obj.forEach((o) => collectIds(o, defined, referenced));
  if (!obj || typeof obj !== "object") return;
  const keys = Object.keys(obj);
  if ("@id" in obj) {
    if (keys.length === 1) referenced.add(obj["@id"]);
    else defined.add(obj["@id"]);
  }
  Object.entries(obj).forEach(([k, v]) => {
    if (k !== "@id") collectIds(v, defined, referenced);
  });
}

function walkStrings(obj, path, cb) {
  if (typeof obj === "string") return cb(obj, path);
  if (Array.isArray(obj))
    return obj.forEach((v, i) => walkStrings(v, `${path}[${i}]`, cb));
  if (obj && typeof obj === "object")
    Object.entries(obj).forEach(([k, v]) =>
      walkStrings(v, path ? `${path}.${k}` : k, cb)
    );
}

function lintSchema(blocks) {
  const placeholders = [];
  const missing = [];
  const seenTypeMissing = new Set();

  blocks.forEach((b, i) => {
    walkStrings(b, `block[${i}]`, (str, path) => {
      if (PLACEHOLDER_RE.test(str)) {
        const m = str.match(PLACEHOLDER_RE);
        placeholders.push({ path, value: str, token: m ? m[0] : "" });
      }
    });
  });

  const nodes = [];
  blocks.forEach((b) => collectTypedNodes(b, nodes));
  nodes.forEach((node) => {
    const types = Array.isArray(node["@type"]) ? node["@type"] : [node["@type"]];
    types.forEach((t) => {
      const rec = RECOMMENDED[t];
      if (!rec) return;
      const miss = rec.filter((f) => !(f in node));
      if (miss.length) {
        const key = t + "|" + miss.join(",");
        if (!seenTypeMissing.has(key)) {
          seenTypeMissing.add(key);
          missing.push({ type: t, fields: miss });
        }
      }
    });
  });

  const defined = new Set();
  const referenced = new Set();
  blocks.forEach((b) => collectIds(b, defined, referenced));
  const brokenRefs = [...referenced].filter(
    (id) => !defined.has(id) && String(id).includes("#")
  );

  return { placeholders, missing, brokenRefs };
}

/* ----- schema completeness + suggest-the-fix ----- */

// Recommended-fields checklists (a richness heuristic, NOT a validity check).
const COMPLETENESS = {
  Organization: ["name", "url", "logo", "sameAs", "description"],
  Article: ["headline", "author", "datePublished", "dateModified", "image", "publisher"],
  Person: ["name", "url", "sameAs"],
};

// A field counts as missing if absent, empty, or an unresolved placeholder.
function isFilled(v) {
  if (v == null) return false;
  if (typeof v === "string") {
    const t = v.trim();
    return t !== "" && !PLACEHOLDER_RE.test(t) && !/FILL_ME/i.test(t);
  }
  if (Array.isArray(v)) return v.some(isFilled);
  if (typeof v === "object") return Object.keys(v).length > 0;
  return true; // number / boolean
}

const canonType = (t) =>
  ["NewsArticle", "BlogPosting", "Report", "ScholarlyArticle"].includes(t) ? "Article" : t;

function computeCompleteness(a) {
  const nodes = [];
  (a.jsonLd || []).forEach((b) => collectTypedNodes(b, nodes));
  const best = new Map(); // checklist type -> { node, filled }
  nodes.forEach((n) => {
    const types = Array.isArray(n["@type"]) ? n["@type"] : [n["@type"]];
    types.forEach((raw) => {
      const t = canonType(raw);
      if (!COMPLETENESS[t]) return;
      const filled = COMPLETENESS[t].filter((f) => isFilled(n[f])).length;
      const cur = best.get(t);
      if (!cur || filled > cur.filled) best.set(t, { node: n, filled });
    });
  });
  const results = [];
  best.forEach((info, type) => {
    const fields = COMPLETENESS[type];
    const missing = fields.filter((f) => !isFilled(info.node[f]));
    results.push({ type, found: fields.length - missing.length, total: fields.length, missing });
  });
  return results;
}

// detect social profile links already on the page (for Organization sameAs)
const SOCIAL_RE =
  /(?:^|\.)(?:twitter\.com|x\.com|facebook\.com|fb\.com|linkedin\.com|instagram\.com|youtube\.com|youtu\.be|github\.com|tiktok\.com|pinterest\.com|t\.me|threads\.net|mastodon\.[\w.]+)$/i;
function detectSocialLinks(a) {
  const out = [];
  (a.links || []).forEach((l) => {
    try {
      const host = new URL(l.href).hostname.replace(/^www\./, "");
      if (SOCIAL_RE.test(host) && !out.includes(l.href)) out.push(l.href);
    } catch {}
  });
  return out.slice(0, 8);
}

function findTypedNode(a, type) {
  const nodes = [];
  (a.jsonLd || []).forEach((b) => collectTypedNodes(b, nodes));
  return nodes.find((n) => {
    const t = Array.isArray(n["@type"]) ? n["@type"] : [n["@type"]];
    return t.map(canonType).includes(type) || t.includes(type);
  });
}

function jsonLdScript(obj) {
  return (
    '<script type="application/ld+json">\n' + JSON.stringify(obj, null, 2) + "\n</script>"
  );
}

function buildFaqSnippet(a) {
  const pairs = (a.faq && a.faq.pairs) || [];
  const source = pairs.length ? pairs : [null, null];
  return jsonLdScript({
    "@context": "https://schema.org",
    "@type": "FAQPage",
    name: a.title || "FILL_ME",
    url: a.canonical || a.url,
    mainEntity: source.slice(0, 10).map((p) => ({
      "@type": "Question",
      name: p ? p.q : "",
      acceptedAnswer: { "@type": "Answer", text: p ? p.a : "" },
    })),
  });
}

// schema freshness: Article JSON-LD wordCount vs rendered DOM word count
function articleSchemaWordCount(a) {
  const nodes = [];
  (a.jsonLd || []).forEach((b) => collectTypedNodes(b, nodes));
  for (const n of nodes) {
    const t = Array.isArray(n["@type"]) ? n["@type"] : [n["@type"]];
    if (!t.map(canonType).includes("Article")) continue;
    const wc = n.wordCount;
    if (typeof wc === "number" && wc > 0) return wc;
    if (typeof wc === "string" && /^\d+$/.test(wc.trim())) return parseInt(wc, 10);
  }
  return null;
}
function schemaWordCountStale(a) {
  const schemaWC = articleSchemaWordCount(a);
  // Compare against MAIN content — schema wordCount describes the article,
  // not the nav/footer/cookie-banner text that a.wordCount includes.
  const pageWC = (a.content && a.content.mainWordCount) || a.wordCount || 0;
  if (schemaWC == null || schemaWC <= 0 || pageWC <= 0) return null;
  if (Math.abs(schemaWC - pageWC) / pageWC > 0.15) return { schemaWC, pageWC };
  return null;
}

function buildOrgSnippet(a) {
  const org = findTypedNode(a, "Organization");
  const og = a.openGraph || {};
  const keep = (v) => (isFilled(v) ? v : null);

  const existingSameAs =
    org && Array.isArray(org.sameAs) ? org.sameAs.filter(isFilled) : [];
  const sameAs = [...new Set([...existingSameAs, ...detectSocialLinks(a)])];

  return jsonLdScript({
    "@context": "https://schema.org",
    "@type": "Organization",
    name: keep(org && org.name) || og["og:site_name"] || "FILL_ME",
    url: a.origin || a.url || "FILL_ME",
    logo: keep(org && org.logo) || "FILL_ME",
    sameAs: sameAs.length ? sameAs : ["FILL_ME"],
    description: keep(org && org.description) || a.metaDescription || "FILL_ME",
  });
}

// Build the flagged-gap list, each with a snippet fix or a plain-text note.
function computeSchemaIssues(a) {
  const blocks = a.jsonLd || [];
  const errors = a.jsonLdErrors || [];
  const issues = [];

  const typeSet = new Set();
  blocks.forEach((b) => collectTypes(b, typeSet));
  const completeness = computeCompleteness(a);
  const orgRes = completeness.find((r) => r.type === "Organization");

  // FAQ heading present but no FAQPage — only suggest a snippet if real Q&A
  // pairs were actually parsed from the page; otherwise just a verify note.
  const faqHeading = (a.headings || []).some((hd) =>
    /\bfaqs?\b|frequently asked questions/i.test(hd.text || "")
  );
  if (faqHeading && !typeSet.has("FAQPage")) {
    const qaCount = (a.faq && a.faq.qaCount) || 0;
    if (qaCount >= 2) {
      issues.push({
        status: "amber",
        label: "FAQ content without FAQPage schema",
        detail: FAQ_DEPRECATION_NOTE,
        fix: { kind: "snippet", code: buildFaqSnippet(a) },
      });
    } else {
      issues.push({
        status: "amber",
        label: "FAQ heading without detectable Q&A",
        detail: FAQ_VERIFY_NOTE,
        fix: null,
      });
    }
  }

  // Article schema wordCount drifted from the rendered page → stale data
  const stale = schemaWordCountStale(a);
  if (stale) {
    issues.push({
      status: "amber",
      label: "Schema wordCount doesn't match page",
      detail: `Schema wordCount (${stale.schemaWC}) vs ~${stale.pageWC} words of main content — structured data may be stale.`,
      fix: {
        kind: "note",
        text: "Regenerate (or remove) the Article's wordCount so the structured data reflects the current content.",
      },
    });
  }

  // No Organization, or incomplete one → templatable
  if (!orgRes) {
    issues.push({
      status: "amber",
      label: "No Organization schema",
      detail: "Define the publishing entity with an Organization node.",
      fix: { kind: "snippet", code: buildOrgSnippet(a) },
    });
  } else if (orgRes.missing.length) {
    issues.push({
      status: "amber",
      label: "Organization schema incomplete",
      detail: "Missing: " + orgRes.missing.join(", ") + ".",
      fix: { kind: "snippet", code: buildOrgSnippet(a) },
    });
  }

  // Non-templatable gaps → plain-text notes (no fabricated snippet)
  const lint = lintSchema(blocks);
  lint.placeholders.forEach((p) => {
    issues.push({
      status: "red",
      label: `Unresolved placeholder ${p.token}`,
      detail: `${p.path} — “${truncate(p.value, 70)}”`,
      fix: {
        kind: "note",
        text: `Replace ${p.token} with a real value before publishing — validators treat templated values as invalid, not as the intended content.`,
      },
    });
  });
  lint.brokenRefs.forEach((id) => {
    issues.push({
      status: "amber",
      label: "Unresolved @id reference",
      detail: String(id),
      fix: {
        kind: "note",
        text: "This @id is referenced but never defined in the page's JSON-LD. Add a node with this @id, or repoint the reference at a node that exists.",
      },
    });
  });
  errors.forEach((e) => {
    issues.push({
      status: "red",
      label: "Malformed JSON-LD block",
      detail: e.message + (e.snippet ? ` — ${truncate(e.snippet, 60)}` : ""),
      fix: {
        kind: "note",
        text: 'This <script type="application/ld+json"> block is not valid JSON, so it is ignored entirely. Fix the syntax (often a trailing comma or an unescaped quote).',
      },
    });
  });

  // ---- deeper sanity lint: dates, ratings, breadcrumbs, author shape ----
  const allNodes = [];
  blocks.forEach((b) => collectTypedNodes(b, allNodes));
  const firstOf = (v) => (Array.isArray(v) ? v[0] : v);
  allNodes.forEach((node) => {
    const types = Array.isArray(node["@type"]) ? node["@type"] : [node["@type"]];
    const tLabel = types.filter(Boolean).join("/");

    // dates: parseable, ordered, not in the future
    const pub = firstOf(node.datePublished);
    const mod = firstOf(node.dateModified);
    [["datePublished", pub], ["dateModified", mod]].forEach(([k, v]) => {
      if (v != null && typeof v === "string" && v.trim() && isNaN(Date.parse(v)))
        issues.push({
          status: "red",
          label: `Unparseable ${k}`,
          detail: `${tLabel}: "${truncate(v, 50)}"`,
          fix: {
            kind: "note",
            text: "Use ISO 8601 (e.g. 2026-06-11 or 2026-06-11T09:30:00+02:00) so parsers read the date reliably.",
          },
        });
    });
    if (
      pub && mod &&
      !isNaN(Date.parse(pub)) && !isNaN(Date.parse(mod)) &&
      Date.parse(mod) < Date.parse(pub)
    )
      issues.push({
        status: "amber",
        label: "dateModified earlier than datePublished",
        detail: `${tLabel}: modified ${truncate(String(mod), 25)} < published ${truncate(String(pub), 25)}`,
        fix: {
          kind: "note",
          text: "A page can't be modified before it was published — usually a template filling the wrong field.",
        },
      });
    if (pub && !isNaN(Date.parse(pub)) && Date.parse(pub) > Date.now() + 86400000)
      issues.push({
        status: "amber",
        label: "datePublished is in the future",
        detail: `${tLabel}: ${truncate(String(pub), 40)}`,
        fix: null,
      });

    // rating sanity (AggregateRating / Rating / reviewRating nodes)
    if (node.ratingValue != null) {
      const val = parseFloat(firstOf(node.ratingValue));
      if (isNaN(val)) {
        issues.push({
          status: "red",
          label: "ratingValue is not a number",
          detail: `${tLabel}: "${truncate(String(firstOf(node.ratingValue)), 30)}"`,
          fix: null,
        });
      } else {
        const best = node.bestRating != null ? parseFloat(firstOf(node.bestRating)) : 5;
        const worst = node.worstRating != null ? parseFloat(firstOf(node.worstRating)) : 1;
        if (!isNaN(best) && !isNaN(worst) && (val > best || val < worst))
          issues.push({
            status: "red",
            label: "ratingValue out of range",
            detail: `${tLabel}: ${val} outside ${worst}–${best}`,
            fix: {
              kind: "note",
              text: "Ratings outside the declared range disqualify the star rich result.",
            },
          });
      }
    }

    // breadcrumb position continuity
    if (types.includes("BreadcrumbList")) {
      const items = Array.isArray(node.itemListElement) ? node.itemListElement : [];
      const positions = items
        .map((it) => parseInt(it && it.position, 10))
        .filter((n) => !isNaN(n));
      if (positions.length) {
        const sorted = [...positions].sort((x, y) => x - y);
        if (!sorted.every((p2, i) => p2 === i + 1))
          issues.push({
            status: "amber",
            label: "BreadcrumbList positions not sequential",
            detail: "positions: " + positions.slice(0, 8).join(", "),
            fix: { kind: "note", text: "Positions must run 1, 2, 3… without gaps or duplicates." },
          });
      }
    }

    // author as plain text (Google recommends a Person/Organization object)
    if (types.some((x) => ["Article", "NewsArticle", "BlogPosting"].includes(x))) {
      const author = firstOf(node.author);
      if (typeof author === "string" && author.trim())
        issues.push({
          status: "amber",
          label: "author is plain text",
          detail: `"${truncate(author, 40)}"`,
          fix: {
            kind: "note",
            text: 'Google recommends an object: "author": {"@type": "Person", "name": "…", "url": "…"} — it enables author attribution (E-E-A-T).',
          },
        });
    }
  });

  return issues;
}

/* ----- JSON tree renderer ----- */
function highlightString(str) {
  const span = h("span", { class: "jt-string" });
  span.appendChild(document.createTextNode('"'));
  const re = new RegExp(PLACEHOLDER_RE.source, "gi");
  let last = 0;
  let m;
  while ((m = re.exec(str))) {
    if (m.index > last)
      span.appendChild(document.createTextNode(str.slice(last, m.index)));
    span.appendChild(h("span", { class: "jt-bad", text: m[0] }));
    last = m.index + m[0].length;
    if (m[0].length === 0) re.lastIndex++;
  }
  span.appendChild(document.createTextNode(str.slice(last)));
  span.appendChild(document.createTextNode('"'));
  return span;
}

function renderPrimitive(value) {
  if (value === null) return h("span", { class: "jt-null", text: "null" });
  if (typeof value === "boolean")
    return h("span", { class: "jt-boolean", text: String(value) });
  if (typeof value === "number")
    return h("span", { class: "jt-number", text: String(value) });
  return highlightString(String(value));
}

function renderValue(value, key) {
  const isObj = value && typeof value === "object";
  if (!isObj) {
    const row = h("div", { class: "jt-row jt-node" });
    if (key != null) {
      row.appendChild(h("span", { class: "jt-key", text: key }));
      row.appendChild(document.createTextNode(": "));
    }
    row.appendChild(renderPrimitive(value));
    return row;
  }
  const arr = Array.isArray(value);
  const entries = arr ? value.map((v, i) => [i, v]) : Object.entries(value);
  const open = arr ? "[" : "{";
  const close = arr ? "]" : "}";

  const node = h("div", { class: "jt-node" });
  const toggle = h("div", { class: "jt-row jt-toggle" });
  toggle.appendChild(h("span", { class: "jt-twisty", text: "▾" }));
  if (key != null) {
    toggle.appendChild(h("span", { class: "jt-key", text: key }));
    toggle.appendChild(document.createTextNode(": "));
  }
  toggle.appendChild(
    h("span", {
      class: "jt-punct",
      text: entries.length ? open : open + close,
    })
  );
  if (entries.length)
    toggle.appendChild(
      h("span", { class: "jt-punct", text: `  ${entries.length}` })
    );
  node.appendChild(toggle);

  if (entries.length) {
    const children = h("div", { class: "jt-children" });
    entries.forEach(([k, v]) => children.appendChild(renderValue(v, arr ? null : k)));
    node.appendChild(children);
    node.appendChild(h("div", { class: "jt-row jt-punct", text: close }));
  }
  toggle.addEventListener("click", () => node.classList.toggle("jt-collapsed"));
  return node;
}

function renderJsonTree(blocks) {
  const root = h("div", { class: "json-tree" });
  blocks.forEach((b) => root.appendChild(renderValue(b, null)));
  return root;
}

/* ============================================================
   heading flags
   ============================================================ */
function headingFlags(headings) {
  const counts = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 };
  let skips = 0;
  let empties = 0;
  let prev = 0;
  headings.forEach((hd) => {
    counts[hd.level] = (counts[hd.level] || 0) + 1;
    if (!hd.text) empties++;
    if (prev && hd.level > prev + 1) skips++;
    prev = hd.level;
  });
  return { counts, skips, empties, multipleH1: counts[1] > 1, noH1: counts[1] === 0 };
}

/* ============================================================
   E-E-A-T authoritative-domain detection
   ============================================================ */
const AUTH_DOMAINS = [
  "wikipedia.org",
  "doi.org",
  "nih.gov",
  "ncbi.nlm.nih.gov",
  "pubmed.ncbi.nlm.nih.gov",
  "who.int",
  "nature.com",
  "sciencedirect.com",
  "reuters.com",
  "nytimes.com",
  "harvard.edu",
  "stanford.edu",
  "mit.edu",
];
function isAuthoritative(host) {
  if (!host) return false;
  if (/\.gov$|\.gov\.[a-z]{2}$|\.edu$|\.ac\.[a-z]{2}$/.test(host)) return true;
  return AUTH_DOMAINS.some((d) => host === d || host.endsWith("." + d));
}

/* ============================================================
   TRIAGE — sort findings into Critical / Warning / Pass.
   Pure synthesis of data the audit already collects. No network.
   ============================================================ */

// Pixel width of a title at Google's desktop SERP size (20px Arial), measured
// with a real canvas — exact for the fonts this machine renders. Falls back to
// a per-character table (scaled to 20px) if canvas is unavailable.
let _titleMeasureCtx = null;
function estimateTitlePx(s) {
  const text = s || "";
  try {
    if (!_titleMeasureCtx)
      _titleMeasureCtx = document.createElement("canvas").getContext("2d");
    _titleMeasureCtx.font = '20px Arial, "Helvetica Neue", Helvetica, sans-serif';
    return Math.round(_titleMeasureCtx.measureText(text).width);
  } catch {
    let w = 0;
    for (const ch of text) {
      if (/[ .,:;'!|ijl]/.test(ch)) w += 5;
      else if (/[ftIr()\[\]\-]/.test(ch)) w += 7;
      else if (/[mwMW]/.test(ch)) w += 16;
      else if (/[A-Z]/.test(ch)) w += 12;
      else w += 10;
    }
    return Math.round(w);
  }
}

function computeTriage(a) {
  const F = [];
  const headings = a.headings || [];
  const images = a.images || [];
  const og = a.openGraph || {};
  const tw = a.twitter || {};
  const p = a.performance || {};

  const typeSet = new Set();
  (a.jsonLd || []).forEach((b) => collectTypes(b, typeSet));
  const nodes = [];
  (a.jsonLd || []).forEach((b) => collectTypedNodes(b, nodes));

  // ---- CRITICAL ----
  // noindex — search engines are told to drop the page; nothing matters more.
  const robotsAll = `${a.robotsMeta || ""} ${a.googlebotMeta || ""}`;
  if (/\b(?:noindex|none)\b/i.test(robotsAll))
    F.push({
      sev: "critical",
      label: "Page is set to noindex",
      detail: `Robots meta contains "${
        /\bnone\b/i.test(robotsAll) ? "none" : "noindex"
      }" — search engines are instructed not to index this page.`,
    });

  if (!a.title || !a.title.trim())
    F.push({
      sev: "critical",
      label: "Missing <title>",
      detail: "The most important on-page element — search results have nothing to show.",
    });

  // conflicting canonicals — search engines may ignore all canonical hints
  const tc = a.tagCounts || {};
  const canonDistinct = [...new Set((a.canonicalUrls || []).map(normalizeForCompare))];
  if ((tc.canonical || 0) > 1 && canonDistinct.length > 1)
    F.push({
      sev: "critical",
      label: `Conflicting canonical tags (${tc.canonical})`,
      detail:
        "They point to different URLs — search engines may ignore all of them. " +
        (a.canonicalUrls || []).slice(0, 2).join("  vs  "),
    });

  const h1 = headings.filter((h) => h.level === 1).length;
  if (h1 !== 1)
    F.push({
      sev: "critical",
      label: h1 === 0 ? "No H1 on the page" : `Multiple H1s (${h1})`,
      detail: "A page should have exactly one H1 as its main topic.",
    });

  // ---- WARNING (impact-ordered) ----
  // canonical pointing elsewhere — sometimes intentional, catastrophic when not
  const canonSelf =
    !!a.canonical && normalizeForCompare(a.canonical) === normalizeForCompare(a.url);
  if (a.canonical && !canonSelf)
    F.push({
      sev: "warning",
      label: "Canonical points to a different URL",
      detail: `canonical: ${a.canonical} — search engines are told to index that URL instead of this one. Fine if intentional (parameter cleanup, pagination); a serious bug if not.`,
    });

  if ((tc.canonical || 0) > 1 && canonDistinct.length === 1)
    F.push({
      sev: "warning",
      label: `Duplicate canonical tags (${tc.canonical}, same URL)`,
      detail: "Harmless to search engines, but usually a template rendering the tag twice.",
    });

  if (a.canonicalInBody)
    F.push({
      sev: "warning",
      label: "Canonical tag inside <body>",
      detail: "Canonical link tags are only honored in <head> — this one is ignored.",
    });

  if ((tc.title || 0) > 1)
    F.push({
      sev: "warning",
      label: `${tc.title} <title> tags`,
      detail: "Search engines read the first; the rest are ignored and usually a template bug.",
    });

  if ((tc.metaDescription || 0) > 1)
    F.push({
      sev: "warning",
      label: `${tc.metaDescription} meta description tags`,
      detail: "Only one is used — duplicates make it unpredictable which.",
    });

  if (!a.metaDescription || !a.metaDescription.trim())
    F.push({
      sev: "warning",
      label: "No meta description",
      detail: "Search engines will improvise a snippet from page text — you lose control of the pitch.",
    });

  const relOg = relativeOgImage(a);
  if (relOg)
    F.push({
      sev: "warning",
      label: "og:image is a relative URL",
      detail: `"${truncate(relOg, 60)}" — most platforms require an absolute URL and will show no image.`,
    });

  // mixed content — insecure assets on a secure page
  const mc = a.mixedContent || { count: 0, samples: [] };
  if (a.isHttps && mc.count)
    F.push({
      sev: "warning",
      label: `${mc.count} insecure (http://) resource${mc.count > 1 ? "s" : ""} on an HTTPS page`,
      detail: "Browsers block or warn on mixed content, and it undermines the secure connection.",
      items: (mc.samples || []).map((s) => ({ text: `[${s.kind}] ${s.url}` })),
    });

  // hreflang sanity — the two serious failures (full lint in Technical)
  computeHreflangIssues(a).forEach((iss) => {
    if (iss.triage)
      F.push({ sev: "warning", label: "hreflang: " + iss.label, detail: iss.detail });
  });

  // canonical vs og:url
  const ogUrl = og["og:url"];
  if (a.canonical && ogUrl) {
    const norm = (u) => u.replace(/\/+$/, "").toLowerCase();
    if (norm(a.canonical) !== norm(ogUrl))
      F.push({
        sev: "warning",
        label: "canonical URL ≠ og:url",
        detail: `canonical: ${a.canonical} · og:url: ${ogUrl}`,
      });
  }

  // images missing alt — list each by src (click-to-highlight on the page)
  const noAlt = images.filter((i) => !i.hasAlt);
  if (noAlt.length)
    F.push({
      sev: "warning",
      label: `${noAlt.length} image${noAlt.length > 1 ? "s" : ""} missing alt text`,
      items: noAlt.map((i) => ({
        text: i.src || "(inline / data-URI image)",
        locator: i.locator,
      })),
    });

  // Article freshness: no dateModified OR no visible "last updated"
  const articlePresent = ["Article", "NewsArticle", "BlogPosting"].some((t) => typeSet.has(t));
  if (articlePresent) {
    const hasDateMod = nodes.some((n) => n.dateModified);
    const hasLastUpdated = !!(a.eeat && a.eeat.lastUpdatedText);
    if (!hasDateMod || !hasLastUpdated) {
      const missing = [];
      if (!hasDateMod) missing.push("schema dateModified");
      if (!hasLastUpdated) missing.push('visible "last updated" text');
      F.push({
        sev: "warning",
        label: "Article freshness signal missing",
        detail: "Missing " + missing.join(" and ") + ".",
      });
    }
  }

  // FAQ heading but no FAQPage schema — gate on parseable Q&A, honest justification
  const hasFaqHeading = headings.some((hd) =>
    /\bfaqs?\b|frequently asked questions/i.test(hd.text || "")
  );
  if (hasFaqHeading && !typeSet.has("FAQPage")) {
    const qaCount = (a.faq && a.faq.qaCount) || 0;
    F.push(
      qaCount >= 2
        ? { sev: "warning", label: "FAQ section without FAQPage schema", detail: FAQ_DEPRECATION_NOTE }
        : { sev: "warning", label: "FAQ heading without detectable Q&A", detail: FAQ_VERIFY_NOTE }
    );
  }

  // schema freshness — Article wordCount drifted from the rendered page
  const stale = schemaWordCountStale(a);
  if (stale)
    F.push({
      sev: "warning",
      label: "Schema wordCount doesn't match page",
      detail: `Schema wordCount (${stale.schemaWC}) vs ~${stale.pageWC} words of main content — structured data may be stale.`,
    });

  // title truncation — pixel width only (a short-but-wide title can still truncate;
  // a long-but-narrow one may not). Character count is not used.
  const titlePx = estimateTitlePx(a.title || "");
  if (titlePx > TITLE_PX_LIMIT)
    F.push({
      sev: "warning",
      label: "Title may be truncated in search results",
      detail: `~${titlePx}px (Google truncates around ~${TITLE_PX_LIMIT}px) · ${a.titleLength} chars`,
    });

  // empty headings — list each (click-to-highlight on the page)
  const emptyHeads = headings.filter((hd) => !hd.text || !hd.text.trim());
  if (emptyHeads.length)
    F.push({
      sev: "warning",
      label: `${emptyHeads.length} empty heading${emptyHeads.length > 1 ? "s" : ""}`,
      detail: "Headings with no text muddy the document outline.",
      items: emptyHeads.map((hd) => ({ text: `(empty H${hd.level})`, locator: hd.locator })),
    });

  // ---- PASS ----
  if (h1 === 1)
    F.push({
      sev: "pass",
      label: "Exactly one H1",
      detail: "Clear single-page topic.",
    });

  if (a.isHttps)
    F.push({
      sev: "pass",
      label: "Served over HTTPS",
      detail: "Secure TLS connection.",
    });

  if (canonSelf)
    F.push({
      sev: "pass",
      label: "Canonical is self-referencing",
      detail: a.canonical,
    });

  if (a.title && titlePx <= TITLE_PX_LIMIT)
    F.push({
      sev: "pass",
      label: "Title fits in search results",
      detail: `~${titlePx}px · within the ~${TITLE_PX_LIMIT}px limit`,
    });

  if (a.metaDescription && a.metaDescription.trim())
    F.push({
      sev: "pass",
      label: "Meta description present",
      detail: "Search engines have a summary snippet to show.",
    });

  if (og["og:title"] || og["og:image"])
    F.push({
      sev: "pass",
      label: "Open Graph tags present",
      detail: "Social shares render a rich preview.",
    });

  if (a.viewport)
    F.push({
      sev: "pass",
      label: "Viewport configured",
      detail: "Mobile-friendly viewport meta is set.",
    });

  if (a.lang)
    F.push({
      sev: "pass",
      label: "Language declared",
      detail: `Declared as "${a.lang}".`,
    });

  if (!tw["twitter:title"] && og["og:title"])
    F.push({
      sev: "pass",
      label: "twitter:title not set — og:title is used",
      detail: "Not a problem: Twitter/X falls back to og:title.",
    });

  if (p.lcp != null && p.cls != null && p.lcp < 2500 && p.cls < 0.1)
    F.push({
      sev: "pass",
      label: "Core Web Vitals look healthy",
      detail: `LCP ${fmtMs(p.lcp)} · CLS ${p.cls.toFixed(3)} (this load)`,
    });

  return F;
}

const SEV_BAND = { critical: "red", warning: "amber", pass: "green" };

// Condensed "since last scan" line for the verdict meta (null if no history).
function sinceLastSummary() {
  if (!historyState || historyState.unavailable) return null;
  const { prev, cur } = historyState;
  if (!prev || !cur) return "first scan of this page";
  const bits = [];
  const rd = cur.readability.overall - prev.readability.overall;
  if (rd) bits.push(`readability ${rd > 0 ? "+" : ""}${rd}`);
  const wd = cur.triage.warning - prev.triage.warning;
  if (wd < 0) bits.push(`${-wd} warning${-wd > 1 ? "s" : ""} resolved`);
  else if (wd > 0) bits.push(`${wd} new warning${wd > 1 ? "s" : ""}`);
  const cd = cur.triage.critical - prev.triage.critical;
  if (cd < 0) bits.push(`${-cd} critical resolved`);
  else if (cd > 0) bits.push(`${cd} new critical`);
  const summary = bits.length ? bits.join(" · ") : "no change since last scan";
  return `${summary} · ${timeAgo(prev.ts)}`;
}

function renderTriage(a) {
  const out = [];
  const F = computeTriage(a);
  const crit = F.filter((f) => f.sev === "critical");
  const warn = F.filter((f) => f.sev === "warning");
  const pass = F.filter((f) => f.sev === "pass");

  const sourceLabel =
    a.domSource === "rendered" ? "rendered DOM (post-JavaScript)" : "raw HTML";

  // ----- verdict header (dynamic status from the counts) -----
  let vBand, vStatus, vSub;
  if (crit.length) {
    vBand = "red";
    vStatus = "Critical issues";
    vSub =
      `${crit.length} critical issue${crit.length > 1 ? "s" : ""}` +
      (warn.length ? ` · ${warn.length} warning${warn.length > 1 ? "s" : ""}` : "");
  } else if (warn.length) {
    vBand = "amber";
    vStatus = "Needs attention";
    vSub = `${warn.length} warning${warn.length > 1 ? "s" : ""} to review`;
  } else {
    vBand = "green";
    vStatus = "Looking healthy";
    vSub = pass.length
      ? `${pass.length} check${pass.length > 1 ? "s" : ""} passed`
      : "No issues found";
  }

  const countPill = (label, n, band) =>
    h(
      "span",
      { class: "cpill" + (n ? " cpill--" + band : "") },
      h("span", { class: "dot dot--" + band }),
      h("b", { text: String(n) }),
      " " + label
    );

  let metaText = `Read from ${sourceLabel}`;
  const ss = sinceLastSummary();
  if (ss) metaText += ` · ${ss}`;
  metaText += ` · scanned ${new Date(a.scrapedAt).toLocaleTimeString()}`;

  out.push(
    h(
      "section",
      { class: "card verdict-card" },
      h(
        "div",
        { class: "verdict-top" },
        h("span", {
          class: "verdict-ico verdict-ico--" + vBand,
          html: vBand === "green" ? ICON.check : ICON.alert,
        }),
        h(
          "div",
          {},
          h("div", { class: "verdict-status", text: vStatus }),
          h("div", { class: "verdict-sub", text: vSub })
        )
      ),
      h(
        "div",
        { class: "count-pills" },
        countPill("Critical", crit.length, "red"),
        countPill("Warnings", warn.length, "amber"),
        countPill("Passed", pass.length, "green")
      ),
      h("p", { class: "note", text: metaText })
    )
  );

  // ----- findings feed (one surface, grouped by severity) -----
  const feed = h("section", { class: "card feed-card" });
  let any = false;
  [
    ["Critical", "red", crit],
    ["Warnings", "amber", warn],
    ["Passed", "green", pass],
  ].forEach(([label, band, items]) => {
    if (!items.length) return;
    any = true;
    const group = h("details", { class: "feed-group", open: true });
    group.appendChild(
      h(
        "summary",
        { class: "feed-group-head" },
        h("span", { class: "dot dot--" + band }),
        label,
        h("span", { class: "fgh-cnt", text: String(items.length) })
      )
    );
    items.forEach((f) => {
      const body = h(
        "div",
        { class: "finding-body" },
        h("div", { class: "finding-title", text: f.label }),
        f.detail ? h("div", { class: "finding-detail", text: f.detail }) : null
      );
      if (f.items && f.items.length) {
        // Every item renders — .triage-items caps the visible height and scrolls.
        const list = h("div", { class: "triage-items" });
        f.items.forEach((it) => {
          const row = h(
            "div",
            { class: "triage-item", title: it.text },
            h("span", { class: "triage-item-text", text: it.text })
          );
          attachHighlight(row, it.locator, truncate(it.text, 40));
          list.appendChild(row);
        });
        body.appendChild(list);
      }
      group.appendChild(
        h(
          "div",
          { class: "finding" },
          h("span", {
            class: "finding-chip chip--" + band,
            html: band === "green" ? ICON.check : ICON.alert,
          }),
          body
        )
      );
    });
    feed.appendChild(group);
  });
  if (!any) {
    feed.appendChild(
      h("p", { class: "muted", text: "No findings from the collected data." })
    );
  }
  out.push(feed);

  out.push(renderHistoryList(a));
  return out;
}

/* ============================================================
   PHASE 2 — LLM Readability (client-side heuristic, no network).
   Estimates how cleanly an LLM can read & cite the page from three
   dimensions: schema cleanliness, answer extractability, content ratio.
   ============================================================ */
function computeReadability(a) {
  const blocks = a.jsonLd || [];
  const c = a.content || {};

  // --- schema cleanliness ---
  let schema = 100;
  const schemaNotes = [];
  if (!blocks.length) {
    schema = 25;
    schemaNotes.push({
      ok: false,
      text: a.microdataCount
        ? "No JSON-LD structured data (microdata present, not parsed)"
        : "No JSON-LD structured data",
    });
  } else {
    schemaNotes.push({ ok: true, text: `${blocks.length} JSON-LD block(s)` });
    const lint = lintSchema(blocks);
    if (lint.placeholders.length) {
      schema -= 25;
      schemaNotes.push({ ok: false, text: `${lint.placeholders.length} placeholder value(s)` });
    }
    if ((a.jsonLdErrors || []).length) {
      schema -= 25;
      schemaNotes.push({ ok: false, text: `${a.jsonLdErrors.length} malformed block(s)` });
    }
    if (lint.brokenRefs.length) {
      schema -= 10;
      schemaNotes.push({ ok: false, text: `${lint.brokenRefs.length} broken @id reference(s)` });
    }
    const comp = computeCompleteness(a);
    if (comp.length) {
      const miss = comp.reduce((s, r) => s + r.missing.length, 0);
      const tot = comp.reduce((s, r) => s + r.total, 0);
      const ratio = tot ? 1 - miss / tot : 1;
      schema = schema * (0.6 + 0.4 * ratio);
      schemaNotes.push({
        ok: miss === 0,
        text: miss ? `${miss} recommended schema field(s) missing` : "recommended schema fields complete",
      });
    }
  }
  schema = clampScore(schema);

  // --- answer extractability ---
  let ans = 0;
  const ansNotes = [];
  if (a.title && a.titleLength >= 10) {
    ans += 12;
    ansNotes.push({ ok: true, text: "Descriptive <title>" });
  } else ansNotes.push({ ok: false, text: "Weak or missing <title>" });
  if (a.metaDescription) {
    ans += 10;
    ansNotes.push({ ok: true, text: "Meta description present" });
  } else ansNotes.push({ ok: false, text: "No meta description" });
  const flags = headingFlags(a.headings || []);
  if (!flags.noH1 && !flags.multipleH1) {
    ans += 16;
    ansNotes.push({ ok: true, text: "Exactly one H1" });
  } else ansNotes.push({ ok: false, text: flags.noH1 ? "No H1" : "Multiple H1s" });
  if (!flags.skips) ans += 10;
  else ansNotes.push({ ok: false, text: `${flags.skips} skipped heading level(s)` });
  if (!flags.empties) ans += 6;
  else ansNotes.push({ ok: false, text: `${flags.empties} empty heading(s)` });
  if ((a.headings || []).length >= 3) {
    ans += 8;
    ansNotes.push({ ok: true, text: `${a.headings.length} headings give structure` });
  }
  const qa = (a.faq && a.faq.qaCount) || 0;
  if (qa >= 2) {
    ans += 14;
    ansNotes.push({ ok: true, text: `${qa} Q&A pairs (highly extractable)` });
  }
  if ((c.lists || 0) > 0 || (c.tables || 0) > 0) {
    ans += 12;
    ansNotes.push({ ok: true, text: `${c.lists || 0} list(s), ${c.tables || 0} table(s)` });
  } else ansNotes.push({ ok: false, text: "No lists or tables to structure answers" });
  if ((c.paragraphs || 0) >= 3) ans += 12;
  ans = clampScore(ans);

  // --- content-to-chrome ratio ---
  const body = a.wordCount || 0;
  const main = c.mainWordCount || 0;
  let ratio = body > 0 ? main / body : 0;
  ratio = Math.max(0, Math.min(1, ratio));
  let cr = clampScore(((ratio - 0.3) / (0.75 - 0.3)) * 100);
  const crNotes = [
    {
      ok: ratio >= 0.5,
      text: `Main content ≈ ${Math.round(ratio * 100)}% of page text (${main}/${body} words)`,
    },
  ];
  if (body < 300) crNotes.push({ ok: false, text: "Thin content (under 300 words)" });

  const overall = clampScore(schema * 0.3 + ans * 0.4 + cr * 0.3);
  return {
    overall,
    dims: [
      { key: "schema", label: "Schema cleanliness", score: schema, notes: schemaNotes },
      { key: "extract", label: "Answer extractability", score: ans, notes: ansNotes },
      { key: "ratio", label: "Content-to-chrome ratio", score: cr, notes: crNotes },
    ],
  };
}

function renderReadability(a) {
  const out = [];
  const r = computeReadability(a);
  const band = scoreBand(r.overall);

  // hero
  out.push(
    card(
      "LLM Readability",
      { right: pill("heuristic") },
      h(
        "div",
        { class: "score-hero" },
        h(
          "div",
          { class: "score-num" },
          h("span", { class: "score-big is-" + band, text: String(r.overall) }),
          h("span", { class: "score-unit", text: "/ 100" })
        ),
        h(
          "div",
          { class: "score-hero-meta" },
          h("div", {
            class: "score-verdict is-" + band,
            text: r.overall >= 80 ? "Easy to parse" : r.overall >= 50 ? "Parseable, with gaps" : "Hard to parse",
          }),
          scoreBar(r.overall)
        )
      )
    )
  );

  // dimensions
  r.dims.forEach((d) => {
    const body = h("div", {});
    body.appendChild(
      h(
        "div",
        { class: "dim-head" },
        h("span", { class: "dim-score is-" + scoreBand(d.score), text: `${d.score}` }),
        scoreBar(d.score)
      )
    );
    d.notes.forEach((n) =>
      body.appendChild(
        checkRow({ status: n.ok ? "green" : "amber", label: n.text })
      )
    );
    out.push(card(d.label, {}, body));
  });

  out.push(
    card(
      null,
      {},
      h("p", {
        class: "note",
        text: "Heuristic estimate of how cleanly an LLM can read and cite this page — computed locally, not a real model's judgment. Live LLM grading is planned.",
      })
    )
  );
  return out;
}

/* ============================================================
   Feature 3 — Content & keyword analysis (pure client-side text math)
   ============================================================ */
const STOPWORDS = new Set(
  ("a about above after again against all am an and any are aren't as at be because " +
    "been before being below between both but by can cannot could couldn't did didn't " +
    "do does doesn't doing don't down during each few for from further had hadn't has " +
    "hasn't have haven't having he he'd he'll he's her here here's hers herself him " +
    "himself his how how's i i'd i'll i'm i've if in into is isn't it it's its itself " +
    "let's me more most mustn't my myself no nor not of off on once only or other ought " +
    "our ours ourselves out over own same shan't she she'd she'll she's should shouldn't " +
    "so some such than that that's the their theirs them themselves then there there's " +
    "these they they'd they'll they're they've this those through to too under until up " +
    "very was wasn't we we'd we'll we're we've were weren't what what's when when's where " +
    "where's which while who who's whom why why's will with won't would wouldn't you " +
    "you'd you'll you're you've your yours yourself yourselves").split(/\s+/)
);

// Vowel-group syllable estimate (heuristic; good enough for a Flesch estimate).
function countSyllables(w) {
  w = String(w).toLowerCase().replace(/[^a-z]/g, "");
  if (!w) return 0;
  if (w.length <= 3) return 1;
  w = w.replace(/(?:[^laeiouy]es|ed|[^laeiouy]e)$/, "");
  w = w.replace(/^y/, "");
  const groups = w.match(/[aeiouy]{1,2}/g);
  return groups ? groups.length : 1;
}

function easeBand(score) {
  if (score >= 60)
    return { band: "green", label: score >= 90 ? "Very easy" : score >= 70 ? "Easy" : "Plain English" };
  if (score >= 30)
    return { band: "amber", label: score >= 50 ? "Fairly difficult" : "Difficult" };
  return { band: "red", label: "Very difficult" };
}

function countOccurrences(haystack, needle) {
  if (!needle || !haystack) return 0;
  const re = new RegExp(needle.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "gi");
  const m = haystack.match(re);
  return m ? m.length : 0;
}

function computeContent(a) {
  const c = a.content || {};
  const text = c.text || "";
  // Unicode-aware tokens (\p{L}/\p{N}) so Serbian, German, French etc. words
  // count as words instead of being split on every diacritic.
  const words = text.match(/[\p{L}\p{N}'’]+/gu) || [];
  const wordCount = words.length || c.mainWordCount || 0;
  const sentences = Math.max(1, c.sentences || 0);

  // Flesch is calibrated for English — on a page that declares another
  // language the number would be noise, so it's skipped (and the UI says why).
  const fleschApplies = !a.lang || /^en\b/i.test(a.lang);

  let syl = 0;
  let flesch = null;
  if (fleschApplies && wordCount > 0) {
    for (const w of words) syl += countSyllables(w);
    flesch = 206.835 - 1.015 * (wordCount / sentences) - 84.6 * (syl / wordCount);
    flesch = Math.round(flesch);
  }

  const readingMin = Math.max(1, Math.round(wordCount / 200));
  const avgWPS = sentences ? Math.round((wordCount / sentences) * 10) / 10 : 0;

  // term frequency (meaningful words only)
  const freq = new Map();
  const meaningful = [];
  for (const raw of words) {
    const w = raw.toLowerCase();
    if (w.length < 3 || STOPWORDS.has(w) || /^\d+$/.test(w)) {
      meaningful.push(null);
      continue;
    }
    meaningful.push(w);
    freq.set(w, (freq.get(w) || 0) + 1);
  }
  const topTerms = [...freq.entries()]
    .sort((x, y) => y[1] - x[1])
    .slice(0, 12)
    .map(([term, count]) => ({
      term,
      count,
      density: wordCount ? (count / wordCount) * 100 : 0,
    }));

  // bigrams (both words meaningful & adjacent)
  const bigramFreq = new Map();
  for (let i = 0; i < meaningful.length - 1; i++) {
    if (meaningful[i] && meaningful[i + 1]) {
      const bg = meaningful[i] + " " + meaningful[i + 1];
      bigramFreq.set(bg, (bigramFreq.get(bg) || 0) + 1);
    }
  }
  let topBigram = null;
  for (const [bg, ct] of bigramFreq) {
    if (!topBigram || ct > topBigram.count) topBigram = { term: bg, count: ct };
  }

  // guess: prefer a strong bigram, else the top single term
  let topGuess = topTerms.length ? topTerms[0].term : null;
  if (topBigram && topGuess) {
    const topUni = topTerms[0].count;
    if (topBigram.count >= Math.max(2, topUni * 0.5)) topGuess = topBigram.term;
  } else if (topBigram && !topGuess) {
    topGuess = topBigram.term;
  }

  return {
    wordCount,
    sentences,
    syllables: syl,
    flesch,
    fleschSkipped: !fleschApplies,
    readingMin,
    avgWPS,
    paragraphs: c.paragraphs || 0,
    lists: c.lists || 0,
    tables: c.tables || 0,
    topTerms,
    topGuess,
  };
}

function keywordCoverage(a, phrase, wordCount) {
  const p = phrase.toLowerCase();
  const inc = (s) => (s || "").toLowerCase().includes(p);
  const headings = a.headings || [];
  const bodyCount = countOccurrences((a.content && a.content.text) || "", phrase);
  return {
    inTitle: inc(a.title),
    h1Exists: headings.some((hd) => hd.level === 1),
    inH1: headings.some((hd) => hd.level === 1 && inc(hd.text)),
    inFirstPara: inc((a.content && a.content.firstParagraph) || ""),
    inAnyHeading: headings.some((hd) => inc(hd.text)),
    bodyCount,
    density: wordCount ? (bodyCount / wordCount) * 100 : 0,
  };
}

function renderKeywordCard(a, content) {
  const coverageWrap = h("div", {});

  const render = () => {
    coverageWrap.textContent = "";
    let phrase = keyword.trim();
    let guessed = false;
    if (!phrase) {
      phrase = content.topGuess || "";
      guessed = !!phrase;
    }
    if (!phrase) {
      coverageWrap.appendChild(
        h("p", { class: "muted", text: "Type a target keyword above to see coverage." })
      );
      return;
    }
    const cov = keywordCoverage(a, phrase, content.wordCount);
    coverageWrap.appendChild(
      h("p", {
        class: "note",
        text: guessed
          ? `Analyzing “${phrase}” (guessed — type your target above).`
          : `Analyzing “${phrase}”.`,
      })
    );
    [
      checkRow({ status: cov.inTitle ? "green" : "amber", label: "Appears in <title>", detail: truncate(a.title || "(no title)", 70) }),
      checkRow({
        status: !cov.h1Exists ? "neutral" : cov.inH1 ? "green" : "amber",
        label: "Appears in H1",
        detail: cov.h1Exists ? (cov.inH1 ? "found" : "not in the H1") : "no H1 on page",
      }),
      checkRow({ status: cov.inFirstPara ? "green" : "amber", label: "Appears in first paragraph", detail: cov.inFirstPara ? "found" : "not found" }),
      checkRow({ status: cov.inAnyHeading ? "green" : "amber", label: "Appears in any heading", detail: cov.inAnyHeading ? "found" : "not found" }),
      checkRow({
        status: cov.bodyCount > 0 ? "green" : "amber",
        label: "Appears in body",
        detail: `${cov.bodyCount}× · density ${cov.density.toFixed(2)}%`,
        value: cov.bodyCount,
      }),
    ].forEach((r) => coverageWrap.appendChild(r));
  };

  const input = h("input", {
    class: "kw-input",
    type: "text",
    placeholder: "e.g. on-page seo inspector",
    "aria-label": "Target keyword",
    value: keyword,
    spellcheck: "false",
  });
  let deb = null;
  input.addEventListener("input", () => {
    keyword = input.value;
    try {
      localStorage.setItem("seodin.keyword", keyword);
    } catch {}
    clearTimeout(deb);
    deb = setTimeout(render, 200);
  });

  render();
  return card("Target keyword", { right: pill("coverage") }, input, coverageWrap);
}

function renderContent(a) {
  const out = [];
  const ct = computeContent(a);

  // reading ease hero
  if (ct.flesch != null) {
    const eb = easeBand(ct.flesch);
    out.push(
      card(
        "Reading ease",
        { right: pill("estimate") },
        h(
          "div",
          { class: "ease-hero" },
          h(
            "div",
            { class: "ease-num" },
            h("span", { class: "score-big is-" + eb.band, text: String(ct.flesch) }),
            h("span", { class: "score-unit", text: "Flesch" })
          ),
          h(
            "div",
            { class: "score-hero-meta" },
            h(
              "div",
              { class: "ease-band" },
              statusDot(eb.band),
              h("span", { class: "is-" + eb.band, text: eb.label })
            ),
            h(
              "div",
              { class: "bar" },
              h("div", {
                class: "bar-fill is-" + eb.band,
                style: { width: Math.max(0, Math.min(100, ct.flesch)) + "%" },
              })
            )
          )
        ),
        h("p", {
          class: "note",
          text: "Flesch Reading Ease (0–100, higher = easier) estimated from sentence length and a syllable heuristic — not exact.",
        })
      )
    );
  } else if (ct.fleschSkipped) {
    out.push(
      card(
        "Reading ease",
        { right: pill("skipped") },
        h("p", {
          class: "muted",
          text: `Flesch Reading Ease is calibrated for English — this page declares lang="${a.lang}", so no score is shown instead of a misleading one.`,
        })
      )
    );
  } else {
    out.push(card("Reading ease", {}, h("p", { class: "muted", text: "Not enough readable text to estimate." })));
  }

  // stats grid
  out.push(
    card(
      "Stats",
      { right: pill(`~${ct.readingMin} min read`, "accent") },
      h(
        "div",
        { class: "metric-grid" },
        metric("Words", String(ct.wordCount)),
        metric("Sentences", String(ct.sentences)),
        metric("Avg / sentence", String(ct.avgWPS), { sub: "words" }),
        metric("Paragraphs", String(ct.paragraphs)),
        metric("Lists", String(ct.lists)),
        metric("Tables", String(ct.tables))
      )
    )
  );

  // top terms
  if (ct.topTerms.length) {
    const maxCount = ct.topTerms[0].count || 1;
    const terms = h("div", { class: "terms" });
    ct.topTerms.forEach((t) => {
      terms.appendChild(
        h(
          "div",
          { class: "term-row" },
          h("span", { class: "term-word", text: t.term }),
          h(
            "div",
            { class: "term-bar" },
            h("div", { class: "term-bar-fill", style: { width: (t.count / maxCount) * 100 + "%" } })
          ),
          h("span", { class: "term-count", text: `${t.count}× · ${t.density.toFixed(2)}%` })
        )
      );
    });
    out.push(
      card(
        "Top terms",
        { right: pill("stopwords removed") },
        terms,
        h("p", { class: "note", text: "Most frequent meaningful words · density = share of total words." })
      )
    );
  }

  // target keyword
  out.push(renderKeywordCard(a, ct));

  return out;
}

/* ============================================================
   Feature 4 — Accessibility quick-audit (honest automated checks)
   ============================================================ */
function computeA11y(a) {
  const x = a.a11y || {};
  const lm = x.landmarks || {};
  const imgs = a.images || [];
  const missingAlt = imgs.filter((i) => !i.hasAlt);
  const flags = headingFlags(a.headings || []);
  const checks = [];

  // document basics
  checks.push({
    key: "lang",
    status: x.htmlLang ? "green" : "red",
    label: "<html lang> set",
    detail: x.htmlLang ? x.htmlLang : "missing — assistive tech can't detect the language",
  });
  checks.push({
    key: "title",
    status: a.title ? "green" : "red",
    label: "Page <title> present",
    detail: a.title ? truncate(a.title, 70) : "missing",
  });
  checks.push({
    key: "zoom",
    status: x.viewportZoomBlocked ? "red" : "green",
    label: "Pinch-zoom allowed",
    detail: x.viewportZoomBlocked
      ? "viewport blocks zoom (user-scalable=no / maximum-scale=1)"
      : "not blocked",
  });

  // landmarks — missing <main> is a real fail; others are informational
  checks.push({
    key: "main",
    status: lm.main ? "green" : "red",
    label: "<main> landmark",
    detail: lm.main ? "present" : "missing — no primary content landmark",
  });
  checks.push({ key: "nav", status: lm.nav ? "green" : "amber", label: "<nav> landmark", detail: lm.nav ? "present" : "none found" });
  checks.push({ key: "header", status: lm.header ? "green" : "amber", label: "<header> / banner", detail: lm.header ? "present" : "none found" });
  checks.push({ key: "footer", status: lm.footer ? "green" : "amber", label: "<footer> / contentinfo", detail: lm.footer ? "present" : "none found" });

  // images missing alt (reuse image locators for highlighting)
  checks.push({
    key: "alt",
    status: missingAlt.length ? (missingAlt.length > 3 ? "red" : "amber") : "green",
    label: "Images have alt text",
    detail: missingAlt.length
      ? `${missingAlt.length} of ${imgs.length} missing alt`
      : `${imgs.length} image(s) OK`,
    count: missingAlt.length,
    samples: missingAlt.slice(0, 12).map((i) => ({ desc: i.src || "(inline image)", locator: i.locator })),
  });

  // form controls without an accessible label
  const fn = x.formNoLabel || { count: 0, samples: [] };
  checks.push({
    key: "labels",
    status: fn.count ? "red" : "green",
    label: "Form controls labelled",
    detail: fn.count
      ? `${fn.count} of ${x.formFieldCount || 0} have no label`
      : `${x.formFieldCount || 0} control(s) OK`,
    count: fn.count,
    samples: fn.samples,
  });

  // links/buttons without an accessible name
  const cn = x.ctrlNoName || { count: 0, samples: [] };
  checks.push({
    key: "names",
    status: cn.count ? "red" : "green",
    label: "Links/buttons have a name",
    detail: cn.count ? `${cn.count} with no accessible name` : "all have an accessible name",
    count: cn.count,
    samples: cn.samples,
  });

  // heading order (reuse skip/empty flags)
  const horderIssues = [
    flags.noH1 ? "no H1" : null,
    flags.skips ? `${flags.skips} skipped level${flags.skips > 1 ? "s" : ""}` : null,
    flags.empties ? `${flags.empties} empty heading${flags.empties > 1 ? "s" : ""}` : null,
  ].filter(Boolean);
  checks.push({
    key: "horder",
    status: flags.skips || flags.empties || flags.noH1 ? "amber" : "green",
    label: "Heading order",
    detail: horderIssues.length ? horderIssues.join(", ") : "logical, no skipped levels",
  });

  // tap targets smaller than 24×24px (inline text links exempt — WCAG 2.5.8)
  const tp = x.tapSmall || { count: 0, samples: [] };
  checks.push({
    key: "tap",
    status: tp.count ? "amber" : "green",
    label: "Tap targets ≥ 24×24px",
    detail: tp.count
      ? `${tp.count} smaller than 24×24px (inline text links exempt)`
      : "none too small (inline text links exempt)",
    count: tp.count,
    samples: tp.samples,
  });

  return checks;
}

/* Each scan renders several surfaces (tab badges, the active tab, history
   snapshots) that all re-derive the same pure computations — cache per audit
   object so each one runs once per scan. */
computeTriage = memo1(computeTriage);
computeReadability = memo1(computeReadability);
computeContent = memo1(computeContent);
computeA11y = memo1(computeA11y);

function a11yRow(chk) {
  const frag = document.createDocumentFragment();
  frag.appendChild(
    checkRow({
      status: chk.status,
      label: chk.label,
      detail: chk.detail,
      value: chk.count != null ? chk.count : undefined,
    })
  );
  if (chk.samples && chk.samples.length) {
    const list = h("div", { class: "triage-items" });
    chk.samples.forEach((s) => {
      const row = h(
        "div",
        { class: "triage-item", title: s.desc },
        h("span", { class: "triage-item-text", text: s.desc })
      );
      attachHighlight(row, s.locator, truncate(s.desc, 40));
      list.appendChild(row);
    });
    frag.appendChild(list);
  }
  return frag;
}

function renderA11y(a) {
  const out = [];
  const checks = computeA11y(a);
  const by = (keys) => checks.filter((c) => keys.includes(c.key));

  out.push(
    card(
      "Accessibility",
      { right: pill("quick checks") },
      h("p", {
        class: "note",
        text: "Quick automated checks — not a full WCAG audit. Colour contrast and keyboard operability still need manual testing.",
      })
    )
  );

  const group = (label, keys) => {
    const list = by(keys);
    if (!list.length) return;
    const body = h("div", {});
    list.forEach((c) => body.appendChild(a11yRow(c)));
    out.push(card(label, {}, body));
  };
  group("Document", ["lang", "title", "zoom"]);
  group("Landmarks", ["main", "nav", "header", "footer"]);
  group("Names & labels", ["alt", "labels", "names"]);
  group("Structure & tap targets", ["horder", "tap"]);

  out.push(
    card(
      null,
      {},
      h("p", {
        class: "note",
        text: "Element rows are click-to-highlight. Colour contrast and full keyboard operability are out of scope for an automated pass and must be checked manually.",
      })
    )
  );
  return out;
}

/* ============================================================
   Feature 2 — audit history & diff (chrome.storage.local, local only)
   ============================================================ */
const HISTORY_KEY = "seodin.history";
const HISTORY_PER_URL = 10; // keep last N snapshots per URL
const HISTORY_MAX_URLS = 50; // cap total URLs tracked

function hasStorage() {
  return (
    typeof chrome !== "undefined" && chrome.storage && chrome.storage.local
  );
}

// Normalize a URL into a stable history key: drop the hash and any trailing
// slash, lowercase the origin, keep the query (different query = different page).
function normalizeUrl(u) {
  try {
    const url = new URL(u);
    url.hash = "";
    // Tracking params don't change the page — without this, one utm-tagged
    // visit would fork the URL's scan history.
    [...url.searchParams.keys()].forEach((k) => {
      if (/^utm_/i.test(k) || /^(?:gclid|fbclid|msclkid|twclid|igshid|mc_cid|mc_eid)$/i.test(k)) {
        url.searchParams.delete(k);
      }
    });
    const path = url.pathname.replace(/\/+$/, "");
    const q = url.searchParams.toString();
    return url.origin.toLowerCase() + path + (q ? "?" + q : "");
  } catch {
    return String(u || "");
  }
}

// Compact snapshot — NOT the whole audit. Just enough to diff scans.
function buildSnapshot(a) {
  const r = computeReadability(a);
  const t = computeTriage(a);
  const dim = (k) => {
    const d = r.dims.find((x) => x.key === k);
    return d ? d.score : null;
  };
  return {
    ts: Date.now(),
    readability: { overall: r.overall, schema: dim("schema"), extract: dim("extract"), ratio: dim("ratio") },
    triage: {
      critical: t.filter((f) => f.sev === "critical").length,
      warning: t.filter((f) => f.sev === "warning").length,
      pass: t.filter((f) => f.sev === "pass").length,
    },
    schemaBlocks: (a.jsonLd || []).length,
    missingAlt: (a.images || []).filter((i) => !i.hasAlt).length,
    titlePx: estimateTitlePx(a.title || ""),
    wordCount: a.wordCount || 0,
  };
}

// Two snapshots are "the same scan" if every metric (ignoring ts) matches.
function sameSnapshot(x, y) {
  if (!x || !y) return false;
  return (
    x.readability.overall === y.readability.overall &&
    x.triage.critical === y.triage.critical &&
    x.triage.warning === y.triage.warning &&
    x.triage.pass === y.triage.pass &&
    x.schemaBlocks === y.schemaBlocks &&
    x.missingAlt === y.missingAlt &&
    x.titlePx === y.titlePx &&
    x.wordCount === y.wordCount
  );
}

// Load the previous snapshot for this URL, record the current one (deduping an
// identical consecutive scan so rapid auto-refreshes don't churn the list), and
// populate historyState for the renderers. All local; nothing leaves the machine.
async function applyHistory(a) {
  historyState = { prev: null, cur: null, list: [], unavailable: false };
  if (!hasStorage()) {
    historyState.unavailable = true;
    historyState.cur = buildSnapshot(a);
    return;
  }
  try {
    const key = normalizeUrl(a.url);
    const got = await chrome.storage.local.get(HISTORY_KEY);
    const map = (got && got[HISTORY_KEY]) || {};
    const list = Array.isArray(map[key]) ? map[key] : [];
    const prev = list[0] || null;
    const cur = buildSnapshot(a);

    let newList = list;
    if (!prev || !sameSnapshot(prev, cur)) {
      newList = [cur, ...list].slice(0, HISTORY_PER_URL);
      map[key] = newList;
      // Evict oldest URLs if we track too many (by each URL's newest ts).
      const keys = Object.keys(map);
      if (keys.length > HISTORY_MAX_URLS) {
        keys
          .sort((k1, k2) => (map[k2][0]?.ts || 0) - (map[k1][0]?.ts || 0))
          .slice(HISTORY_MAX_URLS)
          .forEach((k) => delete map[k]);
      }
      await chrome.storage.local.set({ [HISTORY_KEY]: map });
    }
    historyState.prev = prev;
    historyState.cur = cur;
    historyState.list = newList;
  } catch (e) {
    console.debug("SEOdin: history unavailable", e);
    historyState.unavailable = true;
    historyState.cur = buildSnapshot(a);
  }
}

async function clearHistory(a) {
  if (!hasStorage()) return;
  const ok = window.confirm(
    "Clear SEOdin scan history for this URL?\n\nThis only removes data stored locally on this machine."
  );
  if (!ok) return;
  try {
    const key = normalizeUrl(a.url);
    const got = await chrome.storage.local.get(HISTORY_KEY);
    const map = (got && got[HISTORY_KEY]) || {};
    delete map[key];
    await chrome.storage.local.set({ [HISTORY_KEY]: map });
    historyState = { prev: null, cur: buildSnapshot(a), list: [], unavailable: false };
    showToast("History cleared for this URL");
    renderActiveTab();
  } catch (e) {
    showToast("Couldn't clear history");
  }
}

// One delta block: "Label  from → to  +diff".
function deltaBlock(label, from, to, higherIsBetter) {
  const diff = to - from;
  const dir = diff === 0 ? "flat" : (higherIsBetter ? diff > 0 : diff < 0) ? "up" : "down";
  const sign = diff > 0 ? "+" : "";
  return h(
    "div",
    { class: "delta" },
    h("span", { class: "delta-label", text: label }),
    h(
      "span",
      { class: "delta-vals" },
      String(from),
      h("span", { class: "delta-arrow", text: " → " }),
      String(to)
    ),
    h("span", {
      class: "delta-diff is-" + dir,
      text: diff === 0 ? "no change" : `${sign}${diff}`,
    })
  );
}

// "Since last scan" strip at the top of Triage.
function renderSinceLast() {
  if (!historyState || historyState.unavailable) return null;
  const { prev, cur } = historyState;
  if (!prev || !cur) {
    return card(
      "Since last scan",
      { right: pill("local only") },
      h("p", { class: "muted", text: "First scan of this page." })
    );
  }

  const row = h(
    "div",
    { class: "delta-row" },
    deltaBlock("Readability", prev.readability.overall, cur.readability.overall, true),
    deltaBlock("Critical", prev.triage.critical, cur.triage.critical, false),
    deltaBlock("Warnings", prev.triage.warning, cur.triage.warning, false)
  );

  // Plain-English summary line.
  const bits = [];
  const rd = cur.readability.overall - prev.readability.overall;
  if (rd) bits.push(`readability ${rd > 0 ? "+" : ""}${rd}`);
  const wd = cur.triage.warning - prev.triage.warning;
  if (wd < 0) bits.push(`${-wd} warning${-wd > 1 ? "s" : ""} resolved`);
  else if (wd > 0) bits.push(`${wd} new warning${wd > 1 ? "s" : ""}`);
  const cd = cur.triage.critical - prev.triage.critical;
  if (cd < 0) bits.push(`${-cd} critical resolved`);
  else if (cd > 0) bits.push(`${cd} new critical`);
  const summary = bits.length ? bits.join(" · ") : "No changes since the last scan.";

  return card(
    "Since last scan",
    { right: pill("local only") },
    row,
    h("p", { class: "note", text: `${summary} · last scanned ${timeAgo(prev.ts)}` })
  );
}

// Collapsible past-scans list + Clear control.
function renderHistoryList(a) {
  if (!historyState || historyState.unavailable) {
    return card(
      "Scan history",
      {},
      h("p", {
        class: "note",
        text: "History needs the storage permission and is stored only on this machine.",
      })
    );
  }
  const list = historyState.list || [];
  const details = h("details", { class: "hist" });
  details.appendChild(
    h("summary", { class: "hist-summary" }, `Past scans · ${list.length}`)
  );
  const body = h("div", { class: "hist-body" });
  if (!list.length) {
    body.appendChild(h("p", { class: "muted", text: "No history yet." }));
  } else {
    list.forEach((s, i) => {
      const band = scoreBand(s.readability.overall);
      body.appendChild(
        h(
          "div",
          { class: "hist-item" },
          statusDot(band),
          h(
            "div",
            { class: "hist-when" },
            new Date(s.ts).toLocaleString([], {
              month: "short",
              day: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            }),
            i === 0 ? h("span", { class: "hist-ago", text: "latest" }) : h("span", { class: "hist-ago", text: timeAgo(s.ts) })
          ),
          h("span", { class: "hist-score is-" + band, text: String(s.readability.overall) })
        )
      );
    });
  }
  const clearBtn = h("button", { class: "hist-clear", type: "button", text: "Clear history" });
  clearBtn.addEventListener("click", () => clearHistory(a));
  body.appendChild(
    h(
      "div",
      { class: "hist-footer" },
      h("span", { class: "note", text: "Stored locally · never uploaded" }),
      list.length ? clearBtn : null
    )
  );
  details.appendChild(body);
  return card("Scan history", { right: pill("on this machine") }, details);
}

/* ============================================================
   TAB REGISTRY (data-driven — add a tab here, shell untouched)
   ============================================================ */
const TABS = [
  { id: "triage", label: "Triage", count: (a) => computeTriage(a).filter((f) => f.sev !== "pass").length, render: renderTriage },
  { id: "schema", label: "Schema", count: (a) => a.jsonLd.length, render: renderSchema },
  { id: "readability", label: "Readability", count: (a) => computeReadability(a).overall, render: renderReadability },
  { id: "content", label: "Content", count: (a) => { const ct = computeContent(a); return ct.fleschSkipped || ct.flesch == null ? null : ct.flesch; }, render: renderContent },
  { id: "headings", label: "Headings", count: (a) => a.headings.length, render: renderHeadings },
  { id: "links", label: "Links", count: (a) => a.links.length, render: renderLinks },
  { id: "images", label: "Images", count: (a) => a.images.length, render: renderImages },
  { id: "social", label: "Social", render: renderSocial },
  { id: "eeat", label: "E-E-A-T", render: renderEeat },
  { id: "performance", label: "Performance", render: renderPerformance },
  { id: "technical", label: "Technical", render: renderTechnical },
  { id: "server", label: "Server", render: renderServer },
  { id: "site", label: "Site", render: renderSite },
  { id: "a11y", label: "Accessibility", count: (a) => computeA11y(a).filter((c) => c.status !== "green").length, render: renderA11y },
];

/* ============================================================
   TAB: Schema (hero)
   ============================================================ */
function renderSchema(a) {
  const out = [];
  const blocks = a.jsonLd || [];
  const errors = a.jsonLdErrors || [];

  // type pills
  const typeSet = new Set();
  blocks.forEach((b) => collectTypes(b, typeSet));
  out.push(
    card(
      "Detected Types",
      { right: blocks.length ? pill(`${blocks.length} block${blocks.length === 1 ? "" : "s"}`) : null },
      typeSet.size
        ? h("div", { class: "type-pills" }, [...typeSet].map((t) => pill(t, "accent")))
        : h("p", {
            class: "muted",
            text: blocks.length
              ? "No @type declared in blocks."
              : (a.microdataCount || 0) > 0
              ? `No JSON-LD found. ${a.microdataCount} microdata item${
                  a.microdataCount > 1 ? "s" : ""
                } (itemscope) detected — SEOdin parses JSON-LD only.`
              : "No JSON-LD structured data found on this page.",
          })
    )
  );

  // completeness — recommended-fields heuristic per present type
  const completeness = computeCompleteness(a);
  if (completeness.length) {
    const body = h("div", {});
    completeness.forEach((r) => {
      const status = r.missing.length === 0 ? "green" : r.found === 0 ? "red" : "amber";
      body.appendChild(
        checkRow({
          status,
          label: `${r.type} — found ${r.found} of ${r.total} expected fields`,
          detail: r.missing.length ? `missing: ${r.missing.join(", ")}` : "all recommended fields present",
        })
      );
    });
    body.appendChild(
      h("p", {
        class: "note",
        text: "Recommended-fields heuristic — a guide to richer markup, not a validity guarantee.",
      })
    );
    out.push(card("Completeness", { right: pill("heuristic") }, body));
  }

  // issues & fixes — snippet for templatable gaps, note for the rest
  const issues = computeSchemaIssues(a);
  const issuesBody = h("div", {});
  if (!issues.length) {
    issuesBody.appendChild(checkRow({ status: "green", label: "No structural issues detected" }));
  } else {
    issues.forEach((iss) => {
      issuesBody.appendChild(
        checkRow({ status: iss.status, label: iss.label, detail: iss.detail })
      );
      if (iss.fix && iss.fix.kind === "snippet") {
        issuesBody.appendChild(codeBlock(iss.fix.code, "Suggested JSON-LD"));
      } else if (iss.fix && iss.fix.kind === "note") {
        issuesBody.appendChild(h("div", { class: "fix-note", text: iss.fix.text }));
      }
    });
  }
  out.push(card("Issues & Fixes", {}, issuesBody));

  if (!blocks.length) return out;

  // tree / raw viewer
  const view = viewModes.schema || "tree";
  const body = h("div", {});
  const renderBody = (mode) => {
    body.textContent = "";
    if (mode === "raw") {
      body.appendChild(
        h("pre", { class: "raw-json", text: JSON.stringify(blocks, null, 2) })
      );
    } else {
      body.appendChild(renderJsonTree(blocks));
    }
  };
  renderBody(view);
  const seg = makeSegmented(
    [
      { id: "tree", label: "Tree" },
      { id: "raw", label: "Raw" },
    ],
    view,
    (mode) => {
      viewModes.schema = mode;
      renderBody(mode);
    }
  );
  out.push(card("Markup", { right: seg }, body));

  return out;
}

/* ============================================================
   TAB: Headings
   ============================================================ */
function renderHeadings(a) {
  const out = [];
  const flags = headingFlags(a.headings);

  // count summary
  const countPills = h(
    "div",
    { class: "type-pills" },
    [1, 2, 3, 4, 5, 6].map((lv) => pill(`H${lv} · ${flags.counts[lv] || 0}`))
  );
  out.push(card("Counts", {}, countPills));

  // flags
  const flagRows = [];
  flagRows.push(
    checkRow({
      status: flags.noH1 ? "red" : flags.multipleH1 ? "amber" : "green",
      label: flags.noH1
        ? "No H1 on page"
        : flags.multipleH1
        ? `Multiple H1s (${flags.counts[1]})`
        : "Exactly one H1",
    })
  );
  flagRows.push(
    checkRow({
      status: flags.skips ? "amber" : "green",
      label: flags.skips ? `${flags.skips} skipped level${flags.skips > 1 ? "s" : ""}` : "No skipped levels",
      detail: flags.skips ? "A heading jumps more than one level deeper than its parent." : null,
    })
  );
  flagRows.push(
    checkRow({
      status: flags.empties ? "amber" : "green",
      label: flags.empties ? `${flags.empties} empty heading${flags.empties > 1 ? "s" : ""}` : "No empty headings",
    })
  );
  out.push(card("Checks", {}, h("div", {}, flagRows)));

  // outline tree
  if (a.headings.length) {
    const outline = h("div", { class: "outline" });
    a.headings.forEach((hd, i) => {
      const prev = i > 0 ? a.headings[i - 1].level : 0;
      const isSkip = prev && hd.level > prev + 1;
      const row = h(
        "div",
        { class: "outline-row", style: { paddingLeft: (hd.level - 1) * 14 + "px" } },
        h("span", { class: "h-tag" + (isSkip ? " is-flag" : ""), text: "H" + hd.level }),
        h(
          "span",
          { class: "h-text" + (hd.text ? "" : " is-empty"), text: hd.text || "(empty)" }
        )
      );
      attachHighlight(row, hd.locator, "H" + hd.level + (hd.text ? ": " + truncate(hd.text, 32) : ""));
      outline.appendChild(row);
    });
    out.push(card("Outline", {}, outline));
  } else {
    out.push(card("Outline", {}, h("p", { class: "muted", text: "No headings found." })));
  }
  return out;
}

/* ============================================================
   TAB: Links
   ============================================================ */
function renderLinks(a) {
  const out = [];
  const links = a.links || [];
  const internal = links.filter((l) => l.isInternal);
  const external = links.filter(
    (l) => !l.isInternal && (l.protocol === "http:" || l.protocol === "https:")
  );
  const relCount = (kw) =>
    links.filter((l) => l.rel && l.rel.toLowerCase().split(/\s+/).includes(kw)).length;
  const emptyAnchor = links.filter((l) => !l.anchor).length;
  const nakedUrl = links.filter(
    (l) => l.anchor && /^https?:\/\//i.test(l.anchor.trim())
  ).length;
  // href="#", empty, or javascript: — looks like a link, goes nowhere for crawlers
  const isPlaceholder = (l) => {
    const r = (l.rawHref || "").trim();
    return r === "" || r === "#" || /^javascript:/i.test(r);
  };
  const placeholder = links.filter(isPlaceholder).length;

  out.push(
    card(
      "Overview",
      {},
      h(
        "div",
        { class: "metric-grid" },
        metric("Total", String(links.length)),
        metric("Internal", String(internal.length)),
        metric("External", String(external.length)),
        metric("Nofollow", String(relCount("nofollow")))
      )
    )
  );

  const relRows = [
    checkRow({ status: "neutral", label: "rel=nofollow", value: relCount("nofollow") }),
    checkRow({ status: "neutral", label: "rel=sponsored", value: relCount("sponsored") }),
    checkRow({ status: "neutral", label: "rel=ugc", value: relCount("ugc") }),
    checkRow({
      status: emptyAnchor ? "amber" : "green",
      label: "Empty-anchor links",
      detail: emptyAnchor ? "No text, alt, aria-label or title to describe the link." : null,
      value: emptyAnchor,
    }),
    checkRow({
      status: nakedUrl ? "amber" : "green",
      label: "Naked-URL anchors",
      detail: nakedUrl ? "Anchor text is a raw URL." : null,
      value: nakedUrl,
    }),
    checkRow({
      status: placeholder ? "amber" : "green",
      label: "Placeholder links",
      detail: placeholder
        ? 'href="#", empty, or javascript: — these lead nowhere for crawlers.'
        : null,
      value: placeholder,
    }),
  ];
  out.push(card("Attributes", {}, h("div", {}, relRows)));

  // sample list — region-aware. "content" = links embedded in the article's
  // prose (not share/related/widget link-lists that themes nest inside the
  // article); "nav"/"footer" = page chrome. Lets the user filter out boilerplate.
  if (links.length) {
    const REGION_LABEL = { content: "content", nav: "nav", footer: "footer", other: "other" };
    const regionOf = (l) => l.region || "other";
    const counts = {};
    links.forEach((l) => {
      const r = regionOf(l);
      counts[r] = (counts[r] || 0) + 1;
    });

    // Render every link in real DOM order so "All" reflects the actual page and
    // switching to Content/Nav/Footer visibly drops the other regions. The list
    // lives in a fixed-height scroll box (.item-list), so length doesn't stretch
    // the tab — the user scrolls the full set ~15 rows at a time.
    const rows = links.map((l) => {
      const region = regionOf(l);
      const tags = h("div", { class: "item-tags" });
      tags.appendChild(tag(REGION_LABEL[region] || region, region === "content" ? "green" : ""));
      tags.appendChild(tag(l.isInternal ? "internal" : "external", l.isInternal ? "" : "amber"));
      if (l.rel) {
        l.rel
          .toLowerCase()
          .split(/\s+/)
          .filter((r) => ["nofollow", "sponsored", "ugc"].includes(r))
          .forEach((r) => tags.appendChild(tag(r)));
      }
      if (!l.anchor) tags.appendChild(tag("empty", "red"));
      if (isPlaceholder(l)) tags.appendChild(tag("placeholder", "amber"));
      const anchor = l.anchor || "(no anchor text)";
      const el = h(
        "div",
        { class: "item" },
        h(
          "div",
          { class: "item-main" },
          h("div", { class: "item-primary", text: anchor }),
          h("div", { class: "item-secondary", text: l.href })
        ),
        tags
      );
      attachHighlight(el, l.locator, truncate(anchor, 40));
      return { el, text: `${l.anchor || ""} ${l.href || ""}`, region };
    });

    const segments = [
      { id: "all", label: "All", test: () => true },
      { id: "content", label: "Content", test: (r) => r.region === "content" },
      { id: "nav", label: "Nav", test: (r) => r.region === "nav" },
      { id: "footer", label: "Footer", test: (r) => r.region === "footer" },
      { id: "other", label: "Other", test: (r) => r.region === "other" },
    ];

    const breakdown = ["content", "nav", "footer", "other"]
      .filter((r) => counts[r])
      .map((r) => `${counts[r]} ${REGION_LABEL[r]}`)
      .join(" · ");

    out.push(
      card(
        "Links",
        {},
        h("p", { class: "note", text: "By region: " + breakdown }),
        filterableList(rows, { placeholder: "Filter by anchor or href…", noun: "links", segments })
      )
    );
  }

  out.push(renderLinkCheck(a));

  out.push(
    card(
      null,
      {},
      h("p", {
        class: "note",
        text: "“Content” = links embedded in the article's text. Pages whose links are all navigation, sharing or related-posts (e.g. many news posts) will show few or none here — that's expected. Google crawls every link but discounts repeated header/nav/footer boilerplate; in-text links carry the most weight.",
      })
    )
  );
  return out;
}

/* ---- Internal link checker (on-demand, same-site fetches) ---- */
// Resolve each unique internal URL to an HTTP status. Anonymous (no cookies),
// which mirrors what a search crawler sees. Networked, so it's button-gated.
function renderLinkCheck(a) {
  const seen = new Set();
  const targets = [];
  (a.links || []).forEach((l) => {
    if (!l.isInternal) return;
    if (l.protocol !== "http:" && l.protocol !== "https:") return;
    let key;
    try {
      const u = new URL(l.href);
      u.hash = ""; // /p and /p#section are the same document
      key = u.href;
    } catch {
      return;
    }
    if (seen.has(key)) return;
    seen.add(key);
    targets.push({ url: key, anchor: l.anchor || "", locator: l.locator });
  });

  if (!targets.length) {
    return card(
      "Internal link check",
      { right: pill("on demand") },
      h("p", { class: "note", text: "No internal links on this page to check." })
    );
  }

  const resultsArea = h("div", {});
  const btnLabel = (verb) =>
    `${verb} ${targets.length} internal link${targets.length === 1 ? "" : "s"}`;
  const runBtn = h("button", { class: "linkcheck-run", type: "button", text: btnLabel("Check") });

  const renderSummary = (results) => {
    resultsArea.textContent = "";

    // Tally by raw status code; network failures keyed by their message.
    const tally = new Map();
    results.forEach((r) => {
      const key = r.code != null ? String(r.code) : r.message || "failed";
      tally.set(key, (tally.get(key) || 0) + 1);
    });
    const chips = h("div", { class: "linkcheck-codes" });
    [...tally.entries()]
      .sort((a, b) => (Number(a[0]) || 1000) - (Number(b[0]) || 1000))
      .forEach(([key, count]) => {
        const n = Number(key);
        const band = Number.isFinite(n) ? codeBand(n) : "neutral";
        chips.appendChild(tag(`${key} · ${count}`, band === "neutral" ? "" : band));
      });
    resultsArea.appendChild(chips);

    const list = h("div", { class: "linkcheck-list" });
    [...results]
      .sort((a, b) => codeRank(b) - codeRank(a))
      .forEach((r) => {
        const value = r.code != null ? String(r.code) : r.message || "failed";
        const detail = r.redirected && r.finalUrl ? "→ " + r.finalUrl : r.url;
        const row = checkRow({ status: codeBand(r.code), label: r.anchor || r.url, detail, value });
        attachHighlight(row, r.locator, truncate(r.anchor || r.url, 40));
        list.appendChild(row);
      });
    resultsArea.appendChild(list);
  };

  const run = async () => {
    runBtn.disabled = true;
    resultsArea.textContent = "";
    const statusEl = h(
      "div",
      { class: "linkcheck-status" },
      h("span", { class: "linkcheck-spinner" }),
      h("span", { text: `Checking… 0 / ${targets.length}` })
    );
    const label = statusEl.lastChild;
    resultsArea.appendChild(statusEl);

    let done = 0;
    const results = await runPool(
      targets,
      async (t) => ({ ...t, ...(await checkUrl(t.url)) }),
      6,
      () => {
        done += 1;
        label.textContent = `Checking… ${done} / ${targets.length}`;
      }
    );

    runBtn.disabled = false;
    runBtn.textContent = btnLabel("Re-check");
    renderSummary(results);
  };
  runBtn.addEventListener("click", run);

  return card(
    "Internal link check",
    { right: pill("on demand") },
    h("p", {
      class: "note",
      text: "Sends a GET to each unique internal URL and reports the HTTP status code it returns. Bot-protected sites may answer automated requests with codes (403, 404, 429…) that differ from what a real browser sees.",
    }),
    runBtn,
    resultsArea
  );
}

async function checkUrl(url) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 8000);
  try {
    // GET (not HEAD): many servers/bot-walls mishandle HEAD and 404 it.
    const res = await fetch(url, { method: "GET", redirect: "follow", signal: ctrl.signal });
    try {
      res.body?.cancel(); // status is in the headers — don't download the body
    } catch {}
    return { code: res.status, redirected: res.redirected, finalUrl: res.url };
  } catch (e) {
    return { code: null, message: e && e.name === "AbortError" ? "timeout" : "failed" };
  } finally {
    clearTimeout(timer);
  }
}

// Colour band from the HTTP class — a fact about the code, not a verdict.
function codeBand(code) {
  if (code == null) return "neutral";
  if (code >= 200 && code < 300) return "green";
  if (code >= 300 && code < 400) return "amber";
  return "red";
}

// Sort weight so the codes worth attention float to the top of the list.
function codeRank(r) {
  if (r.code == null) return 6;
  if (r.code >= 500) return 5;
  if (r.code >= 400) return 4;
  if (r.code >= 300) return 3;
  return 0;
}

// Bounded-concurrency map: runs `worker` over `items`, at most `n` in flight.
async function runPool(items, worker, n, onEach) {
  const results = new Array(items.length);
  let next = 0;
  const runner = async () => {
    while (next < items.length) {
      const i = next++;
      results[i] = await worker(items[i], i);
      onEach();
    }
  };
  await Promise.all(Array.from({ length: Math.min(n, items.length) }, runner));
  return results;
}

/* ============================================================
   TAB: Images
   ============================================================ */
function renderImages(a) {
  const out = [];
  const imgs = a.images || [];
  const missingAlt = imgs.filter((i) => !i.hasAlt).length;
  const decorative = imgs.filter((i) => i.decorative).length;
  const lazy = imgs.filter((i) => i.loading === "lazy").length;
  // DPR-aware: a 2× asset on a 2× display is correct, not oversized. Flag only
  // images carrying more than 2× the pixels this display actually used.
  const dpr = a.dpr || 1;
  const isOversized = (i) =>
    !!i.naturalW && i.displayW > 0 && i.naturalW > i.displayW * dpr * 2;
  const oversized = imgs.filter(isOversized).length;
  const noDims = imgs.filter((i) => i.hasDims === false).length;
  const isFilenameAlt = (i) => i.hasAlt && i.alt && FILENAME_ALT_RE.test(i.alt.trim());
  const filenameAlts = imgs.filter(isFilenameAlt).length;
  const heavy = imgs.filter((i) => (i.bytes || 0) >= 200 * 1024);

  out.push(
    card(
      "Overview",
      {},
      h(
        "div",
        { class: "metric-grid" },
        metric("Total", String(imgs.length)),
        metric("Missing alt", String(missingAlt), { band: missingAlt ? "red" : "green" }),
        metric("Lazy-loaded", String(lazy)),
        metric("Oversized", String(oversized), { band: oversized ? "amber" : "green" })
      )
    )
  );

  if (decorative) {
    out.push(
      card(
        null,
        {},
        h("p", {
          class: "note",
          text: `${decorative} image${decorative > 1 ? "s have" : " has"} empty alt="" (treated as decorative).`,
        })
      )
    );
  }

  if (noDims || filenameAlts || heavy.length) {
    const bits = [];
    if (noDims)
      bits.push(
        `${noDims} image${noDims > 1 ? "s" : ""} without width/height — layout can jump while they load`
      );
    if (filenameAlts)
      bits.push(
        `${filenameAlts} alt text${filenameAlts > 1 ? "s" : ""} that look like filenames`
      );
    if (heavy.length)
      bits.push(
        `${heavy.length} image${heavy.length > 1 ? "s" : ""} over 200 KB (largest ${fmtBytes(
          Math.max(...heavy.map((i) => i.bytes || 0))
        )})`
      );
    out.push(card(null, {}, h("p", { class: "note", text: bits.join(" · ") + "." })));
  }

  if (imgs.length) {
    // Every image renders; the list itself is a fixed-height scroll viewport.
    const rows = imgs.map((i) => {
      const thumb = h("img", { class: "item-thumb", src: i.src, alt: "", loading: "lazy" });
      thumb.addEventListener("error", () => {
        thumb.style.visibility = "hidden";
      });
      const tags = h("div", { class: "item-tags" });
      if (!i.hasAlt) tags.appendChild(tag("no alt", "red"));
      else if (i.decorative) tags.appendChild(tag("decorative"));
      if (i.loading === "lazy") tags.appendChild(tag("lazy", "green"));
      if (isOversized(i)) tags.appendChild(tag("oversized", "amber"));
      if (i.hasDims === false) tags.appendChild(tag("no w/h", "amber"));
      if (isFilenameAlt(i)) tags.appendChild(tag("filename alt", "amber"));
      if (i.bytes > 0)
        tags.appendChild(tag(fmtBytes(i.bytes), i.bytes >= 200 * 1024 ? "amber" : ""));
      if (i.format) tags.appendChild(tag(i.format));

      const dims =
        i.naturalW && i.naturalH
          ? `${i.naturalW}×${i.naturalH}${
              i.displayW ? ` → ${i.displayW}×${i.displayH}` : ""
            }`
          : "";
      const primary = i.hasAlt ? i.alt || '(empty alt="")' : "(missing alt)";
      const el = h(
        "div",
        { class: "item" },
        thumb,
        h(
          "div",
          { class: "item-main" },
          h("div", { class: "item-primary", text: primary }),
          h("div", { class: "item-secondary", text: dims || i.src })
        ),
        tags
      );
      attachHighlight(el, i.locator, truncate(primary, 40));
      return { el, text: `${i.alt || ""} ${i.src || ""}` };
    });
    out.push(
      card("Images", {}, filterableList(rows, { placeholder: "Filter by alt or src…", noun: "images" }))
    );
  } else {
    out.push(card("Images", {}, h("p", { class: "muted", text: "No images found." })));
  }
  return out;
}

/* ============================================================
   TAB: Social
   ============================================================ */
function renderSocial(a) {
  const out = [];
  const og = a.openGraph || {};
  const tw = a.twitter || {};

  // unfurl preview — resolve relative share images against the page URL (the
  // preview can; external scrapers can't, which is exactly why we flag them).
  const rawImage = og["og:image"] || tw["twitter:image"] || "";
  let image = rawImage;
  if (rawImage) {
    try {
      image = new URL(rawImage, a.url).href;
    } catch {}
  }
  const title = og["og:title"] || tw["twitter:title"] || a.title || "Untitled";
  const desc = og["og:description"] || tw["twitter:description"] || a.metaDescription || "";
  const domain = domainOf(a.url);

  const unfurl = h("div", { class: "unfurl" });
  if (image) {
    const img = h("img", { class: "unfurl-img", src: image, alt: "" });
    img.addEventListener("error", () => {
      img.replaceWith(h("div", { class: "unfurl-img-empty", text: "image failed to load" }));
    });
    unfurl.appendChild(img);
  } else {
    unfurl.appendChild(h("div", { class: "unfurl-img-empty", text: "No og:image" }));
  }
  unfurl.appendChild(
    h(
      "div",
      { class: "unfurl-body" },
      h("div", { class: "unfurl-domain", text: domain }),
      h("div", { class: "unfurl-title", text: truncate(title, 90) }),
      desc ? h("div", { class: "unfurl-desc", text: desc }) : null
    )
  );
  out.push(card("Link Preview", {}, unfurl));

  // OG checks
  const ogFields = ["og:title", "og:description", "og:image", "og:type", "og:url"];
  const ogRows = ogFields.map((f) =>
    checkRow({
      status: og[f] ? "green" : "amber",
      label: f,
      detail: og[f] ? truncate(og[f], 90) : "missing",
    })
  );
  if (relativeOgImage(a))
    ogRows.push(
      checkRow({
        status: "amber",
        label: "og:image is a relative URL",
        detail:
          "Most platforms (Facebook, Slack, LinkedIn) require an absolute URL — resolved against the page for this preview only.",
      })
    );
  out.push(card("Open Graph", {}, h("div", {}, ogRows)));

  // Twitter checks
  const twCard = (k) => tw[k];
  const twType = twCard("twitter:card");
  const twFields = ["twitter:card", "twitter:title", "twitter:description", "twitter:image"];
  out.push(
    card(
      "Twitter Card",
      { right: twType ? pill(twType, "accent") : pill("none") },
      h(
        "div",
        {},
        twFields.map((f) =>
          checkRow({
            status: tw[f] ? "green" : "amber",
            label: f,
            detail: tw[f] ? truncate(tw[f], 90) : "missing",
          })
        )
      )
    )
  );
  return out;
}

/* ============================================================
   TAB: E-E-A-T (signal detection only)
   ============================================================ */
// Pull the actual VALUES (author name, dates, publisher, link hrefs) out of the
// audit — shared by the E-E-A-T tab and the Copy-for-LLM serializer.
function extractEeat(a) {
  const ee = a.eeat || {};
  const links = a.links || [];
  const nodes = [];
  (a.jsonLd || []).forEach((b) => collectTypedNodes(b, nodes));
  const typeSet = new Set();
  (a.jsonLd || []).forEach((b) => collectTypes(b, typeSet));

  const idMap = new Map();
  nodes.forEach((n) => {
    if (n["@id"]) idMap.set(n["@id"], n);
  });
  const resolveRef = (v) => {
    if (!v) return null;
    if (Array.isArray(v)) return resolveRef(v[0]);
    if (typeof v === "string") return { name: v };
    if (typeof v === "object") {
      if (v.name) return v;
      if (v["@id"] && idMap.has(v["@id"])) return idMap.get(v["@id"]);
      return v;
    }
    return null;
  };
  const nameOf = (n) => {
    if (!n) return null;
    if (typeof n.name === "string") return n.name;
    if (Array.isArray(n.name)) return n.name.find((x) => typeof x === "string") || null;
    return null;
  };
  const hasType = (n, t) => {
    const x = n["@type"];
    return (Array.isArray(x) ? x : [x]).includes(t);
  };
  const firstVal = (v) => (Array.isArray(v) ? v[0] : v);

  const articleNode =
    nodes.find((n) => ["Article", "NewsArticle", "BlogPosting"].some((t) => hasType(n, t))) ||
    nodes.find((n) => n.author || n.datePublished);

  // author
  let authorName = null;
  let authorSource = null;
  let authorUrl = null;
  if (articleNode && articleNode.author) {
    const r = resolveRef(articleNode.author);
    authorName = nameOf(r);
    if (r && typeof r.url === "string") authorUrl = r.url;
    if (authorName) authorSource = "schema author";
  }
  if (!authorName) {
    const p = nodes.find((n) => hasType(n, "Person"));
    if (p) {
      authorName = nameOf(p);
      if (typeof p.url === "string") authorUrl = authorUrl || p.url;
      if (authorName) authorSource = "schema.org/Person";
    }
  }
  if (!authorName && ee.metaAuthor) {
    authorName = ee.metaAuthor;
    authorSource = "meta author";
  }
  if (!authorName && ee.bylineText) {
    authorName = ee.bylineText;
    authorSource = "visible byline";
  }

  // dates
  let datePublished = (() => {
    const n = nodes.find((x) => x.datePublished);
    return n ? firstVal(n.datePublished) : null;
  })();
  let datePubSource = datePublished ? "schema" : null;
  if (!datePublished && ee.timeEls && ee.timeEls.length) {
    datePublished = ee.timeEls[0].datetime;
    datePubSource = "page <time>";
  }
  const dateModified = (() => {
    const n = nodes.find((x) => x.dateModified);
    return n ? firstVal(n.dateModified) : null;
  })();

  // publisher / organization
  let orgName = null;
  let orgSource = null;
  if (articleNode && articleNode.publisher) {
    orgName = nameOf(resolveRef(articleNode.publisher));
    if (orgName) orgSource = "publisher";
  }
  if (!orgName) {
    const o = nodes.find((n) => hasType(n, "Organization"));
    if (o) {
      orgName = nameOf(o);
      if (orgName) orgSource = "schema.org/Organization";
    }
  }

  // links (capture the actual href)
  const findLink = (re, anchorRe) =>
    links.find((l) => re.test(l.href || "") || (anchorRe && anchorRe.test(l.anchor || "")));
  const aboutHref = (findLink(/\/(about|about-us)\b/i, /about/i) || {}).href || null;
  const contactHref = (findLink(/\/(contact|contact-us)\b/i, /contact/i) || {}).href || null;
  const authorHref = (findLink(/\/(author|authors|team)\b/i, /\bauthor\b/i) || {}).href || null;

  // authoritative citations (distinct domains)
  const citeDomains = [];
  let citeCount = 0;
  links.forEach((l) => {
    if (l.isInternal) return;
    try {
      const host = new URL(l.href).hostname;
      if (isAuthoritative(host)) {
        citeCount++;
        if (!citeDomains.includes(host)) citeDomains.push(host);
      }
    } catch {}
  });

  return {
    authorName,
    authorSource,
    authorUrl,
    datePublished,
    datePubSource,
    dateModified,
    orgName,
    orgSource,
    hasPublisher: nodes.some((n) => n.publisher),
    lastUpdatedText: ee.lastUpdatedText || null,
    aboutHref,
    contactHref,
    authorHref,
    citeDomains,
    citeCount,
  };
}

function renderEeat(a) {
  const out = [];
  const e = extractEeat(a);

  const dateDetail = (raw, src) => {
    if (!raw) return "missing";
    const f = fmtDate(raw);
    const human =
      f && f !== String(raw) ? `${f} · ${truncate(String(raw), 30)}` : String(raw);
    return src && src !== "schema" ? `${human} (${src})` : human;
  };

  const rows = [
    checkRow({
      status: e.authorName ? "green" : "amber",
      label: "Author",
      detail: e.authorName
        ? `${e.authorName}${e.authorSource ? ` — ${e.authorSource}` : ""}`
        : "no author signal found",
    }),
    e.authorUrl
      ? checkRow({ status: "neutral", label: "Author URL", detail: e.authorUrl })
      : null,
    checkRow({
      status: e.datePublished ? "green" : "amber",
      label: "Date published",
      detail: dateDetail(e.datePublished, e.datePubSource),
    }),
    checkRow({
      status: e.dateModified ? "green" : "amber",
      label: "Date modified",
      detail: dateDetail(e.dateModified),
    }),
    checkRow({
      status: e.lastUpdatedText ? "green" : "neutral",
      label: 'Visible "last updated"',
      detail: e.lastUpdatedText || "not detected in page text",
    }),
    checkRow({
      status: e.orgName || e.hasPublisher ? "green" : "amber",
      label: "Publisher / organization",
      detail: e.orgName
        ? `${e.orgName}${e.orgSource ? ` — ${e.orgSource}` : ""}`
        : e.hasPublisher
        ? "present (no name field)"
        : "missing",
    }),
    checkRow({ status: e.aboutHref ? "green" : "amber", label: "About page", detail: e.aboutHref || "not found" }),
    checkRow({ status: e.contactHref ? "green" : "amber", label: "Contact page", detail: e.contactHref || "not found" }),
    checkRow({ status: e.authorHref ? "green" : "neutral", label: "Author / team page", detail: e.authorHref || "not found" }),
    checkRow({
      status: e.citeCount > 0 ? "green" : "neutral",
      label: "Authoritative citations",
      detail: e.citeDomains.length ? e.citeDomains.slice(0, 6).join(", ") : "none detected",
      value: e.citeCount,
    }),
  ].filter(Boolean);

  out.push(card("Trust Signals", { right: pill("heuristic") }, h("div", {}, rows)));
  out.push(
    card(
      null,
      {},
      h("p", {
        class: "note",
        text: "Signal detection only — presence of these markers is not a measure of actual expertise or trust.",
      })
    )
  );
  return out;
}

/* ============================================================
   TAB: Performance
   ============================================================ */
function band(value, good, ni) {
  if (value == null || isNaN(value)) return "neutral";
  if (value <= good) return "green";
  if (value <= ni) return "amber";
  return "red";
}
function renderPerformance(a) {
  const out = [];
  const p = a.performance || {};

  const grid = h(
    "div",
    { class: "metric-grid" },
    metric("LCP", fmtMs(p.lcp), {
      band: band(p.lcp, 2500, 4000),
      sub: "good ≤ 2.5s",
    }),
    metric("CLS", p.cls == null ? "—" : p.cls.toFixed(3), {
      band: band(p.cls, 0.1, 0.25),
      sub: "good ≤ 0.10",
    }),
    metric("FCP", fmtMs(p.fcp), {
      band: band(p.fcp, 1800, 3000),
      sub: "good ≤ 1.8s",
    }),
    metric("TTFB", fmtMs(p.ttfb), {
      band: band(p.ttfb, 800, 1800),
      sub: "good ≤ 0.8s",
    })
  );
  out.push(card("Core Web Vitals", { right: pill("field, this load") }, grid));

  out.push(
    card(
      "Load",
      {},
      h(
        "div",
        {},
        checkRow({ status: "neutral", label: "DOMContentLoaded", value: fmtMs(p.domContentLoaded) }),
        checkRow({ status: "neutral", label: "Load event", value: fmtMs(p.loadTime) }),
        checkRow({ status: "neutral", label: "Transfer size", value: fmtBytes(p.transferSize) }),
        checkRow({ status: "neutral", label: "Requests", value: p.resourceCount ?? "—" })
      )
    )
  );

  // heaviest downloads + third-party share, from this load's resource timing
  const top = a.topResources || [];
  if (top.length) {
    const tp = a.thirdParty || { count: 0, bytes: 0 };
    const list = h("div", {});
    top.forEach((r) => {
      let name = r.url;
      try {
        const u = new URL(r.url);
        name = (u.pathname.split("/").filter(Boolean).pop() || u.hostname).slice(0, 60);
      } catch {}
      list.appendChild(
        checkRow({
          status: r.bytes >= 500 * 1024 ? "amber" : "neutral",
          label: name,
          detail: `${r.type || "resource"}${r.third ? " · third-party" : ""} · ${truncate(r.url, 80)}`,
          value: fmtBytes(r.bytes),
        })
      );
    });
    out.push(
      card(
        "Heaviest resources",
        { right: pill(`3rd-party: ${tp.count} req · ${tp.bytes ? fmtBytes(tp.bytes) : "0 B"}`) },
        list,
        h("p", {
          class: "note",
          text: "Top downloads by transfer size for this load. Cross-origin resources without Timing-Allow-Origin report 0 bytes and are omitted.",
        })
      )
    );
  }

  out.push(
    card(
      null,
      {},
      h("p", {
        class: "note",
        text: "Core Web Vitals above are measured client-side from this single page load.",
      })
    )
  );

  return out;
}

/* ============================================================
   Feature — Google search preview (pixel-true SERP facsimile)
   ============================================================ */
// "host › segment › segment" the way Google displays the URL line.
function serpBreadcrumb(url) {
  try {
    const u = new URL(url);
    const host = u.hostname.replace(/^www\./, "");
    const segs = u.pathname
      .split("/")
      .filter(Boolean)
      .slice(0, 3)
      .map((s) => {
        try {
          return decodeURIComponent(s);
        } catch {
          return s;
        }
      });
    return host + (segs.length ? " › " + segs.join(" › ") : "");
  } catch {
    return String(url || "");
  }
}

function renderSerpPreview(a) {
  const og = a.openGraph || {};
  const titleText = a.title || "(no title)";
  const improvised = !(a.metaDescription && a.metaDescription.trim());
  const descSource = improvised
    ? ((a.content && (a.content.firstParagraph || a.content.text)) || "").slice(0, 300)
    : a.metaDescription;
  const descText =
    descSource || "No description available — Google will assemble one from page text.";
  const e = extractEeat(a);
  const dateStr = e.datePublished ? fmtDate(e.datePublished) : null;

  const fav = h("img", { class: "serp-fav-img", src: a.faviconUrl || "", alt: "" });
  fav.addEventListener("error", () => {
    fav.style.display = "none";
  });

  // The stage renders at Google's true column width (600px desktop / 360px
  // mobile) with Google's real type sizes, then scales down to fit the panel —
  // so the ellipsis cuts exactly where it cuts in a real result.
  const stage = h(
    "div",
    { class: "serp-stage" },
    h(
      "div",
      { class: "serp-head" },
      h("span", { class: "serp-fav" }, fav),
      h(
        "div",
        { class: "serp-id" },
        h("div", {
          class: "serp-site",
          text:
            og["og:site_name"] ||
            (a.hostname || domainOf(a.url) || "").replace(/^www\./, "") ||
            "site",
        }),
        h("div", { class: "serp-url", text: serpBreadcrumb(a.url) })
      )
    ),
    h("div", { class: "serp-title", text: titleText }),
    h(
      "div",
      { class: "serp-desc" },
      dateStr ? h("span", { class: "serp-date", text: dateStr + " — " }) : null,
      descText
    )
  );

  const wrap = h("div", { class: "serp-wrap" }, stage);
  const fit = () => {
    if (!wrap.clientWidth || !stage.offsetWidth) return;
    const scale = Math.min(1, wrap.clientWidth / stage.offsetWidth);
    stage.style.transform = `scale(${scale})`;
    wrap.style.height = stage.offsetHeight * scale + "px";
  };
  // rAF for the normal path, a 0-timer as backup — rAF (and ResizeObserver)
  // starve when the window is occluded, and the panel can render while hidden.
  requestAnimationFrame(fit);
  setTimeout(fit, 0);
  try {
    new ResizeObserver(fit).observe(wrap);
  } catch {}

  const seg = makeSegmented(
    [
      { id: "desktop", label: "Desktop" },
      { id: "mobile", label: "Mobile" },
    ],
    "desktop",
    (id) => {
      stage.classList.toggle("is-mobile", id === "mobile");
      requestAnimationFrame(fit);
    }
  );

  const titlePx = estimateTitlePx(a.title || "");
  return card(
    "Search preview",
    { right: seg },
    wrap,
    improvised && descSource
      ? h("p", {
          class: "note",
          text: "No meta description — the snippet above is improvised from page text, which is what Google does too.",
        })
      : null,
    h("p", {
      class: "note",
      text: `Title ≈ ${titlePx}px of ~${TITLE_PX_LIMIT}px · description ${a.metaDescriptionLength} ch (sweet spot 70–160). Measured with real font metrics — Google may still rewrite titles and snippets per query.`,
    })
  );
}

/* ============================================================
   TAB: Technical
   ============================================================ */
function renderTechnical(a) {
  const out = [];

  out.push(renderSerpPreview(a));

  const titlePx = estimateTitlePx(a.title || "");
  const titleStatus =
    a.titleLength === 0
      ? "red"
      : titlePx > TITLE_PX_LIMIT || a.titleLength < 30
      ? "amber"
      : "green";
  const descStatus =
    a.metaDescriptionLength === 0
      ? "red"
      : a.metaDescriptionLength < 70 || a.metaDescriptionLength > 160
      ? "amber"
      : "green";

  out.push(
    card(
      "Title & Description",
      {},
      h(
        "div",
        {},
        checkRow({
          status: titleStatus,
          label: "Title",
          detail: a.title || "(missing)",
          value: `~${titlePx}px · ${a.titleLength} ch`,
        }),
        checkRow({
          status: descStatus,
          label: "Meta description",
          detail: a.metaDescription || "(missing)",
          value: `${a.metaDescriptionLength} ch`,
        })
      )
    )
  );

  const canonSelf =
    !!a.canonical && normalizeForCompare(a.canonical) === normalizeForCompare(a.url);
  const noindexed = /\b(?:noindex|none)\b/i.test(
    `${a.robotsMeta || ""} ${a.googlebotMeta || ""}`
  );
  const robotsDetail = [
    a.robotsMeta ? `robots: ${a.robotsMeta}` : null,
    a.googlebotMeta ? `googlebot: ${a.googlebotMeta}` : null,
  ]
    .filter(Boolean)
    .join(" · ");
  out.push(
    card(
      "Indexing",
      {},
      h(
        "div",
        {},
        checkRow({
          status: a.canonical ? (canonSelf ? "green" : "amber") : "amber",
          label: "Canonical",
          detail: a.canonical
            ? a.canonical + (canonSelf ? "" : " — differs from this page's URL")
            : "not set",
        }),
        checkRow({
          status: noindexed ? "red" : "green",
          label: "Robots meta",
          detail: robotsDetail || "not set (defaults to index,follow)",
        }),
        checkRow({
          status: a.isHttps ? "green" : "red",
          label: "HTTPS",
          detail: a.isHttps ? "secure" : "not secure",
        })
      )
    )
  );

  out.push(renderCrawlability(a));

  out.push(
    card(
      "Document",
      {},
      h(
        "div",
        {},
        checkRow({
          status: a.viewport ? "green" : "amber",
          label: "Viewport",
          detail: a.viewport || "missing",
        }),
        checkRow({
          status: a.charset ? "green" : "amber",
          label: "Charset",
          detail: a.charset || "missing",
        }),
        checkRow({
          status: a.lang ? "green" : "amber",
          label: "Lang",
          detail: a.lang || "missing",
        }),
        checkRow({ status: "neutral", label: "Word count", value: a.wordCount }),
        checkRow({
          status: "neutral",
          label: "Reading time",
          value: `~${Math.max(1, Math.round(((a.content && a.content.mainWordCount) || a.wordCount || 0) / 200))} min`,
        })
      )
    )
  );

  // hreflang — sanity lint first, then every entry in a scroll viewport
  if (a.hreflang && a.hreflang.length) {
    const issueRows = computeHreflangIssues(a).map((iss) =>
      checkRow({ status: iss.status, label: iss.label, detail: iss.detail })
    );
    const rows = a.hreflang.map((hl) =>
      checkRow({ status: "neutral", label: hl.lang, detail: hl.href })
    );
    out.push(
      card(
        "Hreflang",
        { right: pill(String(a.hreflang.length)) },
        issueRows.length
          ? h("div", {}, issueRows)
          : checkRow({
              status: "green",
              label: "Set looks sane",
              detail: "Self-referencing, x-default present, codes valid, no duplicates.",
            }),
        h("div", { class: "item-list" }, rows)
      )
    );
  } else {
    out.push(card("Hreflang", {}, h("p", { class: "muted", text: "No hreflang alternates declared." })));
  }

  // quick links: own resources + external validators (each opens a new tab)
  const enc = encodeURIComponent(a.url);
  out.push(
    card(
      "Resources & validators",
      {},
      h(
        "div",
        { style: { display: "flex", flexWrap: "wrap", gap: "8px" } },
        linkButton("robots.txt", a.origin + "/robots.txt"),
        linkButton("sitemap.xml", a.origin + "/sitemap.xml"),
        linkButton("Rich Results Test", "https://search.google.com/test/rich-results?url=" + enc),
        linkButton("Schema validator", "https://validator.schema.org/#url=" + enc),
        linkButton("PageSpeed Insights", "https://pagespeed.web.dev/analysis?url=" + enc),
        linkButton("Google index check", "https://www.google.com/search?q=site:" + enc)
      ),
      h("p", {
        class: "note",
        text: "Each opens in a new tab — Google's own validators for the second opinion.",
      })
    )
  );

  return out;
}

/* ============================================================
   Crawlability — robots.txt rules + sitemap membership (on demand).
   The matcher follows Google's documented behavior: longest rule
   wins, Allow wins ties, * is a wildcard, $ anchors the end.
   ============================================================ */
let robotsView = { key: null, loading: false, data: null, error: null };

function parseRobots(txt) {
  const groups = [];
  const sitemaps = [];
  let cur = null;
  let lastWasAgent = false;
  String(txt)
    .split(/\r?\n/)
    .forEach((rawLine) => {
      const line = rawLine.replace(/#.*$/, "").trim();
      if (!line) return;
      const m = line.match(/^([a-z-]+)\s*:\s*(.*)$/i);
      if (!m) return;
      const key = m[1].toLowerCase();
      const val = m[2].trim();
      if (key === "user-agent") {
        if (!cur || !lastWasAgent) {
          cur = { agents: [], rules: [] };
          groups.push(cur);
        }
        cur.agents.push(val.toLowerCase());
        lastWasAgent = true;
      } else {
        if (key === "sitemap" && val) sitemaps.push(val);
        if ((key === "allow" || key === "disallow") && cur)
          cur.rules.push({ allow: key === "allow", path: val, line });
        lastWasAgent = false;
      }
    });
  return { groups, sitemaps };
}

function robotsRuleMatches(rulePath, path) {
  if (!rulePath) return false; // empty "Disallow:" matches nothing
  let p = rulePath;
  let anchored = false;
  if (p.endsWith("$")) {
    anchored = true;
    p = p.slice(0, -1);
  }
  const rx = new RegExp(
    "^" +
      p
        .split("*")
        .map((s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
        .join(".*") +
      (anchored ? "$" : "")
  );
  return rx.test(path);
}

function evaluateRobots(parsed, url, agent) {
  const ag = String(agent || "*").toLowerCase();
  let grps = parsed.groups.filter((g) =>
    g.agents.some((x) => x !== "*" && (ag === x || ag.startsWith(x)))
  );
  if (!grps.length) grps = parsed.groups.filter((g) => g.agents.includes("*"));
  let path = "/";
  try {
    const u = new URL(url);
    path = u.pathname + u.search;
  } catch {}
  let best = null;
  grps.forEach((g) =>
    g.rules.forEach((r) => {
      if (!robotsRuleMatches(r.path, path)) return;
      const spec = r.path.length;
      if (!best || spec > best.spec || (spec === best.spec && r.allow && !best.allow))
        best = { allow: r.allow, spec, line: r.line };
    })
  );
  return best ? { allowed: best.allow, rule: best.line } : { allowed: true, rule: null };
}

async function fetchText(url, timeoutMs) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs || 10000);
  try {
    const res = await fetch(url, { credentials: "omit", cache: "no-store", signal: ctrl.signal });
    const text = res.ok ? await res.text() : "";
    return { status: res.status, ok: res.ok, text };
  } catch (e) {
    return {
      status: null,
      ok: false,
      text: "",
      failed: true,
      timeout: !!(e && e.name === "AbortError"),
    };
  } finally {
    clearTimeout(timer);
  }
}

// Scan sitemaps for the URL, following one level of sitemap-index, bounded
// (6 fetches / 8 MB) so a 50k-URL sitemap can't hang the panel.
async function checkSitemaps(sitemapUrls, targetUrl) {
  const norm = normalizeForCompare(targetUrl);
  const queue = sitemapUrls.slice(0, 3);
  let fetches = 6;
  let bytes = 8 * 1024 * 1024;
  let scanned = 0;
  let urlCount = 0;
  let found = false;
  let skippedGz = 0;
  while (queue.length && fetches > 0 && bytes > 0 && !found) {
    const sm = queue.shift();
    if (/\.gz(?:[?#]|$)/i.test(sm)) {
      skippedGz++;
      continue;
    }
    fetches--;
    const res = await fetchText(sm, 10000);
    if (!res.ok) continue;
    scanned++;
    bytes -= res.text.length;
    const locs = (res.text.match(/<loc>\s*([\s\S]*?)\s*<\/loc>/gi) || []).map((l) =>
      l.replace(/<\/?loc>/gi, "").trim()
    );
    if (/<sitemapindex/i.test(res.text)) {
      locs.slice(0, 5).forEach((l) => queue.push(l));
    } else {
      urlCount += locs.length;
      if (locs.some((l) => normalizeForCompare(l) === norm)) found = true;
    }
  }
  return { scanned, urlCount, found, skippedGz, exhausted: fetches <= 0 || bytes <= 0 };
}

function renderCrawlability(a) {
  const key = normalizeUrl(a.url);
  const btn = h("button", {
    class: "linkcheck-run",
    type: "button",
    text:
      robotsView.key === key && robotsView.data
        ? "Check again"
        : "Check robots.txt & sitemap",
  });
  btn.addEventListener("click", async () => {
    robotsView = { key, loading: true, data: null, error: null };
    renderActiveTab();
    const res = await fetchText(a.origin + "/robots.txt", 10000);
    const data = { robotsStatus: res.status, robotsFailed: !!res.failed };
    if (res.ok) {
      const parsed = parseRobots(res.text);
      data.hasRobots = true;
      data.sitemaps = parsed.sitemaps;
      data.google = evaluateRobots(parsed, a.url, "googlebot");
      data.star = evaluateRobots(parsed, a.url, "*");
    } else {
      data.hasRobots = false;
      data.sitemaps = [];
    }
    const smUrls = data.sitemaps.length ? data.sitemaps : [a.origin + "/sitemap.xml"];
    data.sitemapGuessed = !data.sitemaps.length;
    data.sitemapUrls = smUrls;
    data.sitemap = await checkSitemaps(smUrls, a.url);
    robotsView = { key, loading: false, data, error: null };
    renderActiveTab();
  });

  const bits = [
    h("p", {
      class: "note",
      text:
        "Downloads robots.txt, applies Google's matching rules to THIS page, then scans the sitemap for this URL. On demand; nothing stored.",
    }),
    btn,
  ];

  if (robotsView.key === key) {
    if (robotsView.loading) {
      bits.push(
        h(
          "div",
          { class: "linkcheck-status" },
          h("span", { class: "linkcheck-spinner" }),
          h("span", { text: "Checking robots.txt and sitemap…" })
        )
      );
    } else if (robotsView.data) {
      const d = robotsView.data;
      const rows = h("div", {});
      if (d.robotsFailed) {
        rows.appendChild(
          checkRow({
            status: "amber",
            label: "robots.txt unreachable",
            detail: "Network failure or bot protection — crawl status unknown.",
          })
        );
      } else if (!d.hasRobots) {
        rows.appendChild(
          checkRow({
            status: d.robotsStatus >= 500 ? "amber" : "green",
            label: `No robots.txt (HTTP ${d.robotsStatus})`,
            detail:
              d.robotsStatus >= 500
                ? "Server error — Google may treat the whole site as temporarily off-limits."
                : "Everything is crawlable by default.",
          })
        );
      } else {
        rows.appendChild(
          checkRow({
            status: d.google.allowed ? "green" : "red",
            label: d.google.allowed
              ? "This page is crawlable (Googlebot)"
              : "This page is BLOCKED for Googlebot",
            detail: d.google.rule
              ? "matched rule: " + d.google.rule
              : "no rule matched — allowed by default",
          })
        );
        if (d.google.allowed !== d.star.allowed)
          rows.appendChild(
            checkRow({
              status: "amber",
              label: `Other crawlers (*) differ: ${d.star.allowed ? "allowed" : "blocked"}`,
              detail: d.star.rule ? "matched rule: " + d.star.rule : "",
            })
          );
        rows.appendChild(
          checkRow({
            status: d.sitemaps.length ? "green" : "amber",
            label: d.sitemaps.length
              ? `${d.sitemaps.length} sitemap${d.sitemaps.length > 1 ? "s" : ""} declared in robots.txt`
              : "No Sitemap: line in robots.txt",
            detail: d.sitemaps[0] || "tried the conventional /sitemap.xml instead",
          })
        );
      }
      const sm = d.sitemap || {};
      rows.appendChild(
        checkRow({
          status: sm.scanned ? (sm.found ? "green" : "amber") : "amber",
          label: sm.scanned
            ? sm.found
              ? "This page is in the sitemap"
              : "This page was NOT found in the sitemap"
            : "Sitemap unreachable",
          detail: sm.scanned
            ? `${sm.urlCount} URL${sm.urlCount === 1 ? "" : "s"} scanned across ${sm.scanned} file${sm.scanned === 1 ? "" : "s"}` +
              (d.sitemapGuessed ? " (guessed /sitemap.xml)" : "") +
              (sm.exhausted ? " — scan capped, result may be partial" : "") +
              (sm.skippedGz ? ` — ${sm.skippedGz} compressed (.gz) skipped` : "")
            : (d.sitemapUrls && d.sitemapUrls[0]) || "",
        })
      );
      bits.push(rows);
    }
  }
  return card("Crawlability", { right: pill("on demand") }, ...bits);
}

/* ============================================================
   TAB: Server — raw server HTML vs rendered DOM (on demand)
   One anonymous GET powers four checks: HTTP status, the
   X-Robots-Tag header, tag-level drift, and JS-dependence.
   ============================================================ */
let serverView = { key: null, loading: false, data: null, error: null };

const SV_HEADERS = ["x-robots-tag", "content-type", "last-modified", "cache-control", "link"];

async function fetchServerView(url) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 12000);
  try {
    const res = await fetch(url, {
      method: "GET",
      redirect: "follow",
      credentials: "omit", // anonymous, like a crawler — never the user's session
      cache: "no-store",
      signal: ctrl.signal,
    });
    const headers = {};
    SV_HEADERS.forEach((k) => {
      const v = res.headers.get(k);
      if (v) headers[k] = v;
    });
    const html = await res.text();
    return {
      ok: true,
      status: res.status,
      redirected: res.redirected,
      finalUrl: res.url,
      headers,
      html,
    };
  } catch (e) {
    return {
      ok: false,
      message: e && e.name === "AbortError" ? "timeout (12s)" : "request failed",
    };
  } finally {
    clearTimeout(timer);
  }
}

// DOMParser never executes scripts or loads subresources — safe on any HTML.
function parseRawHtml(html, baseUrl) {
  const doc = new DOMParser().parseFromString(html, "text/html");
  const absR = (href) => {
    try {
      return new URL(href, baseUrl).href;
    } catch {
      return href || null;
    }
  };
  const meta = (sel) => {
    const el = doc.querySelector(sel);
    return el ? (el.getAttribute("content") || "").trim() : null;
  };
  const ogMeta = (p) => meta(`meta[property="${p}" i]`) || meta(`meta[name="${p}" i]`);
  const canonEl = doc.querySelector('link[rel="canonical" i]');
  const out = {
    title: (doc.querySelector("title")
      ? doc.querySelector("title").textContent || ""
      : ""
    ).trim(),
    metaDescription: meta('meta[name="description" i]'),
    canonical: canonEl ? absR(canonEl.getAttribute("href")) : null,
    robotsMeta: meta('meta[name="robots" i]'),
    googlebotMeta: meta('meta[name="googlebot" i]'),
    h1Count: doc.querySelectorAll("h1").length,
    jsonLdScripts: doc.querySelectorAll('script[type="application/ld+json" i]').length,
    ogTitle: ogMeta("og:title"),
    ogImage: ogMeta("og:image"),
    wordCount: 0,
  };
  // Word count AFTER removing script/style text, or inline JS inflates it.
  try {
    doc.querySelectorAll("script,style,noscript,template").forEach((el) => el.remove());
    out.wordCount = ((doc.body && doc.body.textContent) || "")
      .trim()
      .split(/\s+/)
      .filter(Boolean).length;
  } catch {}
  return out;
}

// Field-by-field drift between the server's HTML and the rendered DOM.
function computeDrift(raw, a) {
  const txt = (v) => {
    if (v == null) return null;
    const t = String(v).trim();
    return t === "" ? null : t;
  };
  const rows = [];
  const push = (field, sv, rv, sameFn) => {
    const s = txt(sv);
    const r = txt(rv);
    if (s == null && r == null) return; // nothing on either side — no drift to report
    const same = sameFn ? sameFn(s, r) : s === r;
    let verdict, status;
    if (same) {
      verdict = "same";
      status = "green";
    } else if (s == null) {
      verdict = "added by JavaScript";
      status = "amber";
    } else if (r == null) {
      verdict = "removed by JavaScript";
      status = "red";
    } else {
      verdict = "changed by JavaScript";
      status = "amber";
    }
    rows.push({ field, server: s, rendered: r, verdict, status });
  };
  const urlSame = (x, y) =>
    x != null && y != null && normalizeForCompare(x) === normalizeForCompare(y);
  push("Title", raw.title, a.title);
  push("Meta description", raw.metaDescription, a.metaDescription);
  push("Canonical", raw.canonical, a.canonical, urlSame);
  push("Robots meta", raw.robotsMeta, a.robotsMeta);
  push("Googlebot meta", raw.googlebotMeta, a.googlebotMeta);
  push(
    "H1 count",
    String(raw.h1Count),
    String((a.headings || []).filter((x) => x.level === 1).length)
  );
  const renderedLd =
    a.jsonLdScriptCount != null ? a.jsonLdScriptCount : (a.jsonLd || []).length;
  push("JSON-LD scripts", String(raw.jsonLdScripts), String(renderedLd));
  push("og:title", raw.ogTitle, (a.openGraph || {})["og:title"]);
  push("og:image", raw.ogImage, (a.openGraph || {})["og:image"]);
  return rows;
}

function renderServer(a) {
  const out = [];
  const key = normalizeUrl(a.url);

  const btn = h("button", {
    class: "linkcheck-run",
    type: "button",
    text: serverView.key === key && serverView.data ? "Fetch again" : "Fetch from server",
  });
  btn.addEventListener("click", async () => {
    serverView = { key, loading: true, data: null, error: null };
    renderActiveTab();
    const res = await fetchServerView(a.url);
    serverView = res.ok
      ? {
          key,
          loading: false,
          error: null,
          data: {
            status: res.status,
            redirected: res.redirected,
            finalUrl: res.finalUrl,
            headers: res.headers,
            raw: parseRawHtml(res.html, res.finalUrl || a.url),
            htmlBytes: res.html.length,
          },
        }
      : { key, loading: false, data: null, error: res.message };
    renderActiveTab();
  });

  out.push(
    card(
      "Server view",
      { right: pill("on demand") },
      h("p", {
        class: "note",
        text:
          "Fetches this URL fresh from the server (anonymous, no cookies) and compares the raw HTML — what crawlers parse first — against the rendered DOM in your tab. Also reveals the X-Robots-Tag header, a noindex hiding place no meta-tag check can see.",
      }),
      btn
    )
  );

  if (serverView.key !== key) return out;

  if (serverView.loading) {
    out.push(
      card(
        null,
        {},
        h(
          "div",
          { class: "linkcheck-status" },
          h("span", { class: "linkcheck-spinner" }),
          h("span", { text: "Fetching raw HTML…" })
        )
      )
    );
    return out;
  }
  if (serverView.error) {
    out.push(
      card(
        "Result",
        {},
        checkRow({
          status: "red",
          label: "Fetch failed",
          detail:
            serverView.error +
            " — often bot protection. The rendered audit in the other tabs is unaffected.",
        })
      )
    );
    return out;
  }
  if (!serverView.data) return out;

  const d = serverView.data;
  const xrt = d.headers["x-robots-tag"] || null;
  const xrtNoindex = !!xrt && /\b(?:noindex|none)\b/i.test(xrt);

  out.push(
    card(
      "Server response",
      {},
      h(
        "div",
        {},
        checkRow({
          status: codeBand(d.status),
          label: "HTTP status",
          detail: d.redirected ? "redirected → " + d.finalUrl : a.url,
          value: d.status,
        }),
        checkRow({
          status: xrt ? (xrtNoindex ? "red" : "amber") : "green",
          label: "X-Robots-Tag header",
          detail: xrt
            ? xrt +
              (xrtNoindex
                ? " — page is noindexed at the HTTP layer (invisible to meta-tag checks)"
                : "")
            : "not set",
        }),
        d.headers["content-type"]
          ? checkRow({ status: "neutral", label: "Content-Type", detail: d.headers["content-type"] })
          : null,
        d.headers["last-modified"]
          ? checkRow({ status: "neutral", label: "Last-Modified", detail: d.headers["last-modified"] })
          : null,
        d.headers["link"]
          ? checkRow({ status: "neutral", label: "Link header", detail: truncate(d.headers["link"], 140) })
          : null,
        checkRow({ status: "neutral", label: "Raw HTML size", value: fmtBytes(d.htmlBytes) })
      )
    )
  );

  const rows = computeDrift(d.raw, a);
  const drifts = rows.filter((r) => r.verdict !== "same");
  const body = h("div", {});
  body.appendChild(
    checkRow(
      drifts.length
        ? {
            status: "amber",
            label: `${drifts.length} field${drifts.length > 1 ? "s" : ""} differ between server HTML and rendered DOM`,
            detail:
              "Crawlers parse server HTML first — anything JavaScript changes can be read late or inconsistently.",
          }
        : {
            status: "green",
            label: "No drift in SEO-critical fields",
            detail: "Server HTML and rendered DOM agree — JavaScript isn't rewriting your SEO tags.",
          }
    )
  );
  rows.forEach((r) => {
    body.appendChild(
      h(
        "div",
        { class: "drift" },
        h(
          "div",
          { class: "drift-head" },
          statusDot(r.status),
          h("span", { class: "drift-field", text: r.field }),
          h("span", { class: "drift-verdict is-" + r.status, text: r.verdict })
        ),
        r.verdict === "same"
          ? h("div", { class: "drift-val" }, h("span", { class: "drift-src", text: "both" }), truncate(r.server || "", 110))
          : h(
              "div",
              {},
              h(
                "div",
                { class: "drift-val" },
                h("span", { class: "drift-src", text: "server" }),
                r.server != null ? truncate(r.server, 110) : "(not set)"
              ),
              h(
                "div",
                { class: "drift-val" },
                h("span", { class: "drift-src", text: "rendered" }),
                r.rendered != null ? truncate(r.rendered, 110) : "(not set)"
              )
            )
      )
    );
  });
  out.push(
    card(
      "Raw vs rendered",
      {
        right: drifts.length
          ? pill(`${drifts.length} drift${drifts.length > 1 ? "s" : ""}`, "accent")
          : pill("no drift"),
      },
      body
    )
  );

  // How much of the content even exists before JavaScript runs?
  const rawWords = d.raw.wordCount || 0;
  const renderedWords = a.wordCount || 0;
  if (renderedWords > 50) {
    const pct = Math.min(100, Math.round((rawWords / renderedWords) * 100));
    out.push(
      card(
        "Content delivery",
        {},
        checkRow({
          status: pct >= 80 ? "green" : pct >= 40 ? "amber" : "red",
          label: `≈${pct}% of the text is in the server HTML`,
          detail:
            `${rawWords} words raw vs ${renderedWords} rendered. ` +
            (pct < 80
              ? "A meaningful share of content only exists after JavaScript runs — crawlers may index it late or miss it."
              : "The content doesn't depend on client-side JavaScript."),
        })
      )
    );
  }

  out.push(
    card(
      null,
      {},
      h("p", {
        class: "note",
        text:
          "Fresh anonymous GET — personalization, consent walls and bot protection can make the server's answer differ from what your logged-in tab received. Treat drift as a signal to investigate, not a verdict.",
      })
    )
  );
  return out;
}

/* ============================================================
   TAB: Site — sample-crawl the pages this one links to and hunt
   cross-page issues (duplicate titles/descriptions, noindexed or
   broken pages). Raw HTML only, anonymous, capped at 15 pages.
   ============================================================ */
let siteView = { key: null, loading: false, data: null, error: null };
const SITE_CRAWL_CAP = 15;
const NON_HTML_RE =
  /\.(?:jpe?g|png|gif|webp|avif|svg|ico|css|js|mjs|json|xml|pdf|zip|rar|7z|gz|mp3|mp4|webm|mov|avi|woff2?|ttf|eot)(?:[?#]|$)/i;

function siteCrawlTargets(a) {
  const seen = new Set([normalizeForCompare(a.url)]);
  const out = [];
  (a.links || []).forEach((l) => {
    if (!l.isInternal) return;
    if (l.protocol !== "http:" && l.protocol !== "https:") return;
    if (NON_HTML_RE.test(l.href)) return;
    try {
      const u = new URL(l.href);
      u.hash = "";
      const k = normalizeForCompare(u.href);
      if (seen.has(k)) return;
      seen.add(k);
      out.push(u.href);
    } catch {}
  });
  return out.slice(0, SITE_CRAWL_CAP);
}

async function auditUrlLite(url) {
  const res = await fetchServerView(url);
  if (!res.ok) return { url, error: res.message };
  const raw = parseRawHtml(res.html, res.finalUrl || url);
  const noindex =
    /\b(?:noindex|none)\b/i.test(`${raw.robotsMeta || ""} ${raw.googlebotMeta || ""}`) ||
    /\b(?:noindex|none)\b/i.test(res.headers["x-robots-tag"] || "");
  return {
    url,
    status: res.status,
    finalUrl: res.redirected ? res.finalUrl : null,
    title: raw.title || "",
    description: raw.metaDescription || "",
    canonical: raw.canonical,
    noindex,
    h1Count: raw.h1Count,
    words: raw.wordCount,
  };
}

function analyzeSite(pages) {
  const groupBy = (field) => {
    const map = new Map();
    pages.forEach((p) => {
      if (p.error) return;
      const v = (p[field] || "").trim().toLowerCase();
      if (!v) return;
      if (!map.has(v)) map.set(v, []);
      map.get(v).push(p);
    });
    return [...map.values()].filter((g) => g.length > 1);
  };
  return {
    dupTitles: groupBy("title"),
    dupDescs: groupBy("description"),
    noTitle: pages.filter((p) => !p.error && !p.title),
    noDesc: pages.filter((p) => !p.error && !p.description),
    noindexed: pages.filter((p) => !p.error && p.noindex),
    broken: pages.filter((p) => p.error || (p.status && p.status >= 400)),
    canonElsewhere: pages.filter(
      (p) =>
        !p.error &&
        p.canonical &&
        normalizeForCompare(p.canonical) !== normalizeForCompare(p.finalUrl || p.url)
    ),
  };
}

function renderSite(a) {
  const out = [];
  const key = normalizeUrl(a.url);
  const targets = siteCrawlTargets(a);

  const btn = h("button", {
    class: "linkcheck-run",
    type: "button",
    text: targets.length
      ? `${siteView.key === key && siteView.data ? "Re-crawl" : "Crawl"} ${targets.length} linked page${targets.length > 1 ? "s" : ""}`
      : "No internal pages to crawl",
  });
  if (!targets.length) btn.disabled = true;

  const progress = h("div", {});
  btn.addEventListener("click", async () => {
    btn.disabled = true;
    siteView = { key, loading: true, data: null, error: null };
    progress.textContent = "";
    const statusEl = h(
      "div",
      { class: "linkcheck-status" },
      h("span", { class: "linkcheck-spinner" }),
      h("span", { text: `Crawling… 0 / ${targets.length}` })
    );
    progress.appendChild(statusEl);
    const label = statusEl.lastChild;
    let done = 0;
    const pages = await runPool(targets, auditUrlLite, 4, () => {
      done++;
      label.textContent = `Crawling… ${done} / ${targets.length}`;
    });
    // the current page joins the comparison set from its own (rendered) audit
    const thisPage = {
      url: a.url,
      status: null,
      thisPage: true,
      title: a.title || "",
      description: a.metaDescription || "",
      canonical: a.canonical,
      noindex: /\b(?:noindex|none)\b/i.test(`${a.robotsMeta || ""} ${a.googlebotMeta || ""}`),
      h1Count: (a.headings || []).filter((x) => x.level === 1).length,
    };
    siteView = {
      key,
      loading: false,
      error: null,
      data: { pages: [thisPage, ...pages], crawled: pages.length },
    };
    renderActiveTab();
  });

  out.push(
    card(
      "Site sample",
      { right: pill("on demand") },
      h("p", {
        class: "note",
        text: `Fetches up to ${SITE_CRAWL_CAP} pages this page links to (raw HTML, anonymous, no JavaScript) and hunts the classic cross-page issues: duplicate titles and descriptions, missing tags, noindexed or broken pages.`,
      }),
      btn,
      progress
    )
  );

  if (siteView.key !== key || !siteView.data) return out;

  const pages = siteView.data.pages;
  const an = analyzeSite(pages);
  const sum = h("div", {});
  const sRow = (count, okLabel, badLabel, detail, band) =>
    sum.appendChild(
      checkRow({
        status: count ? band : "green",
        label: count ? badLabel : okLabel,
        detail: count ? detail : null,
      })
    );
  sRow(
    an.dupTitles.length,
    "No duplicate titles",
    `${an.dupTitles.length} duplicate-title group${an.dupTitles.length > 1 ? "s" : ""}`,
    "Pages competing for the same query — groups below.",
    "red"
  );
  sRow(
    an.dupDescs.length,
    "No duplicate descriptions",
    `${an.dupDescs.length} duplicate-description group${an.dupDescs.length > 1 ? "s" : ""}`,
    "The same pitch on multiple pages.",
    "amber"
  );
  sRow(
    an.noindexed.length,
    "No noindexed pages in sample",
    `${an.noindexed.length} noindexed page${an.noindexed.length > 1 ? "s" : ""}`,
    an.noindexed.map((p) => p.url).slice(0, 3).join(" · "),
    "red"
  );
  sRow(
    an.broken.length,
    "No broken pages",
    `${an.broken.length} broken/unreachable page${an.broken.length > 1 ? "s" : ""}`,
    an.broken.map((p) => p.url).slice(0, 3).join(" · "),
    "red"
  );
  sRow(
    an.noTitle.length,
    "Every page has a title",
    `${an.noTitle.length} page${an.noTitle.length > 1 ? "s" : ""} without a title`,
    null,
    "red"
  );
  sRow(
    an.noDesc.length,
    "Every page has a description",
    `${an.noDesc.length} page${an.noDesc.length > 1 ? "s" : ""} without a description`,
    null,
    "amber"
  );
  sRow(
    an.canonElsewhere.length,
    "All canonicals self-reference",
    `${an.canonElsewhere.length} page${an.canonElsewhere.length > 1 ? "s" : ""} canonicalized elsewhere`,
    "Often intentional — verify.",
    "amber"
  );
  out.push(card("Cross-page findings", { right: pill(`${siteView.data.crawled} crawled`) }, sum));

  // duplicate group details
  [
    ...an.dupTitles.map((g) => ({ g, kind: "title" })),
    ...an.dupDescs.map((g) => ({ g, kind: "description" })),
  ].forEach(({ g, kind }, i) => {
    const body = h("div", {});
    body.appendChild(
      h("p", { class: "note", text: `Shared ${kind}: “${truncate(g[0][kind], 90)}”` })
    );
    g.forEach((p) =>
      body.appendChild(
        checkRow({
          status: kind === "title" ? "red" : "amber",
          label: p.thisPage ? "(this page)" : p.url.replace(/^https?:\/\//i, ""),
        })
      )
    );
    out.push(card(`Duplicate ${kind} · group ${i + 1}`, {}, body));
  });

  // full page list
  const rows = pages.map((p) => {
    const tags = h("div", { class: "item-tags" });
    if (p.thisPage) tags.appendChild(tag("this page", "green"));
    if (p.error) tags.appendChild(tag("failed", "red"));
    if (p.status && p.status >= 400) tags.appendChild(tag(String(p.status), "red"));
    else if (p.status && p.status >= 300) tags.appendChild(tag(String(p.status), "amber"));
    if (p.noindex) tags.appendChild(tag("noindex", "red"));
    if (!p.error && !p.title) tags.appendChild(tag("no title", "red"));
    if (!p.error && !p.description) tags.appendChild(tag("no desc", "amber"));
    if (!p.error && p.h1Count !== 1) tags.appendChild(tag(`h1×${p.h1Count}`, "amber"));
    const el = h(
      "div",
      { class: "item" },
      h(
        "div",
        { class: "item-main" },
        h("div", { class: "item-primary", text: p.error ? "(unreachable)" : p.title || "(no title)" }),
        h("div", { class: "item-secondary", text: p.url })
      ),
      tags
    );
    return { el, text: `${p.title || ""} ${p.url}` };
  });
  out.push(card("Pages", {}, filterableList(rows, { placeholder: "Filter pages…", noun: "pages" })));

  out.push(
    card(
      null,
      {},
      h("p", {
        class: "note",
        text: "A raw-HTML sample of pages linked from here — not a full crawl. JS-injected tags on those pages won't show (open any of them and use the Server tab for that).",
      })
    )
  );
  return out;
}

/* ============================================================
   shell: tab bar, content, states
   ============================================================ */
function buildTabBar() {
  // remove old tab buttons (keep underline element)
  [...els.tabbar.querySelectorAll(".tab")].forEach((t) => t.remove());
  TABS.forEach((t) => {
    const btn = h("button", {
      class: "tab" + (t.id === currentTabId ? " is-active" : ""),
      role: "tab",
      id: "tabbtn-" + t.id,
      "aria-selected": String(t.id === currentTabId),
      tabindex: t.id === currentTabId ? "0" : "-1",
      "data-id": t.id,
    });
    btn.appendChild(document.createTextNode(t.label));
    if (currentAudit && t.count) {
      const c = t.count(currentAudit);
      // null = "no meaningful badge" (e.g. Flesch skipped on non-English pages)
      if (c != null) btn.appendChild(h("span", { class: "tab-count", text: String(c) }));
    }
    btn.addEventListener("click", () => setActiveTab(t.id));
    els.tabbar.insertBefore(btn, els.underline);
  });
  els.content.setAttribute("aria-labelledby", "tabbtn-" + currentTabId);
  requestAnimationFrame(positionUnderline);
}

function positionUnderline() {
  const active = els.tabbar.querySelector(".tab.is-active");
  if (!active) {
    els.underline.style.width = "0";
    return;
  }
  els.underline.style.width = active.offsetWidth + "px";
  els.underline.style.transform = `translateX(${active.offsetLeft}px)`;
}

function setActiveTab(id) {
  currentTabId = id;
  els.tabbar.querySelectorAll(".tab").forEach((t) => {
    const on = t.getAttribute("data-id") === id;
    t.classList.toggle("is-active", on);
    t.setAttribute("aria-selected", String(on));
    t.setAttribute("tabindex", on ? "0" : "-1");
  });
  els.content.setAttribute("aria-labelledby", "tabbtn-" + id);
  positionUnderline();
  // keep active tab visible in scroll
  const active = els.tabbar.querySelector(".tab.is-active");
  if (active) active.scrollIntoView({ inline: "nearest", block: "nearest" });
  renderActiveTab();
}

function renderActiveTab() {
  if (panelState !== "ready") return;
  const tab = TABS.find((t) => t.id === currentTabId) || TABS[0];
  const panel = h("div", { class: "tab-panel" });
  let nodes;
  try {
    nodes = tab.render(currentAudit) || [];
  } catch (e) {
    console.error("SEOdin render error", e);
    nodes = [card("Error", {}, h("p", { class: "muted", text: "Failed to render this tab: " + e.message }))];
  }
  nodes.forEach((n) => panel.appendChild(n));
  els.content.textContent = "";
  els.content.appendChild(panel);
  els.content.scrollTop = 0;
}

/* ----- states ----- */
function showState(kind, { title, sub, iconKey } = {}) {
  panelState = kind;
  els.content.textContent = "";
  const wrap = h(
    "div",
    { class: "state" },
    h("div", { class: "state-icon", html: ICON[iconKey] || ICON.empty }),
    h("div", { class: "state-title", text: title }),
    sub ? h("div", { class: "state-sub", text: sub }) : null
  );
  els.content.appendChild(wrap);
}

function showLoading() {
  panelState = "loading";
  els.content.textContent = "";
  const wrap = h(
    "div",
    { class: "state" },
    h("div", { class: "spinner" }),
    h("div", { class: "state-sub", text: "Analyzing page…" })
  );
  els.content.appendChild(wrap);
}

/* ============================================================
   header
   ============================================================ */
function updateHeader(tab) {
  if (tab && tab.favIconUrl) {
    els.favicon.src = tab.favIconUrl;
    els.favicon.style.visibility = "visible";
  } else {
    els.favicon.removeAttribute("src");
  }
  if (tab && tab.title) els.pageTitle.textContent = tab.title;
  if (tab && tab.url) els.pageUrl.textContent = tab.url;
}
function updateHeaderFromAudit(a) {
  if (a.title) els.pageTitle.textContent = a.title;
  if (a.url) els.pageUrl.textContent = a.url;
  if (!els.favicon.getAttribute("src") && a.faviconUrl) {
    els.favicon.src = a.faviconUrl;
    els.favicon.style.visibility = "visible";
  }
}

/* ============================================================
   toast
   ============================================================ */
let toastTimer = null;
function showToast(msg) {
  els.toast.textContent = "";
  els.toast.appendChild(h("span", { class: "toast-check", html: ICON.check }));
  els.toast.appendChild(document.createTextNode(msg));
  els.toast.classList.add("is-show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => els.toast.classList.remove("is-show"), 1900);
}

/* ============================================================
   audit orchestration
   ============================================================ */
const RESTRICTED_RE =
  /^(chrome|edge|brave|opera|about|devtools|view-source|chrome-extension|moz-extension|chrome-search|chrome-untrusted):/i;
function isRestricted(url) {
  if (!url) return true;
  if (RESTRICTED_RE.test(url)) return true;
  if (/^https?:\/\/chrome\.google\.com\/webstore/i.test(url)) return true;
  if (/^https?:\/\/chromewebstore\.google\.com/i.test(url)) return true;
  return false;
}

async function getActiveTab() {
  try {
    let [tab] = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
    if (!tab) [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    return tab || null;
  } catch {
    return null;
  }
}

// Errors that mean "the page was navigating / the frame went away" — transient,
// not a real failure. Retrying once after the page settles usually fixes it.
let auditToken = 0;
function isTransientInjectionError(e) {
  const m = (e && e.message) || String(e || "");
  return /frame (?:with id .* )?was removed|no frame with id|no tab with id|tab was closed|frame (?:was )?detached|cannot access contents|the (?:tab|page) (?:was|is) (?:closed|navigat)|back\/forward cache|render(?:er)? frame|target (?:frame )?(?:was )?detached|document is not focused|receiving end does not exist/i.test(
    m
  );
}

async function runAudit() {
  const token = ++auditToken;
  const superseded = () => token !== auditToken;
  showLoading();
  els.refreshBtn.classList.add("is-spinning");
  try {
    const tab = await getActiveTab();
    if (superseded()) return;
    activeBrowserTab = tab;
    if (!tab || !tab.id || !tab.url) {
      showState("restricted", {
        iconKey: "empty",
        title: "No active tab",
        sub: "Open a web page in this window, then refresh.",
      });
      return;
    }
    updateHeader(tab);

    if (isRestricted(tab.url)) {
      els.pageTitle.textContent = "Restricted page";
      els.pageUrl.textContent = tab.url;
      showState("restricted", {
        iconKey: "restricted",
        title: "Can't analyze this page",
        sub: "Browser pages, the Web Store, and extension pages are off-limits to extensions. Navigate to a normal website and refresh.",
      });
      return;
    }

    // If the page is still loading, wait for it to settle before injecting —
    // injecting into a frame mid-navigation is what throws "frame was removed".
    if (tab.status === "loading") {
      for (let i = 0; i < 8; i++) {
        await new Promise((r) => setTimeout(r, 300));
        if (superseded()) return;
        let t = null;
        try {
          t = await chrome.tabs.get(tab.id);
        } catch {
          break; // tab gone; the inject loop will handle it
        }
        if (superseded()) return;
        if (!t || t.status !== "loading") break;
      }
    }

    // Inject, retrying if the page was mid-navigation when we hit it.
    let injection = null;
    let lastErr = null;
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const results = await chrome.scripting.executeScript({
          target: { tabId: tab.id },
          func: scrapeAudit,
        });
        if (superseded()) return;
        injection = results && results[0];
        lastErr = null;
        break;
      } catch (e) {
        if (superseded()) return;
        lastErr = e;
        if (attempt < 2 && isTransientInjectionError(e)) {
          await new Promise((r) => setTimeout(r, 500)); // let the page settle
          if (superseded()) return;
          continue;
        }
        break;
      }
    }

    if (lastErr) {
      if (isTransientInjectionError(lastErr)) {
        // Expected during navigation/reload — don't spam the Errors page.
        console.debug("SEOdin: skipped scan, page was navigating:", lastErr.message);
        showState("error", {
          iconKey: "error",
          title: "Page was still loading",
          sub: "The page was navigating when I tried to scan it. Hit Refresh once it has finished loading.",
        });
      } else {
        console.error("SEOdin injection error", lastErr);
        showState("error", {
          iconKey: "error",
          title: "Couldn't read this page",
          sub: "Script injection was blocked (it may be a PDF, a sandboxed frame, or a restricted page). Try Refresh.",
        });
      }
      return;
    }

    if (!injection || !injection.result) {
      showState("error", {
        iconKey: "error",
        title: "No data returned",
        sub: "The page returned an empty audit. Try Refresh.",
      });
      return;
    }

    currentAudit = injection.result;
    panelState = "ready";
    updateHeaderFromAudit(currentAudit);
    await applyHistory(currentAudit); // Feature 2 — record + diff (local only)
    if (superseded()) return;
    buildTabBar();
    renderActiveTab();
  } finally {
    if (token === auditToken) els.refreshBtn.classList.remove("is-spinning");
  }
}

/* ============================================================
   Copy for LLM — Markdown serializer
   ============================================================ */
function buildMarkdown(a) {
  const L = [];
  const yn = (b) => (b ? "yes" : "no");
  const sevMark = (s) =>
    s === "red" || s === "critical"
      ? "🔴"
      : s === "amber" || s === "warning"
      ? "🟠"
      : s === "green" || s === "pass"
      ? "🟢"
      : "•";

  // Instruction header — makes a bare paste actionable.
  L.push(
    "You are a senior technical-SEO consultant. Below is an automated on-page audit of a single URL, generated by SEOdin from the page's rendered DOM. Please:"
  );
  L.push("1. Triage the findings by real-world SEO impact (Critical → Warning) and say what to fix first.");
  L.push("2. For each fix, give concrete, paste-ready output — corrected JSON-LD, exact tag/text changes.");
  L.push('3. Treat anything labelled "heuristic" as a signal, not ground truth.');
  L.push("");
  L.push("---");
  L.push("");

  L.push(`# SEO Audit — ${a.title || "(untitled)"}`);
  L.push("");
  L.push(`- Tool: SEOdin v${VERSION}`);
  L.push(`- Source: ${a.domSource === "rendered" ? "rendered DOM (post-JavaScript)" : "raw HTML"}`);
  L.push(`- URL: ${a.url}`);
  L.push(`- Scraped: ${a.scrapedAt}`);
  L.push("");

  // Since last scan (Feature 2 — history is stored locally only)
  if (historyState && !historyState.unavailable) {
    if (historyState.prev && historyState.cur) {
      const pv = historyState.prev;
      const cv = historyState.cur;
      L.push(
        `> Since last scan: readability ${pv.readability.overall}→${cv.readability.overall}, ` +
          `critical ${pv.triage.critical}→${cv.triage.critical}, ` +
          `warnings ${pv.triage.warning}→${cv.triage.warning} (last scanned ${new Date(pv.ts).toLocaleString()}).`
      );
      L.push("");
    } else if (!historyState.prev) {
      L.push("> Since last scan: first scan of this page.");
      L.push("");
    }
  }

  // Triage (impact-ordered, top of the report)
  const triage = computeTriage(a);
  const emoji = { critical: "🔴", warning: "🟠", pass: "🟢" };
  L.push("## Triage");
  ["critical", "warning", "pass"].forEach((sev) => {
    const items = triage.filter((f) => f.sev === sev);
    L.push(`### ${sev[0].toUpperCase() + sev.slice(1)} (${items.length})`);
    if (!items.length) {
      L.push("- none");
    } else {
      items.forEach((f) => {
        L.push(`- ${emoji[sev]} ${f.label}${f.detail ? ` — ${f.detail}` : ""}`);
        if (f.items) f.items.slice(0, 40).forEach((s) => L.push(`    - ${s.text}`));
      });
    }
  });
  L.push("");

  // LLM Readability (heuristic)
  const rd = computeReadability(a);
  L.push("## LLM Readability (heuristic)");
  L.push(`- Overall: ${rd.overall}/100`);
  rd.dims.forEach((d) => L.push(`- ${d.label}: ${d.score}/100`));
  L.push("");

  // Content & keyword (client-side text math)
  const cc = computeContent(a);
  L.push("## Content & keyword");
  L.push(
    `- Reading ease (Flesch, estimate): ${
      cc.fleschSkipped
        ? `skipped — Flesch is English-only (page lang="${a.lang}")`
        : cc.flesch == null
        ? "—"
        : cc.flesch
    }`
  );
  L.push(
    `- ~${cc.readingMin} min read · Words: ${cc.wordCount} · Sentences: ${cc.sentences} · Avg/sentence: ${cc.avgWPS} · Paragraphs: ${cc.paragraphs}`
  );
  if (cc.topTerms.length)
    L.push(
      `- Top terms: ${cc.topTerms
        .slice(0, 8)
        .map((t) => `${t.term} (${t.count}, ${t.density.toFixed(1)}%)`)
        .join(", ")}`
    );
  const kw = keyword.trim() || cc.topGuess || "";
  if (kw) {
    const cov = keywordCoverage(a, kw, cc.wordCount);
    const yn2 = (b) => (b ? "yes" : "no");
    L.push(
      `- Target keyword${keyword.trim() ? "" : " (guessed)"}: "${kw}" — title:${yn2(cov.inTitle)}, ` +
        `H1:${yn2(cov.inH1)}, first paragraph:${yn2(cov.inFirstPara)}, any heading:${yn2(cov.inAnyHeading)}, ` +
        `body:${cov.bodyCount}× (${cov.density.toFixed(2)}%)`
    );
  }
  L.push("");

  // Technical
  L.push("## Technical");
  L.push(`- Title (${a.titleLength} ch): ${a.title || "—"}`);
  L.push(`- Meta description (${a.metaDescriptionLength} ch): ${a.metaDescription || "—"}`);
  L.push(`- Canonical: ${a.canonical || "—"}`);
  L.push(
    `- Robots meta: ${a.robotsMeta || "—"}${a.googlebotMeta ? ` · googlebot: ${a.googlebotMeta}` : ""}`
  );
  L.push(`- HTTPS: ${yn(a.isHttps)} · Lang: ${a.lang || "—"} · Charset: ${a.charset || "—"}`);
  L.push(`- Viewport: ${a.viewport || "—"}`);
  L.push(`- Word count: ${a.wordCount}`);
  if (a.hreflang && a.hreflang.length)
    L.push(`- Hreflang: ${a.hreflang.map((x) => x.lang).join(", ")}`);
  L.push("");

  // Server view — only if it was fetched for this URL in this session
  if (serverView.key === normalizeUrl(a.url) && serverView.data) {
    const sv = serverView.data;
    L.push("## Server view (raw HTML vs rendered DOM)");
    L.push(`- HTTP status: ${sv.status}${sv.redirected ? ` (redirected → ${sv.finalUrl})` : ""}`);
    L.push(`- X-Robots-Tag: ${sv.headers["x-robots-tag"] || "not set"}`);
    const driftRows = computeDrift(sv.raw, a).filter((r) => r.verdict !== "same");
    if (!driftRows.length) {
      L.push("- No drift in SEO-critical fields — server HTML and rendered DOM agree.");
    } else {
      driftRows.forEach((r) =>
        L.push(
          `- ⚠ ${r.field} ${r.verdict}: server="${r.server != null ? r.server : "(not set)"}" → rendered="${r.rendered != null ? r.rendered : "(not set)"}"`
        )
      );
    }
    L.push("");
  }

  // Crawlability — only if checked for this URL this session
  if (robotsView.key === normalizeUrl(a.url) && robotsView.data) {
    const rv = robotsView.data;
    L.push("## Crawlability");
    if (rv.hasRobots && rv.google)
      L.push(
        `- robots.txt: page ${rv.google.allowed ? "allowed" : "BLOCKED"} for Googlebot${rv.google.rule ? ` (rule: ${rv.google.rule})` : ""}`
      );
    else if (rv.robotsFailed) L.push("- robots.txt: unreachable");
    else L.push(`- robots.txt: none (HTTP ${rv.robotsStatus}) — crawlable by default`);
    if (rv.sitemap && rv.sitemap.scanned)
      L.push(
        `- Sitemap: page ${rv.sitemap.found ? "FOUND" : "NOT found"} (${rv.sitemap.urlCount} URLs scanned${rv.sitemapGuessed ? ", guessed /sitemap.xml" : ""})`
      );
    L.push("");
  }

  // Site sample — only if crawled from this page this session
  if (siteView.key === normalizeUrl(a.url) && siteView.data) {
    const an = analyzeSite(siteView.data.pages);
    L.push(`## Site sample (${siteView.data.crawled} linked pages, raw HTML)`);
    L.push(
      `- Duplicate titles: ${an.dupTitles.length} group(s) · duplicate descriptions: ${an.dupDescs.length} group(s)`
    );
    L.push(
      `- Noindexed: ${an.noindexed.length} · broken: ${an.broken.length} · missing title: ${an.noTitle.length} · missing description: ${an.noDesc.length}`
    );
    an.dupTitles.slice(0, 5).forEach((g) =>
      L.push(`- ⚠ Same title on: ${g.map((p) => p.url).join(" , ")}`)
    );
    L.push("");
  }

  // Headings
  const flags = headingFlags(a.headings);
  L.push("## Headings");
  L.push(
    `- Counts: ${[1, 2, 3, 4, 5, 6].map((lv) => `H${lv}:${flags.counts[lv] || 0}`).join(" ")}`
  );
  if (flags.multipleH1) L.push(`- ⚠ Multiple H1s (${flags.counts[1]})`);
  if (flags.noH1) L.push(`- ⚠ No H1`);
  if (flags.skips) L.push(`- ⚠ ${flags.skips} skipped level(s)`);
  if (flags.empties) L.push(`- ⚠ ${flags.empties} empty heading(s)`);
  L.push("- Outline:");
  a.headings.slice(0, 60).forEach((hd) => {
    L.push(`${"  ".repeat(hd.level)}- H${hd.level}: ${hd.text || "(empty)"}`);
  });
  L.push("");

  // Schema
  const blocks = a.jsonLd || [];
  L.push("## Schema (JSON-LD)");
  const typeSet = new Set();
  blocks.forEach((b) => collectTypes(b, typeSet));
  L.push(`- Blocks: ${blocks.length} · Types: ${[...typeSet].join(", ") || "none"}`);
  if (a.microdataCount)
    L.push(`- Microdata: ${a.microdataCount} itemscope item(s) — not parsed by SEOdin`);

  // completeness (recommended-fields heuristic)
  const completeness = computeCompleteness(a);
  if (completeness.length) {
    L.push("");
    L.push("### Completeness (recommended-fields heuristic)");
    completeness.forEach((r) =>
      L.push(
        `- ${r.type}: ${r.found}/${r.total} fields${
          r.missing.length ? ` — missing: ${r.missing.join(", ")}` : " — complete"
        }`
      )
    );
  }

  // issues + suggested fixes (snippets for templatable gaps, notes for the rest)
  const issues = computeSchemaIssues(a);
  if (issues.length) {
    L.push("");
    L.push("### Issues & suggested fixes");
    issues.forEach((iss) => {
      L.push(`- ${sevMark(iss.status)} ${iss.label}${iss.detail ? ` — ${iss.detail}` : ""}`);
      if (iss.fix && iss.fix.kind === "snippet") {
        L.push("");
        L.push("```html");
        L.push(iss.fix.code);
        L.push("```");
        L.push("");
      } else if (iss.fix && iss.fix.kind === "note") {
        L.push(`  - ${iss.fix.text}`);
      }
    });
  }

  // raw JSON-LD (toggleable — controlled by the header { } button)
  if (includeJsonLd && blocks.length) {
    L.push("");
    L.push("### Raw JSON-LD");
    L.push("```json");
    L.push(JSON.stringify(blocks, null, 2));
    L.push("```");
  } else if (!includeJsonLd && blocks.length) {
    L.push("");
    L.push(`_Raw JSON-LD omitted (${blocks.length} block(s)); enable the { } toggle to include it._`);
  }
  L.push("");

  // Social
  L.push("## Social");
  const og = a.openGraph || {};
  const tw = a.twitter || {};
  ["og:title", "og:description", "og:image", "og:type", "og:url"].forEach((f) =>
    L.push(`- ${f}: ${og[f] || "MISSING"}`)
  );
  ["twitter:card", "twitter:title", "twitter:image"].forEach((f) =>
    L.push(`- ${f}: ${tw[f] || "MISSING"}`)
  );
  L.push("");

  // Images
  const missingAlt = (a.images || []).filter((i) => !i.hasAlt).length;
  L.push("## Images");
  L.push(`- Total: ${(a.images || []).length} · Missing alt: ${missingAlt}`);
  L.push("");

  // Links
  const links = a.links || [];
  const internal = links.filter((l) => l.isInternal).length;
  L.push("## Links");
  L.push(`- Total: ${links.length} · Internal: ${internal} · External: ${links.length - internal}`);
  L.push(
    `- nofollow: ${links.filter((l) => /nofollow/i.test(l.rel)).length} · empty-anchor: ${links.filter((l) => !l.anchor).length}`
  );
  L.push("");

  // E-E-A-T
  const e = extractEeat(a);
  L.push("## E-E-A-T signals");
  L.push(`- Author: ${e.authorName ? `${e.authorName}${e.authorSource ? ` (${e.authorSource})` : ""}` : "—"}`);
  if (e.authorUrl) L.push(`- Author URL: ${e.authorUrl}`);
  L.push(`- Date published: ${e.datePublished || "—"}`);
  L.push(`- Date modified: ${e.dateModified || "—"}`);
  L.push(`- Publisher: ${e.orgName || (e.hasPublisher ? "present (no name)" : "—")}`);
  L.push(`- Visible "last updated": ${e.lastUpdatedText || "—"}`);
  L.push(`- About: ${e.aboutHref || "—"} · Contact: ${e.contactHref || "—"}`);
  L.push(
    `- Authoritative citations: ${e.citeCount}${e.citeDomains.length ? ` (${e.citeDomains.slice(0, 6).join(", ")})` : ""}`
  );
  L.push("");

  // Accessibility (quick automated checks)
  const a11yChecks = computeA11y(a);
  L.push("## Accessibility (quick automated checks)");
  L.push("_Not a full WCAG audit — colour contrast and keyboard operability need manual testing._");
  a11yChecks.forEach((c) =>
    L.push(`- ${sevMark(c.status)} ${c.label}${c.detail ? ` — ${c.detail}` : ""}`)
  );
  L.push("");

  // Performance
  const p = a.performance || {};
  L.push("## Performance (this load)");
  L.push(`- LCP: ${fmtMs(p.lcp)} · CLS: ${p.cls == null ? "—" : p.cls.toFixed(3)}`);
  L.push(`- FCP: ${fmtMs(p.fcp)} · TTFB: ${fmtMs(p.ttfb)}`);
  L.push(`- Transfer: ${fmtBytes(p.transferSize)} · Requests: ${p.resourceCount ?? "—"}`);
  L.push("");

  return L.join("\n");
}

async function copyForLLM() {
  if (!currentAudit) {
    showToast("Nothing to copy yet");
    return;
  }
  const md = buildMarkdown(currentAudit);
  try {
    await navigator.clipboard.writeText(md);
    showToast("Audit copied for LLM");
  } catch (e) {
    // fallback
    const ta = h("textarea", { style: { position: "fixed", opacity: "0" } });
    ta.value = md;
    document.body.appendChild(ta);
    ta.select();
    try {
      document.execCommand("copy");
      showToast("Audit copied for LLM");
    } catch {
      showToast("Copy failed");
    }
    ta.remove();
  }
}

/* ============================================================
   Export to file (.md / .json) — Blob + temporary <a download>
   ============================================================ */
function isoDate() {
  const d = new Date();
  const p = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}
function safeHost(a) {
  return (a.hostname || domainOf(a.url) || "page").replace(/[^a-z0-9.-]/gi, "_");
}
function downloadFile(filename, text, mime) {
  try {
    const blob = new Blob([text], { type: mime });
    const url = URL.createObjectURL(blob);
    const link = h("a", { href: url, download: filename });
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
    return true;
  } catch (e) {
    console.error("SEOdin export failed", e);
    return false;
  }
}
function exportMarkdown() {
  if (!currentAudit) {
    showToast("Nothing to export yet");
    return;
  }
  // The .md follows the { } JSON-LD toggle (buildMarkdown reads includeJsonLd).
  const ok = downloadFile(
    `seodin-${safeHost(currentAudit)}-${isoDate()}.md`,
    buildMarkdown(currentAudit),
    "text/markdown"
  );
  showToast(ok ? "Markdown exported" : "Export failed");
}
function exportJson() {
  if (!currentAudit) {
    showToast("Nothing to export yet");
    return;
  }
  const ok = downloadFile(
    `seodin-${safeHost(currentAudit)}-${isoDate()}.json`,
    JSON.stringify(currentAudit, null, 2),
    "application/json"
  );
  showToast(ok ? "Raw audit exported" : "Export failed");
}

/* ============================================================
   Client-ready HTML report — one self-contained file, prints to
   PDF. Generated locally; every dynamic value is HTML-escaped.
   ============================================================ */
function escHtml(s) {
  return String(s == null ? "" : s).replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]
  );
}

function buildHtmlReport(a) {
  const e = escHtml;
  const triage = computeTriage(a);
  const crit = triage.filter((f) => f.sev === "critical");
  const warn = triage.filter((f) => f.sev === "warning");
  const pass = triage.filter((f) => f.sev === "pass");
  const rd = computeReadability(a);
  const ct = computeContent(a);
  const issues = computeSchemaIssues(a);
  const a11yBad = computeA11y(a).filter((c) => c.status !== "green");
  const ee = extractEeat(a);
  const p = a.performance || {};
  const SEV = { critical: "#e5484d", warning: "#e8930c", pass: "#30a46c" };

  const findingList = (items, color) =>
    items
      .map(
        (f) =>
          `<li><span class="sev" style="background:${color}"></span><b>${e(f.label)}</b>` +
          (f.detail ? `<div class="fd">${e(f.detail)}</div>` : "") +
          (f.items && f.items.length
            ? `<div class="fd">${f.items.slice(0, 15).map((x) => e(x.text)).join("<br>")}${
                f.items.length > 15 ? `<br>…and ${f.items.length - 15} more` : ""
              }</div>`
            : "") +
          `</li>`
      )
      .join("") || `<li class="none">none</li>`;

  const kv = (k, v) =>
    `<tr><th>${e(k)}</th><td>${e(v == null || v === "" ? "—" : v)}</td></tr>`;

  const typeSet = new Set();
  (a.jsonLd || []).forEach((b) => collectTypes(b, typeSet));

  let serverBlock = "";
  if (serverView.key === normalizeUrl(a.url) && serverView.data) {
    const sv = serverView.data;
    const drifts = computeDrift(sv.raw, a).filter((r) => r.verdict !== "same");
    serverBlock =
      `<h2>Server view (raw HTML vs rendered DOM)</h2><table>` +
      kv("HTTP status", sv.status + (sv.redirected ? " → " + sv.finalUrl : "")) +
      kv("X-Robots-Tag", sv.headers["x-robots-tag"] || "not set") +
      `</table>` +
      (drifts.length
        ? `<ul class="flist">${findingList(
            drifts.map((r) => ({
              label: `${r.field} — ${r.verdict}`,
              detail: `server: ${r.server != null ? r.server : "(not set)"} · rendered: ${r.rendered != null ? r.rendered : "(not set)"}`,
            })),
            SEV.warning
          )}</ul>`
        : `<p>No drift — server HTML and rendered DOM agree.</p>`);
  }

  let siteBlock = "";
  if (siteView.key === normalizeUrl(a.url) && siteView.data) {
    const an = analyzeSite(siteView.data.pages);
    siteBlock =
      `<h2>Site sample (${siteView.data.crawled} linked pages)</h2><table>` +
      kv("Duplicate titles", an.dupTitles.length + " group(s)") +
      kv("Duplicate descriptions", an.dupDescs.length + " group(s)") +
      kv("Noindexed / broken", an.noindexed.length + " / " + an.broken.length) +
      kv("Missing title / description", an.noTitle.length + " / " + an.noDesc.length) +
      `</table>` +
      an.dupTitles
        .slice(0, 5)
        .map((g) => `<p class="fd">Same title on: ${g.map((x) => e(x.url)).join(" · ")}</p>`)
        .join("");
  }

  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>SEO audit — ${e(a.title || a.url)}</title>
<style>
  body{font:14px/1.55 -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;color:#1d1d1f;margin:40px auto;max-width:760px;padding:0 24px}
  header{border-bottom:2px solid #1d1d1f;padding-bottom:14px;margin-bottom:22px}
  h1{font-size:22px;margin:0 0 4px}
  h2{font-size:13px;text-transform:uppercase;letter-spacing:.07em;margin:28px 0 10px;border-bottom:1px solid #ddd;padding-bottom:5px}
  .meta{font-size:12px;color:#444;word-break:break-all}
  .chips{display:flex;flex-wrap:wrap;gap:10px;margin:16px 0 0}
  .chip{border-radius:8px;padding:7px 13px;color:#fff;font-weight:700;font-size:13px}
  ul.flist{list-style:none;padding:0;margin:0}
  ul.flist li{padding:7px 0;border-bottom:1px solid #eee}
  .sev{display:inline-block;width:9px;height:9px;border-radius:50%;margin-right:8px}
  .fd{font-size:12px;color:#333;margin:2px 0 0 17px;word-break:break-word}
  li.none{color:#555}
  table{border-collapse:collapse;width:100%;font-size:13px}
  th{text-align:left;font-weight:600;padding:6px 10px 6px 0;vertical-align:top;white-space:nowrap;width:185px}
  td{padding:6px 0;word-break:break-word}
  tr{border-bottom:1px solid #f0f0f0}
  footer{margin-top:34px;font-size:11px;color:#444;border-top:1px solid #ddd;padding-top:10px}
  @media print{body{margin:10mm auto}h2{break-after:avoid}li{break-inside:avoid}}
</style></head><body>
<header>
  <h1>On-page SEO audit</h1>
  <div class="meta">${e(a.url)}<br>Generated ${e(new Date().toLocaleString())} · SEOdin v${e(VERSION)} · source: ${a.domSource === "rendered" ? "rendered DOM (post-JavaScript)" : "raw HTML"}</div>
  <div class="chips">
    <span class="chip" style="background:${SEV.critical}">${crit.length} critical</span>
    <span class="chip" style="background:${SEV.warning}">${warn.length} warnings</span>
    <span class="chip" style="background:${SEV.pass}">${pass.length} passed</span>
    <span class="chip" style="background:#52525b">LLM readability ${rd.overall}/100</span>
  </div>
</header>
<h2>Critical</h2><ul class="flist">${findingList(crit, SEV.critical)}</ul>
<h2>Warnings</h2><ul class="flist">${findingList(warn, SEV.warning)}</ul>
<h2>Passed</h2><ul class="flist">${findingList(pass, SEV.pass)}</ul>
<h2>Technical snapshot</h2>
<table>
${kv("Title (" + a.titleLength + " ch)", a.title)}
${kv("Meta description (" + a.metaDescriptionLength + " ch)", a.metaDescription)}
${kv("Canonical", a.canonical)}
${kv("Robots meta", (a.robotsMeta || "not set") + (a.googlebotMeta ? " · googlebot: " + a.googlebotMeta : ""))}
${kv("Language / charset", (a.lang || "—") + " / " + (a.charset || "—"))}
${kv("HTTPS", a.isHttps ? "yes" : "NO")}
${kv("Words (main / total)", ((a.content && a.content.mainWordCount) || 0) + " / " + (a.wordCount || 0))}
${kv("Reading ease", ct.fleschSkipped ? "skipped (non-English page)" : ct.flesch == null ? "—" : ct.flesch + " (Flesch)")}
${kv("Headings", "H1×" + (a.headings || []).filter((x) => x.level === 1).length + " · " + (a.headings || []).length + " total")}
${kv("Images missing alt", (a.images || []).filter((i) => !i.hasAlt).length + " of " + (a.images || []).length)}
${kv("Schema types", [...typeSet].join(", ") || "none")}
${kv("E-E-A-T author", ee.authorName ? ee.authorName + (ee.authorSource ? " (" + ee.authorSource + ")" : "") : "not found")}
${kv("LCP / CLS (this load)", fmtMs(p.lcp) + " / " + (p.cls == null ? "—" : p.cls.toFixed(3)))}
</table>
${issues.length ? `<h2>Schema issues</h2><ul class="flist">${findingList(issues.map((i) => ({ label: i.label, detail: i.detail })), SEV.warning)}</ul>` : ""}
<h2>Accessibility (quick checks — failures only)</h2><ul class="flist">${findingList(a11yBad.map((c) => ({ label: c.label, detail: c.detail })), SEV.warning)}</ul>
${serverBlock}
${siteBlock}
<footer>Generated locally by SEOdin — no data left this machine. Checks labelled “heuristic” in-app are signals, not verdicts.</footer>
</body></html>`;
}

function exportHtmlReport() {
  if (!currentAudit) {
    showToast("Nothing to export yet");
    return;
  }
  const ok = downloadFile(
    `seodin-report-${safeHost(currentAudit)}-${isoDate()}.html`,
    buildHtmlReport(currentAudit),
    "text/html"
  );
  showToast(ok ? "Report exported — print it for a PDF" : "Export failed");
}

/* ============================================================
   wiring
   ============================================================ */
els.refreshBtn.addEventListener("click", runAudit);
els.copyBtn.addEventListener("click", copyForLLM);

// A 404ing favicon shouldn't sit in the header as a broken-image glyph.
els.favicon.addEventListener("error", () => {
  els.favicon.style.visibility = "hidden";
});

/* ---- theme (manual light/dark, remembered; defaults to system) ---- */
function currentTheme() {
  return document.documentElement.getAttribute("data-theme") || "light";
}
function applyTheme(theme) {
  document.documentElement.setAttribute("data-theme", theme);
  els.themeToggle.innerHTML = theme === "dark" ? ICON.sun : ICON.moon;
  els.themeToggle.title =
    theme === "dark" ? "Switch to light mode" : "Switch to dark mode";
}
(function initTheme() {
  let stored = null;
  try {
    stored = localStorage.getItem("seodin.theme");
  } catch {}
  const systemDark =
    window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
  applyTheme(stored || (systemDark ? "dark" : "light"));
})();
els.themeToggle.addEventListener("click", () => {
  const next = currentTheme() === "dark" ? "light" : "dark";
  applyTheme(next);
  try {
    localStorage.setItem("seodin.theme", next);
  } catch {}
});

function syncJsonldToggle() {
  els.jsonldToggle.classList.toggle("is-on", includeJsonLd);
  els.jsonldToggle.setAttribute("aria-pressed", String(includeJsonLd));
  els.jsonldToggle.title = includeJsonLd
    ? "Raw JSON-LD is included in the copied report — click to exclude"
    : "Raw JSON-LD is excluded from the copied report — click to include";
}
els.jsonldToggle.addEventListener("click", () => {
  includeJsonLd = !includeJsonLd;
  try {
    localStorage.setItem("seodin.includeJsonLd", String(includeJsonLd));
  } catch {}
  syncJsonldToggle();
  showToast(includeJsonLd ? "Raw JSON-LD will be included" : "Raw JSON-LD excluded");
});
syncJsonldToggle();

/* ---- settings / export popover (gear button) ---- */
let settingsMenu = null;
function closeSettingsMenu() {
  if (!settingsMenu) return;
  settingsMenu.remove();
  settingsMenu = null;
  els.settingsBtn.setAttribute("aria-expanded", "false");
  document.removeEventListener("click", onSettingsDocClick, true);
  document.removeEventListener("keydown", onSettingsKey);
}
function onSettingsDocClick(e) {
  if (!settingsMenu) return;
  if (!settingsMenu.contains(e.target) && !els.settingsBtn.contains(e.target)) {
    closeSettingsMenu();
  }
}
function onSettingsKey(e) {
  if (e.key === "Escape") closeSettingsMenu();
}
function openSettingsMenu() {
  const wrap = els.settingsBtn.parentElement;
  const menu = h("div", { class: "menu", role: "menu" });

  // auto-refresh switch
  const sw = h("button", {
    class: "switch" + (autoRefresh ? " is-on" : ""),
    type: "button",
    role: "switch",
    "aria-checked": String(autoRefresh),
    title: "Re-scan automatically when you switch or reload tabs",
  });
  sw.addEventListener("click", () => {
    autoRefresh = !autoRefresh;
    try {
      localStorage.setItem("seodin.autoRefresh", String(autoRefresh));
    } catch {}
    sw.classList.toggle("is-on", autoRefresh);
    sw.setAttribute("aria-checked", String(autoRefresh));
    showToast(autoRefresh ? "Auto-refresh on" : "Auto-refresh off — use Refresh");
  });
  menu.appendChild(
    h(
      "div",
      { class: "menu-row" },
      h(
        "div",
        {},
        h("div", { class: "menu-row-label", text: "Auto-refresh" }),
        h("div", { class: "menu-row-sub", text: "Re-scan on tab change / load" })
      ),
      sw
    )
  );

  menu.appendChild(h("div", { class: "menu-divider" }));
  menu.appendChild(h("div", { class: "menu-label", text: "Export" }));

  const mdItem = h(
    "button",
    { class: "menu-item", type: "button", role: "menuitem" },
    h("span", { html: ICON.fileText }),
    h("span", { class: "menu-item-text", text: "Export Markdown (.md)" })
  );
  mdItem.addEventListener("click", () => {
    closeSettingsMenu();
    exportMarkdown();
  });
  const jsonItem = h(
    "button",
    { class: "menu-item", type: "button", role: "menuitem" },
    h("span", { html: ICON.download }),
    h("span", { class: "menu-item-text", text: "Export raw audit (.json)" })
  );
  jsonItem.addEventListener("click", () => {
    closeSettingsMenu();
    exportJson();
  });
  const reportItem = h(
    "button",
    { class: "menu-item", type: "button", role: "menuitem" },
    h("span", { html: ICON.fileText }),
    h("span", { class: "menu-item-text", text: "Export client report (.html)" })
  );
  reportItem.addEventListener("click", () => {
    closeSettingsMenu();
    exportHtmlReport();
  });
  menu.appendChild(reportItem);
  menu.appendChild(mdItem);
  menu.appendChild(jsonItem);

  menu.appendChild(h("div", { class: "menu-divider" }));
  menu.appendChild(
    h("p", {
      class: "menu-note",
      text: "Settings & scan history are stored locally on this machine. The .md export follows the { } JSON-LD toggle.",
    })
  );

  wrap.appendChild(menu);
  settingsMenu = menu;
  els.settingsBtn.setAttribute("aria-expanded", "true");
  // Defer so this same click doesn't immediately close the menu.
  setTimeout(() => {
    document.addEventListener("click", onSettingsDocClick, true);
    document.addEventListener("keydown", onSettingsKey);
  }, 0);
}
els.settingsBtn.addEventListener("click", (e) => {
  e.stopPropagation();
  if (settingsMenu) closeSettingsMenu();
  else openSettingsMenu();
});

window.addEventListener("resize", () => {
  positionUnderline();
});

// Let a vertical mouse wheel scroll the tab bar horizontally — otherwise, on a
// narrow side panel, the further tabs are unreachable without a trackpad.
els.tabbar.addEventListener(
  "wheel",
  (e) => {
    if (els.tabbar.scrollWidth <= els.tabbar.clientWidth) return; // no overflow
    const delta = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
    if (!delta) return;
    e.preventDefault();
    els.tabbar.scrollLeft += delta;
  },
  { passive: false }
);

// Arrow-key navigation for the tab bar (roving tabindex pattern).
els.tabbar.addEventListener("keydown", (e) => {
  if (!["ArrowRight", "ArrowLeft", "Home", "End"].includes(e.key)) return;
  const tabs = [...els.tabbar.querySelectorAll(".tab")];
  if (!tabs.length) return;
  const cur = Math.max(
    0,
    tabs.findIndex((t) => t.getAttribute("data-id") === currentTabId)
  );
  let idx = cur;
  if (e.key === "ArrowRight") idx = (cur + 1) % tabs.length;
  else if (e.key === "ArrowLeft") idx = (cur - 1 + tabs.length) % tabs.length;
  else if (e.key === "Home") idx = 0;
  else idx = tabs.length - 1;
  e.preventDefault();
  setActiveTab(tabs[idx].getAttribute("data-id"));
  tabs[idx].focus();
});

// auto re-audit when the user switches/loads tabs (unless disabled in settings)
let autoTimer = null;
function scheduleAuto() {
  if (!autoRefresh) return;
  clearTimeout(autoTimer);
  autoTimer = setTimeout(runAudit, 250);
}
if (typeof chrome !== "undefined" && chrome.tabs && chrome.tabs.onActivated) {
  chrome.tabs.onActivated.addListener(scheduleAuto);
  chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if (changeInfo.status === "complete" && tab.active) scheduleAuto();
  });
}

// initial: build an (empty) tab bar so the shell is visible, then audit
buildTabBar();
runAudit();
