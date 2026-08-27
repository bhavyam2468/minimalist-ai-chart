/* ===========================================================================
   parse.ts — a from-scratch markdown engine designed for token streams.

   Core idea: never "repair" the string. Instead the parser is aware that the
   tail of the document is unfinished, so every construct carries an `open`
   flag. An unmatched leading `**` immediately produces a <strong> that is
   still growing; when the trailing `**` arrives the same node simply flips to
   closed. Nothing remounts, so no flicker and no lost animation state.
   ========================================================================= */

export type Inline =
  | { t: "text"; v: string }
  | { t: "br" }
  | { t: "code"; v: string; open: boolean }
  | { t: "math"; v: string; open: boolean }
  | { t: "img"; src: string; alt: string }
  | { t: "link"; href: string; kids: Inline[]; open: boolean }
  | { t: "fnref"; id: string }
  | { t: "strong" | "em" | "del" | "mark" | "sup" | "sub" | "u"; kids: Inline[]; open: boolean };

export type Cell = Inline[];

export type Block =
  | { t: "p"; kids: Inline[]; open: boolean }
  | { t: "h"; level: number; kids: Inline[]; open: boolean }
  | { t: "hr" }
  | { t: "quote"; blocks: Block[]; open: boolean }
  | { t: "code"; lang: string; code: string; open: boolean }
  | { t: "math"; expr: string; open: boolean }
  | { t: "list"; ordered: boolean; start: number; tight: boolean; items: ListItem[]; open: boolean }
  | { t: "table"; head: Cell[]; align: (string | null)[]; rows: Cell[][]; open: boolean; partialRow: boolean }
  | { t: "details"; summary: Inline[]; blocks: Block[]; open: boolean }
  | { t: "media"; kind: "youtube" | "video" | "image"; src: string; caption?: string }
  | { t: "html"; html: string }
  | { t: "fndef"; id: string; kids: Inline[] }
  | { t: "tool"; id?: string; name: string; argsRaw: string; open: boolean }
  | { t: "component"; raw: string; attrs?: string; open: boolean };

export interface ListItem {
  checked: boolean | null;
  blocks: Block[];
}

const ESC = "\\";

/* ------------------------------------------------------------------ inline */

function findClose(s: string, from: number, delim: string): number {
  for (let i = from; i <= s.length - delim.length; i++) {
    if (s[i] === ESC) { i++; continue; }
    if (s.startsWith(delim, i)) return i;
  }
  return -1;
}

