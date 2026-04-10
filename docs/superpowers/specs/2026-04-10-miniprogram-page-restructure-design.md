# 小程序页面结构调整设计

> **日期**: 2026-04-10
> **版本**: V1.0
> **依据**: 信息架构图 V1.0 + OpenAPI

---

## 一、目标

将现有 4-Tab 结构调整为 3-Tab 结构，贴合信息架构图。

---

## 二、Tab Bar 配置

| Tab | 页面路径 | 名称 | 图标 |
|-----|---------|------|------|
| 1 | `pages/home/index` | 任务大厅 | 📋 |
| 2 | `pages/works/index` | 过审作品 | 🎨 |
| 3 | `pages/mine/index` | 我的 | 👤 |

---

## 三、页面清单

### 新建页面

| 页面 | 文件 | 说明 |
|------|------|------|
| 过审作品列表 | `pages/works/index` | 复用 video-proposals 改名改造 |
| 我的 | `pages/mine/index` | 个人中心首页，整合所有入口 |
| 收益明细 | `pages/transactions/index` | 创作者收益记录 |
| 我领取的任务 | `pages/my-claims/index` | 创作者认领列表 |
| 作品详情 | `pages/work-detail/index` | 过审作品详情 |
| 设置 | `pages/settings/index` | 用户设置页 |

### 改造页面

| 页面 | 改造内容 |
|------|----------|
| `pages/home/index` | 改为任务大厅（搜索、分类、瀑布流） |
| `pages/task-detail/index` | 保持不变，任务详情 |
| `pages/login/index` | 仅保留微信登录按钮 |

### 删除页面

| 页面 | 原因 |
|------|------|
| `pages/create-task/index` | 商家从"我发布的任务"进入创建 |
| `pages/my-tasks/index` | 改为"我的"Tab 下的功能入口 |
| `pages/video-proposals/index` | 改为 works Tab |
| `pages/register/index` | 不需要独立注册页 |

---

## 四、"我的"页面入口

`pages/mine/index` 包含以下功能入口：

```
├── 用户信息卡片（头像、昵称、角色）
├── 钱包卡片（余额）
│   └── 跳转 pages/transactions/index（收益明细）
├── 我领取的任务 → pages/my-claims/index
├── 我发布的任务 → pages/my-tasks/index
│   └── 点击"发布任务"按钮 → 创建任务表单
├── 我的提案 → pages/works/index（复用 Tab2）
└── 设置 → pages/settings/index
```

---

## 五、登录流程

- `pages/login/index` 仅保留「微信登录」按钮
- 调用 `POST /auth/wechat-mini-login`，参数 `{ code }`（wx.login 返回）
- 新用户自动创建；老用户自动登录
- 响应 `{ code: 0, data: { token, user, is_new } }`

---

## 六、API 接口（OpenAPI 对照）

### Auth

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/auth/wechat-mini-login` | 微信小程序登录 |

### 任务

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/tasks` | 可认领任务列表（公开） |
| GET | `/creator/tasks` | 同上，带认证 |
| GET | `/business/tasks` | 我发布的任务（商家） |
| POST | `/business/tasks` | 创建任务（商家） |
| POST | `/creator/claim` | 认领任务 |
| GET | `/creator/claims` | 我的认领列表 |
| PUT | `/creator/claim/:id/submit` | 提交认领 |

### 作品

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/works` | 过审作品列表（公开） |

### 钱包

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/creator/wallet` | 创作者钱包 |
| GET | `/creator/transactions` | 收益明细 |

### 用户

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/users/me` | 当前用户信息 |

---

## 七、实施顺序

1. 修改 `app.json` 的 tabBar 配置
2. 改造 `login/index`（已完成）
3. 改造 `home/index` → 任务大厅
4. 改造 `video-proposals` → `works`（Tab 2）
5. 新建 `mine/index`（Tab 3）
6. 新建 `my-claims/index`、`transactions/index`、`settings/index`、`work-detail/index`
7. 清理废弃页面和文件

---

## 八、app.json tabBar list

```json
"tabBar": {
  "color": "#999",
  "selectedColor": "#FF2442",
  "backgroundColor": "#fff",
  "borderStyle": "black",
  "list": [
    { "pagePath": "pages/home/index", "text": "任务大厅", "iconPath": "assets/icons/home.png", "selectedIconPath": "assets/icons/home-active.png" },
    { "pagePath": "pages/works/index", "text": "过审作品", "iconPath": "assets/icons/works.png", "selectedIconPath": "assets/icons/works-active.png" },
    { "pagePath": "pages/mine/index", "text": "我的", "iconPath": "assets/icons/mine.png", "selectedIconPath": "assets/icons/mine-active.png" }
  ]
}
```

---

## 九、页面注册顺序（pages 数组）

```json
"pages": [
  "pages/home/index",
  "pages/works/index",
  "pages/mine/index",
  "pages/login/index",
  "pages/task-detail/index",
  "pages/my-claims/index",
  "pages/my-tasks/index",
  "pages/transactions/index",
  "pages/settings/index",
  "pages/work-detail/index"
]
```
