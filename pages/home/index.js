// pages/home/index.js
const Api = require('../../utils/api.js');
const { getStatusText } = require('../../utils/util.js');
const app = getApp();

Page({
  data: {
    tasks: [],
    page: 1,
    hasMore: true,
    loading: false
  },

  onLoad() {
    if (!app.isLoggedIn()) {
      wx.navigateTo({ url: '/pages/login/index' });
      return;
    }
    this.loadTasks();
  },

  onShow() {
    if (app.isLoggedIn()) {
      this.setData({ page: 1, tasks: [], hasMore: true });
      this.loadTasks();
    }
  },

  onPullDownRefresh() {
    this.setData({ page: 1, tasks: [], hasMore: true });
    this.loadTasks().then(() => {
      wx.stopPullDownRefresh();
    });
  },

  async loadTasks() {
    if (this.data.loading) return;
    this.setData({ loading: true });

    wx.showLoading({ title: '加载中...' });
    try {
      const res = await Api.getTasks({ page: this.data.page, limit: 20, sort: 'created_at' });
      const tasks = res.data?.data || [];
      const openTasks = tasks.filter(t => {
        const s = typeof t.status === 'number' ? t.status : parseInt(t.status, 10);
        return s === 1; // status=1: 已上线
      });

      this.setData({
        tasks: this.data.page === 1 ? openTasks : [...this.data.tasks, ...openTasks],
        hasMore: openTasks.length === 20,
        loading: false
      });
    } catch (err) {
      wx.showToast({ title: '加载失败', icon: 'none' });
      this.setData({ loading: false });
    } finally {
      wx.hideLoading();
    }
  },

  loadMore() {
    if (!this.data.hasMore) return;
    this.setData({ page: this.data.page + 1 });
    this.loadTasks();
  },

  goTaskDetail(e) {
    const taskId = e.currentTarget.dataset.id;
    wx.navigateTo({ url: `/pages/task-detail/index?id=${taskId}` });
  },

  getStatusText(status) {
    return getStatusText(status);
  }
});
