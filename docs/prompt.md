我想参考 D:\martix素材\martix.gif （martix 中培育人类的 培育仓） 为文档 agnet 的会话区 设计一个 和 D:\martix素材\martix.gif 图中培育仓颜色一样的 像素风培育仓素材，替代现在的 卡片式会话卡（.side-section.sessions），本轮只生成带 Alpha 通道的透明 PNG 像素风 培育仓 素材，不修改任src\renderer\src\components\Sidebar.tsx的何代码，需要 两张 一张为仓门关闭的培育仓，另一张为仓门打开的培育仓 ，生成的素材放在  src\renderer\src\assets 下


在生成一个用于连接 D:\pi-martix-ui\src\renderer\src\assets\neo-avatar\neo-idle.png ，D:\pi-martix-ui\src\renderer\src\assets\neo-avatar\neo-talking.png和D:\pi-martix-ui\src\renderer\src\assets\session-pod-horizontal-closed.png ，D:\pi-martix-ui\src\renderer\src\assets\session-pod-horizontal-open.png 的脑机接口连接线（用于连接neo头像和培育仓），参考martix中人类与母体的连接线的设定，生成 Alpha 通道的透明 PNG 像素风 素材，我的初步设想是，后续D:\pi-martix-ui\src\renderer\src\components\Sidebar.tsx中的会话区，默认同时只展示三个 会话（培育仓），且每次滚动的距离都固定，所以你只需要生成6个脑机接口连接线，分别是从neo的后脑部分，连接 到 会话区第一个，第二个，第三个 会话（培育仓）的连接线（用于鼠标点击会话切换到该会话时的连接状态） ，和只连接neo的后脑部分，另一端和三个培育仓保留一段距离的，未连接状态的连接线 （用于鼠标移动时切换）




─────────────────────────────────────────────────────────────────────────────────────────────────────────────────╮
 │ > 我想重新设计侧边会话栏，将侧边栏的会话区的尺寸修改为更贴近正式使用场景的会话区尺寸                               │
 │   （D:\pi-martix-ui-dev\docs\matrix-drive-vault-sidebar-measurements.md），，并添加同时显示多个会话+工作区的功能   │
 │   （如  D:\pi-martix-ui-dev\ui-demo\matrix-drive-vault-sidebar.html所示，为了适配会话区设定，修改为了机柜顶+机柜   │
 │   体+会话硬盘的设定 ）但 始终无法实现满意的视觉效果 ，（现有的                                                     │
 │   D:\pi-martix-ui-dev\src\renderer\src\components\Sidebar.tsx 修改为同时显示多个会话+工作区的功能有难度过大） ，   │
 │   你可以帮我收集一些设计灵感吗 （不限于黑客帝国，可参考攻壳机动队，lain，赛博朋克，铳梦等各种 科幻作品），可以将   │
 │   侧边会话栏 既能满足贴近正式使用场景的会话区尺寸 ，有能有极具科幻风格的视觉效果（）                               │
 ╰─────────────────────────────────────────────────────────────────────────────────────
