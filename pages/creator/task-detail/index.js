const Api = require('../../../utils/api.js');
const { formatDateTime: formatDateTimeText } = require('../../../utils/util.js');
const app = getApp();

function toList(value) {
  if (Array.isArray(value)) return value;
  if (!value) return [];
  if (typeof value === 'string') {
    return value.split(',').map(item => item.trim()).filter(Boolean);
  }
  return [value];
}

function isVideoType(value) {
  return String(value || '').toLowerCase().indexOf('video') !== -1;
}

function isImageType(value) {
  return String(value || '').toLowerCase().indexOf('image') !== -1;
}

function formatDateTime(value) {
  return formatDateTimeText(value);
}

function getClaimStatusClass(status) {
  const value = Number(status);
  const map = {
    1: 'pending',
    2: 'reviewing',
    3: 'approved',
    4: 'cancelled',
    5: 'rejected',
    6: 'reported',
  };
  return map[value] || 'unknown';
}

function getClaimReviewResult(claim = {}) {
  return Number(claim.review_result || claim.reviewResult || 0) || 0;
}

function getClaimActionState(claim = {}) {
  const status = Number(claim.status || 0);
  const reviewResult = getClaimReviewResult(claim);

  if (status === 3) return { text: '已采纳', className: 'action-state-approved' };
  if (status === 4) return { text: '审核超时，已发参与奖', className: 'action-state-timeout' };
  if (status === 5 || (status === 1 && reviewResult === 2)) return { text: '已淘汰', className: 'action-state-rejected' };
  if (status === 6 || (status === 1 && reviewResult === 3)) return { text: '已举报', className: 'action-state-reported' };
  if (status === 2) return { text: '已报名，等待审核', className: 'action-state-pending' };

  return null;
}

function normalizeTask(task = {}) {
  const claim = task.claim ? normalizeClaim(task.claim) : null;
  const claimMaterials = Array.isArray(task.claim_materials)
    ? task.claim_materials.map(item => normalizeClaimMaterial(item))
    : [];
  const submissions = Array.isArray(task.submissions)
    ? task.submissions.map(item => normalizeSubmission(item))
    : [];
  const industries = toList(task.industries);
  const styles = toList(task.styles);
  const endAt = task.endAt || task.end_at || '';
  const isPublic = task.public == null ? true : !!task.public;
  const hasSignedUp = task.hasSignedUp != null ? task.hasSignedUp : (task.has_signed_up != null ? task.has_signed_up : !!claim);
  const canSubmit = task.canSubmit != null
    ? task.canSubmit
    : (task.can_submit != null
      ? task.can_submit
      : !!(claim && Number(claim.status) === 1 && !claim.submitAt && !getClaimReviewResult(claim)));
  const claimAction = claim && !canSubmit ? getClaimActionState(claim) : null;

  return {
    ...task,
    businessId: task.business_id || task.businessId || '',
    merchantName: task.business_name || task.merchantName || '',
    merchantAvatar: task.business_avatar || task.merchantAvatar || '',
    industry: task.industry || industries[0] || '',
    industries,
    style: task.style || styles[0] || '',
    styles,
    unit_price: Number(task.unit_price || 0) || 0,
    award_price: Number(task.award_price || 0) || 0,
    videoAspect: task.videoAspect || task.video_aspect || '',
    videoResolution: task.videoResolution || task.video_resolution || '',
    videoDuration: task.videoDuration || task.video_duration || '',
    adoptionRate: task.adoptionRate ?? task.adoption_rate ?? 0,
    totalPublished: task.totalPublished ?? task.total_published ?? task.totalTasks ?? 0,
    totalSpent: task.totalSpent ?? task.total_spent ?? task.totalSpend ?? 0,
    isPublic,
    visibilityText: isPublic ? '公开投稿' : '隐私保护',
    submissionCount: Number(task.submission_count ?? task.submissionCount ?? submissions.length ?? 0) || 0,
    endAt,
    end_at: endAt,
    jimengEnabled: task.jimeng_enabled ?? task.jimengEnabled ?? true,
    jimengLink: task.jimeng_link || task.jimengLink || '',
    hasSignedUp,
    canSubmit,
    claim,
    claimMaterials,
    submissions,
    claimStatusText: claim ? claim.statusText : '',
    claimSubmissionSummary: summarizeClaimMaterials(claimMaterials),
    claimActionText: claimAction ? claimAction.text : '',
    claimActionClass: claimAction ? claimAction.className : '',
  };
}

