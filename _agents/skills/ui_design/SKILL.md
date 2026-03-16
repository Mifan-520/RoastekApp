---
name: UI Design Guidelines (用户的 UI 设计习惯)
description: The user's specific UI design preferences and habits cultivated in this project.
---

# UI 设计规范与习惯 (UI Design Guidelines)

在为该项目开发新的页面或重构界面时，必须严格遵守以下 UI 视觉与交互习惯：

## 1. 颜色主题 (Color Palette)
- **主色调 (Primary Color)**: 以深酒红色/玫瑰红为主 (如 `bg-[#5D1B22]`, `bg-rose-950`, `bg-rose-900`, `rose-800`)。
- **告警与警告 (Alarms & Errors)**: 统一使用红色系，避免黄色或蓝色。涉及告警的背景使用 `bg-red-50` 或 `bg-rose-50`，边框使用 `border-red-100`，图标使用 `text-red-500` / `rose-500`。
- **背景与留白 (Background)**: 页面整体背景通常使用清爽的冷灰色 `bg-slate-50`。
- **在线状态 (Online Status)**: 在线状态统一使用翡翠绿（Emerald 系列，如 `bg-emerald-500`, `text-emerald-400`）。离线使用中性灰（Slate 系列，如 `bg-slate-300`, `text-slate-400`）。

## 2. 形状与边框 (Shapes & Borders)
- **极度圆润 (Highly Rounded)**: 卡片和弹窗重度依赖大圆角，如 `rounded-2xl`, `rounded-3xl`。按钮和图标包装极其偏好 `rounded-full`。
- **柔和阴影 (Soft Shadows)**: 使用带有品牌色调的超柔和阴影，如 `shadow-lg shadow-rose-950/5`。
- **卡片边框 (Card Borders)**: 白底卡片统一带有轻微的边框，如 `border border-slate-100`。

## 3. 排版与文本 (Typography)
- **字体加粗 (Bold Emphases)**: 标题、关键数据、甚至是普通信息列表的主体内容，都喜欢使用 `font-bold`。
- **辅助文本 (Secondary Text)**: 辅助与说明性文字倾向于使用特别小的信息层级，如 `text-xs` 或 `text-[10px]`，并配合 `font-medium` 以保证可读性，颜色多为 `text-slate-400` 或 `text-slate-500`。
- **信息分行 (Information Hierarchy)**: 复杂的组合字段尽量拆分开，变成单独占一行的独立信息，避免用圆点 `·` 将信息拥挤在同一行（例如将设备类型和设备位置分为两行显示）。
- **时间格式 (Time Formats)**: 绝对禁止使用相对时间（如“10分钟前”、“几小时前”），一律替换为绝对的精确时间。日期与时间格式统一为精简版的 `MM-DD HH:mm`（如 `03-12 15:10`），不带年份。

## 4. 视觉与交互质感 (Visuals & Interactions)
- **悬停缩放与变色 (Hover States & Scaling)**:
  - 卡片 hover 时喜欢图标有放大效果：`group-hover:scale-110`, 具有 `transition-transform`。
  - 卡片点击时有按下效果：`active:scale-[0.98]`。
- **毛玻璃悬浮效果 (Glassmorphism)**: 顶部 Header（例如设备列表和设备详情页）使用带模糊的半透明吸顶：`bg-white/80 backdrop-blur-md sticky top-0 z-30`，以及去除底部圆角以防止滚动时穿模。
- **背景肌理 (Background Textures)**: 重度设计感的头部区域喜欢加入带有极低透明度 (`opacity-[0.05]`), 混合模式 (`mix-blend-overlay`) 的纹理背景图。

## 5. 组件布局偏好 (Component Layouts)
- **清晰的列表视图 (List views over complex charts)**: 倾向于将复杂的数据表现形式（如上下线的各种状态折线图、波形图）简化为**纵向滚动的干净时间流列表**，重点呈现具体几点发生了什么。
- **列表高度管控**：对于可能变长的数据列表（如设备上下线记录、报警记录），习惯加上最大高度管控和内部自定义滚动条（`max-h-[180px] overflow-y-auto custom-scrollbar`）。

## 开发准则 (Development Rules)
每次写 JSX 时，请反查上面这些习惯，确保新的 UI 一次性达到用户的极简且高级、带有统一酒红色品牌感的设计标准！
