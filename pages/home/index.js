// pages/home/index.js
const Api = require('../../utils/api.js');
const app = getApp();

Page({
  data: {
    tasks: [],          // 从服务端拉取的所有任务（当前排序+分页的全量缓存）
    displayTasks: [],   // 当前展示的任务（行业过滤后）
    industryTags: [],   // 从任务数据中提取的行业标签列表
    styleTags: [],      // 从任务数据中提取的风格标签列表
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
      const res = await Api.getTasks({ page, limit: 20, sort });
      const newTasks = res.data?.data || [];

      const rawTasks = page === 1 ? newTasks : [...this.data.tasks, ...newTasks];

      // 提取封面（第一个 image 素材的 file_path）
      // 解析 creative_style 和 industries 从逗号分隔字符串为数组
      const allTasks = rawTasks.map(t => {
        const mats = t.materials || [];
        const firstImage = mats.find(m => m.file_type === 'image');
        // Parse creative_style from comma-separated string to array
        let styleArray = [];
        if (t.creative_style && typeof t.creative_style === 'string') {
          styleArray = t.creative_style.split(',').map(s => s.trim()).filter(s => s);
        } else if (Array.isArray(t.creative_style)) {
          styleArray = t.creative_style;
        }
        // Parse industries
        let industryArray = [];
        if (t.industries && typeof t.industries === 'string') {
          industryArray = t.industries.split(',').map(s => s.trim()).filter(s => s);
        } else if (Array.isArray(t.industries)) {
          industryArray = t.industries;
        }
        return {
          ...t,
          cover: firstImage ? firstImage.file_path : '',
          styleArray,
          industryArray,
          enrolled_count: (t.total_count || 0) - (t.remaining_count || 0)
        };
      });

      // 提取所有行业标签（去重）
      const industryTagSet = new Set();
      // 提取所有风格标签（去重）
      const styleTagSet = new Set();
      allTasks.forEach(t => {
        (t.industryArray || []).forEach(tag => tag && industryTagSet.add(tag));
        (t.styleArray || []).forEach(tag => tag && styleTagSet.add(tag));
      });
      const industryTags = Array.from(industryTagSet);
      const styleTags = Array.from(styleTagSet);

      // 应用当前行业过滤
      const displayTasks = this._filterByIndustry(allTasks, this.data.activeIndustry);

      this.setData({
        tasks: allTasks,
        displayTasks,
        industryTags,
        styleTags,
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
    return tasks.filter(t => (t.industryArray || []).includes(industry));
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

  goCreateTask() {
    wx.navigateTo({ url: '/pages/create-task/index' });
  },
});