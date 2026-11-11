# dsh-session-view 样式规约

本文件是该插件 UI 的唯一设计基线。新增或修改界面时，先对照本规约；确需例外时，在本文件「例外清单」登记原因，不要临时写特例值。

- 适用范围：左侧会话视图、会话管理主面板、工作区筛选页、会话/工作区分组管理页、系统设置中的「会话视图」页、右键菜单与各类弹窗。
- 实现位置：样式集中在 `src/client/styles.js`（`STYLES` 模板字符串）；文案键集中在 `src/client/locales.js`（zh/en 必须同时补齐）。
- 基线版本：0.12.19。

## 1. 设计原则

1. **对齐原版工作区**：侧栏行、区块头、右键菜单尽量贴近 `@deepseek-ai/dsh-client-ui-workspace` 的观感与尺寸。
2. **少档位**：字号、圆角、间距都使用有限档位，不新增近似值。
3. **幽灵操作区**：默认无边框、无底色；hover 才出现浅背景；只有主操作使用实色。
4. **状态靠语义 token**：颜色一律引用 `--dsw-alias-*`，禁止写死品牌色（发光边框的渐变色是唯一例外）。
5. **密度优先**：信息行以 32px 为基准，能一行表达就不堆两行。

## 2. 字体层级

四档字号，不引入 12/15/16px 等中间值。

| 档位 | 字号/行高 | 用途 |
| --- | --- | --- |
| 大标题 | 20px | 主面板页面标题 `.dsv-title`（唯一 20px） |
| 标题 | 14px / 20px | 会话行标题、区块标题、分组卡片名、工作区名、对话框标题、`dsv-sideSectionHead` |
| 正文 | 13px / 20px | 正文、按钮、菜单项、设置项标签、表单控件、会话分组行 |
| 次要 | 11px / 16px | 说明文字、计数、路径、小按钮、成员所属工作区、下拉框 |
| 辅助 | 10px / 16px | 时间、状态徽标、卡片元信息、底部提示 |

规则：

- 字重只用 `400` 常规与 `600` 标题，不使用 `500/700`。
- 颜色按语义：主要 `--dsw-alias-label-primary`，次要 `--dsw-alias-label-secondary`，辅助/说明 `--dsw-alias-label-tertiary`。
- 行内时间与状态徽标不得小于 10px；紧凑模式下行高 26px、时间降为 10px。

## 3. 操作区尺寸

| 控件 | 高度 | 内边距 | 圆角 | 字号 | 类 |
| --- | --- | --- | --- | --- | --- |
| 文本按钮 | 32px | 0 12px | 8px | 13px | `.dsv-btn` |
| 小文本按钮 | 28px | 0 9px | 7px | 11px | `.dsv-btn.dsv-btnSm` |
| 图标按钮 | 28×28 | 0 | 8px | — | `.dsv-iconBtn` / `.dsv-sideIconBtn` |
| 会话行内按钮 | 24×24 | 0 | 6px | — | `.dsv-sideRowActions .dsv-sideIconBtn`（例外，见 §9） |
| 菜单项 | 28px | 0 10px | 12px | 13px | `.dsv-menu button` |
| 二级菜单项 | 24px | 0 8px 0 20px | 12px | 11px | `.dsv-menu button.dsv-menuChoiceSub` |
| 标签页 | 34px | 0 11px | 0（下边框 2px） | 13px | `.dsv-tab` |
| 下拉框/输入框 | 28–30px | — | 8px | 11–13px | `.dsv-select` / `.dsv-input` |
| 开关 | 34×20（滑块 16） | — | 999px | — | `.dsv-switch` |

按钮状态：

- 默认（幽灵）：`background: transparent`、`border: 1px solid transparent`、文字 `label-secondary`。
- hover：`background: var(--dsw-alias-interactive-bg-hover)`，文字 `label-primary`。
- 选中 / `aria-pressed="true"`：浅背景 + `label-primary`。
- 主操作 `data-tone="primary"`：`background: var(--dsw-alias-state-business-primary)`、白字；hover 混入 14% 黑。
- 危险 `data-tone="danger"`：红字；hover 为红色 12% 浅底。
- 焦点：`box-shadow: 0 0 0 2px var(--dsw-alias-focus-ring-color)`，不使用默认 outline。
- 禁用：`opacity: .5`，`cursor: default`。

## 4. 间距与圆角

- 间距档位：2 / 4 / 6 / 8 / 10 / 12 / 16 / 20 / 24 / 32 / 48（px）。
- 圆角档位：6 / 7 / 8 / 10 / 12 / 14 / 16 / 999。
  - 行与列表项：8
  - 小按钮：7；卡片/面板：10–12；菜单：12（外层 16）；弹窗：14；开关/胶囊：999
- 区块之间 12–18px；同一列表内行间距 2px；图标与文字 6–8px。

## 5. 布局骨架

