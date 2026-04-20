const Api = require('../../utils/api.js');
const app = getApp();
const buildInfo = require('../../build-info.js');

Page({
  data: {
    displayText: 'v1.0.0',
  },

  onLoad() {
    this.updateDisplayText();
  },

  onShow() {
    this.updateDisplayText();
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

});
