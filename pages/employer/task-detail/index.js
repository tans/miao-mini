const Api = require('../../../utils/api.js');
const { formatDateTime } = require('../../../utils/util.js');
const app = getApp();

const PLACEHOLDER_MATERIAL_KEYWORDS = ['task-placeholder', 'task_placeholder'];

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

function isPlaceholderMaterialPath(path) {
  const normalized = String(path || '').trim().toLowerCase();
  if (!normalized) return false;
  return PLACEHOLDER_MATERIAL_KEYWORDS.some((keyword) => normalized.includes(keyword));
}

function toPositiveInt(value) {
  const num = Number(value);
  return Number.isFinite(num) && num > 0 ? num : 0;
}

function normalizeMediaMaterial(material = {}) {
  const fileType = String(pick(material.file_type, material.fileType, '')).toLowerCase();
  const filePath = pick(material.file_path, material.filePath, '');
  const processedFilePath = pick(material.processed_file_path, material.processedFilePath, '');
  const sourceFilePath = pick(material.source_file_path, material.sourceFilePath, '');
  const thumbnailPath = pick(material.thumbnail_path, material.thumbnailPath, '');
  const rawUrl = pick(
    material.previewUrl,
    filePath,
    processedFilePath,
    sourceFilePath,
    fileType === 'image' ? thumbnailPath : '',
    ''
  );
  const previewUrl = fileType === 'video'
    ? Api.getPlayableUrl(rawUrl)
    : Api.getDisplayUrl(rawUrl);

  return {
    ...material,
    fileType,
    file_type: fileType,
    filePath,
    file_path: filePath,
    processedFilePath,
    processed_file_path: processedFilePath,
    sourceFilePath,
    source_file_path: sourceFilePath,
    thumbnailPath,
    thumbnail_path: thumbnailPath,
    previewUrl,
    isVideo: fileType === 'video',
    isImage: fileType === 'image',
  };
}

function hasVisibleSubmission(claim = {}) {
  const status = Number(claim.status);
  const submitAt = pick(claim.submit_at, claim.submitAt, '');
  const reviewResult = Number(pick(claim.review_result, claim.reviewResult, 0)) || 0;
  return status >= 2 || !!submitAt || reviewResult > 0;
}

function getCurrentUserId() {
  const user = (app && typeof app.getUser === 'function' && app.getUser()) || Api.getUser();
  return user && user.id != null ? String(user.id) : '';
}

function shouldRetryClaimsLoad(err) {
  if (!err) return false;
  const code = Number(err.code || 0);
  const message = String(err.message || '');
  return code === 40101 || message.indexOf('登录已过期') !== -1;
}

