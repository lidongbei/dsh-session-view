# dsh-session-view

DSH Web 的**会话视图**插件：默认接管左侧工作区块，以会话为主行展示置顶 / 活跃 / 最近 / 已完成未读会话，可一键切回原生工作区；主窗口提供完整的会话管理页，偏好设置并入系统「设置」。

版本 0.7.0。

## 功能

### 左侧会话视图（接管模式）

- 不再占用顶部面板菜单：由 footer action 的零尺寸锚点挂载，通过 React Portal 把会话视图插到侧栏 panel nav 之后；默认隐藏原生工作区列表，但**不卸载**它，切回时状态完整保留。侧栏底部不再显示模式切换按钮，入口统一在系统「设置 → 会话视图」。
- **兼容 dsh-ssh**：原生 `.regionArea` 顶部的「远端」SSH 面板保持显示。会话模式下只隐藏原生工作区列表，SSH 面板固定在会话视图上方；切回原生后仍位于工作区列表上方。
- 顶部工具栏：搜索、新建会话、添加工作区、**会话管理**；切换原版工作区统一在系统「设置 → 会话视图」。
- **活跃会话**分组：显示运行中 / 待处理 / **完成未读** / 有运行中子会话的顶层会话；会话完成后只要还没有打开查看（completionUnread）就继续留在活跃区，打开后才移出；按 `settings.activeLimit` 限制条数，支持「更多 / 收起」，分组可折叠。
- **置顶**分组：置顶会话排在最前，置顶/取消置顶通过行菜单或右键菜单完成，行尾不再显示图钉图标；分组可折叠。
- **最近会话**分组：按更新时间显示最近的会话（包含活跃、置顶会话），按 `settings.recentLimit` 限制条数，支持「更多 / 收起」，分组可折叠。
- **新建会话草稿**：点击「新会话」后立即关闭看板；只要草稿仍由主视图保留，就以「新会话」为标题同时出现在最近、活跃和所属工作区分组中，创建完成后转为正式标题。
- 活跃 / 置顶 / 最近三个分组都只是快捷入口；同一个会话**仍然保留在所属工作区分组中**。
- 四个分组可分别在系统设置里关闭：`显示活跃会话分组` / `显示置顶会话分组` / `显示最近会话分组` / `显示工作区会话分组`。
- **工作区分组**：放在「工作区会话」分区下，按工作区路径树形嵌套（取最长前缀父目录），每个工作区按 `settings.workspaceLimit` 限制条数；空工作区始终显示其标题，不再渲染「暂无会话」占位行；「工作区会话」分区可折叠。
- **搜索**：本地标题/路径匹配 + 250ms 防抖调用 `sessions.search` 做 Host 内容搜索，本地与内容命中合计最多 20 条，显示命中片段；支持清空与 `Ctrl+K` 聚焦。
- **排序与过滤**：最近更新 / 手动排序、归档过滤（隐藏 / 显示 / 仅归档）、显示/隐藏空闲会话、工作区树形嵌套。
- **每工作区水位**：默认显示 5 条；如果前 50 条里存在运行中 / 待处理 / 完成未读 / 有运行中子会话的会话，自动展开到最后一条活跃会话；「展开更多」每次 +5 条，「收起」回到水位。
- **折叠持久化**：活跃 / 置顶 / 最近 / 工作区会话分区的折叠状态写入 localStorage，刷新后保持；手动展开条数只保留在本次页面。
- **专注模式**：可创建多个专注组，每组挑选若干工作区；进入某个专注组后，左侧只展示这些工作区及其会话（工作区分组、已归档分组、内容搜索命中一起收窄），并显示专注条与「进入 / 切换 / 退出专注」。左侧列表新增与「最近会话 / 工作区会话」同级的 **专注组** 分区：列出全部专注组、成员数与使用中标记；**左键组行即展开该组的成员工作区**（再点工作区头展开其会话，右键菜单、新建会话、拖拽排序、「更多」折叠与工作区会话分区完全一致），展开状态记入 `focusExpanded` 并持久化；右键组行弹出「进入 / 切换 / 退出、重命名、编辑成员工作区、删除」菜单（只作用于该组：改名用轻量输入框，成员用单组勾选弹窗，删除需二次确认），分区头始终保留「新建」「管理」两个图标按钮；列表为空时只显示标题行，不再渲染空提示块。弹窗内顶部状态条显示当前是否处于专注，组卡片展示成员工作区与失效成员数量，可直接进入 / 退出某个组、就地改名、增删成员、删除专注组；新建组在弹窗内展开表单。管理弹窗只从分区头的「管理」图标进入（主面板与标题栏的专注入口均已移除）。已失效的成员工作区只在渲染时取交集，不会被静默删除。
- **会话行**：点击打开会话；待处理行用「等待批准 / 等待方案审核 / 等待回答」替换时间；右键菜单支持置顶、重命名、派生、复制会话 ID、归档、移入回收站；子会话默认不显示，只统计父会话的「+N 个运行中」。
- **右键管理**：会话行右键打开「打开 / 置顶 / 重命名 / 分叉 / 复制会话 ID / 归档 / 移到回收站」，工作区标题右键打开「新建会话 / 重命名工作区 / 删除工作区」；原生浏览器右键菜单被替换。
- **已归档 / 回收站**：主面板标签页直接展示对应会话列表，已归档页支持批量恢复、批量移入回收站；回收站中的会话不会再出现在已归档或左侧列表；回收站标题优先使用删除时保存的标题，并按原 `cwd` 恢复所属工作区，行内显示「工作区 · 删除于 …」。
- **失效会话自愈**：归档 / 恢复 / 置顶时如果 Host 返回「会话不存在」「已归档」「未归档」等状态不一致错误，该行会从当前列表移除，并提示「已清理 N 个状态失效的会话」，不再反复报错。
- **快捷键**：`Ctrl+K` 搜索、`Ctrl+Alt+N` 新建会话、`F2` / `Ctrl+Alt+G` 重命名当前聚焦会话、`Ctrl+Alt+F` 派生、`Ctrl+Alt+A` 归档、`Esc` 关闭菜单/弹窗。
- **工作区右键菜单**：重命名、删除工作区（新建会话用标题右侧的 `+`）；新建时可通过 Host 目录选择器选路径，也可手动输入。工作区标题右侧不再有「…」更多操作按钮。
- **手动排序**：`sort=manual` 时可拖动会话行排序，结果按工作区保存在 localStorage；同一模式下也可拖动工作区标题调整工作区顺序。拖动时锁定文本选择，只显示当前拖动行；目标行显示上/下插入指示线，松手按落点位置插入。
- **运行中归档**：归档运行中的会话时弹出「停止并归档」确认，失败信息显示在行内 footer。
- 系统「设置 → 会话视图」通过同一份 `prefs.js` 即时驱动模式与显示选项；侧栏不再有独立的模式切换按钮。

