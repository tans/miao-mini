const Api = require('../../../utils/api.js');
const app = getApp();

function toList(value) {
  if (Array.isArray(value)) return value.filter(Boolean);
  if (!value) return [];
  if (typeof value === 'string') {
    return value
      .split(/[,，、]/)
      .map((item) => item.trim())
      .filter(Boolean);
  }
  return [value];
}

function pick(...values) {
  for (const value of values) {
    if (value !== undefined && value !== null && value !== '') return value;
  }
  return '';
}

function getDeadlineText(endAt) {
  if (!endAt) return '未设置';
  const diff = new Date(endAt).getTime() - Date.now();
  if (Number.isNaN(diff)) return '未设置';
  if (diff <= 0) return '已截止';
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  return `${hours}小时${minutes}分`;
}

function normalizeTask(task = {}) {
  const endAt = pick(task.end_at, task.endAt, '');
  const industryTags = toList(pick(task.industries, task.industry));
  const styleTags = toList(pick(task.styles, task.style));
  const materials = Array.isArray(task.materials) ? task.materials : [];

  return {
    ...task,
    id: pick(task.id, task.task_id, ''),
    businessName: pick(task.business_name, task.businessName, task.merchant_name, task.merchantName, '商家'),
    businessAvatar: pick(task.business_avatar, task.businessAvatar, task.merchantAvatar, ''),
    title: pick(task.title, task.name, '高端楼盘春日氛围视频'),
    unitPrice: Number(pick(task.unit_price, task.unitPrice, 100)) || 100,
    awardPrice: Number(pick(task.award_price, task.awardPrice, 10)) || 10,
    industryTags: industryTags.length ? industryTags : [pick(task.industry, '房产家居')],
    styleTags: styleTags.length ? styleTags : [pick(task.style, '房产家居')],
    description: pick(
      task.description,
      task.desc,
      '突出空间通透感与生活方式场景，口语化表达，避免过度摆拍。适合地产、家居类创作者参与。'
    ),
    videoAspect: pick(task.video_aspect, task.videoAspect, '9:16 竖屏'),
    videoResolution: pick(task.video_resolution, task.videoResolution, '1080P'),
    videoDuration: pick(task.video_duration, task.videoDuration, '30s'),
    endAt,
    deadlineText: getDeadlineText(endAt),
    videoUrl: pick(task.video_url, task.videoUrl, ''),
    jimengLink: pick(task.jimeng_link, task.jimengLink, ''),
    jimengLinkLength: pick(task.jimeng_link, task.jimengLink, '').length,
    jimengEnabled: task.jimeng_enabled ?? task.jimengEnabled ?? true,
    materials,
    pendingReviewCount: Number(pick(task.pending_review_count, task.pendingReviewCount, 0)) || 0,
    adoptionRate: Number(pick(task.adoption_rate, task.adoptionRate, 0)) || 0,
    totalPublished: Number(pick(task.total_published, task.totalPublished, 0)) || 0,
    totalSpent: Number(pick(task.total_spent, task.totalSpent, 0)) || 0,
  };
}

function extractContentText(content) {
  if (!content) return '';
  return content
    .split('\n')
    .filter((line) => line && !/^视频链接：/.test(line))
    .join('\n')
    .trim();
}

function extractVideoLink(content) {
  if (!content) return '';
  const match = content.match(/视频链接：(.+)/);
  return match ? match[1].trim() : '';
}

function getClaimStatusText(status) {
  const map = { 1: '待提交', 2: '待审核', 3: '已采纳', 4: '已取消', 5: '已淘汰', 6: '已举报' };
  return map[status] || `未知(${status})`;
}

function getClaimStatusClass(status) {
  const map = { 1: 'draft', 2: 'pending', 3: 'passed', 4: 'cancelled', 5: 'rejected', 6: 'reported' };
  return map[status] || 'draft';
}

function getFilterKey(status) {
  if (status === 2) return 'pending';
  if (status === 3) return 'passed';
  if (status === 5) return 'rejected';
  if (status === 6) return 'reported';
  return 'all';
}

