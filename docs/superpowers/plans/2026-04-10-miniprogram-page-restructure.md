# 小程序页面结构调整实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将 4-Tab 小程序改造为 3-Tab 结构，贴合信息架构图

**Architecture:**
- 3 个 Tab: 任务大厅 / 过审作品 / 我的
- "我的"页面作为个人中心，整合钱包、任务入口、设置等
- 登录改为微信小程序登录（已实施）

**Tech Stack:** 微信小程序原生开发，WXML + WXSS + JS

---

## 文件变更总览

| 操作 | 文件 |
|------|------|
| 修改 | `app.json` |
| 修改 | `utils/api.js` (已完成: /auth/wechat-mini-login, /business/tasks) |
| 修改 | `pages/login/index.{js,wxml}` (已完成) |
| 创建 | `assets/icons/works.png`, `assets/icons/works-active.png` |
| 创建 | `assets/icons/mine.png`, `assets/icons/mine-active.png` |
| 创建 | `pages/works/index.{js,wxml,wxss,json}` (复用 video-proposals) |
| 创建 | `pages/mine/index.{js,wxml,wxss,json}` |
| 创建 | `pages/my-claims/index.{js,wxml,wxss,json}` |
| 创建 | `pages/transactions/index.{js,wxml,wxss,json}` |
| 创建 | `pages/settings/index.{js,wxml,wxss,json}` |
| 创建 | `pages/work-detail/index.{js,wxml,wxss,json}` |
| 修改 | `pages/home/index.{js,wxml,wxss}` (改为任务大厅) |

---

## Task 1: 修改 app.json — 更新 tabBar 和 pages 数组

**Files:**
- Modify: `app.json`

**Steps:**

- [ ] **Step 1: 更新 pages 数组**

将 app.json 中的 `pages` 数组替换为:

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

- [ ] **Step 2: 更新 tabBar.list**

将 tabBar.list 替换为:

```json
"list": [
  {
    "pagePath": "pages/home/index",
    "text": "任务大厅",
    "iconPath": "assets/icons/home.png",
    "selectedIconPath": "assets/icons/home-active.png"
  },
  {
    "pagePath": "pages/works/index",
    "text": "过审作品",
    "iconPath": "assets/icons/works.png",
    "selectedIconPath": "assets/icons/works-active.png"
  },
  {
    "pagePath": "pages/mine/index",
    "text": "我的",
    "iconPath": "assets/icons/mine.png",
    "selectedIconPath": "assets/icons/mine-active.png"
  }
]
```

- [ ] **Step 3: 提交**

```bash
git add app.json && git commit -m "feat: restructure to 3-tab bar (home/works/mine)"
```

---

## Task 2: 创建 Tab 图标

**Files:**
- Create: `assets/icons/works.png`
- Create: `assets/icons/works-active.png`
- Create: `assets/icons/mine.png`
- Create: `assets/icons/mine-active.png`

**Steps:**

- [ ] **Step 1: 创建 works.png（复制现有占位图标）**

```bash
cp assets/icons/proposals.png assets/icons/works.png
```

- [ ] **Step 2: 创建 works-active.png**

```bash
cp assets/icons/proposals-active.png assets/icons/works-active.png
```

- [ ] **Step 3: 创建 mine.png**

```bash
cp assets/icons/mytasks.png assets/icons/mine.png
```

- [ ] **Step 4: 创建 mine-active.png**

```bash
cp assets/icons/mytasks-active.png assets/icons/mine-active.png
```

- [ ] **Step 5: 提交**

```bash
git add assets/icons/works*.png assets/icons/mine*.png && git commit -m "feat: add works and mine tab icons"
```

---

## Task 3: 改造 video-proposals → works（Tab 2）

**Files:**
- Create: `pages/works/index.js`
- Create: `pages/works/index.wxml`
- Create: `pages/works/index.wxss`
- Create: `pages/works/index.json`

**Steps:**

- [ ] **Step 1: 创建 pages/works/index.json**

```json
{
  "usingComponents": {},
  "navigationBarTitleText": "过审作品"
}
```

- [ ] **Step 2: 创建 pages/works/index.wxml**

过审作品页面，显示作品瀑布流，调用 `GET /works`