### 与原版工作区的视觉对齐

- 侧栏内容宽度与原生一致（280px 根宽、`padding: 6px 12px`），视图用 `margin-left:-4px` / `margin-right:-12px` 对齐原生 `.regionArea`，切换后不会跳动。
- 头部 36px，标题 14px tertiary，图标按钮 28×28；搜索展开后 30px 高、0.5px 边框。
- 会话行 32px，标题 14px/20px 单行省略，时间 10px/16px 右对齐，状态点槽 16×20；悬停时隐藏时间。会话行右侧不再有「…」按钮，管理操作统一走右键菜单。紧凑模式行高 26px，仍保留 9px 的会话时间，只隐藏子会话标签。
- 工作区标题 34px、标题 14px primary，不带文件夹图标，始终显示展开箭头；分区标题 36px / 15px（半粗）tertiary，计数 13px；行与分组间距 2px。
- 四个分区标题统一使用 12px 图标：活跃会话为活动折线，最近会话为时钟，置顶为图钉，工作区会话为分栏；活跃状态点带扩散脉冲动画（遵循系统的减少动态效果设置）。
- 工作区内存在运行中 / 待处理会话时，工作区标题右侧显示脉冲状态点，折叠状态下同样可见。
- 文字配色对齐原生：会话标题与工作区标题使用 `label-primary`，时间、计数、分区标题使用 `label-tertiary`，字号分别为 14px / 10px / 13px。
- 右键菜单使用系统菜单同款字体与行高（13px / 20px），不再是编辑器式的小号菜单。
- 视图高度跟随侧栏剩余空间，列表在内部滚动，不撑开页面。

### 主窗口会话面板

