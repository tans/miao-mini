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
      // 触发静默登录
      app.silentLogin().then(() => {
        this.setData({ isLoggedIn: app.isLoggedIn() });
        if (app.isLoggedIn()) {
          this.setData({ user: app.getUser() });
          this.loadWallet();
        }
      });
    }
  },

  async loadWallet() {
    try {
      const res = await Api.getWallet();
      const wallet = res.data || {};
      this.setData({ balance: (wallet.balance || 0).toFixed(2) });
    } catch (err) {
      if (err.message !== '登录已过期') {
        wx.showToast({ title: '余额加载失败', icon: 'none' });
      }
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
      wx.navigateTo({ url: '/pages/settings/profile/index' });
    });
  },

  goWallet() {
    this._ensureLogin(() => {
      wx.navigateTo({ url: '/pages/wallet/index' });
    });
  },

  goMyClaims() {
    this._ensureLogin(() => {
      wx.navigateTo({ url: '/pages/my-claims/index' });
    });
  },

  goMyTasks() {
    this._ensureLogin(() => {
      wx.navigateTo({ url: '/pages/my-tasks/index' });
    });
  },

  goWorks() {
    this._ensureLogin(() => {
      // 所有用户都有商家和创作者角色，可以访问任意作品页面
      // 根据当前角色设置决定跳转，这里改为都显示提案页（商家视角）
      wx.navigateTo({ url: '/pages/video-proposals/index' });
    });
  },

  goTransactions() {
    this._ensureLogin(() => {
      wx.navigateTo({ url: '/pages/transactions/index' });
    });
  },

  goSettings() {
    this._ensureLogin(() => {
      wx.navigateTo({ url: '/pages/settings/index' });
    });
  },
});
