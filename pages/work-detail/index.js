const Api = require('../../utils/api.js');

Page({
  data: {
    work: null
  },

  onLoad(e) {
    if (e.id) {
      this.loadWork(e.id);
    }
  },

  async loadWork(id) {
    wx.showLoading({ title: '加载中...' });
    try {
      const res = await Api.request('GET', `/works/${id}`, null, true);
      this.setData({ work: res.data });
    } catch (err) {
      wx.showToast({ title: '加载失败', icon: 'none' });
    } finally {
      wx.hideLoading();
    }
  }
});