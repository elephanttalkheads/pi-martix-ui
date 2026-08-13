# 会话培育仓 UI 接入交接文档

## 1. 交付目标

本轮交付两份独立 HTML Demo，用于验证会话培育仓的信息层级：

1. `session-pod-name-overlay-demo.html`
   - 会话名称始终固定在培育仓中部。
   - 当前会话使用亮色圆点和更高亮度的仓体。
   - 点击其他培育仓会切换当前态，用于确认长名称截断和三槽布局。

2. `session-pod-hologram-demo.html`
   - 常态只显示培育仓编号。
   - 鼠标悬停或键盘聚焦时，在培育仓上方投射会话名称和第一行摘要。
   - 全息层不接管点击，培育仓本体仍是唯一的会话切换命中区域。

正式界面建议把两种方案组合使用：常态保留中央名称，悬停／聚焦时再显示全息摘要。名称解决快速识别，全息层提供按需细节。

## 2. 交付文件与既有素材

### Demo

- `ui-demo/session-pod-name-overlay-demo.html`
- `ui-demo/session-pod-hologram-demo.html`
- `ui-demo/session-pod-ui-handoff.md`（本文）

### 正式素材

- `src/renderer/src/assets/session-pod-horizontal-closed.png`
- `src/renderer/src/assets/session-pod-horizontal-open.png`
- `src/renderer/src/assets/neo-avatar/neo-idle.png`
- `src/renderer/src/assets/neo-avatar/neo-talking.png`

两张横向培育仓素材均为 `1672×941` RGBA PNG，画布尺寸和底座基线一致。正式接入时必须把开／关两张图放在同一个绝对定位容器中，通过 `opacity` 切换；不要分别计算宽高，否则仓门切换会产生跳位。

### 暂不作为本次接入前置条件的素材

`src/renderer/src/assets/neural-cables/` 中的脑机线缆是独立覆盖层。它们当前不应被塞进每个培育仓卡片内部；线缆需要统一到 Sidebar 的真实纵向画布后，再作为 `.sidebar` 的绝对定位兄弟层接入。培育仓和信息 UI 可以先独立落地。

## 3. 当前正式代码基线

相关文件：

- `src/renderer/src/components/Sidebar.tsx`
- `src/renderer/src/styles.css`
- `src/renderer/src/title.ts`
- `src/shared/protocol.ts`

必须保留的现有行为：

- 会话列表来自 `useFeed((s) => s.sessions)`。
- 当前会话由 `currentSessionId` 判定。
- 标题统一通过 `titleFor(s)`／`deriveSessionTitle` 推导，禁止在新组件里重新实现另一套标题截断规则。
- 点击仍调用 `selectSession(s)`。
- Enter／Space 键仍可切换会话。
- 重命名、两段删除确认及 `switching` 并发锁不能删除。
- `.deck` 仍需固定展示三个槽位并保留滚动吸附。
- 现有滚轮代码用 `.scard` 查询卡片，若重构类名，必须同步修改选择器；最稳妥的做法是保留 `.scard` 作为行为类，再追加视觉类 `.session-pod`。

## 4. 推荐组件边界

新增：

```text
src/renderer/src/components/SessionPod.tsx
```

推荐职责：

- `Sidebar` 负责获取数据、滚动、切换、新建、重命名和删除。
- `SessionPod` 只负责一条会话的培育仓视觉、中央名称和触发全息预览。
- 全息投影面板只渲染一份，作为 `.sidebar` 的直接子层；不要每张卡各挂一份生产级浮层。

推荐属性：

```ts
type SessionPodProps = {
  session: SessionInfoLike;
  displayIndex: number;
  active: boolean;
  deleteArmed: boolean;
  switching: boolean;
  editing: boolean;
  title: string;
  summary: string;
  onSelect: () => void;
  onPreview: (anchor: HTMLElement) => void;
  onPreviewEnd: () => void;
  actions: React.ReactNode;
};
```

