const Api = require('../../utils/api.js');
const app = getApp();
const buildInfo = require('../../build-info.js');

Page({
  data: {
    user: null,
    balance: '0.00',
    isLoggedIn: false,
    displayText: '',
    creatorStats: {
      level: 0,
      level_name: '试用创作者',
      adopted_count: 0,
      daily_limit: 3,
      commission_rate: '10%',
      next_level_name: '新手创作者',
      need_count: 1
    },
    bizStats: {
      accepted_count: 0,
      pending_count: 0,
      adopted_count: 0
    }
  },

  onShow() {
    const isLoggedIn = app.isLoggedIn();
    this.setData({ isLoggedIn });
    this.updateDisplayText();
    if (isLoggedIn) {
      this.loadUserAndWallet();
      this.loadCreatorStats();
      this.loadBusinessStats();
    } else {
      this.setData({ user: null, balance: '0.00' });
      // 触发静默登录
      app.silentLogin().then(() => {
        this.setData({ isLoggedIn: app.isLoggedIn() });
        if (app.isLoggedIn()) {
          this.loadUserAndWallet();
          this.loadCreatorStats();
          this.loadBusinessStats();
        }
      });
    }
  },

  async loadUserAndWallet() {
    try {
      const [userRes, walletRes] = await Promise.all([
        Api.getMe(),
        Api.getWallet()
      ]);
      const user = userRes.data || {};
      const wallet = walletRes.data || {};
      // 更新全局用户缓存
      app.setAuth(app.getToken(), user);
      this.setData({
        user,
        balance: (wallet.balance || 0).toFixed(2)
      });
    } catch (err) {
      if (err.message !== '登录已过期') {
        wx.showToast({ title: '加载失败', icon: 'none' });
      }
    }
  },

  async loadCreatorStats() {
    try {
      const res = await Api.getCreatorStats();
      const stats = res.data || {};
      // 计算升级所需
      const levelConfig = [
        { level: 0, need: 1, next: '新手创作者' },
        { level: 1, need: 5, next: '活跃创作者' },
        { level: 2, need: 20, next: '优质创作者' },
        { level: 3, need: 50, next: '金牌创作者' },
        { level: 4, need: 100, next: '特约创作者' },
        { level: 5, need: null, next: null }
      ];
      const adopted = stats.adopted_count || 0;
      let nextLevel = null;
      let needCount = 0;
      for (const cfg of levelConfig) {
        if (cfg.level === stats.level) {
          nextLevel = cfg.next;
          needCount = cfg.need ? cfg.need - adopted : 0;
          break;
        }
      }
      // 每日投稿上限
      const dailyLimits = [3, 8, 15, 30, 50, 999];
      const commissionRates = ['10%', '10%', '10%', '5%', '5%', '3%'];
      const levelNameMap = ['试用创作者', '新手创作者', '活跃创作者', '优质创作者', '金牌创作者', '特约创作者'];
      this.setData({
        creatorStats: {
          level: stats.level || 0,
          level_name: levelNameMap[stats.level] || '试用创作者',
          adopted_count: adopted,
          daily_limit: dailyLimits[stats.level] || 3,
          commission_rate: commissionRates[stats.level] || '10%',
          next_level_name: nextLevel,
          need_count: Math.max(0, needCount)
        }
      });
    } catch (err) {
      // 使用默认数据
    }
  },

  async loadBusinessStats() {
    try {
      const res = await Api.getBusinessStats();
      const stats = res.data || {};
      this.setData({
        bizStats: {
          accepted_count: stats.accepted_count || 0,
          pending_count: stats.pending_count || 0,
          adopted_count: stats.adopted_count || 0
        }
      });
    } catch (err) {
      // 使用默认数据
    }
  },

  updateDisplayText() {
    const uploadTime = buildInfo.uploadTime;
    if (uploadTime) {
      const date = new Date(uploadTime);
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      const hours = String(date.getHours()).padStart(2, '0');
      const minutes = String(date.getMinutes()).padStart(2, '0');
      this.setData({ displayText: `${month}-${day} ${hours}:${minutes}` });
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
      wx.showToast({ title: '个人资料开发中', icon: 'none' });
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
    wx.showToast({ title: '帮助中心开发中', icon: 'none' });
  },

  goAbout() {
    wx.showToast({ title: '关于我们开发中', icon: 'none' });
  },

  goHome() {
    wx.switchTab({ url: '/pages/home/index' });
  },

  goInspiration() {
    wx.switchTab({ url: '/pages/works/index' });
  },

  goMerchantAuth() {
    this._ensureLogin(() => {
      wx.showToast({ title: '商家认证功能开发中', icon: 'none' });
    });
  },

  goPurchasedWorks() {
    this._ensureLogin(() => {
      wx.navigateTo({ url: '/pages/employer/purchased-works/index' });
    });
  },

  goAppeal() {
    this._ensureLogin(() => {
      wx.showToast({ title: '申诉功能开发中', icon: 'none' });
    });
  },

  goCustomerService() {
    wx.showToast({ title: '客服功能开发中', icon: 'none' });
  },

  goBack() {
    wx.navigateBack({ delta: 1 });
  },
});
