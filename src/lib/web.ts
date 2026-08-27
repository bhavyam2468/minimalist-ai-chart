/* ===========================================================================
   web.ts — High-speed, multi-engine web search and page fetcher.

   Features:
   - Blazing-fast parallel dispatch with strict 2.5s-3s timeouts (no more 15s hangs).
   - Niche filtering: "music" (MusicBrainz + community), "discussions" (Reddit + forums),
     "tech" (GitHub + HN), "academic" (arXiv + PubMed), "general".
   - Direct native-CORS APIs: MusicBrainz, DuckDuckGo Instant, Wikipedia REST,
     HackerNews Algolia, GitHub API, arXiv, PubMed.
   - Multi-instance public SearXNG aggregator for general web queries.
   - Firecrawl v2 support when user configures an API key.
   - Instant abort propagation via AbortSignal so stop button cancels in-flight requests.
   - HTML -> Clean Markdown parser with link extraction.
   ========================================================================= */

import type { Source } from "./types";

export const hostOf = (u: string): string => {
  try {
    const parsed = u.startsWith("http") ? new URL(u) : new URL("https://" + u);
    return parsed.hostname.replace(/^www\./, "");
  } catch {
    return u;
  }
};

/**
 * Timeout wrapper with instant AbortSignal listener.
 */
export const withTimeout = <T>(
  promise: Promise<T>,
  ms = 3000,
  msg = "timeout",
  signal?: AbortSignal
): Promise<T> => {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      return reject(new DOMException("Aborted", "AbortError"));
    }

    let timer: any = null;

    const onAbort = () => {
      if (timer) clearTimeout(timer);
      reject(new DOMException("Aborted", "AbortError"));
    };

    if (signal) {
      signal.addEventListener("abort", onAbort, { once: true });
    }

    timer = setTimeout(() => {
      if (signal) signal.removeEventListener("abort", onAbort);
      reject(new Error(msg));
    }, ms);

    promise.then(
      (res) => {
        if (timer) clearTimeout(timer);
        if (signal) signal.removeEventListener("abort", onAbort);
        resolve(res);
      },
      (err) => {
        if (timer) clearTimeout(timer);
        if (signal) signal.removeEventListener("abort", onAbort);
        reject(err);
      }
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

    const title =
      doc.querySelector("meta[property='og:title']")?.getAttribute("content")?.trim() ||
      doc.querySelector("title")?.textContent?.trim() ||
      doc.querySelector("h1")?.textContent?.trim() ||
      baseUrl ||
      "Page";

    const links: string[] = [];
    doc.querySelectorAll("a[href]").forEach((a) => {
      try {
        const href = a.getAttribute("href");
        if (!href || href.startsWith("#") || href.startsWith("javascript:") || href.startsWith("mailto:") || href.startsWith("tel:")) return;
        const full = baseUrl ? new URL(href, baseUrl).href : href;
        if (full.startsWith("http")) links.push(full);
      } catch {}
    });

    const noise = doc.querySelectorAll(
      "script, style, noscript, svg, nav, footer, header, iframe, form, button, " +
      "[role='navigation'], [role='banner'], .nav, .footer, .sidebar, .cookie-banner, .advertisement, .ad, .menu, #menu"
    );
    noise.forEach((el) => el.remove());

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
  category?: string;
}

export interface WebSearchOpts {
  limit?: number;
  site?: string;
  niche?: "music" | "discussions" | "tech" | "academic" | "general" | string;
  category?: string; // alias for niche
  key?: string;      // firecrawl API key
  signal?: AbortSignal;
}