- 三个标签页：**会话 / 已归档 / 回收站**。
- 工具栏位于标签页下方：搜索、工作区筛选、分组方式和操作按钮；标题行只保留标题、说明与总数。
- **展开全部 / 收起全部** 与 **批量管理** 都下放到工具栏右侧，不再占用标题行。
- 状态分区：`置顶 → 运行中 → 待处理 → 完成未读 → 其他会话`；选中状态 chip 时只显示对应分区。
- 会话行单行展示：标题与工作区/时间同排，行高 34px；支持工作区下拉、状态 chip、标题/工作区/路径搜索组合筛选。
- **置顶**：置顶会话排在所有状态分区之前，并额外出现在左侧视图；切换置顶不弹提示条。
- **归档 / 取消归档**：调用 Host 原生 `workspaceRegistry`，归档后从「会话」页移除，可在「已归档」页取消归档。
- **移入回收站**：普通会话先归档（让 Host 释放会话），已归档会话不会再归档；成功写入回收站索引后自动取消归档，确保已归档列表同步消失。
- **回收站联动**：主面板的移入回收站 / 恢复 / 彻底删除通过共享 `trash-store` 立即推送到左侧会话视图，不需要切回窗口或等焦点刷新；左侧同一会话会同步消失或恢复。
- **恢复**：从回收站恢复到普通会话列表。
- **彻底删除**：真实删除会话目录（`~/.dsh/sessions/<slug>/session-<id>/`），不是仅从列表移除；删除后重建工作区索引。
- **批量管理**：进入管理态后可全选/勾选多条，批量归档、移入回收站、恢复、彻底删除；危险操作有确认对话框。已归档页同样支持批量移入回收站。
- **按工作区管理**：主面板工具栏的「分组方式」默认按工作区展示，会话 / 已归档 / 回收站三个标签页都适用，与左侧会话视图一致；也可切换为按状态。工作区分组标题可点击折叠，工具栏提供「展开全部 / 收起全部」，进入管理态后带「选择本组」，可整组归档、移入回收站或恢复。
- **内部滚动**：内容区独立滚动，页面本身不再滚动（滚轮落在列表区域时只滚动面板内容）。
- **点击打开**：行按钮调用 `ctx.uiWorkspace.openSession(id)`，Host 以 `reveal` 方式替换主视图并自动关闭面板，会话回到主窗口。
- 侧栏与主面板均不显示子会话；顶部工具栏的 **会话管理** 按钮直接打开该面板。
- 专注过滤只作用于左侧会话栏，主面板不再提供专注模式入口；设置页「列表行为」新增 **专注模式** 开关，关闭后隐藏左侧专注组分区、专注条与全部专注入口并停止过滤，已创建的专注组仍会保留。
- 中英文文案；颜色/边框全部使用 `--dsw-alias-*` 主题变量。

## 系统设置

系统「设置 → 会话视图」按四个卡片分组：

- **显示**：左侧工作区模式（会话视图 / 原版工作区）、显示子会话、显示空闲会话。
- **分组**：显示最近 / 置顶 / 活跃 / 工作区会话分组；置顶和活跃不会从工作区会话中移除。
- **数量与排序**：活跃、最近、每个工作区显示条数（0 表示不限），会话排序，工作区树形嵌套。
- **列表行为**：已归档过滤、显示更新时间、紧凑行高。
- 每项都有说明文字；底部提供「恢复默认」与快捷键提示。设置只保存在本机浏览器 localStorage。

## 状态颜色

| 颜色 | 状态 | 判定 |
| --- | --- | --- |
| 蓝（呼吸动画） | 运行中 | `status.running ?? summary.running` |
| 琥珀 | 待处理 | `status.pendingInteraction`（等待批准 / 等待方案审核 / 等待回答；未知类型显示「待处理」） |
| 绿 | 完成未读 | `status.completionUnread === true` |
| 灰 | 空闲 | 以上都不满足 |

状态只来自 Host 暴露的 `SessionStatus`（`running` / `pendingInteraction` / `completionUnread`）与 `SessionSummary.running`。列表级接口没有错误态，因此插件不显示红色「错误」状态；某会话的错误详情仍应在打开后的会话内查看。

已归档会话在「已归档」页使用中性色，回收站条目单独展示，不参与状态分区。

## 设置

`src/client/prefs.js` 使用 localStorage 键 `dsh-session-view.prefs.v1`，默认值：