- 主面板内容：`.dsv-content` `max-width: 960px`，左右 `clamp(24px, 4vw, 48px)`，底部 48px。
- 滚动：`.dsv-page` 撑满并 `overflow: hidden`，内容放在 `.dsv-scroll`（内部滚动，页面不整页滚动）。
- 左侧侧栏：行高 32px，区块头 36px，工作区头 34px，行内缩进 `--dsv-indent` 每级 12px；隐藏阈值 <150px。
- 弹窗：默认 `min(420px, 100%)`；分组管理使用 `.dsv-dialogWide` `min(760px, 96vw)`、`max-height: 88vh`，列表区 `max-height: 52vh`。
- 分组管理页：`.dsv-groupsPage` `max-width: 980px`，标题 14px、说明 11px；会话/工作区分组行 `min-height: 32px`。
- 设置页行：默认 `min-height: 54px; padding: 9px 16px`；无辅助说明时加 `.dsv-settingRow--plain` → `36px / 6px 16px`。

## 6. 状态色与语义

| 语义 | token | 用途 |
| --- | --- | --- |
| 运行中 | `--dsw-alias-state-business-primary` | 运行点、主操作、选中图标、拖拽投放高亮 |
| 待处理 | `--dsw-alias-state-warn-primary` | 待批准/待回答点与文字、待处理分组标记 |
| 已完成未读 | `--dsw-alias-state-success-primary` | 完成未读点 |
| 空闲 | `--dsw-alias-state-idle-primary` | 空闲点 |
| 错误/危险 | `--dsw-alias-state-error-primary` | 删除、清理、错误提示 |

- 分组状态优先级：`待处理 > 运行中（含运行中的子会话）> 已完成未读 > 无标记`。
- 动态发光边框：`prefs.glowRunning / glowPending / glowDone`，效果枚举 `off / marquee / aurora / pulse / rainbow / comet / scan / dash`；`prefers-reduced-motion` 下必须停止动画。

## 7. 组件清单

| 组件 | 关键类 | 规格要点 |
| --- | --- | --- |
| 会话行 | `.dsv-sideRow` | 32px、圆角 8、左侧 16×20 状态位、标题 14、时间 10、hover 显示操作 |
| 侧栏区块头 | `.dsv-sideGroupHead.dsv-sideSectionHead` | 36px、14/20、计数 11、图标 12 |
| 工作区头 | `.dsv-sideGroupHead` | 34px、14、可拖拽时 `cursor: grab` |
| 主面板标签页 | `.dsv-tab` | 34px、选中下边框 2px 业务色、计数 11 |
| 分组块 | `.dsv-groupBlock` | 圆角 12、头 42px、名 14、计数 11、会话行 32px |
| 设置分组卡 | `.dsv-settingsGroup` | 圆角 10–12、组标题 14、说明 11 |
| 右键菜单 | `.dsv-menu` | 圆角 16、内边距 4、项 28/13、二级项 24/11、分隔线 `display:block; height:1px` |
| 开关行 | `.dsv-settingRow--toggle` | 整行可点、开关 34×20 |
| 发光层 | `.dsv-sideGlow` | `mask-composite: exclude` 的 1.5px 环，不占布局 |

## 8. 文案与国际化

- 所有可见文案走 `t('key')`；新增键必须同时写入 `locales.js` 的 `zh` 与 `en`，由 `test/locales.test.mjs` 强制校验。
- 术语统一：会话 / 已归档 / 回收站 / 会话分组 / 工作区分组 / 工作区筛选。
- 计数使用 `counts.*` 键并带 `{n}`；相对时间使用 `time.*`。

## 9. 例外清单

| 例外 | 值 | 原因 |
| --- | --- | --- |
| 主面板页面标题 | 20px | 页面级标题需要与内容拉开层级 |
| 会话行内操作按钮 | 24×24 | 32px 行高内放 28px 会挤压标题 |
| 发光边框渐变色 | 硬编码 `#7dd3fc` 等 | 渐变需要超出语义 token 的色彩范围 |
| `dsv-sideTextBtn` | 保留 | 仅用于侧栏“更多/清除”等内联文字操作，不用于分组管理按钮 |

## 10. 维护检查清单

1. 新增样式值是否落在 §2/§3/§4 的档位内？否则先登记例外。
2. 新按钮是否复用了 `.dsv-btn` / `.dsv-btnSm` / `.dsv-iconBtn`，而不是新的按钮类？
3. 颜色是否全部使用 `--dsw-alias-*`？
4. zh/en 文案键是否同时补齐？
5. `npm test` 是否 59/59 通过（含 locales 覆盖与 SSR 渲染断言）？
6. 改完在浏览器强刷验证：设置页、右键菜单、分组管理页、窄侧栏与紧凑模式。

## 11. 变更记录

| 版本 | 变更 |
| --- | --- |
| 0.12.16 | 确立四档字号、操作区尺寸与幽灵按钮三条规则 |
| 0.12.17 | 工作区分组管理页字号与行高纳入规约 |
| 0.12.18 | 分组卡片操作按钮改为统一小型文本按钮，删除用危险样式 |
| 0.12.19 | 会话分组管理页同步统一；本规约文件建立 |
