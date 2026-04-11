// pages/work-detail/index.js
const Api = require('../../utils/api.js');

Page({
  data: {
    work: null
  },

  onLoad(e) {
    // /works 接口未在 OpenAPI 中定义，暂时显示功能开发中
    // TODO: 后端实现 /works 接口后完善此逻辑
    if (e.id) {
      wx.showToast({ title: '功能开发中', icon: 'none' });
      setTimeout(() => wx.navigateBack(), 1500);
    }
  }
});