```js
{
  mode: 'session',        // session | native
  activeLimit: 5,         // 0–50，0 表示不限
  recentLimit: 5,         // 0–50，0 表示不限
  workspaceLimit: 5,      // 0–50，0 表示不限
  showIdle: true,
  showSubagents: false,
  showRecent: true,
  showPinned: true,
  showActive: true,
  showWorkspaces: true,
  showTimes: true,
  compact: false,
  archivedFilter: 'hide', // hide | show | only
  sort: 'updated',        // updated | manual
  nestWorkspaces: true,
  manualOrder: {},        // 按分组 key 保存的会话 id 顺序
  collapsedGroups: [],    // 折叠的工作区 id
  focusGroups: [],        // [{ id, name, workspaceIds }]，专注组
  focusGroupId: '',       // 当前进入的专注组 id，空串表示未启用
  focusExpanded: [],      // 已展开的专注组 id（左键展开成员工作区）
  focusEnabled: true,     // 专注模式总开关，关闭后隐藏入口并停止过滤
}
```

系统设置分区通过 `subscribePrefs` / `setPrefs` 驱动侧栏，不需要刷新页面；修改模式后侧栏立即切换。

## Host 接口

`lib/index.js` 是 Host 半边（`inject: ['webServer','workspaceRegistry','sessionPersistence','sessions']`），注册以下 exact 路由：

| 方法 | 路径 | 说明 |
| --- | --- | --- |
| GET | `/session-view/capabilities` | 返回 `{ok, trash, purge}` |
| GET | `/session-view/trash` | 回收站索引 |
| POST | `/session-view/trash/add` | 归档后移入回收站 |
| POST | `/session-view/trash/restore` | 只移除成功恢复的条目 |
| POST | `/session-view/trash/purge` | 物理删除会话目录 |

彻底删除的保护：

- 会话仍被 Host 打开（`sessions.get(id)` 存在）→ 409；
- 会话仍被写者占用（`sessionPersistence.open(id,'write')` 抛 `already owned`）→ 409；
- 目录 basename 与会话 id 不一致、目录不在预期根下 → 拒绝；
- 删除后再次 `stat` 检查，若目录重新出现 → 报错，不谎报成功。

回收站索引默认在 `~/.dsh/session-view-trash.json`，可用环境变量 `DSH_SESSION_VIEW_TRASH` 覆盖；写入使用串行队列 + 临时文件 rename，避免并发写坏索引。

## 安装

本插件是标准 DSH bundle 插件：包内自带 `cordis.patch.yml`（bundle patch）、`lib/index.js`（Host 半边）与 `lib/client.js`（Web 客户端 bundle）。安装统一走 `dsh plugin`——它把参数转发给目标 profile 目录里的 pnpm，并在安装后把 `dsh-session-view` 追加进 `dsh.profile.bundles`。**bundle 只在 DSH 进程启动时加载，安装或更新后必须重启 `dsh web`。**

兼容性由 `engines.dsh` 决定（`>=0.2.1-rc.1 <0.3.0-0`）：该字段存在时 DSH 只用它判定兼容，`peerDependencies` 不再参与。不满足时安装会被拒绝，确认可用后可显式豁免：

```bash
dsh plugin --profile web allow-version dsh-session-view@0.7.0 --dsh-version <当前 dsh 版本> --accept-risk
```

### 方式一：npm（发布后可用）

```bash
npm publish                                    # 维护者：首次需先 npm login
dsh plugin --profile web add dsh-session-view@0.7.0
```

升级：`dsh plugin --profile web add dsh-session-view@latest`。

### 方式二：Git 仓库

```bash
dsh plugin --profile web add git+https://github.com/lidongbei/dsh-session-view.git#<40 位 commit>
```

### 方式三：本地目录（开发调试，推荐脚本）

```bash
npm install && npm run build
npm run install:profile -- --profile web --source link --apply
```

脚本在 `~/.dsh/profiles/web/local-plugins/dsh-session-view` 建立 junction / symlink 指向本仓库，再写入 `link:local-plugins/dsh-session-view` 依赖——Windows 上 pnpm 处理跨盘绝对 `file:` 依赖会拼错路径，因此不要手写绝对路径。省略 `--apply` 时只打印将要执行的命令（dry-run）。

其他来源：`--source tgz`（先 `npm pack` 生成 tgz）、`--source git`（使用当前 HEAD 的 commit）、`--source registry`。