不要把 `SessionInfoLike` 复制成新的业务类型；从 `src/shared/protocol.ts` 做 type-only import。

## 5. 数据映射

### 会话名称

继续使用当前 `titleFor(s)`：

```ts
const title = titleFor(s);
```

这样可以保留既有优先级：`name` → `firstMessage` 智能摘要 → `会话 <短码>`。

### 全息摘要

全息面板只取 `firstMessage` 的第一条非空行，并提供真实空态：

```ts
function firstLineSummary(value?: string): string {
  const line = value
    ?.split(/\r?\n/)
    .map((part) => part.trim())
    .find(Boolean);
  return line || '尚无会话内容';
}
```

CSS 使用单行省略，不在 JS 中二次截断。这样侧栏拖宽时可自然显示更多文字。

### 状态映射

建议首版采用：

| 状态 | 仓体图片 | 中央名称 | 全息层 |
|---|---|---|---|
| 普通会话 | closed | 常驻、弱亮 | 隐藏 |
| hover / focus | closed | 常驻、提亮 | 显示名称＋摘要 |
| 当前会话 | closed | 常驻、亮绿圆点 | 默认隐藏，hover / focus 再显示 |
| 等待删除确认 | open | 常驻、危险确认态 | 按 hover / focus 规则显示 |
| switching | 保持原状态 | 降低交互反馈 | 不新增动画 |

仓门只表达“首次点击删除后、第二次确认前”的待删除确认态，不表达当前会话、预览或 Agent 的 READY / RUNNING / STREAMING / CANCELLING 状态。首次点击删除时开门；再次点击确认、2.5 秒超时或确认态被转移时立即关门。开／关图片必须共用尺寸和定位，不要单独拉伸 open 图片。

## 6. `SessionPod.tsx` 结构建议

外层继续使用现有 `div role="button"`，不要改成 `<button>` 后再把重命名／删除按钮嵌进去；嵌套 button 是无效交互结构。

```tsx
<div
  className={`scard session-pod${active ? ' active' : ''}${deleteArmed ? ' delete-armed' : ''}`}
  role="button"
  tabIndex={0}
  aria-current={active || undefined}
  aria-label={`${title}。${summary}`}
  onClick={onSelect}
  onPointerEnter={(event) => onPreview(event.currentTarget)}
  onPointerLeave={onPreviewEnd}
  onFocus={(event) => onPreview(event.currentTarget)}
  onBlur={(event) => {
    if (!event.currentTarget.contains(event.relatedTarget)) onPreviewEnd();
  }}
  onKeyDown={(event) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      onSelect();
    }
  }}
>
  <span className="pod-visual" aria-hidden="true">
    <img className="pod-frame pod-frame-closed" src={podClosed} alt="" />
    <img className="pod-frame pod-frame-open" src={podOpen} alt="" />
  </span>

  <span className="pod-nameplate">
    <span className="pod-index">{String(displayIndex).padStart(2, '0')}</span>
    <span className="pod-title">{title}</span>
    <span className="pod-state" aria-hidden="true">{active ? '●' : '○'}</span>
  </span>

  <span className="session-pod-actions" onClick={(event) => event.stopPropagation()}>
    {actions}
  </span>
</div>
```

图片必须由 Vite import：

```ts
import podClosed from '../assets/session-pod-horizontal-closed.png';
import podOpen from '../assets/session-pod-horizontal-open.png';
```

不要使用 `D:\...` 绝对路径，也不要把图片转换为 Base64 写进组件。

## 7. 全息层的生产级定位

Demo 为了便于独立预览，把全息层放在每个培育仓内部。正式 Sidebar 有内部滚动容器 `.deck`，第一槽上方的内容可能被 `overflow-y: auto` 裁切。因此生产代码应使用一份共享全息层，渲染为 `.sidebar` 的直接子元素。

### 状态

```ts
type SessionPreview = {
  id: string;
  title: string;
  summary: string;
  top: number;
  left: number;
  width: number;
};

const sidebarRef = useRef<HTMLElement | null>(null);
const [preview, setPreview] = useState<SessionPreview | null>(null);
```

