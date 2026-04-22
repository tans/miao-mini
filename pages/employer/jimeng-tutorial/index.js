const config = require('../../../utils/config.js');

Page({
  data: {},

  goBack() {
    wx.navigateBack({ delta: 1 });
  },

  contactService() {
    wx.showToast({ title: '请拨打客服热线：' + config.customerServicePhone, icon: 'none' });
  }
});