/* ===========================================================================
   web.ts — robust web search, page fetcher, site crawler, and database search.

   Browser-native: handles CORS restrictions via multi-tier fallback:
   1. Firecrawl v2 (if user supplied an API key in settings)
   2. Native public APIs: Wikipedia REST, GitHub API, PubMed NCBI, arXiv, HN
   3. Jina Reader (GET r.jina.ai with standard headers, no CORS preflights)
   4. High-reliability CORS proxies: AllOrigins, CorsProxy, CodeTabs
   5. Built-in HTML -> Markdown parser using native DOMParser
   ========================================================================= */
import type { Source } from "./types";

export const hostOf = (u: string) => {
  try {
    const parsed = u.startsWith("http") ? new URL(u) : new URL("https://" + u);
    return parsed.hostname.replace(/^www\./, "");
  } catch {
    return u;
  }
};

const withTimeout = <T>(promise: Promise<T>, ms: number, msg = "timeout"): Promise<T> => {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(msg)), ms);
    promise.then(
      (res) => { clearTimeout(timer); resolve(res); },
      (err) => { clearTimeout(timer); reject(err); }
    );
  });
};

/* =========================================================================
   HTML -> Markdown converter (native browser DOMParser)
   ========================================================================= */
export function htmlToMarkdown(html: string, baseUrl?: string): { markdown: string; title: string; links: string[] } {
  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, "text/html");

    // Title extraction
    const title =
      doc.querySelector("meta[property='og:title']")?.getAttribute("content")?.trim() ||
      doc.querySelector("title")?.textContent?.trim() ||
      doc.querySelector("h1")?.textContent?.trim() ||
      baseUrl ||
      "Page";

    // Collect all links before pruning DOM
    const links: string[] = [];
    doc.querySelectorAll("a[href]").forEach((a) => {
      try {
        const href = a.getAttribute("href");
        if (!href || href.startsWith("#") || href.startsWith("javascript:") || href.startsWith("mailto:") || href.startsWith("tel:")) return;
        const full = baseUrl ? new URL(href, baseUrl).href : href;
        if (full.startsWith("http")) links.push(full);
      } catch {}
    });

    // Prune useless elements
    const noise = doc.querySelectorAll(
      "script, style, noscript, svg, nav, footer, header, iframe, form, button, " +
      "[role='navigation'], [role='banner'], .nav, .footer, .sidebar, .cookie-banner, .advertisement, .ad, .menu, #menu"
    );
    noise.forEach((el) => el.remove());

    // Prefer main or article if available
    const root = doc.querySelector("main, article, [role='main'], #content, .content, .post-content, .article-content") || doc.body;
    if (!root) return { markdown: "", title, links };

    function walk(node: Node): string {
      if (node.nodeType === Node.TEXT_NODE) {
        return (node.textContent || "").replace(/\s+/g, " ");
      }
      if (node.nodeType !== Node.ELEMENT_NODE) return "";
      const el = node as HTMLElement;
      const tag = el.tagName.toLowerCase();

      let inner = "";
      for (const child of Array.from(el.childNodes)) {
        inner += walk(child);
      }

      switch (tag) {
        case "h1": return `\n\n# ${inner.trim()}\n\n`;
        case "h2": return `\n\n## ${inner.trim()}\n\n`;
        case "h3": return `\n\n### ${inner.trim()}\n\n`;
        case "h4": return `\n\n#### ${inner.trim()}\n\n`;
        case "h5": return `\n\n##### ${inner.trim()}\n\n`;
        case "h6": return `\n\n###### ${inner.trim()}\n\n`;
        case "p": return `\n\n${inner.trim()}\n\n`;
        case "blockquote": return `\n\n> ${inner.trim().replace(/\n/g, "\n> ")}\n\n`;
        case "strong":
        case "b": return inner.trim() ? ` **${inner.trim()}** ` : "";
        case "em":
        case "i": return inner.trim() ? ` *${inner.trim()}* ` : "";
        case "code": {
          if (el.parentElement?.tagName.toLowerCase() === "pre") return inner;
          return inner.trim() ? ` \`${inner.trim()}\` ` : "";
        }
        case "pre": {
          const code = el.querySelector("code");
          const lang = el.getAttribute("data-lang") || code?.getAttribute("class")?.match(/lang(?:uage)?-(\w+)/)?.[1] || "";
          return `\n\n\`\`\`${lang}\n${(code ? code.textContent : el.textContent) || ""}\n\`\`\`\n\n`;
        }
        case "ul": return `\n\n${inner.trim()}\n\n`;
        case "ol": return `\n\n${inner.trim()}\n\n`;
        case "li": return `\n- ${inner.trim()}`;
        case "hr": return `\n\n---\n\n`;
        case "br": return `\n`;
        case "a": {
          const href = el.getAttribute("href");
          const t = inner.trim();
          if (!t) return "";
          if (!href || href.startsWith("#") || href.startsWith("javascript:")) return t;
          try {
            const absolute = baseUrl ? new URL(href, baseUrl).href : href;
            return ` [${t}](${absolute}) `;
          } catch {
            return ` ${t} `;
          }
        }
        case "table": {
          const rows: string[][] = [];
          el.querySelectorAll("tr").forEach((tr) => {
            const cells: string[] = [];
            tr.querySelectorAll("th, td").forEach((td) => {
              cells.push((td.textContent || "").trim().replace(/\|/g, "\\|"));
            });
            if (cells.length) rows.push(cells);
          });
          if (!rows.length) return inner;
          const maxCols = Math.max(...rows.map((r) => r.length));
          const padRow = (r: string[]) => {
            const copy = [...r];
            while (copy.length < maxCols) copy.push("");
            return `| ${copy.join(" | ")} |`;
          };
          const head = padRow(rows[0]);
          const sep = `| ${new Array(maxCols).fill("---").join(" | ")} |`;
          const body = rows.slice(1).map(padRow).join("\n");
          return `\n\n${head}\n${sep}\n${body}\n\n`;
        }
        case "div":
        case "section":
        case "article":
          return `\n${inner}\n`;
        default:
          return inner;
      }
    }

    let markdown = walk(root);
    markdown = markdown.replace(/\n{3,}/g, "\n\n").trim();
    return { markdown, title, links };
  } catch (e: any) {
    return { markdown: `[HTML parse error: ${e.message}]`, title: baseUrl || "Page", links: [] };
  }
}

