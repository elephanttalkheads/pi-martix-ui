// 命令面板数据源：skills 扫描 + 内置/扩展命令清单（纯 Node，无 electron 依赖，可 node:test）
// 扫描位置遵循 pi docs/skills.md 的官方加载来源：
//   用户级 ~/.pi/agent/skills、~/.agents/skills；项目级 .pi/skills、.agents/skills；
//   扩展包 skills/ 目录；settings.skills 数组显式路径。
// 命令 = 内置权威清单（pi 源码 BUILTIN_SLASH_COMMANDS，21 个）+ 扩展命令白名单
//   （扩展运行时注册的命令无法静态枚举——新增扩展命令在此追加）。

import { readdirSync, readFileSync, existsSync, statSync } from 'node:fs';
import { join } from 'node:path';

/**
 * @typedef {import('../shared/protocol.ts').CommandItem} CommandItem
 */

/** 内置 slash 命令（pi 源码 dist/core/slash-commands.js BUILTIN_SLASH_COMMANDS） */
export const BUILTIN_COMMANDS = /** @type {const} */ ([
  { name: 'settings', description: 'Open settings menu' },
  { name: 'model', description: 'Select model (opens selector UI)' },
  { name: 'scoped-models', description: 'Enable/disable models for Ctrl+P cycling' },
  { name: 'export', description: 'Export session (HTML default, or specify path: .html/.jsonl)' },
  { name: 'import', description: 'Import and resume a session from a JSONL file' },
  { name: 'share', description: 'Share session as a secret GitHub gist' },
  { name: 'copy', description: 'Copy last agent message to clipboard' },
  { name: 'name', description: 'Set session display name' },
  { name: 'session', description: 'Show session info and stats' },
  { name: 'changelog', description: 'Show changelog entries' },
  { name: 'hotkeys', description: 'Show all keyboard shortcuts' },
  { name: 'fork', description: 'Create a new fork from a previous user message' },
  { name: 'clone', description: 'Duplicate the current session at the current position' },
  { name: 'tree', description: 'Navigate session tree (switch branches)' },
  { name: 'trust', description: 'Save project trust decision for future sessions' },
  { name: 'login', description: 'Configure provider authentication' },
  { name: 'logout', description: 'Remove provider authentication' },
  { name: 'new', description: 'Start a new session' },
  { name: 'compact', description: 'Manually compact the session context' },
  { name: 'resume', description: 'Resume a different session' },
  { name: 'reload', description: 'Reload keybindings, extensions, skills, prompts, themes, and context files' },
]);

/** 扩展注册命令白名单（运行时注册无法静态枚举；新增扩展命令在此追加） */
export const EXTENSION_COMMANDS = /** @type {const} */ ([
  { name: 'goal', description: 'Goal 自主模式：启动/状态/暂停/恢复/清除/队列（pi-goal 扩展）' },
]);

/** 解析 SKILL.md frontmatter 的 name/description；无 frontmatter 返回 null
 * @param {string} text
 * @returns {{ name?: string, description?: string } | null} */
export function parseSkillFrontmatter(text) {
  const m = /^---\n([\s\S]*?)\n---/.exec(text);
  if (!m) return null;
  const fm = {};
  for (const line of m[1].split('\n')) {
    const kv = /^([a-zA-Z-]+):\s*(.*)$/.exec(line.trim());
    if (kv && kv[1] === 'name') fm.name = kv[2].trim();
    else if (kv && kv[1] === 'description') fm.description = kv[2].trim();
  }
  return fm;
}

/**
 * 扫描一个目录，产出其中的 skill 条目（目录/skill-name/SKILL.md；根级 .md 仅 .pi/skills 类目录支持）
 * @param {string} dir 绝对路径
 * @param {string} source 来源标注
 * @returns {CommandItem[]}
 */
export function scanSkillsDir(dir, source) {
  if (!existsSync(dir)) return [];
  /** @type {CommandItem[]} */
  const out = [];
  const readSkill = (/** @type {string} */ skillDir) => {
    const md = join(skillDir, 'SKILL.md');
    if (!existsSync(md)) return;
    try {
      const fm = parseSkillFrontmatter(readFileSync(md, 'utf8'));
      const name = (fm && fm.name) || (skillDir.split(/[\\/]/).pop() ?? '');
      out.push({ name, description: (fm && fm.description) || '', kind: 'skill', source });
    } catch { /* 单技能损坏不影响整体 */ }
  };
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory() && !entry.name.startsWith('.')) readSkill(join(dir, entry.name));
    else if (entry.isFile() && entry.name.endsWith('.md')) {
      // 根级 .md 也是技能（docs/skills.md：.pi/skills 与 ~/.pi/agent/skills 支持）
      const fm = parseSkillFrontmatter(readFileSync(join(dir, entry.name), 'utf8'));
      if (fm && fm.name) out.push({ name: fm.name, description: fm.description || '', kind: 'skill', source });
    }
  }
  return out;
}

/**
 * 聚合全部来源 → 命令面板条目
 * @param {object} opts
 * @param {string} opts.userSkillsDir ~/.pi/agent/skills
 * @param {string} opts.sharedSkillsDir ~/.agents/skills
 * @param {string[]} opts.projectSkillsDirs 项目 .pi/skills、.agents/skills
 * @param {string} opts.packagesRoot ~/.pi/agent/npm/node_modules（扩展包 skills/）
 * @param {string[]} opts.settingsSkillPaths settings.skills 数组
 * @returns {CommandItem[]}
 */
export function collectCommands({ userSkillsDir, sharedSkillsDir, projectSkillsDirs, packagesRoot, settingsSkillPaths }) {
  /** @type {CommandItem[]} */
  const items = [];
  const seen = new Set();
  const push = (/** @type {CommandItem} */ item) => {
    const key = item.kind + ':' + item.name;
    if (seen.has(key)) return; // 同名技能去重（先到先得：用户级优先于共享/项目级）
    seen.add(key);
    items.push(item);
  };

  for (const it of scanSkillsDir(userSkillsDir, '用户')) push(it);
  for (const it of scanSkillsDir(sharedSkillsDir, '共享')) push(it);
  for (const d of projectSkillsDirs) for (const it of scanSkillsDir(d, '项目')) push(it);
  for (const p of settingsSkillPaths) for (const it of scanSkillsDir(p, 'settings')) push(it);

  // 扩展包：扫描 packages 根的 skills/ 目录（支持 @scope 子目录）
  if (existsSync(packagesRoot)) {
    const walkPkg = (/** @type {string} */ dir) => {
      for (const entry of readdirSync(dir, { withFileTypes: true })) {
        if (!entry.isDirectory() || entry.name.startsWith('.')) continue;
        const sub = join(dir, entry.name);
        const skillsDir = join(sub, 'skills');
        if (existsSync(skillsDir)) {
          for (const it of scanSkillsDir(skillsDir, `扩展·${entry.name}`)) push(it);
        } else if (entry.name.startsWith('@')) {
          walkPkg(sub); // scoped 包
        }
      }
    };
    walkPkg(packagesRoot);
  }

  for (const c of BUILTIN_COMMANDS) push({ name: c.name, description: c.description, kind: 'command', source: '内置' });
  for (const c of EXTENSION_COMMANDS) push({ name: c.name, description: c.description, kind: 'command', source: '扩展' });
  return items;
}
