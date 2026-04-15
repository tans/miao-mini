const Api = require('../../utils/api.js');
const app = getApp();

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
    const lastUpload = wx.getStorageSync('lastUploadTime');
    let displayText = 'v1.0.0';
    if (lastUpload) {
      const date = new Date(lastUpload);
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      const hours = String(date.getHours()).padStart(2, '0');
      const minutes = String(date.getMinutes()).padStart(2, '0');
      displayText = `最后上传 ${month}-${day} ${hours}:${minutes}`;
    }
    this.setData({ displayText });
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
