const config = require('../../../utils/config.js');

Page({
  data: {
    customerServicePhone: config.customerServicePhone
  },

  goBack() {
    wx.navigateBack({ delta: 1 });
  },

  startService(e) {
    const type = e.currentTarget.dataset.type;
    if (type === 'complaint') {
      // 投诉建议 - 跳转到申诉页面
      wx.navigateTo({ url: '/pages/mine/appeal/index' });
    } else if (type === 'business') {
      // 商务合作 - 跳转到商家认证页面
      wx.navigateTo({ url: '/pages/mine/merchant-auth/index' });
    } else {
      // 普通咨询 - 跳转到帮助页面
      wx.navigateTo({ url: '/pages/mine/help/index' });
    }
  },

  goHelp() {
    wx.navigateTo({ url: '/pages/mine/help/index' });
  },

  callHotline() {
    wx.makePhoneCall({
      phoneNumber: config.customerServicePhone
    });
  }
});