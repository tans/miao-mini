const Api = require('../../utils/api.js');

Page({
  data: {
    works: [],
    sort: 'latest',
    page: 1,
    loading: false,
    hasMore: true,
    isDeveloping: true  // 功能开发中标记
  },

  onLoad() {
    // /works 接口未在 OpenAPI 中定义，暂时显示功能开发中
    // TODO: 后端实现 /works 接口后移除此逻辑
  },

  onPullDownRefresh() {
    wx.stopPullDownRefresh();
  },

  onReachBottom() {
    // 暂不处理
  },

  switchSort(e) {
    // 暂不处理
  },

  async loadWorks() {
    // 暂不处理，/works 接口未实现
    this.setData({ loading: false });
  },

  goWorkDetail(e) {
    wx.showToast({ title: '功能开发中', icon: 'none' });
  }
});