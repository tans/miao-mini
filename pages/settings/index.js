const Api = require('../../utils/api.js');

Page({
  onLoad() {
    if (!getApp().isLoggedIn()) {
      wx.navigateTo({ url: '/pages/login/index' });
      return;
    }
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