```xml
<view class="works-container">
  <view class="works-header">
    <text class="works-title">过审作品</text>
    <view class="sort-tabs">
      <text class="tab {{sort === 'latest' ? 'active' : ''}}" data-sort="latest" bindtap="switchSort">最新</text>
      <text class="tab {{sort === 'likes' ? 'active' : ''}}" data-sort="likes" bindtap="switchSort">最多点赞</text>
      <text class="tab {{sort === 'views' ? 'active' : ''}}" data-sort="views" bindtap="switchSort">最多浏览</text>
    </view>
  </view>

  <view class="works-list" wx:if="{{works.length > 0}}">
    <view class="work-card" wx:for="{{works}}" wx:key="id" bindtap="goWorkDetail" data-id="{{item.id}}">
      <image class="work-cover" src="{{item.cover_url || item.image}}" mode="aspectFill"/>
      <view class="work-info">
        <text class="work-title">{{item.title}}</text>
        <view class="work-author">
          <image class="author-avatar" src="{{item.creator_avatar || '/assets/icons/home.png'}}"/>
          <text class="author-name">{{item.creator_name || '创作者'}}</text>
        </view>
      </view>
    </view>
  </view>

  <view class="empty-state" wx:if="{{!loading && works.length === 0}}">
    <text>暂无过审作品</text>
  </view>

  <view class="loading-more" wx:if="{{loading}}">
    <text>加载中...</text>
  </view>
</view>
```

- [ ] **Step 3: 创建 pages/works/index.wxss**

```css
.works-container {
  min-height: 100vh;
  background: #f5f5f5;
  padding: 0 12px 20px;
}

.works-header {
  background: #fff;
  padding: 16px 0 12px;
  position: sticky;
  top: 0;
  z-index: 10;
}

.works-title {
  font-size: 18px;
  font-weight: 600;
  color: #333;
  display: block;
  margin-bottom: 12px;
}

.sort-tabs {
  display: flex;
  gap: 20px;
}

.tab {
  font-size: 14px;
  color: #999;
  padding-bottom: 4px;
}

.tab.active {
  color: #FF2442;
  font-weight: 500;
  border-bottom: 2px solid #FF2442;
}

.works-list {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  margin-top: 12px;
}

.work-card {
  width: calc(50% - 6px);
  background: #fff;
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 1px 4px rgba(0,0,0,0.08);
}

.work-cover {
  width: 100%;
  height: 180px;
  background: #eee;
}

.work-info {
  padding: 10px;
}

.work-title {
  font-size: 14px;
  color: #333;
  display: block;
  margin-bottom: 8px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.work-author {
  display: flex;
  align-items: center;
  gap: 6px;
}

.author-avatar {
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: #eee;
}

.author-name {
  font-size: 12px;
  color: #999;
}

.empty-state {
  text-align: center;
  padding: 60px 0;
  color: #999;
  font-size: 14px;
}

.loading-more {
  text-align: center;
  padding: 20px;
  color: #999;
  font-size: 14px;
}
```

- [ ] **Step 4: 创建 pages/works/index.js**

```javascript
const Api = require('../../utils/api.js');

Page({
  data: {
    works: [],
    sort: 'latest',
    page: 1,
    loading: false,
    hasMore: true
  },

  onLoad() {
    this.loadWorks();
  },

  onPullDownRefresh() {
    this.setData({ works: [], page: 1, hasMore: true });
    this.loadWorks().then(() => wx.stopPullDownRefresh());
  },

  onReachBottom() {
    if (!this.loading && this.data.hasMore) {
      this.setData({ page: this.data.page + 1 });
      this.loadWorks();
    }
  },

  switchSort(e) {
    const sort = e.currentTarget.dataset.sort;
    this.setData({ sort, works: [], page: 1, hasMore: true });
    this.loadWorks();
  },

  async loadWorks() {
    this.setData({ loading: true });
    try {
      const res = await Api.request('GET', `/works?sort=${this.data.sort}&page=${this.data.page}&limit=20`, null, true);
      const newWorks = res.data && res.data.data || [];
      this.setData({
        works: this.data.page === 1 ? newWorks : [...this.data.works, ...newWorks],
        hasMore: newWorks.length >= 20,
        loading: false
      });
    } catch (err) {
      this.setData({ loading: false });
      wx.showToast({ title: '加载失败', icon: 'none' });
    }
  },

  goWorkDetail(e) {
    const id = e.currentTarget.dataset.id;
    wx.navigateTo({ url: `/pages/work-detail/index?id=${id}` });
  }
});
```

- [ ] **Step 5: 提交**

```bash
git add pages/works/ && git commit -m "feat: add works page (approved works list, tab 2)"
```

---

## Task 4: 新建 pages/mine/index（Tab 3 个人中心）

