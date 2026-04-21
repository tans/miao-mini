const buildInfo = require('../../build-info.js');

Page({
  data: {
    version: '1.0.0'
  },

  onLoad() {
    this.setData({ version: buildInfo.version || '1.0.0' });
  },

  goBack() {
    wx.navigateBack({ delta: 1 });
  }
});