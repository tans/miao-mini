Page({
  data: {},

  goBack() {
    wx.navigateBack({ delta: 1 });
  },

  startService(e) {
    const type = e.currentTarget.dataset.type;
    wx.showToast({ title: '客服系统开发中', icon: 'none' });
  },

  goHelp() {
    wx.navigateTo({ url: '/pages/mine/help/index' });
  },

  callHotline() {
    wx.makePhoneCall({
      phoneNumber: '400-xxx-xxxx'
    });
  }
});