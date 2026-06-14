# SEOdin — the Norse god of ranking

A fast, flat Chrome side panel that audits the on-page SEO of whatever tab you're looking at. Built for marketers and SEO professionals who are tired of paying for tools that do less and lie more.

**100% local. Zero accounts. Zero telemetry. Zero paid APIs.** Every network request the extension can make is user-initiated, listed below, and goes only to the site you're auditing.

## What it does

Everything lives in **five destinations**. The former tabs are now collapsible sections inside them — all collapsed by default, with problems flagged right on the section header (a severity wash, a colored left bar and an issue count) so you can scan without expanding.

### Overview
One verdict — Critical / Warnings / Passed — covering the issues that actually sink pages: noindex (meta *and* googlebot variant), missing title/description, conflicting or off-page canonicals, duplicate singleton tags, mixed content, missing alt text, title truncation, and more. Plus a transparent score, a one-click **Deep scan** that runs every engine at once, a **Time machine** that checks the Internet Archive's first and latest capture of the URL, and a "since last scan" diff from local history.

### Page
| Section | What you get |
|---------|--------------|
| **Content & keywords** | Flesch reading ease (honestly skipped on non-English pages), word/sentence stats, top terms with Unicode-aware tokenization, and target-keyword coverage (title, H1, first paragraph, body, density). |
| **LLM readability** | A transparent, locally computed estimate of how cleanly an LLM can parse and cite the page (schema cleanliness, answer extractability, content-to-chrome ratio). |
| **Headings** | Counts, single-H1 check, skipped levels, empty headings, and a click-to-highlight outline. |
| **E-E-A-T signals** | Author, dates, publisher, about/contact pages, authoritative citations — signal detection, honestly labelled as such. |

### Tech
| Section | What you get |
|---------|--------------|
| **Indexing & meta** | A pixel-true Google search preview (desktop + mobile, real canvas-measured truncation), title/description audit, indexing checks, an on-demand robots.txt tester that answers "is THIS page blocked, and by which line" and scans the sitemap for the URL, hreflang linting, and one-click external validators. |
| **Schema** | JSON-LD types, recommended-field completeness, and a linter that catches unresolved template placeholders, broken `@id` references, malformed blocks, impossible dates, out-of-range ratings, broken breadcrumb sequences, and plain-text authors — with paste-ready fix snippets where they can be generated honestly. |
| **Server view** | On demand: fetches the URL fresh and diffs the raw server HTML against the rendered DOM — title, description, canonical, robots, H1s, JSON-LD, OG tags — exposing what JavaScript adds, changes, or removes. Also reveals the `X-Robots-Tag` header and how much of the content exists before JS runs. |
| **Links** | Internal/external/nofollow breakdown, prose-vs-chrome region classification, empty and placeholder anchors, plus an on-demand internal link checker (real GET status codes). |
| **Images** | Alt coverage, lazy-loading, DPR-aware oversize detection, missing width/height (layout-shift risk), filename-as-alt detection, and per-image download weight from resource timing. |
| **Social preview** | Live link-preview unfurl, Open Graph and Twitter Card checks, relative-og:image detection. |
| **Performance** | Core Web Vitals for this load (LCP, CLS, FCP, TTFB), transfer size, heaviest resources, third-party share — plus an on-demand real-world pull from Google's free PageSpeed/CrUX endpoint (adds field LCP/INP/CLS and a Lighthouse lab score). |
| **Accessibility** | Quick automated checks (lang, landmarks, labels, accessible names, heading order, WCAG 2.5.8-aware tap targets) — explicitly *not* sold as a full WCAG audit. |

### Compete
| Section | What you get |
|---------|--------------|
| **SERP X-Ray** | On a Google results page, reads the live organic results so you can see the whole SERP at a glance. |
| **Competitor gap** | On demand: paste rival URLs and get a local TF-IDF term-gap analysis — the terms they cover that you don't. |

### Site
| Section | What you get |
|---------|--------------|
| **Site sample & bulk** | On demand: samples the internal pages this page links to (raw HTML) and finds duplicate titles, duplicate descriptions, missing tags, noindexed and broken pages across them — plus a bulk audit for a pasted list of URLs. |

Everything element-level is **click-to-highlight**: click a finding and the panel scrolls the live page to the element and flashes it.

### Export
- **Copy for LLM** — a structured Markdown audit with an instruction header, ready to paste into any AI assistant.
- **Client report (.html)** — a self-contained, print-to-PDF report for sending to clients.
- **Markdown (.md)** and **raw audit (.json)**.

## Install (developer mode)

1. Download or clone this folder.
2. Open `chrome://extensions`, enable **Developer mode**.
3. **Load unpacked** → select the folder.
4. Pin SEOdin and click its icon on any page — the side panel opens.

No build step. Vanilla JavaScript, zero dependencies.

## Privacy

- All analysis runs in your browser, on the page you're viewing.
- Scan history and settings live in local extension storage on your machine.
- Network requests happen **only when you press a button that says so**, and only to the audited site itself: the internal link checker, the Server view fetch, the robots.txt/sitemap check, and the Site sample crawl. All are anonymous (no cookies).
- The external-validator buttons simply open Google's public tools in a new tab.
- Nothing is ever sent to us. There is no "us" to send it to.

## Honesty policy

Every number says where it came from. Heuristics are labelled "heuristic". Single-load metrics are labelled "this load". Checks that can't be automated honestly (color contrast, keyboard operability) say so instead of pretending. When the FAQ rich result died in May 2026, the tool started saying that too. If SEOdin can't know something, it tells you — it never fills the gap with a confident guess.

## Architecture notes

- **MV3**, side-panel based; the scraper is a single self-contained function injected with `chrome.scripting.executeScript` that reads the rendered DOM.
- Data-driven destination registry — five destinations, each holding collapsible sections; a section is one `{ id, label, health, render }` entry, where `health(a)` drives the collapsed-header status and issue count.
- Pure compute functions (triage rules, linters, parsers) are separated from rendering and memoized per scan.
- The robots.txt matcher implements Google's documented semantics: longest match wins, `Allow` wins ties, `*` wildcards, `$` anchors.

## Roadmap

On-device AI grading via Chrome's built-in model, watchtower regression monitoring, annotated screenshots, link-graph visualization — all free, all local. The module split + unit-test suite is the next engineering milestone.
