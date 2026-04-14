const Api = require('../../utils/api.js');

Page({
  data: {
    version: '1.0.0',
  },

  onLoad() {
    if (!getApp().isLoggedIn()) {
      wx.navigateTo({ url: '/pages/login/index' });
      return;
    }
    this.setData({
      version: wx.getAccountInfoSync().miniProgram.version || '1.0.0',
    });
  },

  goProfile() {
    wx.navigateTo({ url: '/pages/settings/profile/index' });
  },

  goHelp() {
    wx.showToast({ title: '功能开发中', icon: 'none' });
  },

  goAbout() {
    wx.showToast({ title: '功能开发中', icon: 'none' });
  },

});