**Files:**
- Create: `pages/mine/index.js`
- Create: `pages/mine/index.wxml`
- Create: `pages/mine/index.wxss`
- Create: `pages/mine/index.json`

**Steps:**

- [ ] **Step 1: 创建 pages/mine/index.json**

```json
{
  "usingComponents": {},
  "navigationBarTitleText": "我的"
}
```

- [ ] **Step 2: 创建 pages/mine/index.wxml**

```xml
<view class="mine-container">
  <!-- 用户信息卡片 -->
  <view class="user-card">
    <image class="avatar" src="{{user.avatar || '/assets/icons/home.png'}}"/>
    <view class="user-info">
      <text class="nickname">{{user.username || '未登录'}}</text>
      <text class="role-tag" wx:if="{{user.role === 'business'}}">商家</text>
      <text class="role-tag" wx:elif="{{user.role === 'creator'}}">创作者</text>
    </view>
  </view>

  <!-- 钱包卡片 -->
  <view class="wallet-card" bindtap="goWallet">
    <view class="wallet-left">
      <text class="wallet-label">钱包余额</text>
      <text class="wallet-balance">¥{{balance || '0.00'}}</text>
    </view>
    <text class="wallet-arrow">></text>
  </view>

  <!-- 功能列表 -->
  <view class="menu-list">
    <view class="menu-item" bindtap="goMyClaims">
      <text class="menu-icon">📋</text>
      <text class="menu-text">我领取的任务</text>
      <text class="menu-arrow">></text>
    </view>
    <view class="menu-item" bindtap="goMyTasks">
      <text class="menu-icon">📝</text>
      <text class="menu-text">我发布的任务</text>
      <text class="menu-arrow">></text>
    </view>
    <view class="menu-item" bindtap="goWorks">
      <text class="menu-icon">🎨</text>
      <text class="menu-text">我的提案</text>
      <text class="menu-arrow">></text>
    </view>
    <view class="menu-item" bindtap="goTransactions">
      <text class="menu-icon">💰</text>
      <text class="menu-text">收益明细</text>
      <text class="menu-arrow">></text>
    </view>
    <view class="menu-item" bindtap="goSettings">
      <text class="menu-icon">⚙️</text>
      <text class="menu-text">设置</text>
      <text class="menu-arrow">></text>
    </view>
  </view>

  <!-- 退出登录 -->
  <view class="logout-btn" bindtap="handleLogout" wx:if="{{isLoggedIn}}">
    <text>退出登录</text>
  </view>
</view>
```

- [ ] **Step 3: 创建 pages/mine/index.wxss**

```css
.mine-container {
  min-height: 100vh;
  background: #f5f5f5;
  padding: 12px;
}

.user-card {
  background: #fff;
  border-radius: 12px;
  padding: 20px;
  display: flex;
  align-items: center;
  margin-bottom: 12px;
}

.avatar {
  width: 60px;
  height: 60px;
  border-radius: 50%;
  background: #eee;
  margin-right: 16px;
}

.user-info {
  display: flex;
  flex-direction: column;
}

.nickname {
  font-size: 18px;
  font-weight: 600;
  color: #333;
  margin-bottom: 6px;
}

.role-tag {
  display: inline-block;
  font-size: 12px;
  color: #FF2442;
  background: rgba(255,36,66,0.1);
  padding: 2px 8px;
  border-radius: 10px;
  width: fit-content;
}

.wallet-card {
  background: linear-gradient(135deg, #FF2442, #ff6b6b);
  border-radius: 12px;
  padding: 20px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
  color: #fff;
}

.wallet-left {
  display: flex;
  flex-direction: column;
}

.wallet-label {
  font-size: 14px;
  opacity: 0.9;
  margin-bottom: 4px;
}

.wallet-balance {
  font-size: 28px;
  font-weight: 700;
}

.wallet-arrow {
  font-size: 20px;
  opacity: 0.9;
}

.menu-list {
  background: #fff;
  border-radius: 12px;
  overflow: hidden;
  margin-bottom: 12px;
}

.menu-item {
  display: flex;
  align-items: center;
  padding: 16px;
  border-bottom: 1px solid #f0f0f0;
}

.menu-item:last-child {
  border-bottom: none;
}

.menu-icon {
  font-size: 18px;
  margin-right: 12px;
}

.menu-text {
  flex: 1;
  font-size: 15px;
  color: #333;
}

.menu-arrow {
  color: #ccc;
  font-size: 16px;
}

.logout-btn {
  background: #fff;
  border-radius: 12px;
  padding: 16px;
  text-align: center;
  color: #999;
  font-size: 15px;
  margin-top: 12px;
}
```

