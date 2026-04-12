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
      // 401 已由 api.js 全局处理，其余轻提示
      if (err.message !== '登录已过期') {
        wx.showToast({ title: '余额加载失败', icon: 'none' });
      }
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

  // "我的提案"按角色跳转：商家→提案管理，创作者→我领取的任务
  goWorks() {
    if (!app.isLoggedIn()) {
      wx.navigateTo({ url: '/pages/login/index' });
      return;
    }
    const user = app.getUser();
    if (user && user.role === 'business') {
      wx.navigateTo({ url: '/pages/video-proposals/index' });
    } else {
      wx.navigateTo({ url: '/pages/my-claims/index' });
    }
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