/* =========================================================================
   SEARCH
   ========================================================================= */
export interface SearchHit extends Source {
  status?: "ok" | "partial" | "error";
  detail?: string;
}

// 1. Firecrawl Search
async function firecrawlSearch(query: string, limit: number, key?: string): Promise<SearchHit[] | null> {
  if (!key) return null;
  try {
    const r = await withTimeout(
      fetch("https://api.firecrawl.dev/v2/search", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
        body: JSON.stringify({ query, limit, sources: ["web"] }),
      }),
      12000
    );
    if (!r.ok) return null;
    const j = await r.json();
    const arr = j?.data?.web ?? j?.data ?? [];
    if (!Array.isArray(arr) || !arr.length) return null;
    return arr.map((x: any) => ({
      url: x.url,
      title: x.title || x.url,
      snippet: (x.description || x.snippet || "").slice(0, 300),
    }));
  } catch {
    return null;
  }
}

// 2. DuckDuckGo HTML Search via AllOrigins CORS proxy
async function duckDuckGoSearch(query: string, limit: number): Promise<SearchHit[]> {
  const ddgUrl = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`;
  const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(ddgUrl)}`;
  const r = await withTimeout(fetch(proxyUrl), 12000);
  if (!r.ok) throw new Error(`ddg proxy status ${r.status}`);
  const html = await r.text();
  const doc = new DOMParser().parseFromString(html, "text/html");
  const items = doc.querySelectorAll(".result");
  const out: SearchHit[] = [];

  items.forEach((item) => {
    const a = item.querySelector(".result__a") || item.querySelector("a.result__url");
    const snippetEl = item.querySelector(".result__snippet");
    if (!a) return;
    let url = a.getAttribute("href") || "";
    // Clean duckduckgo redirect url: /l/?kh=-1&uddg=https%3A%2F%2Fexample.com
    const m = url.match(/uddg=([^&]+)/);
    if (m) url = decodeURIComponent(m[1]);
    if (url.startsWith("//")) url = "https:" + url;
    if (!url.startsWith("http")) return;

    const title = (a.textContent || "").trim();
    const snippet = (snippetEl?.textContent || "").trim();
    if (title && url) {
      out.push({ title, url, snippet: snippet.slice(0, 320) });
    }
  });

  return out.slice(0, limit);
}