function normalizeTask(task = {}) {
  const endAt = pick(task.end_at, task.endAt, '');
  const industryTags = toList(pick(task.industries, task.industry));
  const styleTags = toList(pick(task.styles, task.style));
  const materials = Array.isArray(task.materials)
    ? task.materials
      .map(normalizeMediaMaterial)
      .filter((item) => item.previewUrl && !isPlaceholderMaterialPath(item.previewUrl) && !isPlaceholderMaterialPath(item.filePath))
    : [];
  const isPublic = task.public == null ? true : !!task.public;
  const jimengLink = String(task.jimeng_link || '').trim();
  const jimengCode = String(task.jimeng_code || '').trim();
  const jimengEnabled = !!task.jimeng_enabled;

  return {
    ...task,
    id: pick(task.id, task.task_id, ''),
    businessName: pick(task.business_name, task.businessName, task.merchant_name, task.merchantName, '商家'),
    businessAvatar: Api.getAvatarDisplayUrl(
      pick(task.business_avatar, task.businessAvatar, task.merchantAvatar, ''),
      pick(task.business_id, task.businessId, task.merchant_id, task.merchantId, '')
    ),
    title: pick(task.title, task.name, '高端楼盘春日氛围视频'),
    unit_price: Number(pick(task.unit_price, 0)) || 0,
    award_price: Number(pick(task.award_price, 0)) || 0,
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
    totalCount: Number(pick(task.total_count, task.totalCount, 0)) || 0,
    submissionCount: Number(pick(task.submission_count, task.submissionCount, 0)) || 0,
    jimeng_link: jimengLink,
    jimeng_code: jimengCode,
    jimeng_enabled: jimengEnabled,
    isPublic,
    visibilityText: isPublic ? '公开投稿' : '隐私保护',
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

function getClaimStatusText(claim = {}) {
  const status = Number(claim.normalizedStatus != null ? claim.normalizedStatus : claim.status);
  const reviewResult = Number(pick(claim.review_result, claim.reviewResult, 0)) || 0;
  if (status === 1 && reviewResult === 2) return '已淘汰';
  if (status === 1 && reviewResult === 3) return '已举报';
  const map = { 1: '待提交', 2: '待审核', 3: '已采纳', 4: '已取消', 5: '已超时', 6: '已举报' };
  return map[status] || `未知(${status})`;
}

function getClaimStatusClass(claim = {}) {
  const status = Number(claim.normalizedStatus != null ? claim.normalizedStatus : claim.status);
  const reviewResult = Number(pick(claim.review_result, claim.reviewResult, 0)) || 0;
  if (status === 1 && reviewResult === 2) return 'rejected';
  if (status === 1 && reviewResult === 3) return 'reported';
  const map = { 1: 'draft', 2: 'pending', 3: 'passed', 4: 'cancelled', 5: 'timeout', 6: 'reported' };
  return map[status] || 'draft';
}

function getFilterKey(status) {
  if (status === 2) return 'pending';
  if (status === 3) return 'passed';
  if (status === 6) return 'reported';
  return 'all';
}

function normalizeClaim(claim = {}, task = {}) {
  const status = Number(claim.status);
  const submitAt = pick(claim.submit_at, claim.submitAt, '');
  const reviewResult = Number(pick(claim.review_result, claim.reviewResult, 0)) || 0;
  const normalizedStatus = status === 1 && reviewResult === 0 && hasVisibleSubmission(claim)
    ? 2
    : status;
  const rawMaterials = Array.isArray(claim.materials) ? claim.materials : [];
  const materials = rawMaterials.map(normalizeMediaMaterial);
  const imageMaterials = materials.filter((item) => item.isImage && item.previewUrl);
  const videoMaterials = materials.filter((item) => item.isVideo && item.previewUrl);
  const pendingVideoMaterials = rawMaterials.filter((item) => item.file_type === 'video' && !item.file_path);
  const originalVideoUrls = rawMaterials
    .filter((item) => item.file_type === 'video')
    .map((item) => Api.getDisplayUrl(pick(item.source_file_path, item.sourceFilePath, item.file_path, '')))
    .filter(Boolean);
  const previewImages = imageMaterials.map((item) => item.previewUrl);
  const contentText = extractContentText(claim.content);
  const videoLink = extractVideoLink(claim.content);
  const previewVideos = videoMaterials.map((item) => ({
    url: item.previewUrl,
    poster: item.thumbnailPath || previewImages[0] || '',
  }));

  return {
    ...claim,
    id: claim.id,
    normalizedStatus,
    status: normalizedStatus,
    reviewResult,
    statusText: getClaimStatusText({ ...claim, normalizedStatus }),
    statusClass: getClaimStatusClass({ ...claim, normalizedStatus }),
    filterKey: normalizedStatus === 1 && reviewResult === 0 ? 'draft' : getFilterKey(normalizedStatus),
    creatorName: claim.creator_name || '匿名创作者',
    creatorAvatar: Api.getAvatarDisplayUrl(
      claim.creator_avatar || '',
      claim.creator_id || claim.creatorId || claim.user_id || claim.userId
    ),
    creatorInitial: (claim.creator_name || '匿').slice(0, 1),
    displayDate: formatDateTime(submitAt || claim.updated_at || ''),
    contentText,
    videoLink,
    hasContent: !!contentText,
    processStatusText: pendingVideoMaterials.length > 0
      ? (pendingVideoMaterials.some((item) => item.process_status === 'failed') ? '视频处理失败' : '视频压缩加水印处理中')
      : '',
    previewImages,
    previewVideos,
    previewCount: previewImages.length + previewVideos.length,
    originalVideoUrls,
    canDownloadOriginalVideo: normalizedStatus === 3 && originalVideoUrls.length > 0,
    hasMaterials: previewImages.length > 0 || previewVideos.length > 0,
    canReview: status === 2,
    taskTitle: task.title || '',
  };
}

Page({
  data: {
    taskId: '',
    currentTab: 'proposals',
    loading: false,
    claimsLoadFailed: false,
    claimsLoadErrorMessage: '',
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
    showAdoptConfirmModal: false,
    pendingAdoptClaimId: '',
  },

  onLoad(options = {}) {
    const taskId = options.id || options.taskId || '';
    const validTabs = ['detail', 'proposals'];
    const initialTab = validTabs.includes(options.tab)
      ? options.tab
      : 'proposals';

    this.setData({ taskId, currentTab: initialTab });
    wx.setNavigationBarTitle({ title: '商家任务详情' });

    if (!taskId) {
      wx.showToast({ title: '缺少任务ID', icon: 'none' });
      setTimeout(() => wx.navigateBack(), 1200);
      return;
    }

    if (!app.isLoggedIn()) {
      app.silentLogin()
        .then(() => this.loadTaskDetail(taskId))
        .catch(() => {
          wx.showToast({ title: '登录失效，请重试', icon: 'none' });
          setTimeout(() => wx.navigateBack(), 1200);
        });
      return;
    }

    this.loadTaskDetail(taskId);
  },

  onShow() {
    if (app.isLoggedIn() && this.data.taskId && !this.data.loading) {
      this.loadTaskDetail(this.data.taskId);
    }
  },

  async loadClaimsWithRetry(taskId) {
    try {
      return await Api.getTaskClaims(taskId);
    } catch (err) {
      if (!shouldRetryClaimsLoad(err)) {
        throw err;
      }
      await app.silentLogin();
      return Api.getTaskClaims(taskId);
    }
  },

  onPullDownRefresh() {
    if (!this.data.taskId) {
      wx.stopPullDownRefresh();
      return;
    }
    this.loadTaskDetail(this.data.taskId).finally(() => wx.stopPullDownRefresh());
  },

  async loadTaskDetail(taskId, options = {}) {
    const nextFilter = typeof options.filter === 'string' && options.filter
      ? options.filter
      : this.data.activeFilter;

    this.setData({ loading: true });
    wx.showLoading({ title: '加载中...' });

    try {
      const taskRes = await Api.getTask(taskId).catch(() => ({ data: null }));
      let claimsRes = { data: [] };
      let claimsLoadFailed = false;
      let claimsLoadErrorMessage = '';

      if (app.isLoggedIn()) {
        try {
          claimsRes = await this.loadClaimsWithRetry(taskId);
        } catch (err) {
          claimsLoadFailed = true;
          claimsLoadErrorMessage = (err && err.message) || '投稿加载失败';
        }
      }

      const rawTask = taskRes.data;
      if (!rawTask) {
        wx.showToast({ title: '任务不存在', icon: 'none' });
        this.setData({ loading: false });
        setTimeout(() => wx.navigateBack(), 1200);
        return;
      }

      const task = normalizeTask(rawTask);
      const currentUserId = getCurrentUserId();
      const claims = (Array.isArray(claimsRes.data) ? claimsRes.data : [])
        .filter((item) => hasVisibleSubmission(item))
        .map((item) => normalizeClaim(item, task));
      claims.sort((a, b) => {
        const aOwn = currentUserId && String(a.creator_id || a.creatorId || '') === currentUserId ? 1 : 0;
        const bOwn = currentUserId && String(b.creator_id || b.creatorId || '') === currentUserId ? 1 : 0;
        if (aOwn !== bOwn) {
          return bOwn - aOwn;
        }
        const aTime = new Date(a.created_at || a.createdAt || 0).getTime() || 0;
        const bTime = new Date(b.created_at || b.createdAt || 0).getTime() || 0;
        return bTime - aTime;
      });
      const pendingClaims = claims.filter((item) => item.filterKey === 'pending');
      const totalSubmitted = claims.length;
      const totalAdopted = claims.filter((item) => item.status === 3).length;
      const adoptionRate = totalSubmitted > 0
        ? Math.round((totalAdopted / totalSubmitted) * 100)
        : task.adoptionRate;
      const totalSpent = task.totalSpent || totalAdopted * (task.unit_price + task.award_price);

      this.setData({
        task,
        materials: task.materials || [],
        claims,
        claimsLoadFailed,
        claimsLoadErrorMessage,
        activeFilter: nextFilter,
        proposalCount: claimsLoadFailed ? 0 : pendingClaims.length,
        totalSubmitted,
        totalAdopted,
        adoptionRate,
        totalSpent,
        showEditJimeng: false,
        editJimengLink: task.jimeng_link || task.jimeng_code || '',
        selectedClaims: {},
        selectedCount: 0,
        batchMode: false,
        loading: false,
      });

      this.applyFilter(nextFilter);
      if (claimsLoadFailed) {
        wx.showToast({ title: claimsLoadErrorMessage, icon: 'none' });
      }
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
    if (tab === 'proposals') this.applyFilter(this.data.activeFilter);
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

  copyTaskId() {
    if (!this.data.task.id) return;
    wx.setClipboardData({
      data: String(this.data.task.id),
      success: () => wx.showToast({ title: '已复制', icon: 'success' }),
    });
  },

  previewMaterial(e) {
    const { url, type } = e.currentTarget.dataset;
    if (!url) return;
    if (type === 'video') {
      this.openVideoPreviewByUrl(url);
      return;
    }
    wx.previewImage({ current: url, urls: [url] });
  },

  openVideoPreview(e) {
    const url = e && e.currentTarget && e.currentTarget.dataset
      ? e.currentTarget.dataset.url
      : '';
    this.openVideoPreviewByUrl(url);
  },

  openVideoPreviewByUrl(url) {
    const playableUrl = Api.getPlayableUrl(url);
    if (!playableUrl) {
      wx.showToast({ title: '视频地址无效', icon: 'none' });
      return;
    }
    wx.navigateTo({
      url: `/pages/video-player/index?url=${encodeURIComponent(playableUrl)}`,
    });
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

  openAdoptConfirmModal(e) {
    const { claimId } = e.currentTarget.dataset;
    if (!claimId) {
      wx.showToast({ title: '参数错误', icon: 'none' });
      return;
    }
    this.setData({ showAdoptConfirmModal: true, pendingAdoptClaimId: String(claimId) });
  },

  closeAdoptConfirmModal() {
    this.setData({ showAdoptConfirmModal: false, pendingAdoptClaimId: '' });
  },

  async confirmAdoptClaim() {
    const claimId = this.data.pendingAdoptClaimId;
    if (!claimId) return;
    this.setData({ showAdoptConfirmModal: false, pendingAdoptClaimId: '' });
    await this.performReviewClaim(claimId, 1, null);
  },

  async performReviewClaim(claimId, result, reason = null) {
    try {
      await Api.reviewClaim(claimId, result, reason);
      if (result === 3) {
        const claim = this.data.filteredClaims.find((item) => String(item.id) === String(claimId));
        if (claim) this.createReportDisputeRecords([claim], reason);
      }
      wx.showToast({ title: result === 1 ? '已采纳' : result === 3 ? '已举报' : '已处理', icon: 'success' });
      this.loadTaskDetail(this.data.taskId, { filter: 'all' });
    } catch (err) {
      wx.showToast({ title: err.message || '操作失败', icon: 'none' });
    }
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

    await this.performReviewClaim(claimId, result, reason);
  },

  async batchReview(e) {
    const action = Number(e.currentTarget.dataset.action);
    if (![1, 2, 3].includes(action)) return;

    const selectedClaims = this.data.filteredClaims.filter((item) => this.data.selectedClaims[item.id]);
    if (!selectedClaims.length) {
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
      await Api.batchReviewClaim(selectedClaims.map((item) => item.id), action, reason);
      if (action === 3) {
        this.createReportDisputeRecords(selectedClaims, reason);
      }
      wx.showToast({ title: action === 1 ? '批量采纳成功' : action === 3 ? '批量举报成功' : '批量处理成功', icon: 'success' });
      this.loadTaskDetail(this.data.taskId, { filter: 'all' });
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

  createReportDisputeRecords(claims = [], reason) {
    return claims;
  },

  async downloadAllMaterials() {
    if (!this.data.materials.length) {
      wx.showToast({ title: '暂无素材', icon: 'none' });
      return;
    }

    const files = this.data.materials
      .filter((item) => item.previewUrl || item.file_path)
      .map((item) => ({
        type: item.file_type,
        url: item.previewUrl || item.file_path,
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

  async downloadClaimOriginalVideo(e) {
    const { claimId } = e.currentTarget.dataset;
    const claim = this.data.filteredClaims.find((item) => String(item.id) === String(claimId));
    if (!claim || !Array.isArray(claim.originalVideoUrls) || !claim.originalVideoUrls.length) {
      wx.showToast({ title: '暂无原视频可下载', icon: 'none' });
      return;
    }

    const files = claim.originalVideoUrls.map((url) => ({ type: 'video', url }));
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
      editJimengLink: showEditJimeng ? (this.data.task.jimeng_link || this.data.task.jimeng_code || '') : this.data.editJimengLink,
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
        'task.jimeng_link': editJimengLink,
        'task.jimeng_enabled': true,
        'task.jimeng_code': '',
        showEditJimeng: false,
      });
    } catch (err) {
      wx.showToast({ title: err.message || '更新失败', icon: 'none' });
    } finally {
      wx.hideLoading();
    }
  },

  stopPropagation() {},
});
