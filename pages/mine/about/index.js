const buildInfo = require('../../build-info.js');
const config = require('../../../utils/config.js');

Page({
  data: {
    version: '1.0.0',
    customerServicePhone: config.customerServicePhone
  },

  onLoad() {
    this.setData({ version: buildInfo.version || '1.0.0' });
  },

  goBack() {
    wx.navigateBack({ delta: 1 });
  }
});