// 3. Jina Search (via plain GET with JSON accept, avoiding non-safelisted headers)
async function jinaSearch(query: string, limit: number): Promise<SearchHit[]> {
  const r = await withTimeout(
    fetch(`https://s.jina.ai/${encodeURIComponent(query)}`, {
      method: "GET",
      headers: { Accept: "application/json" },
    }),
    12000
  );
  if (!r.ok) throw new Error(`jina ${r.status}`);
  const ct = r.headers.get("content-type") || "";
  if (ct.includes("application/json")) {
    const j = await r.json();
    const arr: any[] = j.data ?? j.results ?? [];
    const out: SearchHit[] = [];
    for (const x of arr) {
      if (!x) continue;
      const url = x.url || x.URL || x.link || "";
      const title = x.title || x.Title || url;
      const snippet = (x.description || x.content || x.snippet || "").toString().slice(0, 320);
      if (url) out.push({ url, title, snippet });
    }
    if (out.length) return out.slice(0, limit);
  }
  const text = await r.text();
  const out: SearchHit[] = [];
  const blocks = text.split(/\n{2,}(?=\[\d+\]\s)/);
  for (const b of blocks) {
    const title = b.match(/\[\d+\]\s*Title:\s*(.*)/i)?.[1]?.trim();
    const url = b.match(/\[\d+\]\s*URL\s+Source:\s*(\S+)/i)?.[1]?.trim();
    const desc = b.match(/\[\d+\]\s*(?:Description|Summary):\s*([\s\S]*?)(?:\n\[\d+\]|\n---|$)/i)?.[1]?.trim().slice(0, 320);
    if (url) out.push({ url, title: title || url, snippet: desc || "" });
  }
  if (!out.length) {
    for (const m of text.matchAll(/\[([^\]]+)\]\((https?:\/\/[^)]+)\)/g)) {
      out.push({ title: m[1], url: m[2] });
    }
  }
  return out.slice(0, limit);
}

// 4. Wikipedia Search (CORS supported with origin=*)
async function wikipediaSearch(query: string, limit: number): Promise<SearchHit[]> {
  const r = await withTimeout(
    fetch(`https://en.wikipedia.org/w/api.php?action=query&format=json&origin=*&list=search&utf8=1&srlimit=${limit}&srsearch=${encodeURIComponent(query)}`),
    9000
  );
  const j = await r.json();
  return (j?.query?.search || []).map((h: any) => ({
    url: `https://en.wikipedia.org/wiki/${encodeURIComponent((h.title || "").replace(/ /g, "_"))}`,
    title: h.title || query,
    snippet: (h.snippet || "").replace(/<[^>]+>/g, ""),
  }));
}

