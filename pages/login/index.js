// pages/login/index.js
const Api = require('../../utils/api.js');
const app = getApp();

Page({
  onLoad() {
    if (app.isLoggedIn()) {
      wx.switchTab({ url: '/pages/home/index' });
    }
  },

  async handleLogin() {
    wx.showLoading({ title: '登录中...' });
    try {
      const { code } = await wx.login();
      await Api.loginByWechat(code);
      wx.showToast({ title: '登录成功', icon: 'success' });
      setTimeout(() => {
        wx.switchTab({ url: '/pages/home/index' });
      }, 1500);
    } catch (err) {
      wx.showToast({ title: err.message || '登录失败', icon: 'none' });
    } finally {
      wx.hideLoading();
    }
  }
});