- [ ] **Step 4: 创建 pages/mine/index.js**

```javascript
const Api = require('../../utils/api.js');
const app = getApp();

Page({
  data: {
    user: null,
    balance: '0.00',
    isLoggedIn: false
  },

  onShow() {
    const isLoggedIn = app.isLoggedIn();
    this.setData({ isLoggedIn });
    if (isLoggedIn) {
      const user = app.getUser();
      this.setData({ user });
      this.loadWallet();
    } else {
      this.setData({ user: null, balance: '0.00' });
    }
  },

  async loadWallet() {
    try {
      const res = await Api.getWallet();
      const wallet = res.data || {};
      this.setData({ balance: (wallet.balance || 0).toFixed(2) });
    } catch (err) {
      // ignore
    }
  },

  goWallet() {
    wx.navigateTo({ url: '/pages/wallet/index' });
  },

  goMyClaims() {
    if (!app.isLoggedIn()) {
      wx.navigateTo({ url: '/pages/login/index' });
      return;
    }
    wx.navigateTo({ url: '/pages/my-claims/index' });
  },

  goMyTasks() {
    if (!app.isLoggedIn()) {
      wx.navigateTo({ url: '/pages/login/index' });
      return;
    }
    wx.navigateTo({ url: '/pages/my-tasks/index' });
  },

  goWorks() {
    wx.switchTab({ url: '/pages/works/index' });
  },

  goTransactions() {
    if (!app.isLoggedIn()) {
      wx.navigateTo({ url: '/pages/login/index' });
      return;
    }
    wx.navigateTo({ url: '/pages/transactions/index' });
  },

  goSettings() {
    if (!app.isLoggedIn()) {
      wx.navigateTo({ url: '/pages/login/index' });
      return;
    }
    wx.navigateTo({ url: '/pages/settings/index' });
  },

  handleLogout() {
    wx.showModal({
      title: '确认退出',
      content: '确定要退出登录吗？',
      success: (res) => {
        if (res.confirm) {
          Api.logout();
          wx.showToast({ title: '已退出', icon: 'success' });
          setTimeout(() => {
            wx.switchTab({ url: '/pages/mine/index' });
          }, 1000);
        }
      }
    });
  }
});
```

- [ ] **Step 5: 提交**

```bash
git add pages/mine/ && git commit -m "feat: add mine page (personal center, tab 3)"
```

---

## Task 5: 新建 pages/my-claims/index（我领取的任务）

**Files:**
- Create: `pages/my-claims/index.json`
- Create: `pages/my-claims/index.wxml`
- Create: `pages/my-claims/index.wxss`
- Create: `pages/my-claims/index.js`

**Steps:**

- [ ] **Step 1: 创建所有文件（参考 my-tasks 的 claims 部分逻辑）**

pages/my-claims/index.json:
```json
{
  "usingComponents": {},
  "navigationBarTitleText": "我领取的任务"
}
```

pages/my-claims/index.wxml — 显示创作者的认领记录列表，每项显示任务标题、状态、提交按钮:
```xml
<view class="claims-container">
  <view class="tabs">
    <text class="tab {{activeTab === 'all' ? 'active' : ''}}" data-tab="all" bindtap="switchTab">全部</text>
    <text class="tab {{activeTab === 'pending' ? 'active' : ''}}" data-tab="pending" bindtap="switchTab">待提交</text>
    <text class="tab {{activeTab === 'submitted' ? 'active' : ''}}" data-tab="submitted" bindtap="switchTab">待验收</text>
    <text class="tab {{activeTab === 'completed' ? 'active' : ''}}" data-tab="completed" bindtap="switchTab">已完成</text>
  </view>

  <view class="claim-list" wx:if="{{claims.length > 0}}">
    <view class="claim-card" wx:for="{{filteredClaims}}" wx:key="id" bindtap="goTaskDetail" data-id="{{item.task_id}}">
      <view class="claim-header">
        <text class="claim-task-title">{{item.task_title || '任务' + item.task_id}}</text>
        <text class="claim-status status-{{item.status}}">{{getClaimStatusText(item.status)}}</text>
      </view>
      <view class="claim-body">
        <text class="claim-price">¥{{item.unit_price || 0}}</text>
        <text class="claim-time">{{item.created_at}}</text>
      </view>
      <view class="claim-actions" catchtap="stopPropagation" wx:if="{{item.status === 1}}">
        <button class="btn-submit" bindtap="showSubmitModal" data-claim-id="{{item.id}}">提交作品</button>
      </view>
    </view>
  </view>

  <view class="empty-state" wx:if="{{!loading && claims.length === 0}}">
    <text>暂无认领记录</text>
  </view>
</view>

<!-- 提交弹窗 -->
<view class="modal-mask" wx:if="{{showSubmitModal}}" bindtap="hideSubmitModal">
  <view class="modal-content" catchtap="stopPropagation">
    <text class="modal-title">提交作品</text>
    <input class="modal-input" placeholder="请输入视频链接" value="{{submitUrl}}" bindinput="onSubmitUrlInput"/>
    <input class="modal-input" placeholder="备注（选填）" value="{{submitNote}}" bindinput="onSubmitNoteInput"/>
    <view class="modal-btns">
      <button class="btn-cancel" bindtap="hideSubmitModal">取消</button>
      <button class="btn-confirm" bindtap="confirmSubmit">提交</button>
    </view>
  </view>
</view>
```