function normalizeClaim(claim = {}, task = {}) {
  const status = Number(claim.status);
  const materials = Array.isArray(claim.materials) ? claim.materials : [];
  const imageMaterials = materials.filter((item) => item.file_type === 'image' && item.file_path);
  const videoMaterials = materials.filter((item) => item.file_type === 'video' && item.file_path);
  const pendingVideoMaterials = materials.filter((item) => item.file_type === 'video' && !item.file_path);
  const previewImages = imageMaterials.map((item) => item.file_path);
  const contentText = extractContentText(claim.content);
  const videoLink = extractVideoLink(claim.content);
  const previewVideos = videoMaterials.map((item) => ({
    url: item.file_path,
    poster: item.thumbnail_path || previewImages[0] || '',
  }));

  return {
    ...claim,
    id: claim.id,
    status,
    statusText: getClaimStatusText(status),
    statusClass: getClaimStatusClass(status),
    filterKey: getFilterKey(status),
    creatorName: claim.creator_name || '匿名创作者',
    creatorAvatar: claim.creator_avatar || '',
    creatorInitial: (claim.creator_name || '匿').slice(0, 1),
    displayDate: (claim.submitted_at || claim.updated_at || '').substring(0, 16).replace('T', ' '),
    contentText,
    videoLink,
    hasContent: !!contentText,
    processStatusText: pendingVideoMaterials.length > 0
      ? (pendingVideoMaterials.some((item) => item.process_status === 'failed') ? '视频处理失败' : '视频压缩加水印处理中')
      : '',
    previewImages,
    previewVideos,
    hasMaterials: previewImages.length > 0 || previewVideos.length > 0,
    canReview: status === 2,
    taskTitle: task.title || '',
  };
}

