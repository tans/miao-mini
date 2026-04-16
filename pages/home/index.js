// pages/home/index.js
const Api = require('../../utils/api.js');
const app = getApp();

const COVER_THEME_COUNT = 6;
const PLACEHOLDER_COVER_KEYWORDS = [
  'task-placeholder.svg',
  '/static/images/task-placeholder',
  '/static/images/task_placeholder',
];

// 计算倒计时字符串
function formatCountdown(endAt) {
  if (!endAt) return '';
  const end = new Date(endAt);
  if (isNaN(end.getTime())) return ''; // 无效日期不显示
  const now = Date.now();
  const diff = end - now;
  if (diff <= 0) return ''; // 过期不显示
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  if (days > 0) return days + '天'; // 只显示天数
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  if (hours > 0) return hours + '小时' + minutes + '分钟';
  return minutes + '分钟';
}

// 刷新所有任务的倒计时显示
function refreshCountdowns(tasks) {
  return tasks.map(t => ({
    ...t,
    countdown: formatCountdown(t.end_at)
  }));
}

function createFallbackCover(seedText, description) {
  const text = (description || seedText || '').replace(/\s+/g, ' ').trim();
  let hash = 0;
  const source = seedText || text || 'miao';
  for (let i = 0; i < source.length; i += 1) {
    hash = (hash * 31 + source.charCodeAt(i)) >>> 0;
  }

  return {
    themeClass: `cover-theme-${hash % COVER_THEME_COUNT}`,
    summary: (text || '创作说明').slice(0, 34),
  };
}

function isPlaceholderCover(path) {
  if (!path || typeof path !== 'string') return false;
  const normalized = path.toLowerCase();
  return PLACEHOLDER_COVER_KEYWORDS.some((keyword) => normalized.includes(keyword));
}

function getTaskCover(materials = []) {
  const safeMaterials = Array.isArray(materials) ? materials : [];
  const firstRealImage = safeMaterials.find((material) => (
    material &&
    material.file_type === 'image' &&
    material.file_path &&
    !isPlaceholderCover(material.file_path)
  ));

  if (firstRealImage) {
    return firstRealImage.file_path;
  }

  const firstVideo = safeMaterials.find((material) => material && material.file_type === 'video');
  if (firstVideo) {
    return firstVideo.thumbnail_path || firstVideo.poster_url || '';
  }

  return '';
}

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
    this._countdownTimer = null;
    this.loadTasks().then(() => {
      this._initialized = true;
      this._startCountdownTimer();
    });
  },

  onShow() {
    if (this._initialized && this.data.tasks.length > 0) {
      this.setData({ page: 1, hasMore: true, tasks: [], displayTasks: [] });
      this.loadTasks();
    }
    // 页面可见时刷新倒计时
    this._refreshCountdowns();
  },

  onHide() {
    this._stopCountdownTimer();
  },

  onUnload() {
    this._stopCountdownTimer();
  },

  _startCountdownTimer() {
    // 每分钟刷新一次倒计时
    if (this._countdownTimer) return;
    this._countdownTimer = setInterval(() => {
      this._refreshCountdowns();
    }, 60000);
  },

  _stopCountdownTimer() {
    if (this._countdownTimer) {
      clearInterval(this._countdownTimer);
      this._countdownTimer = null;
    }
  },

  _refreshCountdowns() {
    const tasks = refreshCountdowns(this.data.tasks);
    const displayTasks = this._filterByIndustry(tasks, this.data.activeIndustry);
    this.setData({ tasks, displayTasks });
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
        const cover = getTaskCover(mats);
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
        const fallbackCover = createFallbackCover(
          `${t.id || ''}-${t.title || ''}`,
          t.description || t.creative_style || t.title || ''
        );
        return {
          ...t,
          cover,
          styleArray,
          industryArray,
          enrolled_count: (t.total_count || 0) - (t.remaining_count || 0),
          countdown: formatCountdown(t.end_at),
          fallbackThemeClass: fallbackCover.themeClass,
          fallbackSummary: fallbackCover.summary,
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
