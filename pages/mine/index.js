const Api = require('../../utils/api.js');
const app = getApp();
const buildInfo = require('../../build-info.js');

Page({
  data: {
    navPinned: false,
    navElevated: false,
    navSlotPx: 64,
    user: null,
    balance: '0.00',
    isLoggedIn: false,
    displayText: '',
    avatarSrc: '/assets/icons/avatar-default.jpg',
    creatorStats: {
      level: 0,
      level_name: '试用创作者',
      adopted_count: 0,
      daily_limit: 3,
      commission_rate: '10%',
      next_level_name: '新手创作者',
      need_count: 1,
      pending_count: 0
    },
    bizStats: {
      accepted_count: 0,
      pending_count: 0,
      adopted_count: 0
    },
    merchantAuthStatus: 'uncertified',
    merchantAuthActionText: '去认证',
    merchantAuthActionClass: 'is-uncertified'
  },

  onLoad() {
    this._navScrollTimer = null;
    this._lastScrollTop = 0;
    const statusBar = app.globalData.statusBarHeight || 20;
    this.setData({ navSlotPx: statusBar + 44 });
  },

  onShow() {
    this.refreshPageData();
  },

  onHide() {
    if (this._navScrollTimer) {
      clearTimeout(this._navScrollTimer);
      this._navScrollTimer = null;
    }
  },

  onUnload() {
    if (this._navScrollTimer) {
      clearTimeout(this._navScrollTimer);
      this._navScrollTimer = null;
    }
  },

  onPageScroll(e) {
    this._lastScrollTop = Number(e.scrollTop) || 0;
    if (this._navScrollTimer) {
      clearTimeout(this._navScrollTimer);
    }
    this._navScrollTimer = setTimeout(() => {
      this._navScrollTimer = null;
      this._syncNavWithScroll(this._lastScrollTop);
    }, 16);
  },

  _syncNavWithScroll(scrollTop) {
    const pinned = scrollTop >= 1;
    const query = wx.createSelectorQuery().in(this);
    query.select('#mine-top-anchor').boundingClientRect();
    query.exec((res) => {
      const rect = res && res[0];
      if (!rect || typeof rect.top !== 'number') {
        if (pinned !== this.data.navPinned || this.data.navElevated) {
          this.setData({ navPinned: pinned, navElevated: false });
        }
        return;
      }
      const elevated = rect.top < 0;
      if (pinned !== this.data.navPinned || elevated !== this.data.navElevated) {
        this.setData({ navPinned: pinned, navElevated: elevated });
      }
    });
  },

  async refreshPageData() {
    const isLoggedIn = app.isLoggedIn();
    this.setData({ isLoggedIn });
    this.updateDisplayText();
    if (isLoggedIn) {
      await this.loadUserAndWallet();
      await this.loadMineStats();
      await this.loadMerchantAuthStatus();
    } else {
      this.setData({
        user: null,
        balance: '0.00',
        avatarSrc: '/assets/icons/avatar-default.jpg',
        merchantAuthStatus: 'uncertified',
        merchantAuthActionText: '去认证',
        merchantAuthActionClass: 'is-uncertified'
      });
      // 触发静默登录
      await app.silentLogin();
      this.setData({ isLoggedIn: app.isLoggedIn() });
      if (app.isLoggedIn()) {
        await this.loadUserAndWallet();
        await this.loadMineStats();
        await this.loadMerchantAuthStatus();
      }
    }
  },

  onPullDownRefresh() {
    this.refreshPageData().finally(() => wx.stopPullDownRefresh());
  },

  async loadUserAndWallet() {
    try {
      const [userRes, walletRes] = await Promise.all([
        Api.getMe(),
        Api.getWallet()
      ]);
      const user = userRes.data || {};
      const normalizedUser = { ...user, avatar: Api.getRawDisplayUrl(user.avatar) };
      const wallet = walletRes.data || {};
      // 更新全局用户缓存
      app.setAuth(app.getToken(), normalizedUser);
      this.setData({
        user: normalizedUser,
        avatarSrc: Api.getDisplayUrl(normalizedUser.avatar) || '/assets/icons/avatar-default.jpg',
        balance: (wallet.balance || 0).toFixed(2)
      });
    } catch (err) {
      if (err.message !== '登录已过期') {
        wx.showToast({ title: '加载失败', icon: 'none' });
      }
    }
  },

  normalizeMerchantAuthStatus(rawStatus, businessVerified) {
    const statusMap = {
      certified: { status: 'certified', text: '已认证', className: 'is-certified' },
      pending: { status: 'pending', text: '审核中', className: 'is-pending' },
      rejected: { status: 'rejected', text: '审核未通过', className: 'is-rejected' },
      uncertified: { status: 'uncertified', text: '去认证', className: 'is-uncertified' },
      0: { status: 'uncertified', text: '去认证', className: 'is-uncertified' },
      1: { status: 'pending', text: '审核中', className: 'is-pending' },
      2: { status: 'certified', text: '已认证', className: 'is-certified' },
      3: { status: 'rejected', text: '审核未通过', className: 'is-rejected' }
    };
    const normalized = statusMap[rawStatus] || (businessVerified ? statusMap.certified : statusMap.uncertified);
    return normalized;
  },

  async loadMerchantAuthStatus() {
    try {
      const res = await Api.getMerchantAuthStatus();
      const data = res.data || {};
      const normalized = this.normalizeMerchantAuthStatus(data.status || data.status_code, data.business_verified);
      this.setData({
        merchantAuthStatus: normalized.status,
        merchantAuthActionText: normalized.text,
        merchantAuthActionClass: normalized.className
      });
    } catch (err) {
      const fallback = this.normalizeMerchantAuthStatus(
        this.data.user && this.data.user.business_verified ? 'certified' : 'uncertified',
        this.data.user && this.data.user.business_verified
      );
      this.setData({
        merchantAuthStatus: fallback.status,
        merchantAuthActionText: fallback.text,
        merchantAuthActionClass: fallback.className
      });
    }
  },

  async loadMineStats() {
    try {
      const res = await Api.getMineStats();
      const stats = res.data || {};
      const creatorStats = stats.creator_stats || {};
      const businessStats = stats.business_stats || {};
      const creatorLevel = Number(creatorStats.level || 0);
      // 计算升级所需
      const levelConfig = [
        { level: 0, need: 1, next: '新手创作者' },
        { level: 1, need: 5, next: '活跃创作者' },
        { level: 2, need: 20, next: '优质创作者' },
        { level: 3, need: 50, next: '金牌创作者' },
        { level: 4, need: 100, next: '特约创作者' },
        { level: 5, need: null, next: null }
      ];
      const adopted = creatorStats.adopted_count || 0;
      let nextLevel = null;
      let needCount = 0;
      for (const cfg of levelConfig) {
        if (cfg.level === creatorLevel) {
          nextLevel = cfg.next;
          needCount = cfg.need ? cfg.need - adopted : 0;
          break;
        }
      }
      // 每日投稿上限
      const dailyLimits = [3, 8, 15, 30, 50, 999];
      const commissionRates = ['10%', '10%', '10%', '5%', '5%', '3%'];
      const levelNameMap = ['试用创作者', '新手创作者', '活跃创作者', '优质创作者', '金牌创作者', '特约创作者'];
      const safeLevel = Math.min(Math.max(creatorLevel, 0), levelNameMap.length - 1);
      this.setData({
        creatorStats: {
          level: creatorLevel,
          level_name: levelNameMap[safeLevel] || '试用创作者',
          adopted_count: adopted,
          daily_limit: dailyLimits[safeLevel] || 3,
          commission_rate: commissionRates[safeLevel] || '10%',
          next_level_name: nextLevel,
          need_count: Math.max(0, needCount),
          pending_count: stats.pending_claims || 0
        }
      });
      this.setData({
        bizStats: {
          accepted_count: businessStats.accepted_count || 0,
          pending_count: stats.pending_reviews || 0,
          adopted_count: businessStats.adopted_count || 0
        }
      });
    } catch (err) {
      const code = err && err.code !== undefined && err.code !== null ? String(err.code) : 'NO_CODE';
      const message = (err && err.message) ? String(err.message) : '未知错误';
      console.error('[mine/stats] load failed', {
        code,
        message,
        err
      });
      wx.showToast({
        title: `统计失败 ${code}: ${message}`.slice(0, 30),
        icon: 'none'
      });
      wx.showModal({
        title: '我的统计加载失败',
        content: `code: ${code}\nmessage: ${message}`.slice(0, 500),
        showCancel: false
      });
    }
  },

  updateDisplayText() {
    const uploadTime = buildInfo.uploadTime;
    if (uploadTime) {
      this.setData({ displayText: String(uploadTime).trim() });
      return;
    }

    this.setData({ displayText: '' });
  },

  onAvatarError() {
    if (this.data.avatarSrc !== '/assets/icons/avatar-default.jpg') {
      this.setData({ avatarSrc: '/assets/icons/avatar-default.jpg' });
    }
  },

  _ensureLogin(callback) {
    if (app.isLoggedIn()) {
      callback();
    } else {
      wx.showLoading({ title: '登录中...' });
      app.silentLogin().then(() => {
        wx.hideLoading();
        if (app.isLoggedIn()) {
          callback();
        } else {
          wx.showToast({ title: '登录失败，请稍后重试', icon: 'none' });
        }
      });
    }
  },

  goProfile() {
    this._ensureLogin(() => {
      wx.navigateTo({ url: '/pages/mine/profile/index' });
    });
  },
  goLevel() {
    this._ensureLogin(() => {
      wx.navigateTo({ url: '/pages/creator/level/index' });
    });
  },

  goWallet() {
    this._ensureLogin(() => {
      wx.navigateTo({ url: '/pages/wallet/index' });
    });
  },

  goMyTasks() {
    this._ensureLogin(() => {
      wx.navigateTo({ url: '/pages/employer/my-tasks/index' });
    });
  },

  goMyClaims() {
    this._ensureLogin(() => {
      wx.navigateTo({ url: '/pages/creator/my-claims/index' });
    });
  },

  goPublishTask() {
    this._ensureLogin(() => {
      wx.navigateTo({ url: '/pages/employer/create-task/index' });
    });
  },

  goAdoptedWorks() {
    this._ensureLogin(() => {
      wx.navigateTo({ url: '/pages/creator/adopted-works/index' });
    });
  },

  goCreatorData() {
    this._ensureLogin(() => {
      wx.navigateTo({ url: '/pages/creator/data/index' });
    });
  },

  goWorks() {
    this._ensureLogin(() => {
      wx.navigateTo({ url: '/pages/creator/my-works/index' });
    });
  },

  goHelp() {
    wx.navigateTo({ url: '/pages/mine/help/index' });
  },

  goAbout() {
    wx.navigateTo({ url: '/pages/mine/about/index' });
  },

  goHome() {
    wx.switchTab({ url: '/pages/home/index' });
  },

  goInspiration() {
    wx.switchTab({ url: '/pages/works/index' });
  },

  goMerchantAuth() {
    this._ensureLogin(() => {
      wx.navigateTo({ url: '/pages/mine/merchant-auth/index' });
    });
  },

  goPurchasedWorks() {
    this._ensureLogin(() => {
      wx.navigateTo({ url: '/pages/employer/purchased-works/index' });
    });
  },

  goAppeal() {
    this._ensureLogin(() => {
      wx.navigateTo({ url: '/pages/mine/appeal/index' });
    });
  },

  goCustomerService() {
    wx.navigateTo({ url: '/pages/mine/customer-service/index' });
  },

  goBack() {
    wx.navigateBack({ delta: 1 });
  },

  copyUserId() {
    const userId = this.data.user?.id;
    if (userId) {
      wx.setClipboardData({
        data: String(userId),
        success: () => {
          wx.showToast({
            title: '复制成功',
            icon: 'success'
          });
        },
        fail: () => {
          wx.showToast({
            title: '复制失败',
            icon: 'none'
          });
        }
      });
    }
  },
});
