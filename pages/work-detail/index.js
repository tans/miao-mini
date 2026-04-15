const Api = require('../../utils/api.js');

Page({
  data: {
    work: null,
    materials: []
  },

  onLoad(e) {
    if (e.id) {
      this.loadWork(e.id);
    }
  },

  async loadWork(id) {
    wx.showLoading({ title: '加载中...' });
    try {
      const res = await Api.getWork(id);
      const work = res.data;
      this.setData({
        work: work,
        materials: work.materials || []
      });
    } catch (err) {
      wx.showToast({ title: '加载失败', icon: 'none' });
    } finally {
      wx.hideLoading();
    }
  },

  previewMaterial(e) {
    const url = e.currentTarget.dataset.url;
    wx.previewImage({ urls: [url], current: url });
  }
});