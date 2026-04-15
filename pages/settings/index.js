const Api = require('../../utils/api.js');
const app = getApp();

Page({
  data: {
    version: '1.0.0',
  },

  onLoad() {
    this.setData({
      version: wx.getAccountInfoSync().miniProgram.version || '1.0.0',
    });
  },

  goProfile() {
    if (!app.isLoggedIn()) {
      wx.showLoading({ title: '登录中...' });
      app.silentLogin().then(() => {
        wx.hideLoading();
        if (app.isLoggedIn()) {
          wx.navigateTo({ url: '/pages/settings/profile/index' });
        } else {
          wx.showToast({ title: '请稍后重试', icon: 'none' });
        }
      });
      return;
    }
    wx.navigateTo({ url: '/pages/settings/profile/index' });
  },

  goHelp() {
    wx.navigateTo({ url: '/pages/settings/help/index' });
  },

  goAbout() {
    wx.showToast({ title: '功能开发中', icon: 'none' });
  },

});
