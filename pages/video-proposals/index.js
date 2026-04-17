// pages/video-proposals/index.js
// 商家审核作品页面
const Api = require('../../utils/api.js');
const app = getApp();

Page({
  data: {
    task: null,
    claims: [],
    filteredClaims: [],
    activeFilter: 'all',
    filters: [
      { key: 'all', label: '全部' },
      { key: 'pending', label: '待审核' },
      { key: 'passed', label: '已采纳' },
      { key: 'rejected', label: '已拒绝' }
    ],
    loading: false,
    taskId: ''
  },

  onLoad(options = {}) {
    const taskId = options.taskId || '';
    this.setData({ taskId });

    if (!taskId) {
      wx.showToast({ title: '缺少任务ID', icon: 'none' });
      setTimeout(() => wx.navigateBack(), 1500);
      return;
    }

    wx.setNavigationBarTitle({ title: '作品审核' });

    if (!app.isLoggedIn()) {
      app.silentLogin().then(() => {
        if (app.isLoggedIn()) this._initPage();
      });
      return;
    }
    this._initPage();
  },

  async _initPage() {
    wx.showLoading({ title: '加载中...' });
    try {
      const [taskRes, claimsRes] = await Promise.all([
        Api.getTask(this.data.taskId).catch(() => ({ data: null })),
        Api.getTaskClaims(this.data.taskId).catch(() => ({ data: [] }))
      ]);
      const task = taskRes.data || null;
      const claims = (claimsRes.data || [])
        .filter(c => Number(c.status) !== 1) // 排除待提交
        .map(c => this.formatClaim(c, task));
      this.setData({ task, claims });
      this.applyFilter(this.data.activeFilter);
    } catch (err) {
      wx.showToast({ title: '加载失败', icon: 'none' });
    } finally {
      wx.hideLoading();
    }
  },

  onShow() {
    if (app.isLoggedIn() && this.data.taskId && !this.data.loading) {
      this._initPage();
    }
  },

  onPullDownRefresh() {
    this._initPage().finally(() => wx.stopPullDownRefresh());
  },

  formatClaim(claim, task) {
    const status = Number(claim.status);
    const materials = Array.isArray(claim.materials) ? claim.materials : [];
    const imageMaterials = materials.filter(m => m.file_type === 'image' && m.file_path);
    const videoMaterials = materials.filter(m => m.file_type === 'video' && m.file_path);
    const previewImages = imageMaterials.map(m => m.file_path);
    const fallbackPoster = imageMaterials[0] ? imageMaterials[0].file_path : '';
    const previewVideos = videoMaterials.map(m => ({
      url: m.file_path,
      poster: m.thumbnail_path || fallbackPoster
    }));
    const contentText = this.extractContentText(claim.content);
    const videoLink = this.extractVideoLink(claim.content);
    const creatorName = claim.creator_name || '匿名创作者';
    const creatorAvatar = claim.creator_avatar || '';

    const firstMaterial = materials[0] || {};
    const coverType = firstMaterial.file_type || 'image';
    const displayCover = coverType === 'video'
      ? (firstMaterial.thumbnail_path || firstMaterial.file_path || '')
      : (firstMaterial.thumbnail_path || firstMaterial.file_path || '');

    return {
      ...claim,
      status,
      creatorName,
      creatorAvatar,
      creatorInitial: creatorName.slice(0, 1),
      displayDate: (claim.submitted_at || claim.updated_at || '').substring(0, 16).replace('T', ' '),
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
      displayCover,
      taskTitle: task ? task.title : ''
    };
  },

  extractContentText(content) {
    if (!content) return '';
    return content.split('\n').filter(l => l && !/^视频链接：/.test(l)).join('\n').trim();
  },

  extractVideoLink(content) {
    if (!content) return '';
    const m = content.match(/视频链接：(.+)/);
    return m ? m[1].trim() : '';
  },

  getClaimStatusText(status) {
    const map = { 2: '待审核', 3: '已采纳', 4: '已取消', 5: '已拒绝' };
    return map[status] || `未知(${status})`;
  },

  getClaimStatusClass(status) {
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
    const filteredClaims = filter === 'all'
      ? this.data.claims
      : this.data.claims.filter(item => item.filterKey === filter);
    this.setData({ activeFilter: filter, filteredClaims });
  },

  async reviewClaim(e) {
    const { claimId } = e.currentTarget.dataset;
    const result = Number(e.currentTarget.dataset.result);
    if (!claimId || ![1, 2, 3].includes(result)) {
      wx.showToast({ title: '参数错误', icon: 'none' });
      return;
    }

    try {
      await Api.reviewClaim(claimId, result);
      const msg = result === 1 ? '已采纳' : result === 2 ? '已拒绝' : '已举报';
      wx.showToast({ title: msg, icon: 'success' });
      this._initPage();
    } catch (err) {
      wx.showToast({ title: err.message || '操作失败', icon: 'none' });
    }
  },

  previewImages(e) {
    const { current, claimIndex } = e.currentTarget.dataset;
    const claim = this.data.filteredClaims[Number(claimIndex)];
    const images = claim && claim.previewImages || [];
    if (images.length === 0) return;
    wx.previewImage({ current: current || images[0], urls: images });
  },

  copyVideoLink(e) {
    const { url } = e.currentTarget.dataset;
    if (!url) return;
    wx.setClipboardData({
      data: url,
      success: () => wx.showToast({ title: '链接已复制', icon: 'success' })
    });
  }
});