pages/my-claims/index.wxss — 与 my-tasks 中 claims 部分样式一致:
```css
.claims-container {
  min-height: 100vh;
  background: #f5f5f5;
}

.tabs {
  background: #fff;
  display: flex;
  padding: 12px 16px;
  gap: 20px;
  position: sticky;
  top: 0;
  z-index: 10;
}

.tab {
  font-size: 14px;
  color: #999;
  padding-bottom: 4px;
}

.tab.active {
  color: #FF2442;
  font-weight: 500;
  border-bottom: 2px solid #FF2442;
}

.claim-list {
  padding: 12px;
}

.claim-card {
  background: #fff;
  border-radius: 8px;
  padding: 16px;
  margin-bottom: 12px;
}

.claim-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.claim-task-title {
  font-size: 15px;
  font-weight: 500;
  color: #333;
}

.claim-status {
  font-size: 12px;
  padding: 2px 8px;
  border-radius: 10px;
}

.status-1 { background: #fff7e6; color: #fa8c16; }
.status-2 { background: #e6fff7; color: #52c41a; }
.status-5 { background: #fff1f0; color: #ff4d4f; }

.claim-body {
  display: flex;
  justify-content: space-between;
  margin-bottom: 8px;
}

.claim-price {
  font-size: 16px;
  font-weight: 600;
  color: #FF2442;
}

.claim-time {
  font-size: 12px;
  color: #999;
}

.claim-actions {
  display: flex;
  justify-content: flex-end;
}

.btn-submit {
  font-size: 13px;
  color: #fff;
  background: #FF2442;
  padding: 6px 16px;
  border-radius: 16px;
  border: none;
}

.empty-state {
  text-align: center;
  padding: 60px 0;
  color: #999;
  font-size: 14px;
}

.modal-mask {
  position: fixed;
  top: 0; left: 0; right: 0; bottom: 0;
  background: rgba(0,0,0,0.5);
  z-index: 100;
  display: flex;
  align-items: center;
  justify-content: center;
}

.modal-content {
  background: #fff;
  border-radius: 12px;
  padding: 24px;
  width: 80%;
}

.modal-title {
  font-size: 16px;
  font-weight: 600;
  display: block;
  margin-bottom: 16px;
  text-align: center;
}

.modal-input {
  border: 1px solid #eee;
  border-radius: 8px;
  padding: 10px 12px;
  font-size: 14px;
  margin-bottom: 12px;
}

.modal-btns {
  display: flex;
  gap: 12px;
  margin-top: 16px;
}

.btn-cancel, .btn-confirm {
  flex: 1;
  padding: 10px;
  border-radius: 8px;
  font-size: 14px;
  border: none;
}

.btn-cancel {
  background: #f5f5f5;
  color: #666;
}

.btn-confirm {
  background: #FF2442;
  color: #fff;
}
```

