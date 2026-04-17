// pages/video-proposals/index.js
const Api = require('../../utils/api.js');
const app = getApp();

const FILTERS = [
  { key: 'all', label: '全部' },
  { key: 'pending', label: '待审核' },
  { key: 'passed', label: '已采纳' },
  { key: 'rejected', label: '已拒绝' }
];

Page({
  data: {
    allClaims: [],
    filteredClaims: [],
    activeFilter: 'all',
    filters: FILTERS,
    loading: false,
    taskId: ''
  },

  onLoad(options = {}) {
    this.setData({
      taskId: options.taskId || ''
    });

    if (!app.isLoggedIn()) {
      app.silentLogin().then(() => {
        if (app.isLoggedIn()) this._initPage();
      });
      return;
    }
    this._initPage();
  },

  _initPage() {
    // 所有用户都有商家和创作者角色，无需角色检查
    this.loadProposals();
  },

  onShow() {
    if (app.isLoggedIn() && !this.data.loading) {
      this.loadProposals();
    }
  },

  onPullDownRefresh() {
    this.loadProposals().finally(() => wx.stopPullDownRefresh());
  },

  async loadProposals() {
    if (this.data.loading) return;
    this.setData({ loading: true });
    wx.showLoading({ title: '加载中...' });

    try {
      const allClaims = [];
      let page = 1;
      let hasMore = true;
      const maxPages = 5; // 限制最多5页，避免过多请求
      const selectedTaskId = this.data.taskId ? String(this.data.taskId) : '';

      // 分页获取所有商家任务及其提案
      while (hasMore && page <= maxPages) {
        const tasksRes = await Api.getMyBusinessTasks({ page });
        const tasks = tasksRes.data || [];
        if (tasks.length === 0) break;

        const visibleTasks = selectedTaskId
          ? tasks.filter(task => String(task.id) === selectedTaskId)
          : tasks;

        const claimsPromises = visibleTasks.map(task =>
          Api.getTaskClaims(task.id).catch(() => ({ data: [] }))
        );
        const claimsResults = await Promise.all(claimsPromises);

        claimsResults.forEach((res, i) => {
          const claims = (res.data || []).filter(c => Number(c.status) !== 1);
          claims.forEach(c => {
            allClaims.push(this.formatClaim({
              ...c,
              task_title: visibleTasks[i].title
            }));
          });
        });

        hasMore = tasks.length >= 20;
        page++;
      }

      this.setData({ allClaims });
      this.applyFilter(this.data.activeFilter);
    } catch (err) {
      wx.showToast({ title: '加载失败', icon: 'none' });
    } finally {
      this.setData({ loading: false });
      wx.hideLoading();
    }
  },

  switchFilter(e) {
    const filter = e.currentTarget.dataset.filter;
    this.applyFilter(filter);
  },

  async reviewClaim(e) {
    const { claimId } = e.currentTarget.dataset;
    const result = Number(e.currentTarget.dataset.result);
    if (!claimId || ![1, 2].includes(result)) {
      wx.showToast({ title: '参数错误', icon: 'none' });
      return;
    }

    try {
      await Api.reviewClaim(claimId, result);
      wx.showToast({ title: result === 1 ? '已采纳' : '已拒绝', icon: 'success' });
      await this.loadProposals();
    } catch (err) {
      wx.showToast({ title: err.message || '操作失败', icon: 'none' });
    }
  },

  getClaimStatusText(status) {
    const statusMap = {
      1: '待提交',
      2: '待审核',
      3: '已采纳',
      4: '已取消',
      5: '已拒绝'
    };

    return statusMap[status] || `未知(${status})`;
  },

  applyFilter(filter) {
    const filteredClaims = filter === 'all'
      ? this.data.allClaims
      : this.data.allClaims.filter(item => item.filterKey === filter);

    this.setData({
      activeFilter: filter,
      filteredClaims
    });
  },

  formatClaim(claim) {
    const status = Number(claim.status);
    const creatorName = claim.creator_name || '匿名创作者';
    const submittedAt = claim.submitted_at || claim.updated_at || claim.created_at || '';
    const materials = Array.isArray(claim.materials) ? claim.materials : [];
    const imageMaterials = materials.filter(item => item.file_type === 'image' && item.file_path);
    const videoMaterials = materials.filter(item => item.file_type === 'video' && item.file_path);
    const previewImages = imageMaterials.map(item => item.file_path);
    const fallbackPoster = imageMaterials.length > 0 ? imageMaterials[0].file_path : '';
    const previewVideos = videoMaterials.map(item => ({
      url: item.file_path,
      poster: item.thumbnail_path || fallbackPoster
    }));
    const videoLink = this.extractVideoLink(claim.content);
    const contentText = this.extractContentText(claim.content);

    const firstMaterial = materials[0] || {};
    const coverType = firstMaterial.file_type || 'image';
    const displayCover = coverType === 'video'
      ? (firstMaterial.thumbnail_path || firstMaterial.file_path || '')
      : (firstMaterial.thumbnail_path || firstMaterial.file_path || '');

    return {
      ...claim,
      status,
      creatorName,
      creatorInitial: creatorName.slice(0, 1),
      displayDate: submittedAt ? submittedAt.substring(0, 16).replace('T', ' ') : '',
      displayPrice: Number(claim.unit_price || 0).toFixed(2),
      statusText: this.getClaimStatusText(status),
      statusClass: this.getClaimStatusClass(status),
      filterKey: this.getFilterKey(status),
      canReview: status === 2,
      contentText,
      hasContent: !!contentText,
      hasMaterials: previewImages.length > 0 || previewVideos.length > 0,
      previewImages,
      previewVideos,
      imageCount: previewImages.length,
      videoCount: previewVideos.length,
      videoLink,
      coverType,
      isVideo: coverType === 'video',
      displayCover
    };
  },

  extractContentText(content) {
    if (!content) return '';
    return content
      .split('\n')
      .filter(line => line && !/^视频链接：/.test(line))
      .join('\n')
      .trim();
  },

  extractVideoLink(content) {
    if (!content) return '';
    const match = content.match(/视频链接：(.+)/);
    return match ? match[1].trim() : '';
  },

  previewImages(e) {
    const { current, claimIndex } = e.currentTarget.dataset;
    const claim = this.data.filteredClaims[Number(claimIndex)];
    const images = claim && Array.isArray(claim.previewImages) ? claim.previewImages : [];
    if (images.length === 0) return;
    wx.previewImage({
      current: current || images[0],
      urls: images
    });
  },

  copyVideoLink(e) {
    const { url } = e.currentTarget.dataset;
    if (!url) return;
    wx.setClipboardData({
      data: url,
      success: () => {
        wx.showToast({ title: '链接已复制', icon: 'success' });
      }
    });
  },

  getClaimStatusClass(status) {
    const statusClassMap = {
      1: 'draft',
      2: 'pending',
      3: 'passed',
      4: 'cancelled',
      5: 'rejected'
    };

    return statusClassMap[status] || 'draft';
  },

  getFilterKey(status) {
    if (status === 2) return 'pending';
    if (status === 3) return 'passed';
    if (status === 4 || status === 5) return 'rejected';
    return 'all';
  }
});