### 定位

在 `onPreview` 中读取培育仓与 Sidebar 的矩形：

```ts
const showPreview = (s: SessionInfoLike, anchor: HTMLElement) => {
  const sidebar = sidebarRef.current;
  if (!sidebar) return;

  const sideRect = sidebar.getBoundingClientRect();
  const podRect = anchor.getBoundingClientRect();
  const panelHeight = 70;
  const gap = 8;
  const inset = 14;

  setPreview({
    id: s.id,
    title: titleFor(s),
    summary: firstLineSummary(s.firstMessage),
    top: Math.max(8, podRect.top - sideRect.top - panelHeight - gap),
    left: inset,
    width: sideRect.width - inset * 2,
  });
};
```

共享面板：

```tsx
{preview && (
  <div
    className="session-hologram-layer"
    data-session-id={preview.id}
    style={{ top: preview.top, left: preview.left, width: preview.width }}
    aria-live="polite"
  >
    <strong>{preview.title}</strong>
    <span>{preview.summary}</span>
  </div>
)}
```

`.sidebar` 已经 `overflow: hidden`，但只要上述 `top` 被限制在 Sidebar 内，全息层不会被裁切。浮层必须 `pointer-events: none`，否则鼠标从仓体移动到浮层时会造成 hover 抖动或阻断会话点击。

当 `.deck` 开始滚动时建议立即 `setPreview(null)`；不要在滚动过程中每帧测量位置。滚动停止后，下一次 hover/focus 会重新定位。

## 8. CSS 迁移要点

不要整段复制 Demo CSS。只迁移以下模块，并改用 `styles.css` 已有令牌：

- `.session-pod`
- `.pod-visual`
- `.pod-frame`
- `.pod-nameplate`
- `.pod-index`
- `.pod-title`
- `.pod-state`
- `.session-hologram-layer`

关键约束：

```css
.sidebar { position: relative; }

.session-pod {
  position: relative;
  min-height: 0;
  overflow: hidden;
  background: transparent;
}

.pod-visual {
  position: absolute;
  inset: 0;
  overflow: hidden;
  pointer-events: none;
}

.pod-frame {
  position: absolute;
  left: 50%;
  top: 50%;
  width: 108%;
  height: auto;
  transform: translate(-50%, -50%);
  image-rendering: pixelated;
}

.pod-frame-open { opacity: 0; }
.session-pod.delete-armed .pod-frame-open { opacity: 1; }

.session-pod.delete-armed .pod-frame-closed { opacity: 0; }

.session-hologram-layer {
  position: absolute;
  z-index: 30;
  pointer-events: none;
}
```

`session-pod-horizontal-open.png` 的透明主体更高；三槽高度不足时可能靠近相邻仓体。应优先调 `.pod-frame` 的共同 `width`，不要给 open 单独设置 width。

中央名称推荐单行省略：

```css
.pod-title {
  min-width: 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
```

全息层的进入动画只改变 `opacity` 和 `transform`，不要动画 `top/left/width`，避免布局抖动。`prefers-reduced-motion: reduce` 下停用闪烁和伸展动画，直接显示最终状态。

## 9. 在 `Sidebar.tsx` 中的改动顺序

1. 导入 `SessionPod`。
2. 给 `<aside className="sidebar">` 增加 `ref={sidebarRef}`。
3. 新增 `preview` 状态、`showPreview` 和 `hidePreview`。
4. 保留 `.deck`、`deckRef`、滚轮 effect 和三槽 grid。
5. 将 `sessions.map` 内部视觉 DOM 替换为 `<SessionPod>`。
6. 将现有重命名 input、删除／重命名按钮作为 `actions` 传入；事件必须继续 `stopPropagation()`。
7. 在 `.side-section.sessions` 之后渲染唯一的 `.session-hologram-layer`。
8. `.deck` 的 `scroll` 监听中关闭 preview；cleanup 时移除监听。
9. 不修改 `selectSession`、`newSession`、`commitRename` 和 `doDelete` 的 IPC 流程。

