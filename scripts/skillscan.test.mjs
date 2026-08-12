// 命令面板数据源单测（skillscan.mjs 纯 Node，无 electron）
// 用法：node --test scripts/skillscan.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, mkdirSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { parseSkillFrontmatter, scanSkillsDir, collectCommands, BUILTIN_COMMANDS, EXTENSION_COMMANDS } from '../src/main/skillscan.mjs';

test('parseSkillFrontmatter：name/description 提取', () => {
  const fm = parseSkillFrontmatter('---\nname: foo\ndescription: 做某事\nthinking: max\n---\n正文');
  assert.equal(fm.name, 'foo');
  assert.equal(fm.description, '做某事');
});

test('parseSkillFrontmatter：无 frontmatter → null', () => {
  assert.equal(parseSkillFrontmatter('# 标题\n正文'), null);
});

test('scanSkillsDir：目录型技能（SKILL.md）', () => {
  const d = mkdtempSync(join(tmpdir(), 'skill-'));
  try {
    mkdirSync(join(d, 'my-skill'));
    writeFileSync(join(d, 'my-skill', 'SKILL.md'), '---\nname: my-skill\ndescription: 我的技能\n---\n正文');
    const out = scanSkillsDir(d, '测试');
    assert.equal(out.length, 1);
    assert.equal(out[0].name, 'my-skill');
    assert.equal(out[0].description, '我的技能');
    assert.equal(out[0].kind, 'skill');
    assert.equal(out[0].source, '测试');
  } finally {
    rmSync(d, { recursive: true, force: true });
  }
});

test('scanSkillsDir：无 SKILL.md 的目录忽略', () => {
  const d = mkdtempSync(join(tmpdir(), 'skill-'));
  try {
    mkdirSync(join(d, 'no-md'));
    assert.equal(scanSkillsDir(d, '测试').length, 0);
  } finally {
    rmSync(d, { recursive: true, force: true });
  }
});

test('collectCommands：聚合 + 去重 + 内置/扩展命令', () => {
  const d = mkdtempSync(join(tmpdir(), 'skill-'));
  try {
    mkdirSync(join(d, 'dup-skill'));
    writeFileSync(join(d, 'dup-skill', 'SKILL.md'), '---\nname: dup-skill\ndescription: 用户版\n---\n');
    const out = collectCommands({
      userSkillsDir: d,
      sharedSkillsDir: d, // 同名技能 → 去重（用户优先）
      projectSkillsDirs: [join(d, 'nope')],
      packagesRoot: join(d, 'nope'),
      settingsSkillPaths: [],
    });
    const dup = out.filter((i) => i.name === 'dup-skill');
    assert.equal(dup.length, 1);
    assert.equal(dup[0].source, '用户');
    // 内置命令全量 + 扩展命令
    for (const c of BUILTIN_COMMANDS) assert.ok(out.some((i) => i.name === c.name && i.kind === 'command'));
    for (const c of EXTENSION_COMMANDS) assert.ok(out.some((i) => i.name === c.name && i.kind === 'command'));
  } finally {
    rmSync(d, { recursive: true, force: true });
  }
});

test('BUILTIN_COMMANDS 权威清单完整性（21 个）', () => {
  assert.equal(BUILTIN_COMMANDS.length, 21);
});
