const Api = require('../../utils/api.js');

Page({
  data: {
    works: [],
    sort: 'latest',
    page: 1,
    loading: false,
    hasMore: true
  },

  onLoad() {
    this.loadWorks();
  },

  onPullDownRefresh() {
    this.setData({ works: [], page: 1, hasMore: true });
    this.loadWorks().then(() => wx.stopPullDownRefresh());
  },

  onReachBottom() {
    if (!this.data.loading && this.data.hasMore) {
      this.setData({ page: this.data.page + 1 });
      this.loadWorks();
    }
  },

  switchSort(e) {
    const sort = e.currentTarget.dataset.sort;
    this.setData({ sort, works: [], page: 1, hasMore: true });
    this.loadWorks();
  },

  async loadWorks() {
    this.setData({ loading: true });
    try {
      const res = await Api.getWorks({ sort: this.data.sort, page: this.data.page, limit: 20 });
      const newWorks = res.data && res.data.data || [];
      this.setData({
        works: this.data.page === 1 ? newWorks : [...this.data.works, ...newWorks],
        hasMore: newWorks.length >= 20,
        loading: false
      });
    } catch (err) {
      this.setData({ loading: false });
      wx.showToast({ title: '加载失败', icon: 'none' });
    }
  },

  goWorkDetail(e) {
    const id = e.currentTarget.dataset.id;
    wx.navigateTo({ url: `/pages/work-detail/index?id=${id}` });
  }
});