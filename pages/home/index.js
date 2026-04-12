// pages/home/index.js
const Api = require('../../utils/api.js');
const app = getApp();

Page({
  data: {
    tasks: [],          // 从服务端拉取的所有任务（当前排序+分页的全量缓存）
    displayTasks: [],   // 当前展示的任务（行业过滤后）
    industryTags: [],   // 从任务数据中提取的行业标签列表
    activeIndustry: '', // 当前选中的行业（空字符串=全部）
    sort: 'created_at', // 当前排序：created_at / price_desc / price_asc
    page: 1,
    hasMore: true,
    loading: false
  },

  onLoad() {
    this._initialized = false;
    this.loadTasks().then(() => { this._initialized = true; });
  },

  onShow() {
    if (this._initialized && this.data.tasks.length > 0) {
      this.setData({ page: 1, hasMore: true, tasks: [], displayTasks: [] });
      this.loadTasks();
    }
  },

  onPullDownRefresh() {
    this.setData({ page: 1, tasks: [], displayTasks: [], hasMore: true });
    this.loadTasks().finally(() => wx.stopPullDownRefresh());
  },

  async loadTasks() {
    if (this.data.loading) return;
    this.setData({ loading: true });
    wx.showLoading({ title: '加载中...' });
    try {
      const { sort, page } = this.data;
      const res = await Api.getTasks({ page, limit: 20, sort, status: 1 });
      const newTasks = res.data?.data || [];

      const allTasks = page === 1 ? newTasks : [...this.data.tasks, ...newTasks];

      // 提取所有行业标签（去重）
      const tagSet = new Set();
      allTasks.forEach(t => {
        (t.industries || []).forEach(tag => tag && tagSet.add(tag));
      });
      const industryTags = Array.from(tagSet);

      // 应用当前行业过滤
      const displayTasks = this._filterByIndustry(allTasks, this.data.activeIndustry);

      this.setData({
        tasks: allTasks,
        displayTasks,
        industryTags,
        hasMore: newTasks.length === 20,
      });
    } catch (err) {
      wx.showToast({ title: '加载失败', icon: 'none' });
    } finally {
      this.setData({ loading: false });
      wx.hideLoading();
    }
  },

  _filterByIndustry(tasks, industry) {
    if (!industry) return tasks;
    return tasks.filter(t => (t.industries || []).includes(industry));
  },

  // 切换排序：重置到第一页并重新拉取
  setSort(e) {
    const sort = e.currentTarget.dataset.sort;
    if (sort === this.data.sort) return;
    this.setData({ sort, page: 1, tasks: [], displayTasks: [], activeIndustry: '' });
    this.loadTasks();
  },

  // 切换行业过滤：本地过滤，不重新请求
  setIndustry(e) {
    const industry = e.currentTarget.dataset.industry;
    if (industry === this.data.activeIndustry) return;
    const displayTasks = this._filterByIndustry(this.data.tasks, industry);
    this.setData({ activeIndustry: industry, displayTasks });
  },

  loadMore() {
    if (!this.data.hasMore || this.data.loading) return;
    this.setData({ page: this.data.page + 1 });
    this.loadTasks();
  },

  goTaskDetail(e) {
    const taskId = e.currentTarget.dataset.id;
    wx.navigateTo({ url: `/pages/task-detail/index?id=${taskId}` });
  },
});