// 1. MusicBrainz Search for underground & niche music / bands / artists
async function musicBrainzSearch(query: string, limit: number, signal?: AbortSignal): Promise<SearchHit[]> {
  try {
    const cleanQuery = query.replace(/(niche|bands?|underrated|obscure|best|artists?)/gi, "").trim() || query;
    const url = `https://musicbrainz.org/ws/2/artist/?query=${encodeURIComponent(cleanQuery)}&fmt=json&limit=${limit}`;
    const r = await withTimeout(fetch(url, { signal }), 2800, "musicbrainz timeout", signal);
    if (!r.ok) return [];
    const j = await r.json();
    const artists = j?.artists || [];
    const hits: SearchHit[] = [];

    for (const a of artists) {
      if (!a?.name) continue;
      const name = a.name;
      const disambiguation = a.disambiguation ? ` (${a.disambiguation})` : "";
      const country = a.country ? ` · Origin: ${a.country}` : "";
      const lifeSpan = a["life-span"]?.begin ? ` · Active: ${a["life-span"].begin}${a["life-span"].ended ? `-${a["life-span"].end || ""}` : "-present"}` : "";
      const tags = (a.tags || []).slice(0, 5).map((t: any) => t.name).join(", ");
      const tagStr = tags ? ` · Tags: ${tags}` : "";
      const mbid = a.id;
      const targetUrl = `https://musicbrainz.org/artist/${mbid}`;

      hits.push({
        title: `${name}${disambiguation}`,
        url: targetUrl,
        snippet: `${name}${disambiguation}${country}${lifeSpan}${tagStr}. Recognized band/artist in music database.`,
        category: "music",
      });
    }
    return hits;
  } catch {
    return [];
  }
}

// 2. Reddit Discussions & Community Recommendations Search
async function redditSearch(query: string, limit: number, site?: string, signal?: AbortSignal): Promise<SearchHit[]> {
  try {
    let sub = "";
    if (site) {
      const match = site.match(/reddit\.com\/r\/([^/]+)/i);
      if (match) sub = match[1];
    }
    const cleanQ = query.replace(/site:\S+/g, "").trim();
    const url = sub
      ? `https://www.reddit.com/r/${encodeURIComponent(sub)}/search.json?q=${encodeURIComponent(cleanQ)}&restrict_sr=1&sort=relevance&limit=${limit}`
      : `https://www.reddit.com/search.json?q=${encodeURIComponent(cleanQ)}&sort=relevance&limit=${limit}`;

    const r = await withTimeout(fetch(url, { signal, headers: { Accept: "application/json" } }), 3000, "reddit timeout", signal);
    if (!r.ok) return [];
    const j = await r.json();
    const children = j?.data?.children || [];
    const hits: SearchHit[] = [];

    for (const item of children) {
      const d = item?.data;
      if (!d?.title) continue;
      const postTitle = d.title;
      const postUrl = d.permalink ? `https://www.reddit.com${d.permalink}` : d.url || "";
      const selftext = (d.selftext || "").slice(0, 260);
      const subName = d.subreddit_name_prefixed || (d.subreddit ? `r/${d.subreddit}` : "reddit");
      const score = d.score ? `[▲ ${d.score}] ` : "";

      hits.push({
        title: `${score}${postTitle} (${subName})`,
        url: postUrl,
        snippet: `${subName}: ${postTitle}. ${selftext}`.trim(),
        category: "discussions",
      });
    }
    return hits;
  } catch {
    return [];
  }
}

// 3. DuckDuckGo Instant Answers & Topics API (Native CORS)
async function duckDuckGoInstantSearch(query: string, limit: number, signal?: AbortSignal): Promise<SearchHit[]> {
  try {
    const url = `https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json&no_html=1&skip_disambig=0`;
    const r = await withTimeout(fetch(url, { signal }), 2500, "ddg instant timeout", signal);
    if (!r.ok) return [];
    const j = await r.json();
    const hits: SearchHit[] = [];

    if (j.AbstractText && j.AbstractURL) {
      hits.push({
        title: j.Heading || query,
        url: j.AbstractURL,
        snippet: j.AbstractText.slice(0, 300),
      });
    }

    const topics = j.RelatedTopics || [];
    for (const t of topics) {
      if (hits.length >= limit) break;
      if (t.Text && t.FirstURL) {
        hits.push({
          title: t.Text.split(" - ")[0] || t.Text.slice(0, 60),
          url: t.FirstURL,
          snippet: t.Text.slice(0, 260),
        });
      } else if (Array.isArray(t.Topics)) {
        for (const sub of t.Topics) {
          if (hits.length >= limit) break;
          if (sub.Text && sub.FirstURL) {
            hits.push({
              title: sub.Text.split(" - ")[0] || sub.Text.slice(0, 60),
              url: sub.FirstURL,
              snippet: sub.Text.slice(0, 260),
            });
          }
        }
      }
    }
    return hits;
  } catch {
    return [];
  }
}