### 方式四：插件市场索引

`market/index.json` 是按 DSH market index format 1 生成的索引，`npm run market:index` 可复现（`--timestamp` / `--git --commit` 控制产物）。把它的 raw URL 填进 Web 插件页或 Discover 的索引地址即可浏览安装；索引当前指向 npm 源，需先完成 `npm publish`。

### 校验、更新与卸载

```bash
dsh --profile web --dump-config | grep -n "dsh-session-view"   # 确认已注入
npm run uninstall:profile -- --profile web --apply              # 卸载（脚本同样默认 dry-run）
```

排障：

- `not-a-bundle`：包内缺少 `dsh.bundle.patch` 指向的 `cordis.patch.yml`，确认安装的是 ≥0.7.0 的正式包；
- pnpm 报跨盘 `file:` 路径错误：改用 `--source link`，让脚本建立 profile 内 junction；
- 安装成功但界面无变化：重启 `dsh web`，并检查 `dsh.profile.bundles` 是否包含 `dsh-session-view`；
- 完全回退：`npm run uninstall:profile -- --profile web --apply`，删除 `local-plugins/dsh-session-view`，再重启。

## 开发

```bash
npm install
npm test        # 53 项：会话/工作区逻辑、Host 路由、SSR、构建注册、包契约
npm run build   # esbuild -> lib/client.js（__ModuleLoader__ 包装）
npm run check   # build + test
npm run pack:check      # npm pack --dry-run，检查发布清单
npm run market:index    # 重新生成 market/index.json
```

- `src/client/prefs.js`：localStorage 偏好存储与订阅，纯数据无 React。
- `src/client/logic.js`：纯函数（状态归并、父子分组、分区、活跃分组、工作区树、过滤、计数、相对时间、路径推导），无 React 依赖。
- `src/client/sidebar-workspace.jsx`：接管侧栏的会话视图（分组、水位、搜索、拖拽、右键菜单、快捷键、对话框、会话管理入口）。
- `src/client/sidebar-board.jsx`：零尺寸 footer 锚点 + Portal 定位 `nav.panelList`；检测 `.dsh-ssh-sidebar` 存在时把托管节点移到 SSH 面板之后，只隐藏原生工作区列表，保留 SSH 面板；`stopPropagation` 防止 React Portal 事件冒泡到侧栏 footer 的点击处理。
- `src/client/session-view.jsx`：主面板（标签页、分区、批量管理、确认框、Toast）。
- `src/client/api.js`：回收站路由的 fetch 封装。
- `src/client/index.jsx`：注册 `main`、`sidebar.footer.action`、`settings.section`，注册中英文字典，注入 Host 服务。
- `src/client/styles.js`：组件级 CSS，全部使用 `--dsw-alias-*` 主题变量。
- `lib/index.js`：Host 半边，注册回收站/彻底删除路由与工作区索引刷新。
- `lib/client.js`：构建产物，通过 `window.__ModuleLoader__.load({ id, factory })` 暴露 `apply` / `inject`。

## 已知限制

- 会话模式只隐藏原生工作区列表、保留 dsh-ssh 远端面板，依赖原生侧栏 `nav.panelList` / `.regionArea` / `.dsh-ssh-sidebar` 的 DOM 结构；DSH 或 dsh-ssh 若改动该结构，需要同步调整定位逻辑。
- 快捷键只在侧栏获得焦点或搜索框打开时生效，避免覆盖主窗口输入；`sidebar.session.row.hover` 原生行装饰仍未接入。
- 右键菜单替换只作用于会话视图内部的行与工作区标题，原生工作区模式保留浏览器默认菜单。
- 列表级状态不包含 per-session 错误，因此没有红色错误点。
- 彻底删除不可恢复；批量删除前请确认。运行中的会话/X 仍被写者占用时会被拒绝（409），而不是强制删除。
- 内容搜索由 Host `sessions.search` 提供，失败时只保留本地匹配，不阻塞列表。
- 相对时间每 60 秒刷新一次；侧栏宽度 <150px 时接管视图隐藏，原生区域保持隐藏，展开后恢复。
- 会话视图默认过滤子会话；开启「显示子会话」后按父子缩进展示，但原生工作区视图仍隐藏子会话。
- 设置保存在本机浏览器，不写入 DSH 配置。