export async function webSearch(query: string, limit = 6, key?: string): Promise<SearchHit[]> {
  const errors: string[] = [];

  // Try Firecrawl if key set
  const fc = await firecrawlSearch(query, limit, key);
  if (fc && fc.length) return fc;

  // Try DuckDuckGo
  try {
    const ddg = await duckDuckGoSearch(query, limit);
    if (ddg.length) return ddg;
  } catch (e: any) {
    errors.push(`ddg: ${e.message}`);
  }

  // Try Jina
  try {
    const j = await jinaSearch(query, limit);
    if (j.length) return j;
  } catch (e: any) {
    errors.push(`jina: ${e.message}`);
  }

  // Try Wikipedia
  try {
    const w = await wikipediaSearch(query, limit);
    if (w.length) return w;
  } catch (e: any) {
    errors.push(`wiki: ${e.message}`);
  }

  return [
    {
      url: "",
      title: "no results",
      snippet: errors.join(" · ") || "all search providers failed",
      status: "error",
      detail: errors.join("\n"),
    },
  ];
}

/* =========================================================================
   FETCH
   ========================================================================= */

// Normalize URL (ensures https://)
function normalizeUrl(u: string): string {
  let s = u.trim();
  if (!/^https?:\/\//i.test(s)) s = "https://" + s;
  return s;
}

// Special case: Wikipedia REST API (100% public, CORS: *)
async function fetchWikipediaPage(url: string): Promise<{ markdown: string; title: string; links: string[] } | null> {
  const m = url.match(/wikipedia\.org\/wiki\/([^#?]+)/i);
  if (!m) return null;
  const pageTitle = decodeURIComponent(m[1]);
  try {
    const api = `https://en.wikipedia.org/api/rest_v1/page/html/${encodeURIComponent(pageTitle)}`;
    const r = await withTimeout(fetch(api), 9000);
    if (!r.ok) return null;
    const html = await r.text();
    return htmlToMarkdown(html, url);
  } catch {
    return null;
  }
}

// Special case: GitHub raw README (100% CORS-friendly)
async function fetchGitHubRepo(url: string): Promise<{ markdown: string; title: string; links: string[] } | null> {
  const m = url.match(/github\.com\/([^/]+)\/([^/]+?)(?:\/|$|\?|#)/i);
  if (!m) return null;
  const [, owner, repo] = m;
  if (["topics", "search", "trending", "explore", "settings"].includes(owner)) return null;
  try {
    const api = `https://api.github.com/repos/${owner}/${repo}/readme`;
    const r = await withTimeout(fetch(api, { headers: { Accept: "application/vnd.github.raw+json" } }), 9000);
    if (!r.ok) return null;
    const markdown = await r.text();
    return { markdown, title: `${owner}/${repo} README`, links: extractMarkdownLinks(markdown, url) };
  } catch {
    return null;
  }
}

// Extract links from markdown text
export function extractMarkdownLinks(md: string, baseUrl?: string): string[] {
  const out = new Set<string>();
  const norm = (u: string) => {
    try {
      const full = baseUrl ? new URL(u, baseUrl).href : u;
      return full.startsWith("http") ? full : null;
    } catch {
      return null;
    }
  };
  for (const m of md.matchAll(/\[[^\]]*\]\((https?:\/\/[^)\s]+|[^)\s]+)\)/g)) {
    const n = norm(m[1].trim());
    if (n) out.add(n);
  }
  for (const m of md.matchAll(/(https?:\/\/[^\s<>()\[\]"',;]+)/g)) {
    const n = norm(m[1]);
    if (n) out.add(n);
  }
  return Array.from(out);
}

// Jina Reader via plain GET (no non-safelisted headers)
async function fetchViaJina(url: string): Promise<{ markdown: string; title: string; links: string[] }> {
  const r = await withTimeout(
    fetch(`https://r.jina.ai/${url}`, {
      method: "GET",
      headers: { Accept: "text/plain" },
    }),
    12000
  );
  if (!r.ok) throw new Error(`jina ${r.status}`);
  const text = await r.text();
  if (!text || text.length < 20) throw new Error("empty response from reader");
  const title = text.match(/^Title:\s*(.*)$/m)?.[1]?.trim() || hostOf(url);
  const links = extractMarkdownLinks(text, url);
  return { markdown: text, title, links };
}

// Multi-CORS Proxy Fetcher
async function fetchViaCorsProxy(url: string): Promise<{ markdown: string; title: string; links: string[] }> {
  const proxies = [
    async () => {
      const p = `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`;
      const r = await withTimeout(fetch(p), 14000);
      if (!r.ok) throw new Error(`allorigins raw ${r.status}`);
      return await r.text();
    },
    async () => {
      const p = `https://corsproxy.io/?url=${encodeURIComponent(url)}`;
      const r = await withTimeout(fetch(p), 14000);
      if (!r.ok) throw new Error(`corsproxy.io ${r.status}`);
      return await r.text();
    },
    async () => {
      const p = `https://api.allorigins.win/get?url=${encodeURIComponent(url)}`;
      const r = await withTimeout(fetch(p), 14000);
      if (!r.ok) throw new Error(`allorigins get ${r.status}`);
      const j = await r.json();
      if (!j.contents) throw new Error("empty allorigins content");
      return j.contents as string;
    },
    async () => {
      const p = `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(url)}`;
      const r = await withTimeout(fetch(p), 14000);
      if (!r.ok) throw new Error(`codetabs ${r.status}`);
      return await r.text();
    },
  ];

  let lastErr: any = null;
  for (const fn of proxies) {
    try {
      const htmlOrText = await fn();
      if (htmlOrText && htmlOrText.length > 30) {
        return htmlToMarkdown(htmlOrText, url);
      }
    } catch (e: any) {
      lastErr = e;
    }
  }

  throw lastErr || new Error("all cors proxies failed");
}

// Direct fetch (works if destination has CORS enabled)
async function fetchDirect(url: string): Promise<{ markdown: string; title: string; links: string[] }> {
  const r = await withTimeout(fetch(url), 8000);
  if (!r.ok) throw new Error(`direct status ${r.status}`);
  const ct = r.headers.get("content-type") || "";
  const text = await r.text();
  if (ct.includes("markdown") || ct.includes("text/plain")) {
    return { markdown: text, title: hostOf(url), links: extractMarkdownLinks(text, url) };
  }
  return htmlToMarkdown(text, url);
}

export async function webFetch(rawUrl: string, key?: string): Promise<{ markdown: string; title: string; links: string[] }> {
  const url = normalizeUrl(rawUrl);

  // 1. Firecrawl if key set
  if (key) {
    try {
      const r = await withTimeout(
        fetch("https://api.firecrawl.dev/v2/scrape", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
          body: JSON.stringify({ url, formats: ["markdown"], onlyMainContent: true, blockAds: true, parsers: ["pdf"] }),
        }),
        15000
      );
      if (r.ok) {
        const j = await r.json();
        const md = j?.data?.markdown;
        if (md && md.length > 50) {
          return {
            markdown: md,
            title: j?.data?.metadata?.title || url,
            links: extractMarkdownLinks(md, url),
          };
        }
      }
    } catch { /* fallback */ }
  }

  // 2. Special cases
  const wiki = await fetchWikipediaPage(url);
  if (wiki && wiki.markdown.length > 80) return wiki;

  const gh = await fetchGitHubRepo(url);
  if (gh && gh.markdown.length > 80) return gh;

  // 3. Jina Reader
  try {
    const j = await fetchViaJina(url);
    if (j.markdown.length > 60) return j;
  } catch { /* fallback */ }

  // 4. CORS Proxies
  try {
    const proxyRes = await fetchViaCorsProxy(url);
    if (proxyRes.markdown.length > 60) return proxyRes;
  } catch { /* fallback */ }

  // 5. Direct
  try {
    const dir = await fetchDirect(url);
    if (dir.markdown.length > 60) return dir;
  } catch { /* fallback */ }

  throw new Error(`Unable to fetch ${url}. Tried Firecrawl, Wikipedia API, GitHub API, Jina Reader, and CORS proxies.`);
}

/* =========================================================================
   CRAWL
   ========================================================================= */

// Filter candidate URLs to same-domain and exclude binary assets
function filterCandidateLinks(links: string[], rootUrl: string): string[] {
  let rootHost: string;
  try { rootHost = new URL(rootUrl).hostname; } catch { return []; }

  const BAD_EXT = /\.(png|jpe?g|gif|webp|svg|ico|bmp|mp4|webm|mov|mp3|wav|pdf|zip|tar|gz|rar|7z|css|js|map|json|woff2?|ttf|eot)$/i;
  const seen = new Set<string>();
  const out: string[] = [];

  for (const raw of links) {
    try {
      const u = new URL(raw);
      // Same host or subpath
      if (u.hostname !== rootHost && !u.hostname.endsWith("." + rootHost)) continue;
      // Strip query and hash
      u.hash = "";
      const cleaned = u.href;
      if (cleaned === rootUrl || cleaned === rootUrl + "/" || cleaned + "/" === rootUrl) continue;
      if (BAD_EXT.test(u.pathname)) continue;
      if (!seen.has(cleaned)) {
        seen.add(cleaned);
        out.push(cleaned);
      }
    } catch {}
  }

  return out;
}

export async function webCrawl(
  rawUrl: string,
  limit = 4,
  key?: string
): Promise<{ url: string; title: string; markdown: string }[]> {
  const rootUrl = normalizeUrl(rawUrl);
  const pages: { url: string; title: string; markdown: string }[] = [];

  // Step 1: Fetch root page
  let rootPage: { markdown: string; title: string; links: string[] };
  try {
    rootPage = await webFetch(rootUrl, key);
    pages.push({
      url: rootUrl,
      title: rootPage.title || hostOf(rootUrl),
      markdown: rootPage.markdown.slice(0, 7000),
    });
  } catch (e: any) {
    throw new Error(`Failed to crawl root URL ${rootUrl}: ${e.message}`);
  }

  // Step 2: Extract candidate links
  let candidateLinks = filterCandidateLinks(rootPage.links || [], rootUrl);

  // If candidate links are few, supplement with a search for other pages on the same domain
  if (candidateLinks.length < limit) {
    try {
      const host = hostOf(rootUrl);
      const hits = await webSearch(`site:${host}`, limit * 2, key);
      const searchLinks = hits.map((h) => h.url).filter(Boolean);
      const extra = filterCandidateLinks(searchLinks, rootUrl);
      candidateLinks = Array.from(new Set([...candidateLinks, ...extra]));
    } catch {}
  }

  // Step 3: Pick up to (limit - 1) additional pages to fetch
  const targetUrls = candidateLinks.slice(0, Math.max(1, limit - 1));

  // Step 4: Fetch target URLs in parallel
  const fetches = targetUrls.map(async (url) => {
    try {
      const page = await withTimeout(webFetch(url, key), 14000, "page timeout");
      return {
        url,
        title: page.title || url,
        markdown: page.markdown.slice(0, 5000),
      };
    } catch (e: any) {
      return {
        url,
        title: hostOf(url),
        markdown: `[page fetch note: ${e.message}]`,
      };
    }
  });

  const settled = await Promise.allSettled(fetches);
  for (const s of settled) {
    if (s.status === "fulfilled" && s.value) {
      pages.push(s.value);
    }
  }

  return pages;
}

/* =========================================================================
   SITE-SPECIFIC SEARCH
   ========================================================================= */
export async function siteSearch(site: string, query: string, limit = 6, _key?: string): Promise<SearchHit[]> {
  const s = site.toLowerCase().trim();

  if (s.includes("github")) return ghSearch(query, limit);
  if (s.includes("pubmed") || s.includes("ncbi")) return pubmedSearch(query, limit);
  if (s.includes("arxiv")) return arxivSearch(query, limit);
  if (s.includes("hn") || s.includes("hacker")) return hnSearch(query, limit);
  if (s.includes("wiki")) return wikipediaSearch(query, limit);
  if (s.includes("stack") || s.includes("so")) return soSearch(query, limit);

  // Fallback domain search
  const domain = s.replace(/^https?:\/\//, "").replace(/\/.*$/, "");
  const q = `site:${domain} ${query}`.trim();
  return webSearch(q, limit);
}

async function ghSearch(query: string, limit: number): Promise<SearchHit[]> {
  try {
    const r = await withTimeout(
      fetch(`https://api.github.com/search/repositories?q=${encodeURIComponent(query)}&per_page=${limit}&sort=stars&order=desc`),
      9000
    );
    const j = await r.json();
    return (j.items || []).map((i: any) => ({
      url: i.html_url,
      title: `${i.full_name}  ★${(i.stargazers_count || 0).toLocaleString()}`,
      snippet: i.description || "",
    }));
  } catch {
    return [];
  }
}

async function pubmedSearch(query: string, limit: number): Promise<SearchHit[]> {
  try {
    const e = await withTimeout(
      fetch(`https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi?db=pubmed&retmode=json&retmax=${limit}&sort=relevance&term=${encodeURIComponent(query)}`),
      9000
    );
    const ids: string[] = (await e.json())?.esearchresult?.idlist ?? [];
    if (!ids.length) return [];
    const su = await withTimeout(
      fetch(`https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esummary.fcgi?db=pubmed&retmode=json&id=${ids.join(",")}`),
      9000
    );
    const res = (await su.json())?.result ?? {};
    return ids.map((id) => {
      const r = res[id] || {};
      const authors = (r.authors || []).slice(0, 3).map((a: any) => a.name).join(", ");
      return {
        url: `https://pubmed.ncbi.nlm.nih.gov/${id}/`,
        title: r.title || `PMID ${id}`,
        snippet: `${r.source || ""} · ${r.pubdate || ""}${authors ? ` · ${authors}` : ""}`,
      };
    });
  } catch {
    return [];
  }
}

async function arxivSearch(query: string, limit: number): Promise<SearchHit[]> {
  try {
    const r = await withTimeout(
      fetch(`https://export.arxiv.org/api/query?search_query=all:${encodeURIComponent(query)}&start=0&max_results=${limit}&sortBy=relevance`),
      9000
    );
    const xml = await r.text();
    const doc = new DOMParser().parseFromString(xml, "text/xml");
    return Array.from(doc.getElementsByTagName("entry")).slice(0, limit).map((e) => ({
      url: (e.getElementsByTagName("id")[0]?.textContent ?? "").trim(),
      title: (e.getElementsByTagName("title")[0]?.textContent ?? "").replace(/\s+/g, " ").trim(),
      snippet: (e.getElementsByTagName("summary")[0]?.textContent ?? "").replace(/\s+/g, " ").trim().slice(0, 280),
    }));
  } catch {
    return [];
  }
}

async function hnSearch(query: string, limit: number): Promise<SearchHit[]> {
  try {
    const r = await withTimeout(
      fetch(`https://hn.algolia.com/api/v1/search?query=${encodeURIComponent(query)}&hitsPerPage=${limit}`),
      9000
    );
    const j = await r.json();
    return (j.hits || []).map((h: any) => ({
      url: h.url || `https://news.ycombinator.com/item?id=${h.objectID}`,
      title: h.title || h.story_title || "(hn)",
      snippet: `${h.points ?? 0} points · ${h.num_comments ?? 0} comments`,
    }));
  } catch {
    return [];
  }
}

async function soSearch(query: string, limit: number): Promise<SearchHit[]> {
  try {
    const r = await withTimeout(
      fetch(`https://api.stackexchange.com/2.3/search/advanced?order=desc&sort=relevance&q=${encodeURIComponent(query)}&site=stackoverflow&pagesize=${limit}`),
      9000
    );
    const j = await r.json();
    return (j.items || []).map((q: any) => ({
      url: q.link,
      title: (q.title || "").replace(/<[^>]+>/g, ""),
      snippet: `${q.score ?? 0} votes · ${q.answer_count ?? 0} answers`,
    }));
  } catch {
    return [];
  }
}
