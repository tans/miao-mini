Page({
  data: {},

  goBack() {
    wx.navigateBack({ delta: 1 });
  },

  goHelpDetail(e) {
    const type = e.currentTarget.dataset.type;
    wx.navigateTo({ url: `/pages/mine/help-detail/index?type=${type}` });
  },

  contactService() {
    wx.showToast({ title: '请拨打客服热线：400-xxx-xxxx', icon: 'none' });
  }
});