function getClaimStatusText(status, reviewResult = 0) {
  const value = Number(status);
  const review = Number(reviewResult || 0);
  if (value === 1 && review === 2) return '已淘汰';
  if (value === 1 && review === 3) return '已举报';
  const map = {
    1: '已报名，待提交',
    2: '已提交，待审核',
    3: '已采纳',
    4: '商家审核超时',
    5: '已淘汰',
    6: '已举报',
  };
  return map[value] || '未知状态';
}

function normalizeClaim(claim = {}) {
  const status = Number(claim.status);
  const reviewResult = getClaimReviewResult(claim);
  const submitAt = claim.submitAt || claim.submit_at || '';
  const createdAt = claim.createdAt || claim.created_at || '';
  const reviewAt = claim.reviewAt || claim.review_at || '';
  const normalizedStatus = status === 1 && reviewResult === 2 ? 5 : (status === 1 && reviewResult === 3 ? 6 : status);

  return {
    ...claim,
    status,
    reviewResult,
    statusText: getClaimStatusText(status, reviewResult),
    statusClass: getClaimStatusClass(normalizedStatus),
    submitAt,
    submit_at: submitAt,
    submitAtText: formatDateTime(submitAt),
    createdAt,
    created_at: createdAt,
    createdAtText: formatDateTime(createdAt),
    reviewAt,
    review_at: reviewAt,
    reviewAtText: formatDateTime(reviewAt),
  };
}

function normalizeClaimMaterial(material = {}) {
  const fileType = material.fileType || material.file_type || '';
  const fileName = material.fileName || material.file_name || '';
  const filePath = material.filePath || material.file_path || '';
  const processedFilePath = material.processedFilePath || material.processed_file_path || '';
  const sourceFilePath = material.sourceFilePath || material.source_file_path || '';
  const thumbnailPath = material.thumbnailPath || material.thumbnail_path || '';
  const processStatus = String(material.processStatus || material.process_status || (isVideoType(fileType) ? 'done' : ''))
    .trim()
    .toLowerCase();
  const processError = material.processError || material.process_error || '';
  const isVideo = isVideoType(fileType);
  const isImage = isImageType(fileType);
  const previewUrl = isVideo
    ? (filePath || processedFilePath || sourceFilePath || '')
    : (filePath || processedFilePath || thumbnailPath || '');
  const hasPreview = !!previewUrl;

  return {
    ...material,
    fileType,
    fileName,
    filePath,
    file_path: filePath,
    processedFilePath,
    processed_file_path: processedFilePath,
    sourceFilePath,
    source_file_path: sourceFilePath,
    thumbnailPath,
    thumbnail_path: thumbnailPath,
    processStatus,
    process_status: processStatus,
    processError,
    process_error: processError,
    isVideo,
    isImage,
    previewUrl,
    hasPreview,
    processStatusText: getMaterialProcessStatusText(processStatus, isVideo, hasPreview),
    processStatusClass: getMaterialProcessStatusClass(processStatus, isVideo),
  };
}

function getSubmissionStatusText(status, reviewResult) {
  const value = Number(status);
  const review = Number(reviewResult || 0);
  if (value === 3) return '已采纳';
  if (review === 3) return '已举报';
  if (review === 2) return '已淘汰';
  if (value === 2) return '待审核';
  return '已投稿';
}

function getSubmissionStatusClass(status, reviewResult) {
  const value = Number(status);
  const review = Number(reviewResult || 0);
  if (value === 3) return 'approved';
  if (review === 3) return 'reported';
  if (review === 2) return 'rejected';
  if (value === 2) return 'pending';
  return 'pending';
}

function normalizeSubmission(submission = {}) {
  const materials = Array.isArray(submission.materials)
    ? submission.materials.map(item => normalizeClaimMaterial(item))
    : [];
  const status = Number(submission.status);
  const reviewResult = Number(submission.review_result || submission.reviewResult || 0);
  const submitAt = submission.submit_at || submission.submitAt || '';

  return {
    ...submission,
    status,
    reviewResult,
    materials,
    creatorName: submission.creator_name || '匿名创作者',
    creatorAvatar: submission.creator_avatar || '/assets/icons/avatar-default.jpg',
    creatorLevel: Number(submission.creator_level || submission.creatorLevel || 0) || 0,
    submitAt,
    submitAtText: formatDateTime(submitAt),
    statusText: getSubmissionStatusText(status, reviewResult),
    statusClass: getSubmissionStatusClass(status, reviewResult),
  };
}

