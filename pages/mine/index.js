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
