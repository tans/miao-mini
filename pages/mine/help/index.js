const { openCustomerServiceChat } = require('../../../utils/customer-service.js');

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
    openCustomerServiceChat({
      sessionFrom: 'miao-mini:help-center',
      sendMessageTitle: '创意喵帮助中心咨询',
    });
  },

  onPullDownRefresh() {
    wx.stopPullDownRefresh();
  }
});
