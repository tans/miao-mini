const Api = require('../../utils/api.js');
const app = getApp();

const FILTERS = [
  { key: 'all', label: '全部' },
  { key: 'pending', label: '待验收' },
  { key: 'passed', label: '已采纳' },
  { key: 'rejected', label: '已拒绝' }
];

Page({
  data: {
    works: [],
    filteredWorks: [],
    activeFilter: 'all',
    filters: FILTERS,
    loading: false
  },

  onLoad() {
    if (!app.isLoggedIn()) {
      app.silentLogin().then(() => {
        if (app.isLoggedIn()) this.loadWorks();
      });
      return;
    }
    this.loadWorks();
  },

  onShow() {
    if (app.isLoggedIn() && !this.data.loading) {
      this.loadWorks();
    }
  },

  onPullDownRefresh() {
    this.loadWorks().finally(() => wx.stopPullDownRefresh());
  },

  async loadWorks() {
    if (this.data.loading) return;
    this.setData({ loading: true });
    wx.showLoading({ title: '加载中...' });

    try {
      const res = await Api.getMyClaims({ page: 1 });
      const claims = res.data || [];
      // 筛选已提交的作品（status >= 2）
      const submittedWorks = claims
        .filter(c => Number(c.status) >= 2)
        .map(c => this.formatWork(c));
      this.setData({ works: submittedWorks });
      this.applyFilter(this.data.activeFilter);
    } catch (err) {
      wx.showToast({ title: '加载失败', icon: 'none' });
    } finally {
      this.setData({ loading: false });
      wx.hideLoading();
    }
  },

  formatWork(claim) {
    const status = Number(claim.status);
    const materials = Array.isArray(claim.materials) ? claim.materials : [];
    const imageMaterials = materials.filter(m => m.file_type === 'image');
    const videoMaterials = materials.filter(m => m.file_type === 'video');

    return {
      id: claim.id,
      task_id: claim.task_id,
      task_title: claim.task_title || '任务' + claim.task_id,
      content: claim.content || '',
      status,
      statusText: this.getStatusText(status),
      statusClass: this.getStatusClass(status),
      filterKey: this.getFilterKey(status),
      previewImages: imageMaterials.map(m => m.file_path),
      previewVideos: videoMaterials.map(m => ({
        url: m.file_path,
        poster: m.thumbnail_path || ''
      })),
      submittedAt: claim.submitted_at || claim.updated_at || '',
      unitPrice: claim.unit_price || 0
    };
  },

  getStatusText(status) {
    const map = { 2: '待验收', 3: '已采纳', 4: '已取消', 5: '已拒绝' };
    return map[status] || '未知';
  },

  getStatusClass(status) {
    const map = { 2: 'pending', 3: 'passed', 4: 'cancelled', 5: 'rejected' };
    return map[status] || 'draft';
  },

  getFilterKey(status) {
    if (status === 2) return 'pending';
    if (status === 3) return 'passed';
    if (status === 4 || status === 5) return 'rejected';
    return 'all';
  },

  switchFilter(e) {
    const filter = e.currentTarget.dataset.filter;
    this.applyFilter(filter);
  },

  applyFilter(filter) {
    const filteredWorks = filter === 'all'
      ? this.data.works
      : this.data.works.filter(item => item.filterKey === filter);
    this.setData({ activeFilter: filter, filteredWorks });
  },

  goTaskDetail(e) {
    const taskId = e.currentTarget.dataset.taskId;
    if (taskId) {
      wx.navigateTo({ url: `/pages/task-detail/index?id=${taskId}` });
    }
  },

  previewImages(e) {
    const { index } = e.currentTarget.dataset;
    const work = this.data.filteredWorks[Number(index)];
    const images = work && work.previewImages || [];
    if (images.length === 0) return;
    wx.previewImage({ current: images[0], urls: images });
  }
});