# dsh-session-view

DSH Web 的**会话视图**插件：默认接管左侧工作区块，以会话为主行展示置顶 / 活跃 / 已完成未读会话，可一键切回原生工作区；主窗口提供完整的会话管理与设置面板。

版本 0.3.0。

## 功能

### 左侧会话视图（接管模式）

- 通过 React Portal 把会话视图插到 `sidebar.panellist` 之后、原生 `.regionArea` 之前；默认隐藏原生工作区区域，但**不卸载**它，切回时状态完整保留。
- 顶部工具栏：新建会话、添加工作区、设置、切回原生工作区；底部 footer 也有模式切换按钮。
- **活跃会话**分组：显示运行中 / 待处理 / 有运行中子会话的顶层会话，按 `settings.activeLimit` 限制条数，支持「更多 / 收起」。
- **置顶**分组：置顶会话始终排在最前，行尾图钉可直接置顶/取消置顶。
- **工作区分组**：按工作区路径树形嵌套（取最长前缀父目录），每个工作区按 `settings.workspaceLimit` 限制条数；空工作区仍显示标题。
- **搜索**：本地标题/路径匹配 + 防抖调用 `sessions.search` 做 Host 内容搜索，显示命中片段；支持清空。
- **筛选/布局**：全部 / 运行中 / 待处理 / 已完成 / 空闲、归档过滤（隐藏 / 显示 / 仅归档）、分组 / 平铺、最近更新 / 手动排序、显示/隐藏空闲会话。
- **会话行**：点击打开会话；行菜单支持置顶、重命名、派生、复制会话 ID、归档、移入回收站；子会话缩进并标记「子会话」，父会话不可见时提升为顶层并标记「父会话不可见」。
- **工作区菜单**：新建、重命名、删除工作区；新建时可通过 Host 目录选择器选路径，也可手动输入。
- **手动排序**：`sort=manual` 时可拖动会话行排序，结果按工作区保存在 localStorage。
- **运行中归档**：归档运行中的会话时弹出「停止并归档」确认，失败信息显示在行内 footer。
- 设置弹层与主面板设置页共享同一份 `prefs.js`，修改即时生效。

### 主窗口会话面板

- 四个标签页：**会话 / 已归档 / 回收站 / 设置**。
- 状态分区：`置顶 → 运行中 → 待处理 → 完成未读 → 其他会话`；选中状态 chip 时只显示对应分区。
- 平铺会话行，支持工作区下拉、状态 chip、标题/工作区/路径搜索组合筛选。
- **置顶**：置顶会话排在所有状态分区之前，并额外出现在左侧视图。
- **归档 / 取消归档**：调用 Host 原生 `workspaceRegistry`，归档后从「会话」页移除，可在「已归档」页取消归档。
- **移入回收站**：先归档（让 Host 释放会话），成功后写入回收站索引并从列表隐藏。
- **恢复**：从回收站恢复到普通会话列表。
- **彻底删除**：真实删除会话目录（`~/.dsh/sessions/<slug>/session-<id>/`），不是仅从列表移除；删除后重建工作区索引。
- **批量管理**：进入管理态后可全选/勾选多条，批量归档、移入回收站、恢复、彻底删除；危险操作有确认对话框。
- **点击打开**：行按钮调用 `ctx.uiWorkspace.openSession(id)`，Host 以 `reveal` 方式替换主视图并自动关闭面板，会话回到主窗口。
- **设置页**：模式（会话视图 / 原版工作区）、活跃会话条数、每个工作区条数、布局、排序、归档过滤、显示空闲、工作区树形嵌套、恢复默认；说明文字提示设置只保存在本机浏览器。
- 中英文文案；颜色/边框全部使用 `--dsw-alias-*` 主题变量。

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
  workspaceLimit: 5,      // 0–50，0 表示不限
  showIdle: true,
  archivedFilter: 'hide', // hide | show | only
  layout: 'grouped',      // grouped | flat
  sort: 'updated',        // updated | manual
  nestWorkspaces: true,
  manualOrder: {},        // 按分组 key 保存的会话 id 顺序
}
```

侧栏设置弹层、主面板设置页、footer 模式按钮通过 `subscribePrefs` / `setPrefs` 同步，不需要刷新页面。

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

## 安装（web profile）

先在插件目录构建：

```bash
npm install
npm run build
```

Windows 上 pnpm 10 处理跨盘绝对 `file:` 目录依赖会拼错路径（`ENOENT ...\\web\\D:\\...`），因此用 profile 内的 junction + `link:`：

```powershell
New-Item -ItemType Junction `
  -Path  "$env:USERPROFILE\\.dsh\\profiles\\web\\local-plugins\\dsh-session-view" `
  -Target "D:\\AI\\dsh-plugins\\dsh-session-view"
