# AGENTS.md — ZION（pi-martix-ui）【已废弃，仅作 UI 迁移参考】

⚠️ **本项目已停止开发。** 唯一剩余任务：把黑客帝国风 UI 迁移到 **deepseek-zion**（https://github.com/elephanttalkheads/deepseek-zion）；迁移完成后本仓废弃。**不要**在本仓做新功能开发。

## 常用命令

```bash
npm run dev            # vite dev server + electron（开发）
npm run build:renderer # 构建 renderer → dist-renderer/
npm run typecheck     # tsc --noEmit 双配置（renderer + main/preload checkJs）
npm run smoke         # 构建 + 启动 electron 冒烟（CDP 查桥注入/渲染/ipc ping）
npm run e2e           # 构建 + 真实 prompt E2E（deepseek → 事件流 → feed，~12s）
npm run dist           # 打包 NSIS + portable → dist/
```

迁移验证常用脚本（不在 package.json，直接 node 跑）：

```bash
node scripts/e2e-visual.mjs       # CDP 截图看真实视觉效果
node scripts/verify-restore.mjs   # 会话历史全量恢复验证（切换/重启后工具卡+diff 卡进 DOM）
```

会话工作目录（agent 实际操作的目录）：`D:\zion-test`（项目选择 UI：侧栏「⇄ 切换项目」/ 启动无最近项目自动打开面板）。

## 跑通命令的两个环境坑

1. **npm 11 allow-scripts** 默认拦截安装脚本 → electron 二进制不下载。首次 `npm install` 后需 `npm approve-scripts electron`；失败则从 `https://npmmirror.com/mirrors/electron/<版本>/` 手动下载 zip 解压到 `node_modules/electron/dist/` 并写 `path.txt`（内容 `electron.exe`）
2. **vite 8 只绑 IPv6** → `vite.config.mjs` 必须 `server.host: '127.0.0.1'`，否则 `wait-on tcp:127.0.0.1:5173` 卡死、electron 不启动

## UI 迁移地图

视觉与术语事实源：

- `DESIGN.md`（根）—— **视觉宪章/单一事实源**：设计令牌、语义绿、叙事字形、状态→动效映射；任何界面/动效/声音/品牌素材任务先读
- `CONTEXT.md`（根）—— UI 词汇表：凝结雨轨 / 脑波褶 / 机械继电器 / 烧录显影 / 封存带 / 字形蛾光标 / 注入解码等术语定义
- `research/matrix-style-references.md` —— 黑客帝国风格参考调研（数字雨/电影 UI/CRT 还原）

实现（全部 UI 代码在 `src/renderer/`，React 18 + zustand + vite 8 + TypeScript strict）：

- `src/renderer/src/styles.css` —— **样式令牌与全部组件样式集中此文件**；顶部三个本地 `@font-face`（Share Tech Mono 拉丁 / Sarasa Term SC GB2312 子集 CJK / Matrix Code 电影雨字形）
- `src/renderer/DESIGN.md` + `src/renderer/AGENTS.md`（21 条硬约束）—— 渲染层架构、设计决策与实现纪律的事实源
- 组件（`src/renderer/src/components/`）：`RainCanvas`（数字雨）/ `SignalCanvas`（蠕虫写入）/ `NeoAvatar` / `Sidebar` / `SessionPod`（会话培育仓）/ `NeuralCableLayer`（会话脑机链路）/ `Feed`（回合化消息流：脑波褶思考块 + 机械继电器工具卡 + 封存带结算行 + 字形蛾光标）/ `TurnRail`（凝结雨轨）/ `DiffCard`（烧录显影 + 校验环）/ `InputBar`（微簇状态条 + 输入行）/ `SoundFx`（WebAudio 音效）
- `src/renderer/src/assets/` —— UI 素材：`fonts/`（三个字体的生产用文件）、`neo-avatar/`、`neural-cable-system/`、session-pod 四帧 PNG；`src/renderer/src/matrixGlyphs.ts` = Matrix 假名字符集单一事实源
- `docs/neural-cable-visual.md` —— 会话脑机链路视觉实现参考（程序化 SVG，不依赖连接态 PNG 素材）

原型与设计稿（`ui-demo/`）：

- `index-v4.html` / `index-v5.html` —— 历史视觉实现与「信号凝结」原型
- `react/agent-ui-design-spec.md` —— v4 纯文本复刻规格（供无多模态模型按文字复刻，含令牌/算法/mock 替换点）
- `agent-reply-ui-handoff.md` —— agent 回复 UI 各块交接（代码位置/样式值/行为时序/自检清单）
- `plan/ui-proto-variants.md` —— 七块 21 变体选型归档（含采用/退役状态）
- `plan/icon-set-plan.md` —— 细线 SVG 图标套件待实现清单（P0/P1/P2）
- `font/`（Matrix-Code.ttf / SarasaTermSC-Regular.ttf 源文件）、`废案/`（归档素材）
