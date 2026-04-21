// pages/video-proposals/index.js
// 商家审核作品页面
const Api = require('../../../utils/api.js');
const app = getApp();

Page({
  data: {
    task: null,
    materials: [],
    claims: [],
    filteredClaims: [],
    activeFilter: 'all',
    filters: [
      { key: 'all', label: '全部' },
      { key: 'pending', label: '待审核' },
      { key: 'passed', label: '已采纳' },
      { key: 'rejected', label: '已淘汰' },
      { key: 'reported', label: '已举报' }
    ],
    loading: false,
    taskId: '',
    currentTab: 'detail', // 默认显示任务详情
    deadlineText: '23小时28分',
    batchMode: false,
    selectedClaims: {},
    selectedCount: 0,
    // Stats
    totalSubmitted: 0,
    totalAdopted: 0,
    adoptionRate: 0,
    totalSpent: 0
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
      const materials = task && task.materials ? task.materials : [];
      const claims = (claimsRes.data || [])
        .filter(c => Number(c.status) !== 1) // 排除待提交
        .map(c => this.formatClaim(c, task));

      // Calculate stats
      const allClaims = claimsRes.data || [];
      const totalSubmitted = allClaims.filter(c => Number(c.status) !== 1).length;
      const totalAdopted = allClaims.filter(c => Number(c.status) === 3).length;
      const adoptionRate = totalSubmitted > 0 ? Math.round((totalAdopted / totalSubmitted) * 100) : 0;
      const totalSpent = totalAdopted * (task ? (task.unit_price || 0) : 0);

      // 计算截止时间
      let deadlineText = '23小时28分';
      if (task && task.end_at) {
        const endTime = new Date(task.end_at).getTime();
        const now = Date.now();
        const diff = endTime - now;
        if (diff > 0) {
          const hours = Math.floor(diff / (1000 * 60 * 60));
          const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
          deadlineText = `${hours}小时${minutes}分`;
        } else {
          deadlineText = '已截止';
        }
      }

      this.setData({
        task,
        materials,
        claims,
        deadlineText,
        loading: false,
        totalSubmitted,
        totalAdopted,
        adoptionRate,
        totalSpent
      });
      this.applyFilter(this.data.activeFilter);
    } catch (err) {
      this.setData({ loading: false });
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

  switchTab(e) {
    const tab = e.currentTarget.dataset.tab;
    this.setData({ currentTab: tab });
  },

  goBack() {
    wx.navigateBack({ fail: () => wx.switchTab({ url: '/pages/home/index' }) });
  },

  copyTaskId() {
    const taskId = this.data.task && this.data.task.id;
    if (taskId) {
      wx.setClipboardData({
        data: taskId,
        success() {
          wx.showToast({ title: '已复制', icon: 'success' });
        }
      });
    }
  },

  previewMaterial(e) {
    const url = e.currentTarget.dataset.url;
    if (url) {
      wx.previewImage({ urls: [url], current: url });
    }
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
    const map = { 2: '待审核', 3: '已采纳', 4: '已取消', 5: '已淘汰', 6: '已举报' };
    return map[status] || `未知(${status})`;
  },

  getClaimStatusClass(status) {
    const map = { 2: 'pending', 3: 'passed', 4: 'cancelled', 5: 'rejected', 6: 'reported' };
    return map[status] || 'draft';
  },

  getFilterKey(status) {
    if (status === 2) return 'pending';
    if (status === 3) return 'passed';
    if (status === 5) return 'rejected';
    if (status === 6) return 'reported';
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

    let reason = null;
    if (result === 3) {
      reason = await this.showReportModal();
      if (!reason) return;
    }

    try {
      await Api.reviewClaim(claimId, result, reason);
      const msg = result === 1 ? '已采纳' : result === 2 ? '已淘汰' : '已举报';
      wx.showToast({ title: msg, icon: 'success' });
      this._initPage();
    } catch (err) {
      wx.showToast({ title: err.message || '操作失败', icon: 'none' });
    }
  },

  showReportModal() {
    return new Promise((resolve) => {
      const reasons = ['敏感词', '低俗内容', '侵权内容', '政治敏感', '广告夸大'];
      wx.showActionSheet({
        itemList: reasons,
        success: (res) => {
          resolve(reasons[res.tapIndex]);
        },
        fail: () => {
          resolve(null);
        }
      });
    });
  },

  async batchReview(e) {
    const action = e.currentTarget.dataset.action;
    if (![1, 2, 3].includes(action)) return;

    const selectedClaims = this.data.filteredClaims.filter(c => c.selected);
    if (selectedClaims.length === 0) {
      wx.showToast({ title: '请先选择作品', icon: 'none' });
      return;
    }

    let reason = null;
    if (action === 3) {
      reason = await this.showReportModal();
      if (!reason) return;
    }

    wx.showLoading({ title: '处理中...' });
    try {
      const claimIds = selectedClaims.map(c => c.id);
      await Api.batchReviewClaim(claimIds, action, reason);
      const msg = action === 1 ? '批量采纳成功' : action === 2 ? '批量淘汰成功' : '批量举报成功';
      wx.showToast({ title: msg, icon: 'success' });
      this.setData({ batchMode: false, selectedClaims: {} });
      this._initPage();
    } catch (err) {
      wx.showToast({ title: err.message || '操作失败', icon: 'none' });
    } finally {
      wx.hideLoading();
    }
  },

  toggleClaimSelection(e) {
    const claimId = e.currentTarget.dataset.claimId;
    const selected = { ...this.data.selectedClaims, [claimId]: !this.data.selectedClaims[claimId] };
    const selectedCount = Object.values(selected).filter(Boolean).length;
    this.setData({ selectedClaims: selected, selectedCount });
  },

  toggleBatchMode() {
    this.setData({ batchMode: !this.data.batchMode, selectedClaims: {}, selectedCount: 0 });
  },

  downloadSelected() {
    const selectedClaims = this.data.filteredClaims.filter(c => this.data.selectedClaims[c.id]);
    if (selectedClaims.length === 0) {
      wx.showToast({ title: '请先选择作品', icon: 'none' });
      return;
    }
    // Collect all image URLs for download
    const urls = [];
    selectedClaims.forEach(claim => {
      if (claim.previewImages) {
        claim.previewImages.forEach(img => urls.push(img));
      }
    });
    if (urls.length === 0) {
      wx.showToast({ title: '没有可下载的内容', icon: 'none' });
      return;
    }
    wx.showToast({ title: `开始下载 ${urls.length} 个文件`, icon: 'none' });
    // Note: WeChat doesn't support bulk download directly, show message
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