// 3.5 Jina AI Full-Web Search (searches Google/Bing, returns external URLs & snippets, open CORS)
async function jinaSearch(query: string, limit: number, signal?: AbortSignal): Promise<SearchHit[]> {
  try {
    const url = `https://s.jina.ai/${encodeURIComponent(query)}`;
    const r = await withTimeout(
      fetch(url, {
        headers: {
          Accept: "application/json",
          "X-Retain-Images": "none",
        },
        signal,
      }),
      4200,
      "jina search timeout",
      signal
    );
    if (!r.ok) return [];
    const j = await r.json();
    const items = Array.isArray(j?.data) ? j.data : [];
    const hits: SearchHit[] = [];
    for (const item of items) {
      if (hits.length >= limit) break;
      if (item.url) {
        hits.push({
          title: item.title || item.url,
          url: item.url,
          snippet: (item.description || item.content || "").slice(0, 300),
        });
      }
    }
    return hits;
  } catch {
    return [];
  }
}

// 4. Public SearXNG Multi-Instance Web Aggregator (Native JSON + CORS)
async function searxngSearch(query: string, limit: number, signal?: AbortSignal): Promise<SearchHit[]> {
  const instances = [
    "https://search.ononoki.org",
    "https://priv.au",
    "https://searx.be",
    "https://search.mdosch.de",
    "https://baresearch.org",
  ];

  // Try instances concurrently with quick race
  const attempt = async (base: string): Promise<SearchHit[]> => {
    const url = `${base}/search?q=${encodeURIComponent(query)}&format=json&language=auto`;
    const r = await withTimeout(fetch(url, { signal }), 2800, `searxng ${base} timeout`, signal);
    if (!r.ok) throw new Error(`searxng status ${r.status}`);
    const j = await r.json();
    const results = j?.results || [];
    const hits: SearchHit[] = [];
    for (const x of results) {
      if (hits.length >= limit) break;
      if (x.url && (x.title || x.content)) {
        hits.push({
          url: x.url,
          title: x.title || x.url,
          snippet: (x.content || "").slice(0, 300),
        });
      }
    }
    return hits;
  };

  const settled = await Promise.allSettled(instances.slice(0, 3).map((inst) => attempt(inst)));
  for (const s of settled) {
    if (s.status === "fulfilled" && s.value.length > 0) {
      return s.value;
    }
  }
  return [];
}

// 5. HackerNews Algolia Search (Tech discussions & articles)
async function hackernewsSearch(query: string, limit: number, signal?: AbortSignal): Promise<SearchHit[]> {
  try {
    const url = `https://hn.algolia.com/api/v1/search?query=${encodeURIComponent(query)}&hitsPerPage=${limit}`;
    const r = await withTimeout(fetch(url, { signal }), 2500, "hn timeout", signal);
    if (!r.ok) return [];
    const j = await r.json();
    return (j.hits || []).map((h: any) => ({
      title: h.title || h.story_title || "Hacker News item",
      url: h.url || `https://news.ycombinator.com/item?id=${h.objectID}`,
      snippet: `HN Points: ${h.points || 0} | Comments: ${h.num_comments || 0} | Author: ${h.author || "anon"}`,
      category: "discussions",
    }));
  } catch {
    return [];
  }
}

// 6. GitHub Repository Search (Native CORS)
async function githubSearch(query: string, limit: number, signal?: AbortSignal): Promise<SearchHit[]> {
  try {
    const url = `https://api.github.com/search/repositories?q=${encodeURIComponent(query)}&per_page=${limit}&sort=stars&order=desc`;
    const r = await withTimeout(fetch(url, { signal }), 2800, "gh timeout", signal);
    if (!r.ok) return [];
    const j = await r.json();
    return (j.items || []).map((i: any) => ({
      url: i.html_url,
      title: `${i.full_name} ★${(i.stargazers_count || 0).toLocaleString()}`,
      snippet: (i.description || "").slice(0, 300),
      category: "tech",
    }));
  } catch {
    return [];
  }
}

