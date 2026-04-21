Page({
  data: {},

  goBack() {
    wx.navigateBack({ delta: 1 });
  },

  goHelpDetail(e) {
    const type = e.currentTarget.dataset.type;
    wx.showToast({ title: '帮助内容开发中', icon: 'none' });
  },

  contactService() {
    wx.showToast({ title: '请拨打客服热线：400-xxx-xxxx', icon: 'none' });
  }
});