const YT = /(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([\w-]{6,})/;

export function youtubeId(url: string): string | null {
  const m = url.match(YT);
  return m ? m[1] : null;
}

export function parseInline(src: string): Inline[] {
  const out: Inline[] = [];
  let buf = "";
  const push = () => { if (buf) { out.push({ t: "text", v: buf }); buf = ""; } };
  let i = 0;

  const wrap = (tag: any, delim: string, start: number) => {
    const close = findClose(src, start, delim);
    const inner = close === -1 ? src.slice(start) : src.slice(start, close);
    push();
    out.push({ t: tag, kids: parseInline(inner), open: close === -1 });
    return close === -1 ? src.length : close + delim.length;
  };

  while (i < src.length) {
    const c = src[i];

    if (c === ESC && i + 1 < src.length) { buf += src[i + 1]; i += 2; continue; }

    /* hard break */
    if (c === "\n") { push(); out.push({ t: "br" }); i++; continue; }

    /* inline code — count the backtick run */
    if (c === "`") {
      let n = 0; while (src[i + n] === "`") n++;
      const fence = "`".repeat(n);
      const close = findClose(src, i + n, fence);
      const v = close === -1 ? src.slice(i + n) : src.slice(i + n, close);
      push(); out.push({ t: "code", v, open: close === -1 });
      i = close === -1 ? src.length : close + n;
      continue;
    }

    /* inline math $...$  (ignore $12.50 style money) */
    if (c === "$" && src[i + 1] !== "$" && /[^\s\d]/.test(src[i + 1] ?? "")) {
      const close = findClose(src, i + 1, "$");
      const v = close === -1 ? src.slice(i + 1) : src.slice(i + 1, close);
      if (close !== -1 || v.length < 220) {
        push(); out.push({ t: "math", v, open: close === -1 });
        i = close === -1 ? src.length : close + 1;
        continue;
      }
    }
    if (src.startsWith("\\(", i)) {
      const close = findClose(src, i + 2, "\\)");
      const v = close === -1 ? src.slice(i + 2) : src.slice(i + 2, close);
      push(); out.push({ t: "math", v, open: close === -1 });
      i = close === -1 ? src.length : close + 2;
      continue;
    }

    /* image */
    if (c === "!" && src[i + 1] === "[") {
      const endAlt = findClose(src, i + 2, "]");
      if (endAlt !== -1 && src[endAlt + 1] === "(") {
        const endUrl = findClose(src, endAlt + 2, ")");
        if (endUrl !== -1) {
          push();
          out.push({ t: "img", alt: src.slice(i + 2, endAlt), src: src.slice(endAlt + 2, endUrl).trim() });
          i = endUrl + 1; continue;
        }
      }
      // still streaming the image — emit nothing yet
      push(); i = src.length; continue;
    }

    /* footnote ref + link */
    if (c === "[") {
      if (src[i + 1] === "^") {
        const end = findClose(src, i + 2, "]");
        if (end !== -1) { push(); out.push({ t: "fnref", id: src.slice(i + 2, end) }); i = end + 1; continue; }
        push(); i = src.length; continue;
      }
      const endTxt = findClose(src, i + 1, "]");
      if (endTxt !== -1 && src[endTxt + 1] === "(") {
        const endUrl = findClose(src, endTxt + 2, ")");
        const href = (endUrl === -1 ? src.slice(endTxt + 2) : src.slice(endTxt + 2, endUrl)).trim();
        push();
        out.push({ t: "link", href, kids: parseInline(src.slice(i + 1, endTxt)), open: endUrl === -1 });
        i = endUrl === -1 ? src.length : endUrl + 1;
        continue;
      }
      if (endTxt === -1) { // link text still arriving — render it as plain text
        push(); out.push(...parseInline(src.slice(i + 1))); i = src.length; continue;
      }
    }

    /* autolink */
    if ((c === "h" && src.startsWith("http", i)) || src.startsWith("www.", i)) {
      const m = src.slice(i).match(/^(https?:\/\/|www\.)[^\s<>()\[\]]+/);
      if (m) {
        const href = m[0].startsWith("www.") ? "https://" + m[0] : m[0];
        push(); out.push({ t: "link", href, kids: [{ t: "text", v: m[0] }], open: false });
        i += m[0].length; continue;
      }
    }

    /* html-ish inline tags */
    if (c === "<") {
      const br = src.slice(i).match(/^<br\s*\/?>/i);
      if (br) { push(); out.push({ t: "br" }); i += br[0].length; continue; }
      const tagM = src.slice(i).match(/^<(mark|u|sup|sub|strong|em|b|i)>/i);
      if (tagM) {
        const tag = tagM[1].toLowerCase();
        const map: Record<string, Inline["t"]> = { mark: "mark", u: "u", sup: "sup", sub: "sub", strong: "strong", em: "em", b: "strong", i: "em" };
        const from = i + tagM[0].length;
        const close = findClose(src, from, `</${tag}>`);
        const inner = close === -1 ? src.slice(from) : src.slice(from, close);
        push();
        out.push({ t: map[tag] as any, kids: parseInline(inner), open: close === -1 });
        i = close === -1 ? src.length : close + tag.length + 3;
        continue;
      }
      if (/^<\/?[a-z][\w-]*(\s|>|\/)/i.test(src.slice(i))) {
        // unknown / half-typed tag: never show raw html
        const gt = src.indexOf(">", i);
        i = gt === -1 ? src.length : gt + 1;
        continue;
      }
      buf += c; i++; continue;
    }

    /* emphasis family */
    if (src.startsWith("***", i) && src[i + 3] && src[i + 3] !== " ") {
      const close = findClose(src, i + 3, "***");
      const inner = close === -1 ? src.slice(i + 3) : src.slice(i + 3, close);
      push();
      out.push({ t: "strong", open: close === -1, kids: [{ t: "em", open: close === -1, kids: parseInline(inner) }] });
      i = close === -1 ? src.length : close + 3; continue;
    }
    if ((src.startsWith("**", i) || src.startsWith("__", i)) && src[i + 2] && src[i + 2] !== " ") {
      i = wrap("strong", src.slice(i, i + 2), i + 2); continue;
    }
    if (src.startsWith("==", i) && src[i + 2] && src[i + 2] !== " ") { i = wrap("mark", "==", i + 2); continue; }
    if (src.startsWith("~~", i) && src[i + 2] && src[i + 2] !== " ") { i = wrap("del", "~~", i + 2); continue; }
    if ((c === "*" || c === "_") && src[i + 1] && src[i + 1] !== " " && src[i + 1] !== c) {
      // `_` only when at a word boundary (snake_case must survive)
      const prev = src[i - 1] ?? " ";
      if (c === "*" || /[\s([{"'—-]/.test(prev)) { i = wrap("em", c, i + 1); continue; }
    }
    if (c === "^" && src[i + 1] && src[i + 1] !== " " && src.indexOf("^", i + 1) !== -1) { i = wrap("sup", "^", i + 1); continue; }
    if (c === "~" && src[i + 1] && src[i + 1] !== " " && src.indexOf("~", i + 1) !== -1) { i = wrap("sub", "~", i + 1); continue; }

    buf += c; i++;
  }
  push();
  return out;
}

/* ------------------------------------------------------------------ blocks */

const splitRow = (line: string): string[] => {
  const t = line.trim().replace(/^\|/, "").replace(/\|$/, "");
  const cells: string[] = []; let cur = ""; let esc = false;
  for (const ch of t) {
    if (esc) { cur += ch; esc = false; continue; }
    if (ch === ESC) { esc = true; continue; }
    if (ch === "|") { cells.push(cur); cur = ""; continue; }
    cur += ch;
  }
  cells.push(cur);
  return cells.map((c) => c.trim());
};

const isSep = (line: string) => /^\s*\|?\s*:?-{2,}:?\s*(\|\s*:?-{2,}:?\s*)*\|?\s*$/.test(line);

export function parseBlocks(src: string): Block[] {
  const lines = src.replace(/\r\n?/g, "\n").split("\n");
  const out: Block[] = [];
  let i = 0;
  const last = () => i >= lines.length;

  while (i < lines.length) {
    const line = lines[i];

    if (!line.trim()) { i++; continue; }

    /* fenced code */
    const fence = line.match(/^(\s*)(`{3,}|~{3,})\s*([\w+#.-]*)/);
    if (fence) {
      const marker = fence[2][0].repeat(3);
      const lang = fence[3] || "";
      const body: string[] = [];
      i++;
      let closed = false;
      while (i < lines.length) {
        if (lines[i].trim().startsWith(marker)) { closed = true; i++; break; }
        body.push(lines[i]); i++;
      }
      out.push({ t: "code", lang, code: body.join("\n"), open: !closed });
      continue;
    }

    /* $$ math $$ */
    if (line.trim().startsWith("$$")) {
      const first = line.trim().slice(2);
      if (first.endsWith("$$") && first.length > 2) { out.push({ t: "math", expr: first.slice(0, -2), open: false }); i++; continue; }
      const body: string[] = first ? [first] : [];
      i++; let closed = false;
      while (i < lines.length) {
        if (lines[i].trim().endsWith("$$")) { body.push(lines[i].trim().replace(/\$\$$/, "")); closed = true; i++; break; }
        body.push(lines[i]); i++;
      }
      out.push({ t: "math", expr: body.join("\n"), open: !closed });
      continue;
    }

    /* <details> */
    if (/^\s*<details/i.test(line)) {
      const body: string[] = [];
      let summary = "";
      i++;
      let closed = false;
      while (i < lines.length) {
        const l = lines[i];
        if (/<\/details>/i.test(l)) { closed = true; i++; break; }
        const sm = l.match(/<summary>([\s\S]*?)(<\/summary>|$)/i);
        if (sm) { summary = sm[1]; i++; continue; }
        body.push(l); i++;
      }
      out.push({ t: "details", summary: parseInline(summary || "Details"), blocks: parseBlocks(body.join("\n")), open: !closed });
      continue;
    }

    /* split inline <component tag if glued to preceding text */
    if (line.includes("<component") && !line.trim().startsWith("<component")) {
      const idx = line.indexOf("<component");
      const before = line.slice(0, idx);
      const after = line.slice(idx);
      lines.splice(i, 1, before, after);
      continue;
    }

    /* Self-healing: if line starts directly with type="..." omitting <component */
    if (/^\s*type=["']?(?:slider|dropdown|radio|checkbox|button|input|stepper|rating|progress|color-picker|palette|calendar|date-picker|weather|clock|chart|metrics|form|reactive|question)["']?\s/i.test(line)) {
      let healed = line.trim();
      if (healed.endsWith(">")) healed = healed.slice(0, -1).trim();
      if (healed.endsWith("/")) healed = healed.slice(0, -1).trim();
      out.push({ t: "component", raw: "", attrs: healed, open: false });
      i++;
      continue;
    }

    /* <component> */
    if (/^\s*<component/i.test(line)) {
      // Gather multiline opening tag if needed
      let tagLine = line;
      let tagEnd = tagLine.indexOf(">");
      while (tagEnd === -1 && i + 1 < lines.length) {
        i++;
        tagLine += " " + lines[i];
        tagEnd = tagLine.indexOf(">");
      }

      // Check immediate self-closing tag: <component ... />
      const selfClosing = tagLine.match(/^\s*<component([\s\S]*?)\s*\/>([\s\S]*)$/i);
      if (selfClosing) {
        const attrs = selfClosing[1].trim();
        const inlineRest = selfClosing[2].trim();
        out.push({ t: "component", raw: "", attrs, open: false });
        if (inlineRest) {
          lines.splice(i + 1, 0, inlineRest);
        }
        i++;
        continue;
      }

      const body: string[] = [];
      let closed = false;
      const tagM = tagLine.match(/^\s*<component([\s\S]*?)>([\s\S]*)$/i);
      let attrs = tagM ? tagM[1].trim() : "";
      if (attrs.endsWith("/")) {
        attrs = attrs.slice(0, -1).trim();
        closed = true;
      }
      const inlineRest = tagM ? tagM[2] : "";
      if (closed || /<\/component>/i.test(inlineRest)) {
        body.push(inlineRest.replace(/<\/component>[\s\S]*$/i, ""));
        closed = true;
        i++;
      } else {
        if (inlineRest.trim()) body.push(inlineRest);
        i++;
        while (i < lines.length) {
          const l = lines[i];
          if (/<\/component>/i.test(l)) {
            body.push(l.replace(/<\/component>[\s\S]*$/i, ""));
            closed = true;
            i++;
            break;
          }
          body.push(l);
          i++;
        }
      }
      out.push({ t: "component", raw: body.join("\n").trim(), attrs, open: !closed });
      continue;
    }

    /* split inline <tool-call or <tool_call tag if glued to preceding text */
    if (/(<tool[-_]call)/i.test(line) && !/^\s*<tool[-_]call/i.test(line)) {
      const idx = line.search(/<tool[-_]call/i);
      const before = line.slice(0, idx);
      const after = line.slice(idx);
      lines.splice(i, 1, before, after);
      continue;
    }

    /* <tool_call> or <tool-call> */
    if (/^\s*<tool[-_]call/i.test(line)) {
      const body: string[] = [];
      let closed = false;
      const tagM = line.match(/^\s*<tool[-_]call([^>]*)>([\s\S]*)$/i);
      const attrs = tagM ? tagM[1].trim() : "";
      const inlineRest = tagM ? tagM[2] : "";
      const idMatch = attrs.match(/id="([^"]+)"/i);
      const nameMatch = attrs.match(/name="([^"]+)"/i);
      const callId = idMatch ? idMatch[1] : undefined;
      const callName = nameMatch ? nameMatch[1] : "tool";

      if (/<\/tool[-_]call>/i.test(inlineRest)) {
        body.push(inlineRest.replace(/<\/tool[-_]call>[\s\S]*$/i, ""));
        closed = true;
        i++;
      } else {
        if (inlineRest.trim()) body.push(inlineRest);
        i++;
        while (i < lines.length) {
          const l = lines[i];
          if (/<\/tool[-_]call>/i.test(l)) {
            body.push(l.replace(/<\/tool[-_]call>[\s\S]*$/i, ""));
            closed = true;
            i++;
            break;
          }
          body.push(l);
          i++;
        }
      }
      out.push({ t: "tool", id: callId, name: callName, argsRaw: body.join("\n").trim(), open: !closed });
      continue;
    }

    /* thematic break */
    if (/^\s{0,3}([-*_])\s*(\1\s*){2,}$/.test(line)) { out.push({ t: "hr" }); i++; continue; }

    /* heading */
    const h = line.match(/^(\s{0,3})(#{1,6})\s+(.*)$/);
    if (h) { out.push({ t: "h", level: h[2].length, kids: parseInline(h[3].replace(/\s+#+\s*$/, "")), open: i === lines.length - 1 }); i++; continue; }

    /* footnote definition */
    const fd = line.match(/^\[\^([^\]]+)\]:\s?(.*)$/);
    if (fd) {
      const body = [fd[2]];
      i++;
      while (i < lines.length && /^\s{2,}\S/.test(lines[i])) { body.push(lines[i].trim()); i++; }
      out.push({ t: "fndef", id: fd[1], kids: parseInline(body.join(" ")) });
      continue;
    }

    /* blockquote */
    if (/^\s{0,3}>/.test(line)) {
      const body: string[] = [];
      while (i < lines.length && (/^\s{0,3}>/.test(lines[i]) || (body.length && lines[i].trim() && !/^\s{0,3}([-*+]|\d+\.)\s/.test(lines[i])))) {
        body.push(lines[i].replace(/^\s{0,3}>\s?/, "")); i++;
      }
      out.push({ t: "quote", blocks: parseBlocks(body.join("\n")), open: last() });
      continue;
    }

    /* table */
    if (line.includes("|")) {
      const start = i;
      const headLine = line;
      const sepLine = lines[i + 1];
      if (sepLine !== undefined && isSep(sepLine)) {
        const align = splitRow(sepLine).map((c) => (c.startsWith(":") && c.endsWith(":") ? "center" : c.endsWith(":") ? "right" : c.startsWith(":") ? "left" : null));
        const head = splitRow(headLine).map(parseInline);
        i += 2;
        const rows: Cell[][] = [];
        let partial = false;
        while (i < lines.length && lines[i].includes("|") && lines[i].trim() !== "") {
          const isLastLine = i === lines.length - 1;
          const raw = lines[i];
          const cells = splitRow(raw);
          if (isLastLine && !raw.trim().endsWith("|")) partial = true;
          rows.push(cells.map(parseInline));
          i++;
        }
        out.push({ t: "table", head, align, rows, open: last(), partialRow: partial });
        continue;
      }
      // header row has arrived but the alignment row has not yet streamed in
      if (i === lines.length - 1 && line.trim().startsWith("|")) {
        out.push({ t: "table", head: splitRow(headLine).map(parseInline), align: [], rows: [], open: true, partialRow: false });
        i++; continue;
      }
      i = start; // fall through to paragraph
    }

    /* lists */
    const lm = line.match(/^(\s*)([-*+]|\d{1,9}[.)])\s+(.*)$/);
    if (lm) {
      const baseIndent = lm[1].length;
      const ordered = /\d/.test(lm[2]);
      const start = ordered ? parseInt(lm[2], 10) : 1;
      const items: ListItem[] = [];
      let tight = true;
      while (i < lines.length) {
        const m = lines[i].match(/^(\s*)([-*+]|\d{1,9}[.)])\s+(.*)$/);
        if (!m || m[1].length < baseIndent) break;
        if (m[1].length > baseIndent) break;
        if (ordered !== /\d/.test(m[2])) break;
        let text = m[3];
        let checked: boolean | null = null;
        const cb = text.match(/^\[([ xX])\]\s+(.*)$/);
        if (cb) { checked = cb[1].toLowerCase() === "x"; text = cb[2]; }
        const sub: string[] = [text];
        i++;
        while (i < lines.length) {
          const l = lines[i];
          if (!l.trim()) {
            const nxt = lines[i + 1];
            if (nxt && /^\s{2,}\S/.test(nxt)) { tight = false; sub.push(""); i++; continue; }
            break;
          }
          if (/^(\s*)([-*+]|\d{1,9}[.)])\s+/.test(l) && (l.match(/^\s*/)![0].length <= baseIndent)) break;
          if (/^\s{2,}/.test(l) || /^\s*[`>|]/.test(l)) { sub.push(l.replace(new RegExp(`^\\s{0,${baseIndent + 2}}`), "")); i++; continue; }
          sub.push(l); i++;   // lazy continuation
        }
        items.push({ checked, blocks: parseBlocks(sub.join("\n")) });
      }
      out.push({ t: "list", ordered, start, tight, items, open: last() });
      continue;
    }

    /* standalone media line */
    const bare = line.trim();
    if (/^(https?:\/\/\S+)$/.test(bare)) {
      const yid = youtubeId(bare);
      if (yid) { out.push({ t: "media", kind: "youtube", src: yid }); i++; continue; }
      if (/\.(mp4|webm|mov)(\?|$)/i.test(bare)) { out.push({ t: "media", kind: "video", src: bare }); i++; continue; }
      if (/\.(png|jpe?g|gif|webp|avif|svg)(\?|$)/i.test(bare)) { out.push({ t: "media", kind: "image", src: bare }); i++; continue; }
    }
    const onlyImg = bare.match(/^!\[([^\]]*)\]\(([^)]+)\)$/);
    if (onlyImg) { out.push({ t: "media", kind: "image", src: onlyImg[2].trim(), caption: onlyImg[1] }); i++; continue; }

    /* paragraph */
    const para: string[] = [];
    while (i < lines.length) {
      const l = lines[i];
      if (!l.trim()) break;
      if (/^\s{0,3}(#{1,6}\s|>|```|~~~|\$\$|<details|<component|<tool[-_]call)/i.test(l)) break;
      if (/^(\s*)([-*+]|\d{1,9}[.)])\s+/.test(l)) break;
      if (l.trim().startsWith("|")) break;
      if (/^\s{0,3}([-*_])\s*(\1\s*){2,}$/.test(l)) break;
      para.push(l); i++;
    }
    out.push({ t: "p", kids: parseInline(para.join("\n")), open: last() });
  }

  return out;
}

/** Splits a stream into memo-stable top-level blocks. */
export function parseDocument(src: string) {
  const blocks = parseBlocks(src);
  const footnotes: { id: string; kids: Inline[] }[] = [];
  const body: Block[] = [];
  for (const b of blocks) {
    if (b.t === "fndef") footnotes.push({ id: b.id, kids: b.kids });
    else body.push(b);
  }
  return { body, footnotes };
}