pages/my-claims/index.js:
```javascript
const Api = require('../../utils/api.js');
const { getClaimStatusText } = require('../../utils/util.js');

Page({
  data: {
    claims: [],
    filteredClaims: [],
    activeTab: 'all',
    showSubmitModal: false,
    submitClaimId: null,
    submitUrl: '',
    submitNote: ''
  },

  onLoad() {
    this.loadClaims();
  },

  onPullDownRefresh() {
    this.loadClaims().then(() => wx.stopPullDownRefresh());
  },

  async loadClaims() {
    wx.showLoading({ title: '加载中...' });
    try {
      const res = await Api.getMyClaims({ page: 1 });
      const claims = res.data && res.data.data || [];
      this.setData({ claims, filteredClaims: claims });
    } catch (err) {
      wx.showToast({ title: '加载失败', icon: 'none' });
    } finally {
      wx.hideLoading();
    }
  },

  switchTab(e) {
    const tab = e.currentTarget.dataset.tab;
    this.setData({ activeTab: tab });
    const statusMap = { all: null, pending: 0, submitted: 1, completed: 2 };
    const status = statusMap[tab];
    const filtered = status === null ? this.data.claims : this.data.claims.filter(c => c.status === status);
    this.setData({ filteredClaims: filtered });
  },

  goTaskDetail(e) {
    wx.navigateTo({ url: `/pages/task-detail/index?id=${e.currentTarget.dataset.id}` });
  },

  getClaimStatusText(status) {
    return getClaimStatusText(status);
  },

  showSubmitModal(e) {
    this.setData({ showSubmitModal: true, submitClaimId: e.currentTarget.dataset.claimId, submitUrl: '', submitNote: '' });
  },

  hideSubmitModal() {
    this.setData({ showSubmitModal: false });
  },

  onSubmitUrlInput(e) { this.setData({ submitUrl: e.detail.value }); },
  onSubmitNoteInput(e) { this.setData({ submitNote: e.detail.value }); },
  stopPropagation() {},

  async confirmSubmit() {
    const { submitClaimId, submitUrl, submitNote } = this.data;
    if (!submitUrl) { wx.showToast({ title: '请输入视频链接', icon: 'none' }); return; }
    wx.showLoading({ title: '提交中...' });
    try {
      const content = submitNote ? `${submitUrl}\n${submitNote}` : submitUrl;
      await Api.submitClaim(submitClaimId, { content });
      wx.showToast({ title: '提交成功！', icon: 'success' });
      this.hideSubmitModal();
      this.loadClaims();
    } catch (err) {
      wx.showToast({ title: err.message || '提交失败', icon: 'none' });
    } finally {
      wx.hideLoading();
    }
  }
});
```

- [ ] **Step 2: 提交**

```bash
git add pages/my-claims/ && git commit -m "feat: add my-claims page (creator claims list)"
```

---

## Task 6: 新建 pages/transactions/index（收益明细）

**Files:**
- Create: `pages/transactions/index.json`
- Create: `pages/transactions/index.wxml`
- Create: `pages/transactions/index.wxss`
- Create: `pages/transactions/index.js`

**Steps:**

- [ ] **Step 1: 创建所有文件（复用 wallet/index 的交易记录逻辑）**

pages/transactions/index.json:
```json
{
  "usingComponents": {},
  "navigationBarTitleText": "收益明细"
}
```

pages/transactions/index.wxml:
```xml
<view class="transactions-container">
  <view class="transaction-list" wx:if="{{transactions.length > 0}}">
    <view class="transaction-item" wx:for="{{transactions}}" wx:key="id">
      <view class="trans-left">
        <text class="trans-type">{{item.type_text}}</text>
        <text class="trans-time">{{item.created_at}}</text>
      </view>
      <text class="trans-amount {{item.amount > 0 ? 'income' : 'expense'}}">
        {{item.amount > 0 ? '+' : ''}}{{item.amount}}
      </text>
    </view>
  </view>
  <view class="empty-state" wx:if="{{!loading && transactions.length === 0}}">
    <text>暂无交易记录</text>
  </view>
  <view class="loading-more" wx:if="{{loading}}">
    <text>加载中...</text>
  </view>
</view>
```

pages/transactions/index.wxss:
```css
.transactions-container {
  min-height: 100vh;
  background: #f5f5f5;
  padding: 12px;
}

.transaction-list {
  background: #fff;
  border-radius: 8px;
  overflow: hidden;
}

.transaction-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px;
  border-bottom: 1px solid #f0f0f0;
}

.transaction-item:last-child {
  border-bottom: none;
}

.trans-left {
  display: flex;
  flex-direction: column;
}

.trans-type {
  font-size: 15px;
  color: #333;
  margin-bottom: 4px;
}

.trans-time {
  font-size: 12px;
  color: #999;
}

.trans-amount {
  font-size: 16px;
  font-weight: 600;
}

.trans-amount.income { color: #52c41a; }
.trans-amount.expense { color: #FF2442; }

.empty-state {
  text-align: center;
  padding: 60px 0;
  color: #999;
  font-size: 14px;
}

.loading-more {
  text-align: center;
  padding: 20px;
  color: #999;
  font-size: 14px;
}
```