function getMaterialProcessStatusText(status, isVideo, hasPreview) {
  if (!isVideo) return '';
  if (status === 'failed') {
    return hasPreview ? '处理失败，展示原视频' : '视频处理失败';
  }
  if (status === 'processing') {
    return hasPreview ? '处理中，可先看原视频' : '视频处理中';
  }
  if (status === 'pending') {
    return hasPreview ? '待处理，可先看原视频' : '等待处理';
  }
  return '已生成可播放版本';
}

function getMaterialProcessStatusClass(status, isVideo) {
  if (!isVideo) return 'done';
  if (status === 'failed') return 'failed';
  if (status === 'processing') return 'processing';
  if (status === 'pending') return 'pending';
  return 'done';
}

function summarizeClaimMaterials(materials = []) {
  if (!materials.length) return '';
  const videos = materials.filter(item => item.isVideo);
  if (!videos.length) {
    return `已上传 ${materials.length} 个稿件`;
  }

  const counts = videos.reduce((acc, item) => {
    const status = item.processStatus || 'done';
    if (status === 'failed') {
      acc.failed += 1;
    } else if (status === 'processing') {
      acc.processing += 1;
    } else if (status === 'pending') {
      acc.pending += 1;
    } else {
      acc.done += 1;
    }
    return acc;
  }, { pending: 0, processing: 0, failed: 0, done: 0 });

  const parts = [];
  if (counts.done) parts.push(`${counts.done} 个视频可查看`);
  if (counts.processing) parts.push(`${counts.processing} 个视频处理中`);
  if (counts.pending) parts.push(`${counts.pending} 个视频待处理`);
  if (counts.failed) parts.push(`${counts.failed} 个视频处理失败`);
  return parts.join('，');
}

const CLAIM_BLOCKED_CODES = new Set([40002, 40004, 40302, 40303, 40304]);

function getCurrentUserId() {
  const user = (app && typeof app.getUser === 'function' && app.getUser()) || Api.getUser();
  return user && user.id != null ? String(user.id) : '';
}