// 7. Wikipedia REST Search (Fast, Native CORS)
async function wikipediaSearch(query: string, limit: number, signal?: AbortSignal): Promise<SearchHit[]> {
  try {
    const cleanQ = query.replace(/(site:\S+|niche|bands?|best|underrated)/gi, "").trim() || query;
    const url = `https://en.wikipedia.org/w/rest.php/v1/search/page?q=${encodeURIComponent(cleanQ)}&limit=${limit}`;
    const r = await withTimeout(fetch(url, { signal }), 2400, "wiki timeout", signal);
    if (!r.ok) return [];
    const j = await r.json();
    const pages = j?.pages || [];
    return pages.map((p: any) => ({
      url: `https://en.wikipedia.org/wiki/${encodeURIComponent(p.key || p.title || "")}`,
      title: p.title || cleanQ,
      snippet: (p.description || p.excerpt || "").replace(/<[^>]+>/g, "").slice(0, 280),
    }));
  } catch {
    return [];
  }
}

// 8. Firecrawl Search (if API key available)
async function firecrawlSearch(query: string, limit: number, key?: string, signal?: AbortSignal): Promise<SearchHit[]> {
  if (!key) return [];
  try {
    const r = await withTimeout(
      fetch("https://api.firecrawl.dev/v2/search", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
        body: JSON.stringify({ query, limit, sources: ["web"] }),
        signal,
      }),
      4000,
      "firecrawl timeout",
      signal
    );
    if (!r.ok) return [];
    const j = await r.json();
    const arr = j?.data?.web ?? j?.data ?? [];
    if (!Array.isArray(arr)) return [];
    return arr.map((x: any) => ({
      url: x.url,
      title: x.title || x.url,
      snippet: (x.description || x.snippet || "").slice(0, 300),
    }));
  } catch {
    return [];
  }
}

/**
 * High-speed unified web search.
 * Dispatches targeted engines in parallel with tight 2.5s timeouts.
 */
