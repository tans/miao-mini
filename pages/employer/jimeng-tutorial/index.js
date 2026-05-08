const { openCustomerServiceChat } = require('../../../utils/customer-service.js');

Page({
  data: {},

  goBack() {
    wx.navigateBack({ delta: 1 });
  },

  contactService() {
    openCustomerServiceChat({
      sessionFrom: 'miao-mini:jimeng-tutorial',
      sendMessageTitle: '创意喵即梦教程咨询',
    });
  }
});