Page({
  data: {
    taskId: '',
    task: {},
    materials: [],
    claimMaterials: [],
    submissions: [],
    recommendations: [],
    currentTab: 'detail',
    hasSignedUp: false,
    canSubmit: false,
    isMerchantTask: false,
    countdownText: '',
    countdownTimer: null,
    // 提交模态框相关
    showSubmitModal: false,
    showCreatorNoticeModal: false,
    showUploadProgressModal: false,
    uploadProgress: 10,
    submitClaimId: '',
    submitVideoUrl: '',
    submitting: false,
  },

  onLoad(options) {
    if (options.id) {
      this.setData({ taskId: options.id });
      this.loadTaskDetail(options.id).then(() => {
        if (options.action === 'submit') {
          this.goSubmitWork();
        }
      });
    }
  },

  onShow() {
    if (!this.data.taskId || !this.data.task) return;
    const currentUserId = getCurrentUserId();
    const isMerchantTask = !!(currentUserId && String(this.data.task.businessId || this.data.task.business_id || '') === currentUserId);
    if (isMerchantTask !== this.data.isMerchantTask) {
      this.setData({ isMerchantTask });
    }
  },

  onUnload() {
    if (this.data.countdownTimer) {
      clearInterval(this.data.countdownTimer);
      this.setData({ countdownTimer: null });
    }
    if (this.uploadProgressTimer) {
      clearInterval(this.uploadProgressTimer);
      this.uploadProgressTimer = null;
    }
  },

  async loadTaskDetail(taskId, options = {}) {
    const { silent = false } = options;
    if (!silent) {
      wx.showLoading({ title: '加载中...' });
    }
    try {
      const res = await Api.getTask(taskId);
      const task = normalizeTask(res.data || {});
      const currentUserId = getCurrentUserId();
      this.setData({
        task,
        materials: task.materials || [],
        claimMaterials: task.claimMaterials || [],
        submissions: task.submissions || [],
        hasSignedUp: !!task.hasSignedUp,
        canSubmit: !!task.canSubmit,
        submitClaimId: task.claim && task.claim.id ? String(task.claim.id) : '',
        isMerchantTask: !!(currentUserId && String(task.businessId || task.business_id || '') === currentUserId),
      });
      this.startCountdownTimer(task.endAt);
    } catch (err) {
      wx.showToast({ title: '加载失败', icon: 'none' });
    } finally {
      if (!silent) {
        wx.hideLoading();
      }
    }
  },

  startCountdownTimer(endAt) {
    if (this.data.countdownTimer) {
      clearInterval(this.data.countdownTimer);
    }
    this.updateCountdown(endAt);
    const timer = setInterval(() => {
      this.updateCountdown(endAt);
    }, 60000);
    this.setData({ countdownTimer: timer });
  },

  updateCountdown(endAt) {
    if (!endAt) return;
    const endTime = new Date(endAt).getTime();
    const now = new Date().getTime();
    const diff = endTime - now;
    if (diff <= 0) {
      this.setData({ countdownText: '已截止' });
      if (this.data.countdownTimer) {
        clearInterval(this.data.countdownTimer);
        this.setData({ countdownTimer: null });
      }
      return;
    }
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    this.setData({ countdownText: `${hours}小时${minutes}分` });
  },

  switchTab(e) {
    const tab = e.currentTarget.dataset.tab;
    this.setData({ currentTab: tab });
  },

  goBack() {
    wx.navigateBack({ fail: () => wx.switchTab({ url: '/pages/home/index' }) });
  },

  copyTaskId() {
    const taskId = this.data.task.id || 'CC-20260418-000126';
    wx.setClipboardData({
      data: taskId,
      success: () => {
        wx.showToast({ title: '已复制', icon: 'success' });
      }
    });
  },

  previewMaterial(e) {
    const url = e.currentTarget.dataset.url;
    wx.previewImage({ urls: [url], current: url });
  },

  goTaskDetail(e) {
    const id = e.currentTarget.dataset.id;
    wx.navigateTo({ url: `/pages/creator/task-detail/index?id=${id}` });
  },

  handleMainAction() {
    if (this.data.isMerchantTask) {
      wx.navigateTo({ url: `/pages/employer/task-detail/index?id=${this.data.taskId}` });
      return;
    }
    if (!this.data.hasSignedUp) {
      this.handleSignUp();
      return;
    }
    if (this.data.canSubmit) {
      this.goSubmitWork();
      return;
    }
    if (this.data.task && this.data.task.claimActionText) {
      return;
    }
    wx.showToast({ title: '当前状态不可提交', icon: 'none' });
  },

  async handleSignUp() {
    if (this.data.hasSignedUp) {
      wx.showToast({ title: '已报名', icon: 'none' });
      return;
    }
    wx.showLoading({ title: '报名中...' });
    try {
      const res = await Api.claimTask(this.data.taskId);
      const claimId = res.data && res.data.claim_id ? String(res.data.claim_id) : '';
      if (claimId) {
        this.setData({ submitClaimId: claimId });
      }
      await this.loadTaskDetail(this.data.taskId, { silent: true });
      if (!this.data.hasSignedUp) {
        this.setData({
          hasSignedUp: true,
          canSubmit: true,
          submitClaimId: claimId || this.data.submitClaimId,
        });
      }
      wx.hideLoading();
      wx.showToast({ title: '报名成功', icon: 'success' });
    } catch (err) {
      wx.hideLoading();
      const msg = err && err.message ? err.message : '报名失败';
      if (err && CLAIM_BLOCKED_CODES.has(Number(err.code))) {
        wx.showModal({
          title: '无法报名',
          content: msg,
          showCancel: false,
        });
        return;
      }
      wx.showToast({ title: msg, icon: 'none' });
    }
  },

  loadClaimId() {
    const task = this.data.task || {};
    if (task.claim && task.claim.id) {
      this.setData({ submitClaimId: String(task.claim.id) });
      return Promise.resolve(task.claim.id);
    }
    return Api.getClaimByTaskId(this.data.taskId).then((res) => {
      const claim = res && res.data ? (res.data.claim || res.data) : null;
      if (claim && claim.id) {
        this.setData({ submitClaimId: String(claim.id) });
        return claim.id;
      }
      this.setData({ submitClaimId: '' });
    }).catch(() => {
      this.setData({ submitClaimId: '' });
    });
  },

  async goSubmitWork() {
    if (!this.data.canSubmit) {
      wx.showToast({ title: '当前状态不可提交', icon: 'none' });
      return;
    }
    if (!this.data.submitClaimId) {
      await this.loadClaimId();
    }
    if (!this.data.submitClaimId) {
      wx.showToast({ title: '报名记录不存在，请先报名', icon: 'none' });
      return;
    }
    this.setData({ showCreatorNoticeModal: true});
  },

  onCloseSubmitModal() {
    this.setData({ showSubmitModal: false, submitVideoUrl: '', submitting: false });
  },

  onCloseCreatorNotice() {
    this.setData({ showCreatorNoticeModal: false });
  },

  onAcknowledgeCreatorNotice() {
    this.setData({ showCreatorNoticeModal: false });
    this.setData({ showSubmitModal: true, submitVideoUrl: '' });
  },

  updateUploadProgress(progress) {
    const value = Math.max(0, Math.min(100, Number(progress) || 0));
    this.setData({
      uploadProgress: Math.round(value),
    });
  },

  startUploadProgress() {
    if (this.uploadProgressTimer) {
      clearInterval(this.uploadProgressTimer);
    }
    this.updateUploadProgress(1);
    this.uploadProgressTimer = setInterval(() => {
      const current = this.data.uploadProgress || 0;
      if (current >= 85) return;
      this.updateUploadProgress(current + 3);
    }, 350);
  },

  stopUploadProgress() {
    if (this.uploadProgressTimer) {
      clearInterval(this.uploadProgressTimer);
      this.uploadProgressTimer = null;
    }
  },

  onCloseUploadProgressModal() {
    if (this.data.submitting) {
      wx.showToast({ title: '视频上传中，请稍候', icon: 'none' });
      return;
    }
    this.stopUploadProgress();
    this.setData({ showUploadProgressModal: false });
  },

  onChooseVideo() {
    wx.chooseMedia({
      count: 1,
      mediaType: ['video'],
      sourceType: ['album', 'camera'],
      maxDuration: 60,
      camera: 'back',
      success: (res) => {
        const tempFilePath = res.tempFiles[0].tempFilePath;
        this.setData({ submitVideoUrl: tempFilePath });
        wx.showToast({ title: '视频已选择', icon: 'success' });
      },
      fail: () => {
        wx.showToast({ title: '选择失败', icon: 'none' });
      }
    });
  },

  async onSubmitWork() {
    if (this.data.submitting) return;
    if (!this.data.submitVideoUrl) {
      wx.showToast({ title: '请先选择视频', icon: 'none' });
      return;
    }
    const claimId = this.data.submitClaimId;
    if (!claimId) {
      wx.showToast({ title: '报名记录不存在，请重新报名', icon: 'none' });
      return;
    }

    this.setData({ submitting: true, showUploadProgressModal: true, uploadProgress: 0 }, () => {
      this.startUploadProgress();
    });

    try {
      const uploadJobId = `claim-${claimId}-${Date.now()}`;
      const uploadRes = await Api.uploadVideo(this.data.submitVideoUrl, {
        bizType: 'claim_source',
        bizId: claimId,
        jobId: uploadJobId,
        returnMeta: true,
      });

      this.updateUploadProgress(86);

      const submitRes = await Api.submitClaim(claimId, {
        content: `视频稿件：${uploadRes.filename || 'video.mp4'}`,
        materials: [{
          file_name: uploadRes.filename || 'video.mp4',
          file_path: uploadRes.url,
          file_size: uploadRes.size || 0,
          file_type: uploadRes.type || 'video/mp4',
        }],
      });

      this.updateUploadProgress(100);
      this.stopUploadProgress();
      await new Promise(resolve => setTimeout(resolve, 220));
      const summary = submitRes.data && submitRes.data.process_status_summary;
      const pendingCount = summary ? ((summary.pending || 0) + (summary.processing || 0)) : 0;
      this.setData({ showUploadProgressModal: false });
      wx.showToast({
        title: pendingCount ? '提交成功，处理中' : '提交成功',
        icon: 'success'
      });
      this.onCloseSubmitModal();
      await this.loadTaskDetail(this.data.taskId, { silent: true });
      this.setData({ currentTab: 'submissions' });
    } catch (err) {
      this.stopUploadProgress();
      this.setData({ showUploadProgressModal: false });
      wx.showToast({ title: err.message || '提交失败', icon: 'none' });
    } finally {
      this.setData({ submitting: false });
    }
  },

  stopPropagation() {}
});