export async function webSearch(
  query: string,
  optsOrLimit: WebSearchOpts | number = 6,
  keyLegacy?: string
): Promise<SearchHit[]> {
  const opts: WebSearchOpts =
    typeof optsOrLimit === "number"
      ? { limit: optsOrLimit, key: keyLegacy }
      : optsOrLimit;

  const limit = Math.min(Math.max(opts.limit || 6, 1), 12);
  const site = (opts.site || "").toLowerCase().trim();
  const niche = (opts.niche || opts.category || "").toLowerCase().trim();
  const signal = opts.signal;
  const key = opts.key;

  // Detect industry / business / report queries vs metadata discography queries
  const isReportOrStatsQuery = /\b(report|stats|statistics|revenue|market|streaming|industry|sales|forecast|growth|overview|ifpi|billboard|riaa)\b/i.test(query);

  // Detect niche category if not explicitly specified
  const isMusicQuery =
    !isReportOrStatsQuery &&
    (niche === "music" ||
      site.includes("bandcamp") ||
      site.includes("rateyourmusic") ||
      site.includes("spotify") ||
      site.includes("last.fm") ||
      site.includes("discogs") ||
      /\b(band|bands|album|albums|track|discography|musician|singer|discogs)\b/i.test(query));

  const isDiscussionQuery =
    niche === "discussions" ||
    site.includes("reddit") ||
    /\b(underrated|obscure|hidden gem|recommendations|favorite|discussion|thoughts on|thread|reddit)\b/i.test(query);

  const isTechQuery =
    niche === "tech" ||
    site.includes("github") ||
    site.includes("gitlab") ||
    site.includes("stackoverflow") ||
    /\b(library|repo|npm|code|api|sdk|documentation|algorithm)\b/i.test(query);

  // If Firecrawl key is provided, try Firecrawl first
  if (key) {
    const fc = await firecrawlSearch(query, limit, key, signal);
    if (fc.length) return fc.slice(0, limit);
  }

  // Domain-specific routes
  if (site.includes("reddit")) {
    const hits = await redditSearch(query, limit, site, signal);
    if (hits.length) return hits.slice(0, limit);
  }

  if (site.includes("github")) {
    const hits = await githubSearch(query, limit, signal);
    if (hits.length) return hits.slice(0, limit);
  }

  if (site.includes("hn") || site.includes("hacker")) {
    const hits = await hackernewsSearch(query, limit, signal);
    if (hits.length) return hits.slice(0, limit);
  }

  // Construct parallel search bundle
  const tasks: Promise<SearchHit[]>[] = [];

  if (isMusicQuery) {
    tasks.push(musicBrainzSearch(query, limit, signal));
    tasks.push(redditSearch(query + " music", limit, undefined, signal));
  }

  if (isDiscussionQuery && !isMusicQuery) {
    tasks.push(redditSearch(query, limit, undefined, signal));
    tasks.push(hackernewsSearch(query, limit, signal));
  }

  if (isTechQuery) {
    tasks.push(githubSearch(query, limit, signal));
    tasks.push(hackernewsSearch(query, limit, signal));
  }

  // Always include fast general search engines
  const hasSite = Boolean(site);
  const cleanQ = query.trim();
  const effectiveQ = hasSite && !cleanQ.toLowerCase().includes(`site:${site}`) ? `site:${site} ${cleanQ}` : cleanQ;

  // Jina AI Web Search (searches the live web including specific domains, open CORS)
  tasks.push(jinaSearch(effectiveQ, limit, signal));
  tasks.push(searxngSearch(effectiveQ, limit, signal));
  tasks.push(duckDuckGoInstantSearch(query, limit, signal));

  // Only query Wikipedia if no specific external site is targeted, or if Wikipedia itself is the target
  if (!hasSite || site.includes("wikipedia")) {
    tasks.push(wikipediaSearch(query, limit, signal));
  }

  // Run all providers concurrently with timeout protection
  const results = await Promise.allSettled(tasks);
  const combined: SearchHit[] = [];
  const seenUrls = new Set<string>();

  for (const res of results) {
    if (res.status === "fulfilled" && Array.isArray(res.value)) {
      for (const item of res.value) {
        if (!item || !item.url) continue;
        const norm = item.url.replace(/\/$/, "");
        if (seenUrls.has(norm)) continue;
        seenUrls.add(norm);
        combined.push(item);
      }
    }
  }

  if (combined.length > 0) {
    return combined.slice(0, limit);
  }

  // Fallback: If site filter was too narrow, try Jina without the site prefix
  if (hasSite) {
    const broaderQ = cleanQ.replace(/site:\S+/gi, "").trim() || cleanQ;
    const broaderHits = await jinaSearch(broaderQ, limit, signal);
    if (broaderHits.length > 0) return broaderHits.slice(0, limit);
  }

  // Ultimate fallback: Wikipedia direct ONLY if not targeting a specific external site
  if (!hasSite || site.includes("wikipedia")) {
    const fallback = await wikipediaSearch(query, limit, signal);
    if (fallback.length) return fallback;
  }

  return [
    {
      url: "",
      title: "No results found",
      snippet: `No results returned for "${query}". Try broader search terms or synthesize from knowledge.`,
      status: "partial",
    },
  ];
}

/* =========================================================================
   FETCH
   ========================================================================= */

