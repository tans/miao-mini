Page({
  data: {},

  goBack() {
    wx.navigateBack({ delta: 1 });
  },

  contactService() {
    wx.showToast({ title: '请拨打客服热线：400-xxx-xxxx', icon: 'none' });
  }
});