pages/transactions/index.js:
```javascript
const Api = require('../../utils/api.js');

Page({
  data: {
    transactions: [],
    loading: false
  },

  onLoad() {
    this.loadTransactions();
  },

  onPullDownRefresh() {
    this.loadTransactions().then(() => wx.stopPullDownRefresh());
  },

  async loadTransactions() {
    this.setData({ loading: true });
    wx.showLoading({ title: '加载中...' });
    try {
      const res = await Api.getTransactions();
      const transData = res.data && res.data.transactions || [];
      const typeMap = { 1: '充值', 2: '提现', 3: '任务收入', 4: '冻结', 5: '解冻' };
      const transactions = transData.map(t => ({
        ...t,
        type_text: typeMap[t.type] || '其他'
      }));
      this.setData({ transactions, loading: false });
    } catch (err) {
      wx.showToast({ title: '加载失败', icon: 'none' });
      this.setData({ loading: false });
    } finally {
      wx.hideLoading();
    }
  }
});
```

- [ ] **Step 2: 提交**

```bash
git add pages/transactions/ && git commit -m "feat: add transactions page (income details)"
```

---

## Task 7: 新建 pages/settings/index（设置页）

**Files:**
- Create: `pages/settings/index.json`
- Create: `pages/settings/index.wxml`
- Create: `pages/settings/index.wxss`
- Create: `pages/settings/index.js`

**Steps:**

- [ ] **Step 1: 创建所有文件**

pages/settings/index.json:
```json
{
  "usingComponents": {},
  "navigationBarTitleText": "设置"
}
```

pages/settings/index.wxml:
```xml
<view class="settings-container">
  <view class="menu-list">
    <view class="menu-item" bindtap="goProfile">
      <text class="menu-text">个人信息</text>
      <text class="menu-arrow">></text>
    </view>
    <view class="menu-item" bindtap="goHelp">
      <text class="menu-text">帮助中心</text>
      <text class="menu-arrow">></text>
    </view>
    <view class="menu-item" bindtap="goAbout">
      <text class="menu-text">关于我们</text>
      <text class="menu-arrow">></text>
    </view>
  </view>

  <view class="logout-btn" bindtap="handleLogout">
    <text>退出登录</text>
  </view>

  <view class="version">版本 1.0.0</view>
</view>
```

pages/settings/index.wxss:
```css
.settings-container {
  min-height: 100vh;
  background: #f5f5f5;
  padding: 12px;
}

.menu-list {
  background: #fff;
  border-radius: 12px;
  overflow: hidden;
}

.menu-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px;
  border-bottom: 1px solid #f0f0f0;
}

.menu-item:last-child {
  border-bottom: none;
}

.menu-text {
  font-size: 15px;
  color: #333;
}

.menu-arrow {
  color: #ccc;
  font-size: 16px;
}

.logout-btn {
  background: #fff;
  border-radius: 12px;
  padding: 16px;
  text-align: center;
  color: #FF2442;
  font-size: 15px;
  margin-top: 12px;
}

.version {
  text-align: center;
  color: #ccc;
  font-size: 12px;
  margin-top: 24px;
}
```

pages/settings/index.js:
```javascript
const Api = require('../../utils/api.js');

Page({
  onLoad() {
    if (!getApp().isLoggedIn()) {
      wx.navigateTo({ url: '/pages/login/index' });
    }
  },

  goProfile() {
    wx.showToast({ title: '功能开发中', icon: 'none' });
  },

  goHelp() {
    wx.showToast({ title: '功能开发中', icon: 'none' });
  },

  goAbout() {
    wx.showToast({ title: '功能开发中', icon: 'none' });
  },

  handleLogout() {
    wx.showModal({
      title: '确认退出',
      content: '确定要退出登录吗？',
      success: (res) => {
        if (res.confirm) {
          Api.logout();
          wx.showToast({ title: '已退出', icon: 'success' });
          setTimeout(() => {
            wx.switchTab({ url: '/pages/mine/index' });
          }, 1000);
        }
      }
    });
  }
});
```

- [ ] **Step 2: 提交**

```bash
git add pages/settings/ && git commit -m "feat: add settings page"
```

---

## Task 8: 新建 pages/work-detail/index（作品详情）

**Files:**
- Create: `pages/work-detail/index.json`
- Create: `pages/work-detail/index.wxml`
- Create: `pages/work-detail/index.wxss`
- Create: `pages/work-detail/index.js`

**Steps:**

- [ ] **Step 1: 创建所有文件**

