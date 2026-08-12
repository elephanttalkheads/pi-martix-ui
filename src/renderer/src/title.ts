// 会话标题推导纯函数（无依赖模块，便于 node:test 直接测试）
// 规则：name → firstMessage 智能摘要（首行/去成对引号/去前导符号/22 字符截断）→ 会话短码兜底

/** 会话显示标题：name → firstMessage 智能摘要 → 会话短码 */
export function deriveSessionTitle(name: string | undefined, firstMessage: string | undefined, id: string): string {
  if (name && name.trim()) return name.trim();
  const raw = (firstMessage ?? '').trim();
  if (raw) {
    // 首行提取：多行 prompt 的首行通常是完整句子
    let t = raw.split('\n')[0].trim();
    // 摘除含路径/命令特征的内嵌引号对（含 : \ / 之一）：消除 `为"D:\\...\\..."` 路径残尾
    t = t.replace(/"[^"\n]*[:\\/][^"\n]*"/g, '');
    // 去成对包裹引号（"…" 「…」 『…』 ‘…’ “…” '…'）
    t = t.replace(/^(["'“”])([\s\S]*?)\1$/, '$2').replace(/^[「『]([\s\S]*?)[」』]$/, '$1').trim();
    // 去常见前导符号（- # > * · 等后跟空白，或为路径前缀）
    t = t.replace(/^[-#>*·]\s+/, '').replace(/^[/\\]/, '').trim();
    // 压缩连续空白
    t = t.replace(/\s{2,}/g, ' ');
    if (!t) t = raw.split('\n')[0].trim(); // 清理过头则回退首行
    return t.length > 22 ? t.slice(0, 22) + '…' : t;
  }
  return `会话 ${(id || '').slice(0, 4) || '----'}`;
}
