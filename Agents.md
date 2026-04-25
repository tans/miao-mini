# Agents.md

## 项目概览

`创意喵` 是一个微信小程序原生项目，定位是“视频任务撮合平台”。核心是把商家发单、创作者认领、提交作品、商家审核、钱包结算这一整条链路放在一个小程序里完成。

## 技术栈

- 微信小程序原生框架
- `WXML` + `WXSS` + `JavaScript`
- `weui-miniprogram` 组件
- `miniprogram-ci` 用于 CI 上传

## 关键入口

- [`app.js`](./app.js): 全局初始化、静默登录、用户态缓存
- [`app.json`](./app.json): 路由和 tabBar 的真实来源，优先看这里，不要只信 `README.md`
- [`utils/api.js`](./utils/api.js): 所有后端请求封装，包含登录、任务、作品、钱包、审核、申诉等接口
- [`utils/enums.js`](./utils/enums.js): 任务状态、认领状态等枚举
- [`utils/util.js`](./utils/util.js): 日期、金额、状态文案工具

## 主要页面

- 首页 `pages/home/index`: 任务大厅，支持筛选、排序、倒计时、报名
- 灵感 `pages/works/index`: 过审作品流，支持搜索、标签和排序
- 我的 `pages/mine/index`: 用户中心，聚合钱包、创作者专区、商家专区、客服
- 商家创建任务 `pages/employer/create-task/index`: 发任务、AI 帮写、素材上传、预算预览
- 创作者任务 `pages/creator/my-claims/index`: 我的认领、提交作品、取消认领
- 钱包 `pages/wallet/index`: 余额、冻结金额、交易记录、提现

## 业务流程

1. 商家创建任务并托管预算。
2. 创作者在首页浏览任务，完成认领。
3. 创作者提交作品后，商家在审核页处理采纳/淘汰/举报。
4. 采纳后进入钱包结算、提现与交易记录。
5. 灵感页展示过审作品，供继续浏览和互动。

## 代码约定

- 登录态使用本地缓存 `miao_token` 和 `miao_user`
- `app.js` 在启动时会静默登录，`utils/api.js` 会在 401 时清理登录态
- 任务、认领、作品、钱包的数据都走 `utils/api.js`，不要在页面里手写请求
- `build-info.js` 由 `scripts/ci-upload.js` 自动更新，`mine` 页会读它展示“最后更新”
- 状态文案和颜色尽量复用 `utils/enums.js` / `utils/util.js`

## 需要特别注意

- `README.md` 里有些目录说明已经过时，当前真实页面以 `app.json` 为准
- 这个项目里既有创作者视角，也有商家视角，导航和权限判断要区分场景
- 上传图片/视频后，返回值可能是相对路径，`utils/api.js` 已经做了绝对化处理
- 页面里不少资源路径是硬编码的，改名时要连同 `wxml` 一起查

## 常见改动位置

- 改 API 地址: [`utils/config.js`](./utils/config.js)
- 改全局登录逻辑: [`app.js`](./app.js)
- 改任务列表展示: [`pages/home/index.js`](./pages/home/index.js)
- 改灵感流/作品卡片: [`pages/works/index.js`](./pages/works/index.js)
- 改任务创建表单: [`pages/employer/create-task/index.js`](./pages/employer/create-task/index.js)

