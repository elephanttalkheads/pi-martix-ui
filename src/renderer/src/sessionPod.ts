// 会话培育仓的纯数据映射（无 React 依赖，便于 node:test 直测）

/** 全息摘要：取第一条非空行，保留原文长度交给 CSS 自适应省略。 */
export function firstLineSummary(value?: string): string {
  const line = value
    ?.split(/\r?\n/)
    .map((part) => part.trim())
    .find(Boolean);
  return line || '尚无会话内容';
}