Page({
  data: {
    taskId: '',
    currentTab: 'detail',
    loading: false,
    task: {
      industryTags: ['房产家居'],
      styleTags: ['房产家居'],
    },
    materials: [],
    claims: [],
    filteredClaims: [],
    proposalCount: 0,
    activeFilter: 'all',
    filters: [
      { key: 'all', label: '全部' },
      { key: 'pending', label: '待审核' },
      { key: 'passed', label: '已采纳' },
      { key: 'rejected', label: '已淘汰' },
      { key: 'reported', label: '已举报' },
    ],
    batchMode: false,
    selectedClaims: {},
    selectedCount: 0,
    totalSubmitted: 0,
    totalAdopted: 0,
    adoptionRate: 0,
    totalSpent: 0,
    showEditJimeng: false,
    editJimengLink: '',
  },

  onLoad(options = {}) {
    const taskId = options.id || options.taskId || '';
    const validTabs = ['video', 'detail', 'proposals'];
    const initialTab = validTabs.includes(options.tab)
      ? options.tab
      : (options.result === '1' ? 'proposals' : 'detail');

    this.setData({ taskId, currentTab: initialTab });
    wx.setNavigationBarTitle({ title: '商家任务详情' });

    if (!taskId) {
      wx.showToast({ title: '缺少任务ID', icon: 'none' });
      setTimeout(() => wx.navigateBack(), 1200);
      return;
    }

    if (!app.isLoggedIn()) {
      app.silentLogin().catch(() => {}).finally(() => this.loadTaskDetail(taskId));
      return;
    }

    this.loadTaskDetail(taskId);
  },

  onShow() {
    if (app.isLoggedIn() && this.data.taskId && !this.data.loading) {
      this.loadTaskDetail(this.data.taskId);
    }
  },

  onPullDownRefresh() {
    if (!this.data.taskId) {
      wx.stopPullDownRefresh();
      return;
    }
    this.loadTaskDetail(this.data.taskId).finally(() => wx.stopPullDownRefresh());
  },

  async loadTaskDetail(taskId) {
    this.setData({ loading: true });
    wx.showLoading({ title: '加载中...' });

    try {
      const [taskRes, claimsRes] = await Promise.all([
        Api.getTask(taskId).catch(() => ({ data: null })),
        app.isLoggedIn()
          ? Api.getTaskClaims(taskId).catch(() => ({ data: [] }))
          : Promise.resolve({ data: [] }),
      ]);

      const rawTask = taskRes.data;
      if (!rawTask) {
        wx.showToast({ title: '任务不存在', icon: 'none' });
        this.setData({ loading: false });
        setTimeout(() => wx.navigateBack(), 1200);
        return;
      }

      const task = normalizeTask(rawTask);
      const claims = (Array.isArray(claimsRes.data) ? claimsRes.data : [])
        .filter((item) => Number(item.status) !== 1)
        .map((item) => normalizeClaim(item, task));
      const pendingClaims = claims.filter((item) => item.filterKey === 'pending');
      const totalSubmitted = claims.length;
      const totalAdopted = claims.filter((item) => item.status === 3).length;
      const adoptionRate = totalSubmitted > 0
        ? Math.round((totalAdopted / totalSubmitted) * 100)
        : task.adoptionRate;
      const totalSpent = task.totalSpent || totalAdopted * (task.unitPrice + task.awardPrice);

      this.setData({
        task,
        materials: task.materials || [],
        claims,
        proposalCount: task.pendingReviewCount || pendingClaims.length,
        totalSubmitted,
        totalAdopted,
        adoptionRate,
        totalSpent,
        showEditJimeng: false,
        editJimengLink: task.jimengLink || '',
        selectedClaims: {},
        selectedCount: 0,
        batchMode: false,
        loading: false,
      });

      this.applyFilter(this.data.activeFilter);
    } catch (err) {
      wx.showToast({ title: err.message || '加载失败', icon: 'none' });
      this.setData({ loading: false });
    } finally {
      wx.hideLoading();
    }
  },

  switchTab(e) {
    const tab = e.currentTarget.dataset.tab;
    if (!tab || tab === this.data.currentTab) return;
    this.setData({ currentTab: tab });
    if (tab === 'proposals') {
      this.applyFilter(this.data.activeFilter);
    }
  },

  switchFilter(e) {
    const filter = e.currentTarget.dataset.filter;
    if (!filter) return;
    this.applyFilter(filter);
  },

  applyFilter(filter = 'all') {
    const visibleClaims = filter === 'all'
      ? this.data.claims
      : this.data.claims.filter((item) => item.filterKey === filter);

    const nextSelectedClaims = {};
    Object.keys(this.data.selectedClaims).forEach((id) => {
      if (this.data.selectedClaims[id] && visibleClaims.some((item) => String(item.id) === String(id))) {
        nextSelectedClaims[id] = true;
      }
    });

    this.setData({
      activeFilter: filter,
      filteredClaims: visibleClaims,
      selectedClaims: nextSelectedClaims,
      selectedCount: Object.values(nextSelectedClaims).filter(Boolean).length,
    });
  },

  goBack() {
    wx.navigateBack({ fail: () => wx.switchTab({ url: '/pages/home/index' }) });
  },

  copyTaskId() {
    if (!this.data.task.id) return;
    wx.setClipboardData({
      data: String(this.data.task.id),
      success: () => wx.showToast({ title: '已复制', icon: 'success' }),
    });
  },

  goToProposalReview() {
    this.setData({ currentTab: 'proposals' });
    this.applyFilter('pending');
  },

  playVideo() {
    const url = this.data.task.videoUrl;
    if (!url) return;
    wx.navigateTo({ url: `/pages/video-player/index?url=${encodeURIComponent(url)}` });
  },

  previewMaterial(e) {
    const { url, type } = e.currentTarget.dataset;
    if (!url) return;
    if (type === 'video') {
      wx.navigateTo({ url: `/pages/video-player/index?url=${encodeURIComponent(url)}` });
      return;
    }
    wx.previewImage({ current: url, urls: [url] });
  },

  previewImages(e) {
    const { claimId, current } = e.currentTarget.dataset;
    const claim = this.data.filteredClaims.find((item) => String(item.id) === String(claimId));
    if (!claim || !claim.previewImages.length) return;
    wx.previewImage({
      current: current || claim.previewImages[0],
      urls: claim.previewImages,
    });
  },

  previewClaimVideo(e) {
    const { url } = e.currentTarget.dataset;
    if (!url) return;
    wx.navigateTo({ url: `/pages/video-player/index?url=${encodeURIComponent(url)}` });
  },

  copyVideoLink(e) {
    const { url } = e.currentTarget.dataset;
    if (!url) return;
    wx.setClipboardData({
      data: url,
      success: () => wx.showToast({ title: '链接已复制', icon: 'success' }),
    });
  },

  toggleBatchMode() {
    this.setData({
      batchMode: !this.data.batchMode,
      selectedClaims: {},
      selectedCount: 0,
    });
  },

  toggleClaimSelection(e) {
    const { claimId } = e.currentTarget.dataset;
    const claim = this.data.filteredClaims.find((item) => String(item.id) === String(claimId));
    if (!claim) return;
    if (!claim.canReview && !this.data.selectedClaims[claimId]) {
      wx.showToast({ title: '该作品无法审核', icon: 'none' });
      return;
    }

    const nextSelectedClaims = {
      ...this.data.selectedClaims,
      [claimId]: !this.data.selectedClaims[claimId],
    };

    this.setData({
      selectedClaims: nextSelectedClaims,
      selectedCount: Object.values(nextSelectedClaims).filter(Boolean).length,
    });
  },

  async reviewClaim(e) {
    const { claimId } = e.currentTarget.dataset;
    const result = Number(e.currentTarget.dataset.result);
    if (!claimId || ![3, 4, 5, 6].includes(result)) {
      wx.showToast({ title: '参数错误', icon: 'none' });
      return;
    }

    let reason = null;
    if (result === 6) {
      reason = await this.showReportModal();
      if (!reason) return;
    }

    try {
      await Api.reviewClaim(claimId, result, reason);
      wx.showToast({ title: result === 3 ? '已采纳' : result === 6 ? '已举报' : '已处理', icon: 'success' });
      this.loadTaskDetail(this.data.taskId);
    } catch (err) {
      wx.showToast({ title: err.message || '操作失败', icon: 'none' });
    }
  },

  async batchReview(e) {
    const action = Number(e.currentTarget.dataset.action);
    if (![3, 4, 5, 6].includes(action)) return;

    const selectedClaims = this.data.filteredClaims.filter((item) => this.data.selectedClaims[item.id]);
    if (!selectedClaims.length) {
      wx.showToast({ title: '请先选择作品', icon: 'none' });
      return;
    }

    let reason = null;
    if (action === 6) {
      reason = await this.showReportModal();
      if (!reason) return;
    }

    wx.showLoading({ title: '处理中...' });
    try {
      await Api.batchReviewClaim(selectedClaims.map((item) => item.id), action, reason);
      wx.showToast({ title: action === 3 ? '批量采纳成功' : action === 6 ? '批量举报成功' : '批量处理成功', icon: 'success' });
      this.loadTaskDetail(this.data.taskId);
    } catch (err) {
      wx.showToast({ title: err.message || '操作失败', icon: 'none' });
    } finally {
      wx.hideLoading();
    }
  },

  showReportModal() {
    return new Promise((resolve) => {
      const reasons = ['敏感词', '低俗内容', '侵权内容', '政治敏感', '广告夸大'];
      wx.showActionSheet({
        itemList: reasons,
        success: (res) => resolve(reasons[res.tapIndex]),
        fail: () => resolve(null),
      });
    });
  },

  async downloadAllMaterials() {
    if (!this.data.materials.length) {
      wx.showToast({ title: '暂无素材', icon: 'none' });
      return;
    }

    const files = this.data.materials
      .filter((item) => item.file_path)
      .map((item) => ({
        type: item.file_type,
        url: item.file_path,
      }));

    await this.downloadFiles(files);
  },

  async downloadSelected() {
    const selectedClaims = this.data.filteredClaims.filter((item) => this.data.selectedClaims[item.id]);
    if (!selectedClaims.length) {
      wx.showToast({ title: '请先选择作品', icon: 'none' });
      return;
    }

    const files = [];
    selectedClaims.forEach((claim) => {
      claim.previewImages.forEach((url) => files.push({ type: 'image', url }));
      claim.previewVideos.forEach((video) => files.push({ type: 'video', url: video.url }));
    });

    if (!files.length) {
      wx.showToast({ title: '没有可下载的内容', icon: 'none' });
      return;
    }

    await this.downloadFiles(files);
  },

  async downloadFiles(files) {
    wx.showLoading({ title: `正在下载 0/${files.length}` });
    let successCount = 0;
    let failCount = 0;

    for (let index = 0; index < files.length; index += 1) {
      const file = files[index];
      try {
        const tempFilePath = await this.downloadRemoteFile(file.url);
        await this.saveDownloadedFile(file.type, tempFilePath);
        successCount += 1;
        wx.showLoading({ title: `正在下载 ${successCount}/${files.length}` });
      } catch (err) {
        failCount += 1;
      }
    }

    wx.hideLoading();
    wx.showToast({
      title: failCount ? `成功${successCount}个，失败${failCount}个` : `已下载${successCount}个文件`,
      icon: 'none',
    });
  },

  downloadRemoteFile(url) {
    return new Promise((resolve, reject) => {
      wx.downloadFile({
        url,
        success: (res) => {
          if (res.statusCode === 200 && res.tempFilePath) {
            resolve(res.tempFilePath);
            return;
          }
          reject(new Error('下载失败'));
        },
        fail: reject,
      });
    });
  },

  saveDownloadedFile(type, filePath) {
    if (type === 'video') {
      return this.saveVideoToAlbum(filePath);
    }
    return this.saveImageToAlbum(filePath);
  },

  saveImageToAlbum(filePath) {
    return new Promise((resolve, reject) => {
      wx.saveImageToPhotosAlbum({
        filePath,
        success: resolve,
        fail: (err) => {
          this.handleAlbumAuthError(err, '图片');
          reject(err);
        },
      });
    });
  },

  saveVideoToAlbum(filePath) {
    return new Promise((resolve, reject) => {
      wx.saveVideoToPhotosAlbum({
        filePath,
        success: resolve,
        fail: (err) => {
          this.handleAlbumAuthError(err, '视频');
          reject(err);
        },
      });
    });
  },

  handleAlbumAuthError(err, label) {
    if (!err || !err.errMsg || !err.errMsg.includes('auth deny')) return;
    wx.showModal({
      title: '提示',
      content: `需要授权保存${label}到相册`,
      confirmText: '去授权',
      success: (res) => {
        if (res.confirm) {
          wx.openSetting();
        }
      },
    });
  },

  showJimengTutorial() {
    wx.navigateTo({ url: '/pages/employer/jimeng-tutorial/index' });
  },

  onJimengLinkInput(e) {
    this.setData({ editJimengLink: e.detail.value });
  },

  toggleEditJimeng() {
    const showEditJimeng = !this.data.showEditJimeng;
    this.setData({
      showEditJimeng,
      editJimengLink: showEditJimeng ? (this.data.task.jimengLink || '') : this.data.editJimengLink,
    });
  },

  async updateJimengLink() {
    const { task, editJimengLink } = this.data;
    if (!task.id) {
      wx.showToast({ title: '任务不存在', icon: 'none' });
      return;
    }
    if (!editJimengLink || editJimengLink.length < 10) {
      wx.showToast({ title: '请输入有效的邀请链接', icon: 'none' });
      return;
    }

    wx.showLoading({ title: '更新中...' });
    try {
      await Api.updateTaskJimengLink(task.id, editJimengLink);
      wx.showToast({ title: '更新成功', icon: 'success' });
      this.setData({
        'task.jimengLink': editJimengLink,
        'task.jimengLinkLength': editJimengLink.length,
        showEditJimeng: false,
      });
    } catch (err) {
      wx.showToast({ title: err.message || '更新失败', icon: 'none' });
    } finally {
      wx.hideLoading();
    }
  },
});
