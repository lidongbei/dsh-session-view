# dsh-session-view

DSH Web 的**会话视图**插件：在左侧栏工作区块**上方**直接显示置顶/运行中/待处理/完成未读会话，并在主窗口提供完整的会话浏览与管理面板。

## 功能

### 左侧会话视图看板

- 注册 `sidebar.panellist` 入口（`order: 10`），位于原生工作区/会话列表区域之前。
- 通过 React Portal 在 `sidebar.workspaces` 区域**正上方**插入独立看板，不替换原生工作区分组列表；收起侧栏时看板自动隐藏，侧栏展开后恢复。
- 按 `置顶 → 运行中 → 待处理 → 完成未读` 分组，每组最多 3 条；没有内容的组不显示。
- 每行可直接打开会话；行尾图钉按钮可直接置顶/取消置顶，无需进入面板。
- `查看全部` 打开主窗口的会话视图面板；看板标题可折叠，折叠状态保存在 localStorage。
- 原生侧栏与工作区搜索、右键菜单等能力全部保留。

### 主窗口会话面板

- **会话 / 已归档 / 回收站** 三个标签页。
- 状态分区：`置顶 → 运行中 → 待处理 → 完成未读 → 其他会话`；选中状态 chip 时只显示对应分区。
- 平铺会话行，支持按工作区下拉、状态 chip、标题/工作区/路径搜索组合筛选。
- **置顶**：置顶会话排在所有状态分区之前，并额外出现在左侧看板。
- **归档 / 取消归档**：调用 Host 原生 `workspaceRegistry`，归档后从「会话」页移除，可在「已归档」页取消归档。
- **移入回收站**：先归档（让 Host 释放会话），成功后写入回收站索引并从列表隐藏。
- **恢复**：从回收站恢复到普通会话列表。
- **彻底删除**：真实删除会话目录（`~/.dsh/sessions/<slug>/session-<id>/`），不是仅从列表移除；删除后重建工作区索引。
- **批量管理**：进入管理态后可全选/勾选多条，批量归档、移入回收站、恢复、彻底删除；危险操作有确认对话框。
- **点击打开**：行按钮调用 `ctx.uiWorkspace.openSession(id)`，Host 以 `reveal` 方式替换主视图并自动关闭面板，会话回到主窗口。
- 子会话紧跟在父会话之后逐级缩进，带「子会话」标记；父会话不可见时提升为顶层并标记「父会话不可见」。
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

Windows 上 pnpm 10 处理跨盘绝对 `file:` 目录依赖会拼错路径（`ENOENT ...\web\D:\...`），因此用 profile 内的 junction + `link:`：

```powershell
New-Item -ItemType Junction `
  -Path  "$env:USERPROFILE\.dsh\profiles\web\local-plugins\dsh-session-view" `
  -Target "D:\AI\dsh-plugins\dsh-session-view"
```

编辑 `C:\Users\Administrator\.dsh\profiles\web\package.json`（先备份）：

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

确认 `node_modules\dsh-session-view` 是指向插件目录的符号链接，且 dump 结果包含 `- id: dsh-session-view`。bundle 只在 DSH 进程启动时加载，安装/更新后需要重启 `dsh web` 才能在侧栏看到新版；重启前建议备份 profile 的 `package.json`。

卸载：移除 `bundles` 条目与依赖，删除 junction，`dsh plugin --profile web install --no-frozen-lockfile`，再重启。

## 开发

```bash
npm install
npm test        # 12 逻辑 + 2 文案 + 7 会话管理 + 5 Host 路由 + 1 SSR 渲染 + 1 构建产物注册 = 28
npm run build   # esbuild -> lib/client.js（__ModuleLoader__ 包装）
npm run check   # build + test
```

- `src/client/logic.js`：纯函数（状态归并、父子分组、分区、过滤、计数、相对时间、路径推导），无 React 依赖。
- `src/client/session-view.jsx`：主面板组件（标签页、分区、批量管理、确认框、Toast）。
- `src/client/sidebar-board.jsx`：Portal 看板；`useLayoutEffect` 定位 `nav.panelList`，插入到 `sidebar.workspaces` 之前；`stopPropagation` 防止 React Portal 事件冒泡触发入口行的选面板逻辑。
- `src/client/api.js`：回收站路由的 fetch 封装。
- `src/client/index.jsx`：注册 `main` 与 `sidebar.panellist`，注册中英文字典。
- `src/client/styles.js`：组件级 CSS，全部使用 `--dsw-alias-*` 主题变量。
- `lib/index.js`：Host 半边，注册回收站/彻底删除路由与工作区索引刷新。
- `lib/client.js`：构建产物，通过 `window.__ModuleLoader__.load({ id, factory })` 暴露 `apply` / `inject`。

## 已知限制

- 原生侧栏仍保留工作区分组视图；本插件是额外看板 + 独立面板，不替换 `sidebar.workspaces`。
- 看板依赖原生侧栏 `nav.panelList` 的 DOM 结构；DSH 若改动该结构，需要同步调整定位逻辑。
- 列表级状态不包含 per-session 错误，因此没有红色错误点。
- 彻底删除不可恢复；批量删除前请确认。运行中的会话/X 仍被写者占用时会被拒绝（409），而不是强制删除。
- 相对时间每 60 秒刷新一次。
- 看板只在侧栏宽度 ≥150px 时显示。