```

编辑 `C:\\Users\\Administrator\\.dsh\\profiles\\web\\package.json`（先备份）：

```jsonc
{
  "dsh": {
    "profile": {
      "bundles": [
        // ...原有 bundle...
        "dsh-session-view"
      ]
    }
  },
  "dependencies": {
    // ...
    "dsh-session-view": "link:local-plugins/dsh-session-view"
  }
}
```

安装依赖并确认组合结果：

```bash
dsh plugin --profile web install --no-frozen-lockfile
dsh --profile web --dump-config
```

确认 `node_modules\\dsh-session-view` 是指向插件目录的符号链接，且 dump 结果包含 `- id: dsh-session-view`。bundle 只在 DSH 进程启动时加载，安装/更新后需要重启 `dsh web` 才能看到新版；重启前建议备份 profile 的 `package.json`。

卸载：移除 `bundles` 条目与依赖，删除 junction，`dsh plugin --profile web install --no-frozen-lockfile`，再重启。

## 开发

```bash
npm install
npm test        # 12 逻辑 + 2 文案 + 7 会话管理 + 5 Host 路由 + 7 工作区/偏好 + 1 侧栏 SSR + 1 主面板 SSR + 1 构建注册 = 36
npm run build   # esbuild -> lib/client.js（__ModuleLoader__ 包装）
npm run check   # build + test
```

- `src/client/prefs.js`：localStorage 偏好存储与订阅，纯数据无 React。
- `src/client/logic.js`：纯函数（状态归并、父子分组、分区、活跃分组、工作区树、过滤、计数、相对时间、路径推导），无 React 依赖。
- `src/client/sidebar-workspace.jsx`：接管侧栏的会话视图（分组、搜索、拖拽、菜单、对话框、设置弹层）。
- `src/client/sidebar-board.jsx`：Portal 定位 `nav.panelList`，隐藏/恢复原生 `.regionArea`，只在会话模式渲染接管面板；`stopPropagation` 防止 React Portal 事件冒泡触发入口行的选面板逻辑。
- `src/client/session-view.jsx`：主面板（标签页、分区、批量管理、设置页、确认框、Toast）。
- `src/client/api.js`：回收站路由的 fetch 封装。
- `src/client/index.jsx`：注册 `main`、`sidebar.panellist`、`sidebar.footer.action`，注册中英文字典，注入 Host 服务。
- `src/client/styles.js`：组件级 CSS，全部使用 `--dsw-alias-*` 主题变量。
- `lib/index.js`：Host 半边，注册回收站/彻底删除路由与工作区索引刷新。
- `lib/client.js`：构建产物，通过 `window.__ModuleLoader__.load({ id, factory })` 暴露 `apply` / `inject`。

## 已知限制

- 会话模式隐藏原生工作区区域（保留挂载），依赖原生侧栏 `nav.panelList` / `.regionArea` 的 DOM 结构；DSH 若改动该结构，需要同步调整定位逻辑。
- 尚未实现键盘快捷键与 `sidebar.session.row.hover` 原生行装饰（V3 计划 phase 2）。
- 列表级状态不包含 per-session 错误，因此没有红色错误点。
- 彻底删除不可恢复；批量删除前请确认。运行中的会话/X 仍被写者占用时会被拒绝（409），而不是强制删除。
- 内容搜索由 Host `sessions.search` 提供，失败时只保留本地匹配，不阻塞列表。
- 相对时间每 60 秒刷新一次；侧栏宽度 <150px 时接管视图隐藏，原生区域保持隐藏，展开后恢复。
- 设置保存在本机浏览器，不写入 DSH 配置。