## 10. 三槽滚动与编号

当前 `.deck` 用三个等高 `grid-auto-rows` 和 `scroll-snap-type: y mandatory`。培育仓接入后继续让每个 `.scard.session-pod` 占一个完整网格行。

`displayIndex` 推荐使用列表全局序号 `index + 1`，用于视觉识别；不要把它当作脑机线缆的槽位编号。线缆槽位应基于当前可视窗口的起始索引另行计算，否则滚动到第 4–6 个会话时会错误连接。

## 11. 可访问性与输入方式

- hover 展示的内容必须在 `:focus-visible`／focus 时同样可见。
- 外层已有 `role="button"` 和 `tabIndex={0}`，继续支持 Enter／Space。
- 使用 `aria-current={active || undefined}` 表达当前会话。
- 培育仓图片是装饰层，应使用空 `alt` 与 `aria-hidden="true"`；会话名称和摘要由交互容器的 `aria-label` 或 `aria-describedby` 提供。
- 全息层不应抢焦点，也不放功能按钮。
- 删除和重命名按钮继续保留明确 `aria-label`。
- 所有真实按钮保持至少 44px 命中区；如果视觉图标较小，用透明 padding 扩大命中范围。

## 12. 验证清单

### 静态布局

- [ ] 三个培育仓在可视区内等高、等距且没有裁切。
- [ ] 侧栏从 160px 拖到 480px 时，名称都能正确省略或展开。
- [ ] 开／关帧切换时底座不跳动。
- [ ] 仓门只在删除待确认的 2.5 秒窗口内开启，确认、超时或确认态转移后立即关闭。
- [ ] 中央名称位于舱体中部，不覆盖仓体端口。
- [ ] 第一槽全息层不会被 `.deck` 顶部裁掉。
- [ ] 第三槽全息层不会盖住文件树标题或滚动条。

### 交互

- [ ] 鼠标 hover 显示名称和第一行摘要，离开即隐藏。
- [ ] Tab 聚焦显示同样内容，Shift+Tab 离开后隐藏。
- [ ] 点击培育仓仍切换会话且 `switching` 锁有效。
- [ ] 重命名 Enter／blur 提交、Esc 取消。
- [ ] 删除仍为两段确认，按钮点击不会触发会话切换。
- [ ] 滚动时全息层立即隐藏，滚动结束没有残影。

### 回归

```powershell
npm run typecheck
npm run build:renderer
npm run smoke
```

当前 Electron 已运行时，`npm run smoke` 可能因单实例锁无法启动第二个实例。这种情况下不要结束用户正在使用的窗口；先确认 typecheck 和 renderer build，通过现有开发窗口做一次手动 hover／focus／切换验证。

## 13. 明确不做

- 不把 Demo 的演示文案写死进正式组件。
- 不改变 `SessionInfoLike` 或 IPC 契约。
- 不新增第五种 Agent 状态。
- 不让全息动画进入 store 或 FX 状态机。
- 不在每次鼠标移动事件中写 React state；只在进入／离开槽位时更新 preview。
- 不在本次培育仓接入中同时解决脑机线缆定位，避免把两个坐标系统混在同一变更里。

## 14. 推荐落地顺序

1. 先仅替换视觉为培育仓＋中央名称，验证三槽高度和滚动。
2. 再接入共享全息浮层，验证第一／第三槽边界。
3. 再恢复重命名和删除操作的视觉入口。
4. 通过 typecheck、build 和实际 Electron hover/focus 测试。
5. 最后单独处理脑机线缆坐标归一化与连接状态切换。

这样能把“会话列表数据行为”“培育仓视觉”“全息浮层定位”“脑机线缆覆盖”拆成四个可独立验证的层，出现问题时可以快速定位，而不需要回退整个 Sidebar。
