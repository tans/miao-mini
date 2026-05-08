const config = require('../../../utils/config.js');
const { openCustomerServiceChat } = require('../../../utils/customer-service.js');

Page({
  data: {
    customerServicePhone: config.customerServicePhone
  },

  goBack() {
    wx.navigateBack({ delta: 1 });
  },

  startService(e) {
    const type = e.currentTarget.dataset.type;
    const typeMap = {
      general: '普通咨询',
      business: '商务合作',
      complaint: '帮助反馈',
    };
    const serviceType = String(typeMap[type] || '在线客服');
    openCustomerServiceChat({
      sessionFrom: `miao-mini:${type || 'general'}`,
      sendMessageTitle: `创意喵${serviceType}`,
    });
  },

  goHelp() {
    wx.navigateTo({ url: '/pages/mine/help/index' });
  },

  onPullDownRefresh() {
    wx.stopPullDownRefresh();
  },

  callHotline() {
    wx.makePhoneCall({
      phoneNumber: config.customerServicePhone
    });
  }
});