pages/work-detail/index.json:
```json
{
  "usingComponents": {},
  "navigationBarTitleText": "作品详情"
}
```

pages/work-detail/index.wxml — 作品大图/视频 + 作者信息:
```xml
<view class="work-detail-container">
  <view class="work-media">
    <image wx:if="{{work.image}}" class="work-image" src="{{work.image}}" mode="widthFix"/>
    <video wx:if="{{work.video}}" class="work-video" src="{{work.video}}" controls/>
  </view>

  <view class="work-info-card">
    <text class="work-title">{{work.title || '作品'}}</text>
    <view class="work-author">
      <image class="author-avatar" src="{{work.creator_avatar || '/assets/icons/home.png'}}"/>
      <text class="author-name">{{work.creator_name || '创作者'}}</text>
    </view>
  </view>

  <view class="action-bar">
    <button class="action-btn share-btn" open-type="share">分享</button>
  </view>
</view>
```

pages/work-detail/index.wxss:
```css
.work-detail-container {
  min-height: 100vh;
  background: #f5f5f5;
}

.work-media {
  width: 100%;
}

.work-image {
  width: 100%;
  display: block;
}

.work-video {
  width: 100%;
}

.work-info-card {
  background: #fff;
  padding: 16px;
  margin-bottom: 12px;
}

.work-title {
  font-size: 16px;
  font-weight: 500;
  color: #333;
  display: block;
  margin-bottom: 12px;
}

.work-author {
  display: flex;
  align-items: center;
  gap: 8px;
}

.author-avatar {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: #eee;
}

.author-name {
  font-size: 14px;
  color: #666;
}

.action-bar {
  padding: 16px;
}

.action-btn {
  width: 100%;
  background: #FF2442;
  color: #fff;
  border-radius: 24px;
  border: none;
  font-size: 15px;
}
```

pages/work-detail/index.js:
```javascript
const Api = require('../../utils/api.js');

Page({
  data: {
    work: null
  },

  onLoad(e) {
    if (e.id) {
      this.loadWork(e.id);
    }
  },

  async loadWork(id) {
    wx.showLoading({ title: '加载中...' });
    try {
      const res = await Api.request('GET', `/works/${id}`, null, true);
      this.setData({ work: res.data });
    } catch (err) {
      wx.showToast({ title: '加载失败', icon: 'none' });
    } finally {
      wx.hideLoading();
    }
  }
});
```

- [ ] **Step 2: 提交**

```bash
git add pages/work-detail/ && git commit -m "feat: add work-detail page"
```

---

## Task 9: 改造 home/index → 任务大厅

**Files:**
- Modify: `pages/home/index.js`
- Modify: `pages/home/index.wxml`
- Modify: `pages/home/index.wxss`

**说明:** 现有 home/index 已基本是任务列表，只需确认其调用了正确的 `GET /tasks` 接口（已确认正确），检查搜索/筛选/分页逻辑即可。

**Steps:**

- [ ] **Step 1: 检查并确认 home/index.js 调用 GET /tasks**

读取 `pages/home/index.js`，确认:
1. `Api.getTasks()` 被调用（对应 `GET /tasks`）✓
2. 支持 `page`, `limit`, `keyword`, `sort` 参数 ✓
3. 下拉刷新和触底加载正确 ✓

如无需修改则跳过此步。

- [ ] **Step 2: 确认 navigationBarTitleText 为"任务大厅"**

检查 `pages/home/index.json`，如未设置则添加:
```json
{
  "navigationBarTitleText": "任务大厅"
}
```

- [ ] **Step 3: 提交**

```bash
git add pages/home/index.js pages/home/index.json && git commit -m "refactor: update home page as task hall (任务大厅)"
```

---

## Task 10: 清理废弃文件引用（从 app.json 移除）

**Files:**
- Modify: `app.json` (已在 Task 1 中处理)

**说明:** 废弃页面 (`create-task`, `my-tasks` tab, `video-proposals` tab, `register`) 不再在 tabBar 中出现，但页面文件保留在目录中备用。

`pages/register/` 目录整个移除:
```bash
git rm -r pages/register/
git add app.json
git commit -m "feat: remove register page (wechat login only)"
```

---

## 自检清单

- [ ] 3 个 Tab 均可正常切换
- [ ] 微信登录可正常调用 `/auth/wechat-mini-login`
- [ ] works 页面调用 `GET /works` 显示作品列表
- [ ] mine 页面正确显示用户信息和钱包余额
- [ ] 所有跳转链接正确
- [ ] 无未处理的 `console.log` 或调试代码
