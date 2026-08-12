// main 进程构建管线：typecheck 门禁 + 产物布局（dist-main/main + dist-main/preload）
// 源码即产物（JS+JSDoc 无转译需求）；复制保持 main/preload 相对关系，
// 使 main.mjs 内的 __dirname 路径引用（../preload/preload.cjs、../../dist-renderer）零改动生效。
// 未来迁移 TS 源码时：本步骤替换为 tsc emit（保持 dist-main 布局不变）。
// 用法：node scripts/build-main.mjs
import { execFileSync } from 'node:child_process';
import { cpSync, mkdirSync, rmSync, renameSync, readdirSync, statSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const SRC_MAIN = join(ROOT, 'src', 'main');
const SRC_PRELOAD = join(ROOT, 'src', 'preload');
const OUT = join(ROOT, 'dist-main');
const OUT_MAIN = join(OUT, 'main');
const OUT_PRELOAD = join(OUT, 'preload');

// 1) 门禁：node 侧类型检查必须通过才产出
execFileSync(process.execPath, ['node_modules/typescript/bin/tsc', '--noEmit', '-p', 'tsconfig.node.json'], {
  cwd: ROOT,
  stdio: 'inherit',
});

// 2) 复制 JS 产物（*.mjs / *.cjs），跳过非 JS 与隐藏文件
const collect = (dir) =>
  readdirSync(dir).filter((f) => /\.(mjs|cjs)$/.test(f) && !f.startsWith('.')).map((f) => join(dir, f));

// 原子切换：写 tmp → rename 覆盖
const TMP = OUT + '.tmp';
rmSync(TMP, { recursive: true, force: true });
mkdirSync(join(TMP, 'main'), { recursive: true });
mkdirSync(join(TMP, 'preload'), { recursive: true });
for (const f of collect(SRC_MAIN)) cpSync(f, join(TMP, 'main', f.split(/[\\/]/).pop()));
for (const f of collect(SRC_PRELOAD)) cpSync(f, join(TMP, 'preload', f.split(/[\\/]/).pop()));
rmSync(OUT, { recursive: true, force: true });
renameSync(TMP, OUT);

console.log(`[build:main] ok → ${OUT}`);
for (const f of [...collect(OUT_MAIN), ...collect(OUT_PRELOAD)]) {
  console.log(`  ${f.replace(ROOT + '/', '')} (${statSync(f).size} B)`);
}
