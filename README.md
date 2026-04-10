# 创意喵 - 微信小程序

> 视频任务平台，连接商家与创作者

## 项目结构

```
miao-mini/
├── app.js              # 应用入口
├── app.json            # 全局配置
├── app.wxss            # 全局样式
├── project.config.json # 开发者工具配置
├── sitemap.json        # SEO配置
├── utils/
│   ├── api.js          # API 服务层
│   └── util.js         # 工具函数
├── assets/
│   └── icons/          # TabBar 图标（需自行添加）
└── pages/
    ├── home/           # 首页 - 任务列表
    ├── task-detail/    # 任务详情
    ├── create-task/    # 创建任务
    ├── my-tasks/       # 我的任务
    ├── video-proposals/# 视频提案
    ├── login/          # 登录
    └── register/       # 注册
```

## 快速开始

### 1. 安装依赖（可选）

```bash
npm install
```

### 2. TabBar 图标

已生成占位图标于 `assets/icons/` 目录。如需自定义，请替换以下 8 个 81×81px PNG 文件：

- `home.png` / `home-active.png`
- `create.png` / `create-active.png`
- `mytasks.png` / `mytasks-active.png`
- `proposals.png` / `proposals-active.png`

### 3. 在微信开发者工具中导入

1. 打开 [微信开发者工具](https://developers.weixin.qq.com/miniprogram/dev/devtools/download.html)
2. 选择「导入项目」
3. 选择本目录
4. AppID: `wxf830863afde621eb`（或你的 AppID）
5. 完成导入

### 4. 配置后端地址

在 `app.js` 中修改 `globalData.apiBase` 为你的后端地址：

```javascript
globalData: {
  apiBase: 'http://你的服务器IP:8888/api/v1'
}
```

开发阶段可在开发者工具中勾选「不校验合法域名」。

### 5. 配置合法域名

在 [微信公众平台](https://mp.weixin.qq.com/) → 开发 → 开发管理 → 开发设置中，
配置 `request 合法域名` 为你的后端地址（如 `https://api.example.com`）

开发阶段可在开发者工具中勾选「不校验合法域名」。

## 功能模块

### 商家端
- 发布视频创作任务
- 设置预算、人数、截止日期
- 审核创作者提案

### 创作者端
- 浏览任务大厅
- 接单任务
- 提交视频作品

## API 文档

详见 [API.md](API.md)

## 技术栈

- 微信小程序原生框架
- WXML + WXSS + JavaScript
- 微信小程序 API
