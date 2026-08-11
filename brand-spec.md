# Brand Spec — Matrix Agent UI

来源：`C:\Users\zyf\Desktop\crxjs-project\demos\zed-themes\matrix-digital-rain.html`（已提取真实值）

## 色板（OKLch）

| Token | 原始值 | OKLch | 用途 |
|---|---|---|---|
| `--bg` | `#000000` | `oklch(0% 0 0)` | 纯黑基底 |
| `--surface` | `rgba(0,8,2,0.88)` | `oklch(10% 0.03 152 / 0.88)` | 半透明面板 |
| `--fg` | `#00ff41` | `oklch(86% 0.32 145)` | 主文字/主强调（磷光绿） |
| `--muted` | `#00b32d` | `oklch(63% 0.22 145)` | 次级文字 |
| `--dim` | `#00591a` | `oklch(38% 0.11 145)` | 弱化文字/行号 |
| `--bright` | `#c8ffd4` | `oklch(94% 0.09 145)` | 高光头部/激活态 |
| `--border` | `rgba(0,255,65,0.22)` | `oklch(86% 0.32 145 / 0.22)` | 发线边框 |
| `--danger` | `#ff4444` | `oklch(63% 0.24 28)` | 错误/关闭 |

## 字体

- Display / Body / Mono 同族（tech/utility 特例）：`"Share Tech Mono", ui-monospace, "Courier New", monospace`
- 标题大写 + `letter-spacing: 0.15em–0.2em`

## 布局姿态规则

1. 边框永远是 1px 半透明绿发线，无圆角（0–2px），无阴影——发光（`text-shadow`/`box-shadow` 绿色辉光）代替阴影。
2. 数字雨 canvas 只作背景氛围，面板用半透明黑压在上面，雨永远不能让正文不可读。
3. 扫描线叠加层（repeating-linear-gradient）+ 偶尔的微闪，制造 CRT 质感但不干扰交互。
4. 每屏最多两处亮绿高光（`--bright`），其余用 `--fg` / `--muted` 分层。
5. 状态用符号而非色块：`●` 连接、`[OK]` 成功、`[ERR]` 失败。
