// feed 消息正文解析纯函数（无依赖，node:test 直接测）
// 支持：``` 三反引号代码块（含语言标签，未闭合宽容到文末）、行内 `code`、【高亮词】；
// 代码块内不再做行内解析。围栏本身（```lang / ```）不进入输出。

export interface BodyPart {
  k: 't' | 'c' | 'h' | 'f';
  v: string;
  /** 代码块语言标签（```html → 'html'） */
  lang?: string;
}

const FENCE_RE = /^(`{3,}|~{3,})(.*)$/;
const FENCE_CLOSE_RE = /^(`{3,}|~{3,})\s*$/;
const INLINE_RE = /(`[^`\n]+`|【[^】\n]+】)/g;

/** 围栏开行：反引号或波浪号 + 可选语言 */
function isFenceOpen(line: string): { ch: string; lang: string } | null {
  const m = FENCE_RE.exec(line);
  if (!m) return null;
  return { ch: m[1][0], lang: m[2].trim() };
}

export function parseBody(text: string): BodyPart[] {
  const out: BodyPart[] = [];
  const lines = text.split('\n');
  let i = 0;
  while (i < lines.length) {
    const open = isFenceOpen(lines[i]);
    if (open) {
      const buf: string[] = [];
      let j = i + 1;
      let closed = false;
      while (j < lines.length) {
        const c = FENCE_CLOSE_RE.exec(lines[j]);
        if (c && c[1][0] === open.ch) {
          closed = true;
          break;
        }
        buf.push(lines[j]);
        j++;
      }
      out.push({ k: 'f', v: buf.join('\n'), lang: open.lang || undefined });
      i = closed ? j + 1 : lines.length;
      continue;
    }
    // 普通段：累积到下一个围栏开行，段内做行内解析
    const buf = [lines[i]];
    i++;
    while (i < lines.length && !isFenceOpen(lines[i])) {
      buf.push(lines[i]);
      i++;
    }
    const seg = buf.join('\n');
    let last = 0;
    let m: RegExpExecArray | null;
    INLINE_RE.lastIndex = 0;
    while ((m = INLINE_RE.exec(seg))) {
      if (m.index > last) out.push({ k: 't', v: seg.slice(last, m.index) });
      out.push({ k: m[0][0] === '`' ? 'c' : 'h', v: m[0] });
      last = m.index + m[0].length;
    }
    if (last < seg.length) out.push({ k: 't', v: seg.slice(last) });
  }
  return out;
}
