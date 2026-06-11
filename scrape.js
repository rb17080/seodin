// scrape.js
// A single, fully self-contained function injected into the active tab via
// chrome.scripting.executeScript({ func: scrapeAudit }). Because the function
// is serialized (toString) and re-evaluated in the page, it MUST NOT reference
// any variable from this module's scope. All helpers are nested inside.
//
// Returns a Promise that resolves to one serializable audit object.

function scrapeAudit() {
  return new Promise((resolve) => {
    const loc = window.location;

    // ---- small helpers (kept inside so they travel with the function) ----
    const txt = (el) => (el && el.textContent ? el.textContent.trim() : "");
    const attr = (el, name) => (el ? el.getAttribute(name) : null);
    const metaContent = (selector) => {
      const el = document.querySelector(selector);
      return el ? (el.getAttribute("content") || "").trim() : null;
    };
    const abs = (href) => {
      try {
        return new URL(href, loc.href).href;
      } catch {
        return href || "";
      }
    };
    // www.example.com and example.com are the same site for link accounting.
    const stripWww = (h) => (h || "").replace(/^www\./i, "");

    // ---------------- core meta ----------------
    const title = (document.title || "").trim();
    const metaDescription = metaContent('meta[name="description" i]');
    const canonEls = document.querySelectorAll('link[rel="canonical" i]');
    const canonical = canonEls[0] ? abs(canonEls[0].getAttribute("href")) : null;
    const canonicalUrls = [];
    canonEls.forEach((l) => {
      const hr = l.getAttribute("href");
      if (hr) canonicalUrls.push(abs(hr));
    });
    const canonicalInBody = !!(
      document.body && document.body.querySelector('link[rel="canonical" i]')
    );
    // Singleton-tag counts — more than one of these is usually a template bug,
    // and conflicting canonicals can make search engines ignore all of them.
    const tagCounts = {
      title: document.querySelectorAll("title").length,
      metaDescription: document.querySelectorAll('meta[name="description" i]').length,
      canonical: canonEls.length,
    };
    const robotsMeta = metaContent('meta[name="robots" i]');
    // Sites also hide pages with the googlebot-specific variant.
    const googlebotMeta = metaContent('meta[name="googlebot" i]');
    const viewport = metaContent('meta[name="viewport" i]');
    const lang = (document.documentElement.getAttribute("lang") || "").trim();
    const charset = document.characterSet || null;
    const metaAuthor = metaContent('meta[name="author" i]');

    // favicon
    let faviconUrl = null;
    const iconEl = document.querySelector(
      'link[rel~="icon" i], link[rel="shortcut icon" i], link[rel="apple-touch-icon" i]'
    );
    if (iconEl && iconEl.getAttribute("href")) {
      faviconUrl = abs(iconEl.getAttribute("href"));
    } else {
      faviconUrl = loc.origin + "/favicon.ico";
    }

    // ---------------- headings ----------------
    // Each item carries a { kind, index } locator so the panel can re-find the
    // exact element later (highlightFn re-runs the SAME querySelectorAll). The
    // selectors here MUST stay character-identical to those in highlightFn.
    const headings = [];
    document.querySelectorAll("h1,h2,h3,h4,h5,h6").forEach((h, idx) => {
      const ht = txt(h);
      headings.push({
        level: parseInt(h.tagName.substring(1), 10),
        text: ht,
        id: h.id || null,
        // index + a stable signature (text) so highlightFn can re-find the
        // element even if the DOM shifted between scan and click.
        locator: { kind: "heading", index: idx, text: ht || null },
      });
    });

    // ---------------- links ----------------
    // Region of a link, for separating real body links from chrome/widgets.
    // Chrome (nav/header → "nav", footer) is found by the nearest semantic
    // landmark or a header/footer/nav class. A link is "content" ONLY if it
    // sits in PROSE — inside a paragraph / list-item / cell whose text is much
    // longer than the link itself. This reliably distinguishes in-text body
    // links from the share-button, related-post, category and widget link
    // lists that themes nest *inside* the <article> (which a region-only check
    // wrongly counts as content). Everything else is "other".
    const CHROME_CLASS = [
      [/(?:^|[-_ ])(?:site-)?footer|colophon/i, "footer"],
      [/(?:^|[-_ ])(?:site-)?header|masthead|topbar/i, "nav"],
      [/(?:^|[-_ ])(?:nav|navbar|navigation|menu|breadcrumb)(?:[-_ ]|$)/i, "nav"],
    ];
    const classifyRegion = (a) => {
      let el = a;
      let depth = 0;
      while (el && el.nodeType === 1 && el !== document.documentElement && depth < 80) {
        const tag = el.tagName;
        const role = ((el.getAttribute && el.getAttribute("role")) || "").toLowerCase();
        if (tag === "FOOTER" || role === "contentinfo") return "footer";
        if (tag === "NAV" || role === "navigation" || tag === "HEADER" || role === "banner") return "nav";
        if (tag === "MAIN" || role === "main" || tag === "ARTICLE") break; // reached content root
        const cn =
          el.className && el.className.baseVal !== undefined
            ? el.className.baseVal
            : el.className || "";
        const idc = (cn + " " + (el.id || "")).trim();
        if (idc) {
          for (let r = 0; r < CHROME_CLASS.length; r++) {
            if (CHROME_CLASS[r][0].test(idc)) return CHROME_CLASS[r][1];
          }
        }
        el = el.parentElement;
        depth++;
      }
      const block = a.closest("p, li, blockquote, figcaption, dd, td");
      if (block) {
        const linkLen = (a.textContent || "").trim().length;
        const blockLen = (block.textContent || "").trim().length;
        if (blockLen >= linkLen + 15) return "content";
      }
      return "other";
    };

    const links = [];
    document.querySelectorAll("a[href]").forEach((a, idx) => {
      const rawHref = a.getAttribute("href") || "";
      const href = abs(rawHref);
      let isInternal = false;
      let protocol = "";
      try {
        const u = new URL(href);
        protocol = u.protocol;
        isInternal =
          (u.protocol === "http:" || u.protocol === "https:") &&
          stripWww(u.hostname) === stripWww(loc.hostname);
      } catch {
        isInternal = false;
      }
      // anchor text — fall back to img alt / aria-label / title
      let anchor = txt(a);
      if (!anchor) {
        const img = a.querySelector("img[alt]");
        if (img) anchor = (img.getAttribute("alt") || "").trim();
      }
      if (!anchor) anchor = (a.getAttribute("aria-label") || "").trim();
      if (!anchor) anchor = (a.getAttribute("title") || "").trim();

      links.push({
        href,
        rawHref,
        anchor,
        isInternal,
        protocol,
        rel: (a.getAttribute("rel") || "").trim(),
        region: classifyRegion(a),
        // index + a stable signature (resolved href) so highlightFn survives
        // DOM drift (lazy widgets, related-posts, etc. changing link order).
        locator: { kind: "link", index: idx, href: href || null },
      });
    });

    // ---------------- images ----------------
    const formatFromUrl = (src) => {
      if (!src) return "";
      if (src.startsWith("data:")) {
        const m = src.match(/^data:image\/([a-z0-9.+-]+)/i);
        return m ? m[1].toLowerCase() : "data";
      }
      try {
        const path = new URL(src, loc.href).pathname;
        const m = path.match(/\.([a-z0-9]+)$/i);
        return m ? m[1].toLowerCase() : "";
      } catch {
        return "";
      }
    };
    // Map resource-timing entries to bytes so each image can carry its real
    // downloaded weight (0 = cached or cross-origin without Timing-Allow-Origin).
    const resBytes = {};
    try {
      performance.getEntriesByType("resource").forEach((r) => {
        if (
          r.initiatorType === "img" ||
          /\.(?:avif|webp|png|jpe?g|gif|svg)(?:\?|#|$)/i.test(r.name)
        ) {
          resBytes[r.name] = r.transferSize || 0;
        }
      });
    } catch {}

    const images = [];
    document.querySelectorAll("img").forEach((img, idx) => {
      const rect = img.getBoundingClientRect();
      const src = img.currentSrc || img.src || img.getAttribute("src") || "";
      // Explicit dimensions (attributes or a CSS aspect-ratio) prevent layout
      // shift while the image loads — same rule Lighthouse applies.
      const cs = window.getComputedStyle(img);
      const hasDims = !!(
        (img.getAttribute("width") && img.getAttribute("height")) ||
        (cs.aspectRatio && cs.aspectRatio !== "auto")
      );
      images.push({
        src,
        alt: img.getAttribute("alt"),
        hasAlt: img.hasAttribute("alt"),
        loading: img.getAttribute("loading") || img.loading || null,
        naturalW: img.naturalWidth || 0,
        naturalH: img.naturalHeight || 0,
        displayW: Math.round(rect.width),
        displayH: Math.round(rect.height),
        format: formatFromUrl(src),
        bytes: resBytes[src] || 0,
        decorative: img.getAttribute("alt") === "",
        hasDims,
        // index + a stable signature (src) so highlightFn survives lazy-loaded
        // or dynamically inserted images shifting the img order.
        locator: { kind: "img", index: idx, src: src || null },
      });
    });

    // ---------------- JSON-LD ----------------
    const jsonLd = [];
    const jsonLdErrors = [];
    document
      .querySelectorAll('script[type="application/ld+json" i]')
      .forEach((s, idx) => {
        const raw = (s.textContent || "").trim();
        if (!raw) {
          jsonLdErrors.push({ index: idx, message: "Empty JSON-LD block", snippet: "" });
          return;
        }
        try {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed)) {
            parsed.forEach((p) => jsonLd.push(p));
          } else {
            jsonLd.push(parsed);
          }
        } catch (e) {
          jsonLdErrors.push({
            index: idx,
            message: (e && e.message) || "Invalid JSON",
            snippet: raw.slice(0, 160),
          });
        }
      });

    // Microdata (itemscope) — not parsed, but its presence is reported so the
    // panel never claims "no structured data" when a page uses the older format.
    const microdataCount = document.querySelectorAll("[itemscope]").length;
    // Raw script-tag count (the Server tab diffs this against the server HTML —
    // jsonLd.length won't do, since parsed arrays get flattened into entries).
    const jsonLdScriptCount = document.querySelectorAll(
      'script[type="application/ld+json" i]'
    ).length;

    // ---------------- mixed content (https page loading http:// assets) ----
    const mixedContent = { count: 0, samples: [] };
    if (loc.protocol === "https:") {
      const addMixed = (kind, u) => {
        if (!u || !/^http:\/\//i.test(u)) return;
        mixedContent.count++;
        if (mixedContent.samples.length < 12)
          mixedContent.samples.push({ kind, url: u.slice(0, 200) });
      };
      document.querySelectorAll("img[src]").forEach((el) => addMixed("img", el.currentSrc || el.src));
      document.querySelectorAll("script[src]").forEach((el) => addMixed("script", el.src));
      document
        .querySelectorAll('link[rel="stylesheet" i][href]')
        .forEach((el) => addMixed("css", el.href));
      document.querySelectorAll("iframe[src]").forEach((el) => addMixed("iframe", el.src));
      document
        .querySelectorAll("video[src],audio[src],source[src]")
        .forEach((el) => addMixed("media", el.src));
    }

    // ---------------- heaviest resources + third-party share ----------------
    let topResources = [];
    const thirdParty = { count: 0, bytes: 0 };
    try {
      const sameSite = (h) => {
        const a1 = stripWww(h);
        const b = stripWww(loc.hostname);
        return a1 === b || a1.endsWith("." + b) || b.endsWith("." + a1);
      };
      const items = [];
      performance.getEntriesByType("resource").forEach((r) => {
        let host = "";
        try {
          host = new URL(r.name).hostname;
        } catch {}
        const third = !!host && !sameSite(host);
        const bytes = r.transferSize || 0;
        if (third) {
          thirdParty.count++;
          thirdParty.bytes += bytes;
        }
        if (bytes > 0)
          items.push({ url: r.name.slice(0, 300), type: r.initiatorType || "", bytes, third });
      });
      topResources = items.sort((x, y) => y.bytes - x.bytes).slice(0, 10);
    } catch {}

    // ---------------- Open Graph & Twitter ----------------
    const openGraph = {};
    document.querySelectorAll('meta[property^="og:" i]').forEach((m) => {
      const key = (m.getAttribute("property") || "").toLowerCase();
      const val = (m.getAttribute("content") || "").trim();
      if (key && !(key in openGraph)) openGraph[key] = val;
    });
    // some pages use name="og:*"
    document.querySelectorAll('meta[name^="og:" i]').forEach((m) => {
      const key = (m.getAttribute("name") || "").toLowerCase();
      const val = (m.getAttribute("content") || "").trim();
      if (key && !(key in openGraph)) openGraph[key] = val;
    });

    const twitter = {};
    document.querySelectorAll('meta[name^="twitter:" i]').forEach((m) => {
      const key = (m.getAttribute("name") || "").toLowerCase();
      const val = (m.getAttribute("content") || "").trim();
      if (key && !(key in twitter)) twitter[key] = val;
    });
    document.querySelectorAll('meta[property^="twitter:" i]').forEach((m) => {
      const key = (m.getAttribute("property") || "").toLowerCase();
      const val = (m.getAttribute("content") || "").trim();
      if (key && !(key in twitter)) twitter[key] = val;
    });

    // ---------------- hreflang ----------------
    const hreflang = [];
    document
      .querySelectorAll('link[rel="alternate" i][hreflang]')
      .forEach((l) => {
        hreflang.push({
          lang: l.getAttribute("hreflang"),
          href: abs(l.getAttribute("href")),
        });
      });

    // ---------------- word count (visible-ish text) ----------------
    let wordCount = 0;
    try {
      const bodyText = document.body ? document.body.innerText || "" : "";
      const words = bodyText.trim().split(/\s+/).filter(Boolean);
      wordCount = words.length;
    } catch {
      wordCount = 0;
    }

    // ---------------- FAQ Q&A detection (for FAQPage suggestion) ----------------
    // Extract real question/answer pairs from common FAQ patterns so the rules
    // layer only suggests FAQPage markup when genuine Q&A actually exists.
    const detectFaq = () => {
      const pairs = [];
      const add = (q, ans) => {
        q = (q || "").replace(/\s+/g, " ").trim();
        ans = (ans || "").replace(/\s+/g, " ").trim();
        if (q && ans && q.length <= 300) pairs.push({ q: q.slice(0, 300), a: ans.slice(0, 500) });
      };
      // <details><summary>Q</summary> A </details>
      document.querySelectorAll("details").forEach((d) => {
        const s = d.querySelector("summary");
        if (!s) return;
        const clone = d.cloneNode(true);
        const cs = clone.querySelector("summary");
        if (cs) cs.remove();
        add(s.textContent, clone.textContent);
      });
      // <dl><dt>Q</dt><dd>A</dd>
      document.querySelectorAll("dl dt").forEach((dt) => {
        let dd = dt.nextElementSibling;
        while (dd && dd.tagName !== "DD") dd = dd.nextElementSibling;
        if (dd) add(dt.textContent, dd.textContent);
      });
      // question-style headings (text ending in "?") followed by answer text
      if (pairs.length < 2) {
        document.querySelectorAll("h2,h3,h4,h5").forEach((hd) => {
          const q = (hd.textContent || "").trim();
          if (!/\?\s*$/.test(q)) return;
          let ans = "";
          let el = hd.nextElementSibling;
          let guard = 0;
          while (el && guard < 6 && !/^H[1-6]$/.test(el.tagName)) {
            ans += " " + (el.textContent || "");
            guard++;
            el = el.nextElementSibling;
          }
          add(q, ans);
        });
      }
      // dedupe by question, cap at 10
      const seen = new Set();
      const out = [];
      for (const p of pairs) {
        const k = p.q.toLowerCase();
        if (seen.has(k)) continue;
        seen.add(k);
        out.push(p);
        if (out.length >= 10) break;
      }
      return { qaCount: out.length, pairs: out };
    };
    const faq = detectFaq();

    // ---------------- content structure (for LLM readability) ----------------
    const wc = (el) => {
      try {
        return ((el && el.innerText) || "").trim().split(/\s+/).filter(Boolean).length;
      } catch {
        return 0;
      }
    };
    let mainWordCount = 0;
    const mainEl = document.querySelector("main, article, [role='main' i]");
    if (mainEl) {
      mainWordCount = wc(mainEl);
    } else {
      let chromeWords = 0;
      document
        .querySelectorAll("nav, header, footer, aside")
        .forEach((el) => (chromeWords += wc(el)));
      mainWordCount = Math.max(0, wordCount - chromeWords);
    }
    // Visible main-content text (capped) for the Content & keyword tab. Reuses
    // the same <main>/<article>-vs-chrome target used for mainWordCount.
    const textSource = mainEl || document.body || document.documentElement;
    let mainText = "";
    try {
      mainText = ((textSource && textSource.innerText) || "").replace(/\s+/g, " ").trim();
    } catch {
      mainText = "";
    }
    const sentenceCount =
      (mainText.match(/[.!?]+(?=\s|$)|[。！？]+/g) || []).length || (mainText ? 1 : 0);
    let firstParagraph = "";
    const firstP = (mainEl || document).querySelector("p");
    if (firstP) {
      try {
        firstParagraph = ((firstP.innerText || "").replace(/\s+/g, " ").trim()).slice(0, 600);
      } catch {
        firstParagraph = "";
      }
    }
    const content = {
      mainWordCount,
      paragraphs: document.querySelectorAll("p").length,
      lists: document.querySelectorAll("ul, ol").length,
      tables: document.querySelectorAll("table").length,
      text: mainText.slice(0, 30000),
      sentences: sentenceCount,
      firstParagraph,
    };

    // ---------------- accessibility quick-audit ----------------
    // Element-based findings carry a { kind, index } locator so the panel can
    // click-to-highlight them. The selectors below MUST stay identical to the
    // ones in highlightFn (sidepanel.js).
    const FIELD_SEL = "input:not([type=hidden]),select,textarea";
    const INTERACTIVE_SEL =
      "a[href],button,input:not([type=hidden]),select,textarea,[role=button]";

    const isVisible = (el, rect) => {
      if (!rect) rect = el.getBoundingClientRect();
      if (rect.width <= 0 && rect.height <= 0) return false;
      const st = window.getComputedStyle(el);
      return st.visibility !== "hidden" && st.display !== "none";
    };
    const accName = (el) => {
      let n = (el.getAttribute("aria-label") || "").trim();
      if (n) return n;
      const labelledby = el.getAttribute("aria-labelledby");
      if (labelledby) {
        const ref = labelledby
          .split(/\s+/)
          .map((id) => {
            const t = document.getElementById(id);
            return t ? (t.textContent || "").trim() : "";
          })
          .join(" ")
          .trim();
        if (ref) return ref;
      }
      const t = (el.textContent || "").trim();
      if (t) return t;
      const img = el.querySelector && el.querySelector("img[alt]");
      if (img && (img.getAttribute("alt") || "").trim()) return img.getAttribute("alt").trim();
      const title = (el.getAttribute("title") || "").trim();
      if (title) return title;
      if (el.tagName === "INPUT") {
        const v = (el.getAttribute("value") || "").trim();
        if (v && /^(submit|button|reset)$/i.test(el.getAttribute("type") || "")) return v;
      }
      return "";
    };
    const fieldHasLabel = (el) => {
      if ((el.getAttribute("aria-label") || "").trim()) return true;
      if ((el.getAttribute("aria-labelledby") || "").trim()) return true;
      if ((el.getAttribute("title") || "").trim()) return true;
      if (el.closest && el.closest("label")) return true;
      const id = el.getAttribute("id");
      if (id) {
        try {
          if (document.querySelector('label[for="' + CSS.escape(id) + '"]')) return true;
        } catch {
          if (document.querySelector('label[for="' + id.replace(/"/g, '\\"') + '"]')) return true;
        }
      }
      return false;
    };

    const fieldEls = document.querySelectorAll(FIELD_SEL);
    const interactiveEls = document.querySelectorAll(INTERACTIVE_SEL);

    const formNoLabel = { count: 0, samples: [] };
    fieldEls.forEach((el, idx) => {
      const rect = el.getBoundingClientRect();
      if (!isVisible(el, rect)) return;
      if (fieldHasLabel(el)) return;
      formNoLabel.count++;
      if (formNoLabel.samples.length < 12) {
        const type = (el.getAttribute("type") || el.tagName).toLowerCase();
        const nm = el.getAttribute("name") || el.getAttribute("id") || "";
        formNoLabel.samples.push({
          desc: `<${el.tagName.toLowerCase()}${type ? ` type="${type}"` : ""}${nm ? ` name="${nm}"` : ""}>`,
          locator: { kind: "field", index: idx, name: el.getAttribute("name") || null },
        });
      }
    });

    const ctrlNoName = { count: 0, samples: [] };
    const tapSmall = { count: 0, samples: [] };
    interactiveEls.forEach((el, idx) => {
      const rect = el.getBoundingClientRect();
      if (!isVisible(el, rect)) return;
      const tag = el.tagName.toLowerCase();
      const role = (el.getAttribute("role") || "").toLowerCase();
      const isLinkOrBtn =
        tag === "a" || tag === "button" || role === "button" || role === "link";
      const hrefSig = tag === "a" ? abs(el.getAttribute("href") || "") || null : null;
      if (isLinkOrBtn && !accName(el)) {
        ctrlNoName.count++;
        if (ctrlNoName.samples.length < 12) {
          ctrlNoName.samples.push({
            desc: tag === "a" ? `<a href="${(el.getAttribute("href") || "").slice(0, 60)}">` : `<${tag}>`,
            locator: { kind: "interactive", index: idx, href: hrefSig },
          });
        }
      }
      if ((rect.width < 24 || rect.height < 24) && rect.width > 0 && rect.height > 0) {
        // WCAG 2.5.8 exempts targets that flow inline with text — without this
        // exemption every in-sentence link on an article gets flagged.
        const inlineText = tag === "a" && window.getComputedStyle(el).display === "inline";
        if (!inlineText) {
          tapSmall.count++;
          if (tapSmall.samples.length < 12) {
            tapSmall.samples.push({
              desc: `${tag}${role ? ` [role=${role}]` : ""} — ${Math.round(rect.width)}×${Math.round(rect.height)}px`,
              locator: { kind: "interactive", index: idx, href: hrefSig },
            });
          }
        }
      }
    });

    const a11y = {
      htmlLang: lang,
      landmarks: {
        main: !!document.querySelector("main, [role='main' i]"),
        nav: !!document.querySelector("nav, [role='navigation' i]"),
        header: !!document.querySelector("header, [role='banner' i]"),
        footer: !!document.querySelector("footer, [role='contentinfo' i]"),
      },
      formNoLabel,
      ctrlNoName,
      tapSmall,
      formFieldCount: fieldEls.length,
      interactiveCount: interactiveEls.length,
      viewportZoomBlocked:
        !!viewport && /user-scalable\s*=\s*(no|0)|maximum-scale\s*=\s*(1|1\.0)\b/i.test(viewport),
    };

    // ---------------- E-E-A-T heuristic signals ----------------
    const bylineEl = document.querySelector(
      '[rel="author" i], [itemprop="author" i], .author, .byline, .post-author, [class*="author" i]'
    );
    const bylineText = bylineEl ? txt(bylineEl).slice(0, 120) : null;
    const visibleByline = !!bylineText;
    const timeEls = Array.from(document.querySelectorAll("time[datetime]")).map(
      (t) => ({ datetime: t.getAttribute("datetime"), text: txt(t) })
    );
    let lastUpdatedText = null;
    try {
      const bodyText = document.body ? document.body.innerText || "" : "";
      const m = bodyText.match(
        /(last updated|updated on|reviewed on|last reviewed)[:\s][^\n]{0,40}/i
      );
      if (m) lastUpdatedText = m[0].trim().slice(0, 80);
    } catch {}

    // ---------------- performance (Navigation + paint, then a short
    // observation window for LCP & CLS) ----------------
    const collectPerf = () => {
      const perf = {
        ttfb: null,
        fcp: null,
        lcp: null,
        cls: null,
        domContentLoaded: null,
        loadTime: null,
        transferSize: null,
        resourceCount: null,
      };
      try {
        const nav = performance.getEntriesByType("navigation")[0];
        if (nav) {
          perf.ttfb = nav.responseStart || null;
          perf.domContentLoaded = nav.domContentLoadedEventEnd || null;
          perf.loadTime = nav.loadEventEnd || null;
        }
        const paints = performance.getEntriesByType("paint");
        const fcp = paints.find((p) => p.name === "first-contentful-paint");
        if (fcp) perf.fcp = fcp.startTime;

        const resources = performance.getEntriesByType("resource");
        perf.resourceCount = resources.length;
        let bytes = nav && nav.transferSize ? nav.transferSize : 0;
        resources.forEach((r) => {
          bytes += r.transferSize || 0;
        });
        perf.transferSize = bytes;
      } catch {}
      return perf;
    };

    const perf = collectPerf();

    // LCP & CLS via buffered observers, collected over a short window.
    let lcpValue = null;
    let clsValue = 0;
    let lcpObserver = null;
    let clsObserver = null;
    try {
      lcpObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        if (entries.length) {
          lcpValue = entries[entries.length - 1].renderTime ||
            entries[entries.length - 1].startTime;
        }
      });
      lcpObserver.observe({ type: "largest-contentful-paint", buffered: true });
    } catch {}
    try {
      clsObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (!entry.hadRecentInput) clsValue += entry.value;
        }
      });
      clsObserver.observe({ type: "layout-shift", buffered: true });
    } catch {}

    const finish = () => {
      try {
        if (lcpObserver) lcpObserver.disconnect();
        if (clsObserver) clsObserver.disconnect();
      } catch {}
      perf.lcp = lcpValue;
      perf.cls = clsValue;

      resolve({
        // identity
        url: loc.href,
        finalUrl: loc.href,
        origin: loc.origin,
        hostname: loc.hostname,
        faviconUrl,
        // meta
        title,
        titleLength: title.length,
        metaDescription,
        metaDescriptionLength: metaDescription ? metaDescription.length : 0,
        lang,
        charset,
        viewport,
        canonical,
        canonicalUrls,
        canonicalInBody,
        tagCounts,
        robotsMeta,
        googlebotMeta,
        metaAuthor,
        isHttps: loc.protocol === "https:",
        // content
        headings,
        links,
        images,
        jsonLd,
        jsonLdErrors,
        microdataCount,
        jsonLdScriptCount,
        openGraph,
        twitter,
        hreflang,
        wordCount,
        faq,
        content,
        a11y,
        // e-e-a-t signals
        eeat: {
          visibleByline,
          bylineText,
          metaAuthor,
          timeEls,
          lastUpdatedText,
        },
        // performance
        performance: perf,
        topResources,
        thirdParty,
        mixedContent,
        // the display the page was measured on (for DPR-aware image checks)
        dpr: window.devicePixelRatio || 1,
        // provenance: executeScript runs in the live page, so this is the
        // post-JavaScript rendered DOM (not the raw HTML response).
        domSource: "rendered",
        // when
        scrapedAt: new Date().toISOString(),
      });
    };

    // Give observers a brief moment to flush buffered entries.
    setTimeout(finish, 450);
  });
}