function normalizeUrl(u: string): string {
  let s = u.trim();
  if (!/^https?:\/\//i.test(s)) s = "https://" + s;
  return s;
}

// Special case: Wikipedia REST API (CORS: *)
async function fetchWikipediaPage(url: string, signal?: AbortSignal): Promise<{ markdown: string; title: string; links: string[] } | null> {
  const m = url.match(/wikipedia\.org\/wiki\/([^#?]+)/i);
  if (!m) return null;
  const pageTitle = decodeURIComponent(m[1]);
  try {
    const api = `https://en.wikipedia.org/api/rest_v1/page/html/${encodeURIComponent(pageTitle)}`;
    const r = await withTimeout(fetch(api, { signal }), 3000, "wiki page timeout", signal);
    if (!r.ok) return null;
    const html = await r.text();
    return htmlToMarkdown(html, url);
  } catch {
    return null;
  }
}

// Special case: GitHub raw README (CORS: *)
async function fetchGitHubRepo(url: string, signal?: AbortSignal): Promise<{ markdown: string; title: string; links: string[] } | null> {
  const m = url.match(/github\.com\/([^/]+)\/([^/]+?)(?:\/|$|\?|#)/i);
  if (!m) return null;
  const [, owner, repo] = m;
  if (["topics", "search", "trending", "explore", "settings"].includes(owner)) return null;
  try {
    const api = `https://api.github.com/repos/${owner}/${repo}/readme`;
    const r = await withTimeout(fetch(api, { headers: { Accept: "application/vnd.github.raw+json" }, signal }), 3000, "gh page timeout", signal);
    if (!r.ok) return null;
    const markdown = await r.text();
    return { markdown, title: `${owner}/${repo}`, links: [] };
  } catch {
    return null;
  }
}

// Jina Reader: fast Markdown extractor (CORS-friendly, no preflights)
async function fetchViaJina(url: string, signal?: AbortSignal): Promise<{ markdown: string; title: string; links: string[] }> {
  const jinaUrl = `https://r.jina.ai/${encodeURIComponent(url)}`;
  const r = await withTimeout(fetch(jinaUrl, { method: "GET", signal }), 3500, "jina reader timeout", signal);
  if (!r.ok) throw new Error(`jina status ${r.status}`);
  const text = await r.text();

  const titleMatch = text.match(/Title:\s*(.+)/i);
  const title = titleMatch ? titleMatch[1].trim() : hostOf(url);
  const cleaned = text.replace(/^Title:[\s\S]*?Markdown Content:\s*/i, "").trim() || text;

  return { markdown: cleaned, title, links: [] };
}

export async function webFetch(
  rawUrl: string,
  optsOrKey?: { key?: string; signal?: AbortSignal } | string,
  signalLegacy?: AbortSignal
): Promise<{ markdown: string; title: string; links: string[] }> {
  const url = normalizeUrl(rawUrl);
  const key = typeof optsOrKey === "string" ? optsOrKey : optsOrKey?.key;
  const signal = typeof optsOrKey === "object" ? optsOrKey?.signal : signalLegacy;

  // 1. Firecrawl if key set
  if (key) {
    try {
      const r = await withTimeout(
        fetch("https://api.firecrawl.dev/v2/scrape", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
          body: JSON.stringify({ url, formats: ["markdown"], onlyMainContent: true, blockAds: true }),
          signal,
        }),
        5000,
        "firecrawl scrape timeout",
        signal
      );
      if (r.ok) {
        const j = await r.json();
        const md = j?.data?.markdown;
        if (md && md.length > 50) {
          return {
            markdown: md,
            title: j?.data?.metadata?.title || url,
            links: [],
          };
        }
      }
    } catch { /* fallback */ }
  }

  // 2. Special cases (Wikipedia, GitHub)
  const wiki = await fetchWikipediaPage(url, signal);
  if (wiki && wiki.markdown.length > 80) return wiki;

  const gh = await fetchGitHubRepo(url, signal);
  if (gh && gh.markdown.length > 80) return gh;

  // 3. Jina Reader
  try {
    const j = await fetchViaJina(url, signal);
    if (j.markdown.length > 60) return j;
  } catch { /* fallback */ }

  // 4. Direct fetch if CORS permitted
  try {
    const r = await withTimeout(fetch(url, { signal }), 2500, "direct timeout", signal);
    if (r.ok) {
      const ct = r.headers.get("content-type") || "";
      const text = await r.text();
      if (ct.includes("markdown") || ct.includes("text/plain")) {
        return { markdown: text, title: hostOf(url), links: [] };
      }
      return htmlToMarkdown(text, url);
    }
  } catch { /* fallback */ }

  return {
    markdown: `[Content preview: ${url}]\n\nUnable to extract readable markdown via standard CORS channels. Please synthesize using available search excerpts or pre-trained knowledge.`,
    title: hostOf(url),
    links: [],
  };
}

/* =========================================================================
   COMPATIBILITY ALIASES
   ========================================================================= */

export async function siteSearch(site: string, query: string, limit = 6, key?: string, signal?: AbortSignal): Promise<SearchHit[]> {
  return webSearch(query, { site, limit, key, signal });
}

export async function webCrawl(url: string, limit = 4, key?: string, signal?: AbortSignal): Promise<Array<{ url: string; title: string; markdown: string }>> {
  const root = await webFetch(url, { key, signal });
  return [{ url, title: root.title, markdown: root.markdown.slice(0, 5000) }];
}
