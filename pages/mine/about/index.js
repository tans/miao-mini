const buildInfo = require('../../build-info.js');

Page({
  data: {
    version: buildInfo.version || '1.0.0',
  },

  onLoad() {
    this.setData({ version: buildInfo.version || '1.0.0' });
  },

  onPullDownRefresh() {
    this.setData({ version: buildInfo.version || '1.0.0' });
    wx.stopPullDownRefresh();
  },

  goBack() {
    wx.navigateBack({ delta: 1 });
  }
});
