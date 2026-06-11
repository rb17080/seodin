const mk = (anchor, href, region, isInternal, i) => ({ href, rawHref: href, anchor, isInternal, protocol: "https:", rel: "", region, locator: { kind: "link", index: i, href } });
const SAMPLE = {
  url: "https://example.com/p", origin: "https://example.com", hostname: "example.com", faviconUrl: "", title: "Test", titleLength: 4,
  metaDescription: "d", metaDescriptionLength: 1, lang: "en", charset: "UTF-8", viewport: "width=device-width, initial-scale=1",
  canonical: "https://example.com/p", robotsMeta: null, metaAuthor: null, isHttps: true,
  headings: [{ level: 1, text: "H", id: null, locator: { kind: "heading", index: 0, text: "H" } }],
  links: [
    mk("menu home","https://example.com/","nav",true,0), mk("menu about","https://example.com/about","nav",true,1),
    mk("read the in-text guide","https://example.com/guide","content",true,2), mk("cite wikipedia","https://en.wikipedia.org/wiki/SEO","content",false,3),
    mk("another body link","https://example.com/body","content",true,4), mk("privacy","https://example.com/privacy","footer",true,5),
    mk("terms","https://example.com/terms","footer",true,6), mk("related post widget","https://example.com/related","other",true,7),
    mk("share on x","https://twitter.com/intent","other",false,8),
  ],
  images: [], jsonLd: [], jsonLdErrors: [], openGraph: {}, twitter: {}, hreflang: [], wordCount: 100, faq: { qaCount: 0, pairs: [] },
  content: { mainWordCount: 90, paragraphs: 3, lists: 0, tables: 0, sentences: 8, firstParagraph: "x", text: "word ".repeat(90) },
  a11y: { htmlLang: "en", landmarks: { main: true, nav: true, header: true, footer: true }, formNoLabel: { count: 0, samples: [] }, ctrlNoName: { count: 0, samples: [] }, tapSmall: { count: 0, samples: [] }, formFieldCount: 0, interactiveCount: 0, viewportZoomBlocked: false },
  eeat: { visibleByline: false, bylineText: null, metaAuthor: null, timeEls: [], lastUpdatedText: null },
  performance: { ttfb: 300, fcp: 1000, lcp: 1800, cls: 0.02, domContentLoaded: 1200, loadTime: 1500, transferSize: 100000, resourceCount: 10 },
  domSource: "rendered", scrapedAt: new Date().toISOString(),
};
const noop = { addListener() {} };
window.chrome = {
  runtime: { onInstalled: noop, onStartup: noop, lastError: null },
  tabs: { onActivated: noop, onUpdated: noop, query: () => Promise.resolve([{ id: 1, url: SAMPLE.url, title: SAMPLE.title, status: "complete", active: true }]), get: () => Promise.resolve({ id: 1, url: SAMPLE.url, status: "complete", active: true }), create() {} },
  scripting: { executeScript: (d) => Promise.resolve([{ result: d.func && d.func.name === "scrapeAudit" ? JSON.parse(JSON.stringify(SAMPLE)) : { ok: true } }]) },
  storage: { local: { _s: {}, get(k) { return Promise.resolve(typeof k === "string" ? { [k]: this._s[k] } : { ...this._s }); }, set(o) { Object.assign(this._s, o); return Promise.resolve(); } } },
};
