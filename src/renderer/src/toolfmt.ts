// 工具调用参数格式化纯函数（无依赖模块，便于 node:test 直接测试）
// 用于 Feed 工具链块展开区：把原始 args 转成可读全文

const MAX_JSON = 2000;

/** bash → 完整命令；其他返回 null（走通用 JSON 渲染） */
export function formatToolArgs(toolName: string, args: unknown): string {
  const a = (args ?? {}) as Record<string, unknown>;
  if (toolName === 'bash') {
    return typeof a.command === 'string' ? a.command : JSON.stringify(a, null, 2);
  }
  if (toolName === 'batch_execute') {
    const cmds = Array.isArray(a.commands)
      ? a.commands.map((c: unknown) => (c && typeof c === 'object' ? String((c as Record<string, unknown>).command ?? '') : String(c)))
      : [];
    return cmds.length ? cmds.join('\n') : JSON.stringify(a, null, 2);
  }
  return JSON.stringify(a, null, 2).slice(0, MAX_JSON);
}

/** 展开区标题行：工具名 + 主目标（file/path/command 前缀） */
export function toolExpandTitle(toolName: string, args: unknown): string {
  const a = (args ?? {}) as Record<string, unknown>;
  if (typeof a.file === 'string') return `${toolName} → ${a.file}`;
  if (typeof a.path === 'string') return `${toolName} → ${a.path}`;
  return toolName;
}
