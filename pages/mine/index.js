const Api = require('../../utils/api.js');
const app = getApp();
const buildInfo = require('../../build-info.js');

Page({
  data: {
    user: null,
    balance: '0.00',
    isLoggedIn: false,
    displayText: ''
  },

  onShow() {
    const isLoggedIn = app.isLoggedIn();
    this.setData({ isLoggedIn });
    this.updateDisplayText();
    if (isLoggedIn) {
      this.loadUserAndWallet();
    } else {
      this.setData({ user: null, balance: '0.00' });
      // 触发静默登录
      app.silentLogin().then(() => {
        this.setData({ isLoggedIn: app.isLoggedIn() });
        if (app.isLoggedIn()) {
          this.loadUserAndWallet();
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

  goHelp() {
    wx.navigateTo({ url: '/pages/settings/help/index' });
  },

  goAbout() {
    wx.navigateTo({ url: '/pages/settings/about/index' });
  },
});
