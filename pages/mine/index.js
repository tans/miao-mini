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
      // tabBar 页不能用 navigateTo，用 reLaunch 清空栈后跳转
      wx.reLaunch({ url: '/pages/login/index' });
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
    if (!app.isLoggedIn()) {
      wx.navigateTo({ url: '/pages/login/index' });
      return;
    }
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

  });
