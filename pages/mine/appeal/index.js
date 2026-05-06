const Api = require('../../../utils/api.js');
const { formatDateTime } = require('../../../utils/util.js');

const app = getApp();

const DEFAULT_REPORT_REASON = '涉嫌敏感词、低俗内容、侵权内容、政治敏感、广告夸大。';
const MAX_UPLOAD_IMAGES = 3;

function pick() {
  for (let i = 0; i < arguments.length; i += 1) {
    const value = arguments[i];
    if (value !== undefined && value !== null && value !== '') return value;
  }
  return '';
}

function toNumber(value) {
  const num = Number(value);
  return Number.isFinite(num) ? num : 0;
}

function toPositiveInt(value) {
  const num = Number(value);
  return Number.isFinite(num) && num > 0 ? num : 0;
}

function toTimestamp(value) {
  const ts = new Date(value || '').getTime();
  return Number.isFinite(ts) ? ts : 0;
}

function splitCSV(value) {
  return String(value || '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

function normalizeWorkflowMaterial(material = {}) {
  const fileType = String(pick(material.file_type, material.fileType, '')).toLowerCase();
  const filePath = pick(
    material.file_path,
    material.filePath,
    material.processed_file_path,
    material.processedFilePath,
    material.source_file_path,
    material.sourceFilePath,
    ''
  );
  const thumbnailPath = pick(material.thumbnail_path, material.thumbnailPath, '');
  const posterPath = pick(material.poster_url, material.posterUrl, material.thumbnail_url, material.thumbnailUrl, '');
  const previewUrl = fileType === 'video'
    ? Api.getPlayableUrl(filePath || material.previewUrl || '')
    : Api.getDisplayUrl(filePath || material.previewUrl || '');
  const posterUrl = fileType === 'video'
    ? Api.getDisplayUrl(thumbnailPath || posterPath || '')
    : previewUrl;

  return {
    ...material,
    fileType,
    file_path: filePath,
    filePath,
    thumbnail_path: thumbnailPath,
    thumbnailPath,
    previewUrl,
    posterUrl,
    isVideo: fileType === 'video',
    isImage: fileType === 'image',
  };
}

function normalizeAppeal(appeal = {}) {
  const status = toNumber(pick(appeal.status, 1)) || 1;
  const createdAt = pick(appeal.created_at, appeal.createdAt, '');
  const handleAt = pick(appeal.handle_at, appeal.handleAt, '');
  const resolved = status === 2;
  const evidence = splitCSV(pick(appeal.evidence, ''));

  return {
    id: String(pick(appeal.id, '')),
    claimId: String(pick(appeal.claim_id, appeal.claimId, appeal.target_id, appeal.targetId, '')),
    taskId: String(pick(appeal.task_id, appeal.taskId, '')),
    reason: pick(appeal.reason, ''),
    result: pick(appeal.result, resolved ? '已处理' : '平台处理中'),
    status,
    statusText: pick(appeal.status_str, resolved ? '已处理' : '待处理'),
    statusClass: resolved ? 'resolved' : 'processing',
    createdAt,
    handleAt,
    evidence,
    evidenceCount: evidence.length,
    sortAt: toTimestamp(handleAt || createdAt),
  };
}

function normalizeClaim(claim = {}) {
  const materials = Array.isArray(claim.materials) ? claim.materials.map(normalizeWorkflowMaterial) : [];
  const reviewResult = toNumber(pick(claim.review_result, claim.reviewResult, 0));
  const reviewComment = pick(claim.review_comment, claim.reviewComment, '');
  const taskId = String(pick(claim.task_id, claim.taskId, ''));
  const createdAt = pick(claim.created_at, claim.createdAt, '');
  const reviewAt = pick(claim.review_at, claim.reviewAt, '');
  const submitAt = pick(claim.submit_at, claim.submitAt, '');
  const updatedAt = pick(claim.updated_at, claim.updatedAt, '');

  return {
    ...claim,
    id: String(pick(claim.id, claim.claim_id, '')),
    taskId,
    task_id: taskId,
    taskTitle: pick(claim.task_title, claim.taskTitle, ''),
    creatorName: pick(claim.creator_name, claim.creatorName, ''),
    creatorAvatar: pick(claim.creator_avatar, claim.creatorAvatar, ''),
    reviewResult,
    reviewComment,
    reviewAt,
    submitAt,
    createdAt,
    updatedAt,
    materials,
  };
}

function getViewerRole(options = {}) {
  const raw = String(pick(options.scope, options.mode, options.role, '')).toLowerCase();
  if (raw === 'business' || raw === 'merchant') return 'business';
  return 'creator';
}

function getEmptyState(viewerRole, hasTaskContext) {
  if (viewerRole === 'business') {
    return {
      emptyTitle: hasTaskContext ? '暂无申诉流程' : '请从任务详情进入',
      emptyDesc: hasTaskContext
        ? '这个任务还没有可展示的举报、申诉或处理记录。'
        : '商家视角需要从任务详情页打开，才能看到对应作品的举报和申诉流程。',
      emptyActionText: hasTaskContext ? '返回任务管理' : '去任务管理',
    };
  }

  return {
    emptyTitle: '暂无申诉流程',
    emptyDesc: '被商家举报或已提交申诉的作品会显示在这里。',
    emptyActionText: '联系客服',
  };
}

function buildWorkflowCard({ claim = {}, task = {}, appeal = null, viewerRole = 'creator' }) {
  const claimId = String(pick(claim.id, claim.claim_id, ''));
  const taskId = String(pick(claim.task_id, claim.taskId, task.id, task.task_id, ''));
  const reviewResult = toNumber(pick(claim.review_result, claim.reviewResult, 0));
  const appealStatus = appeal ? toNumber(appeal.status) : 0;
  const appealResolved = appealStatus === 2;

  const taskTitle = pick(task.title, task.task_title, claim.task_title, claim.taskTitle, `任务 #${taskId || claimId || '-'}`);
  const taskOwnerName = pick(task.business_name, task.businessName, task.merchant_name, task.merchantName, '');
  const creatorName = pick(claim.creator_name, claim.creatorName, '');
  const taskAvatar = Api.getAvatarDisplayUrl(
    pick(task.business_avatar, task.businessAvatar, task.merchantAvatar, claim.business_avatar, claim.businessAvatar, ''),
    pick(task.business_id, task.businessId, task.merchant_id, task.merchantId, taskId)
  );

  const reportReason = reviewResult === 3
    ? pick(claim.review_comment, claim.reviewComment, DEFAULT_REPORT_REASON)
    : pick(claim.review_comment, claim.reviewComment, '');
  const reportTimeText = formatDateTime(pick(claim.review_at, claim.reviewAt, claim.updated_at, claim.updatedAt, claim.created_at, claim.createdAt, ''));

  const appealReason = appeal ? pick(appeal.reason, '') : '';
  const appealTimeText = appeal ? formatDateTime(pick(appeal.handleAt, appeal.handle_at, appeal.createdAt, appeal.created_at, '')) : '';
  const appealLabel = appeal
    ? (appealResolved ? '已处理' : '待处理')
    : (viewerRole === 'business' ? '等待创作者申诉' : '待申诉');
  const appealDetail = appeal
    ? (appeal.evidenceCount > 0 ? `证据 ${appeal.evidenceCount} 项` : '已提交申诉说明')
    : (viewerRole === 'business' ? '创作者提交后会进入平台处理' : '点击按钮提交申诉说明');

  const platformResult = appeal
    ? pick(appeal.result, appeal.statusText, appealResolved ? '已处理' : '平台处理中')
    : '等待申诉后处理';
  const platformLabel = appeal ? (appealResolved ? '已处理' : '平台处理中') : '待处理';
  const platformDetail = appeal
    ? (appealResolved ? '平台已经给出处理结果' : '平台正在审核申诉')
    : '等待创作者申诉后进入平台处理';

  const reportLabel = reviewResult === 3 ? '已举报' : '待处理';
  const overallStateText = appeal
    ? (appealResolved ? '已处理' : '平台处理中')
    : (viewerRole === 'business' ? '等待创作者申诉' : '待申诉');
  const overallStateClass = appeal
    ? (appealResolved ? 'resolved' : 'processing')
    : (viewerRole === 'business' ? 'waiting' : 'muted');

  const taskSubtitleParts = [];
  if (viewerRole === 'creator' && taskOwnerName) {
    taskSubtitleParts.push(`商家 ${taskOwnerName}`);
  }
  if (viewerRole === 'business' && creatorName) {
    taskSubtitleParts.push(`创作者 ${creatorName}`);
  }
  if (reportTimeText) {
    taskSubtitleParts.push(`举报 ${reportTimeText}`);
  } else if (appealTimeText) {
    taskSubtitleParts.push(`申诉 ${appealTimeText}`);
  }

  const materials = Array.isArray(claim.materials) ? claim.materials.slice(0, 4).map(normalizeWorkflowMaterial) : [];
  const sortAt = Math.max(
    toTimestamp(pick(appeal && (appeal.handleAt || appeal.handle_at), appeal && (appeal.createdAt || appeal.created_at), '')),
    toTimestamp(pick(claim.review_at, claim.reviewAt, claim.updated_at, claim.updatedAt, claim.created_at, claim.createdAt, ''))
  );

  return {
    key: `claim:${claimId || taskId || Date.now()}`,
    claimId,
    taskId,
    taskTitle,
    taskOwnerName,
    creatorName,
    taskAvatar,
    taskSubtitle: taskSubtitleParts.length ? taskSubtitleParts.join(' · ') : `任务ID ${taskId || '-'}`,
    viewerRole,
    viewerRoleLabel: viewerRole === 'business' ? '商家视角' : '创作者视角',
    overallStateText,
    overallStateClass,
    claimStatusText: reportLabel,
    report: {
      title: '商家举报',
      label: reportLabel,
      reason: reportReason || DEFAULT_REPORT_REASON,
      timeText: reportTimeText || '时间待更新',
      detail: reviewResult === 3 ? '商家已完成举报' : '等待商家处理',
      stateClass: reviewResult === 3 ? 'reported' : 'waiting',
    },
    appeal: {
      title: '创作者申诉',
      label: appealLabel,
      reason: appealReason || (viewerRole === 'creator' ? '点击按钮提交申诉说明' : '等待创作者提交申诉'),
      detail: appealDetail,
      timeText: appealTimeText || '时间待更新',
      stateClass: appeal ? (appealResolved ? 'resolved' : 'processing') : (viewerRole === 'business' ? 'waiting' : 'muted'),
      appealId: appeal ? String(appeal.id || '') : '',
      evidenceCount: appeal ? appeal.evidenceCount : 0,
      evidenceList: appeal ? appeal.evidence : [],
    },
    platform: {
      title: '平台处理',
      label: platformLabel,
      result: platformResult,
      detail: platformDetail,
      timeText: appealTimeText || '时间待更新',
      stateClass: appeal ? (appealResolved ? 'resolved' : 'processing') : 'waiting',
    },
    materials,
    canAppeal: viewerRole === 'creator' && reviewResult === 3 && !appeal,
    sortAt,
  };
}

function sortWorkflowCards(cards = []) {
  return cards.sort((a, b) => (b.sortAt || 0) - (a.sortAt || 0));
}

Page({
  data: {
    loading: false,
    viewerRole: 'creator',
    viewerRoleLabel: '创作者视角',
    taskId: '',
    claimId: '',
    records: [],
    emptyTitle: '暂无申诉流程',
    emptyDesc: '被商家举报或已提交申诉的作品会显示在这里。',
    emptyActionText: '联系客服',
    showComposer: false,
    composerTarget: null,
    reason: '',
    uploadImages: [],
    submitError: '',
    submitting: false,
  },

  onLoad(options = {}) {
    const viewerRole = getViewerRole(options);
    const taskId = String(pick(options.taskId, options.task_id, ''));
    const claimId = String(pick(options.claimId, options.claim_id, ''));
    const emptyState = getEmptyState(viewerRole, !!taskId);

    this.setData({
      viewerRole,
      viewerRoleLabel: viewerRole === 'business' ? '商家视角' : '创作者视角',
      taskId,
      claimId,
      ...emptyState,
    });

    wx.setNavigationBarTitle({ title: '申诉流程' });

    if (!app.isLoggedIn()) {
      app.silentLogin()
        .then(() => this.loadPageData())
        .catch(() => wx.showToast({ title: '登录失效，请重试', icon: 'none' }));
      return;
    }

    this.loadPageData();
  },

  onShow() {
    if (app.isLoggedIn() && !this.data.loading) {
      this.loadPageData(false);
    }
  },

  onPullDownRefresh() {
    this.loadPageData().finally(() => wx.stopPullDownRefresh());
  },

  async loadPageData(showLoading = true) {
    if (this.data.loading) return;
    this.setData({ loading: true });
    if (showLoading) {
      wx.showLoading({ title: '加载中...' });
    }

    try {
      const records = this.data.viewerRole === 'business'
        ? await this.loadBusinessWorkflows()
        : await this.loadCreatorWorkflows();

      const emptyState = getEmptyState(this.data.viewerRole, !!this.data.taskId);
      this.setData({
        records: sortWorkflowCards(records),
        loading: false,
        ...emptyState,
      });

      this.autoOpenComposerFromRoute(records);
    } catch (err) {
      this.setData({ loading: false });
      wx.showToast({ title: err.message || '加载失败', icon: 'none' });
    } finally {
      if (showLoading) {
        wx.hideLoading();
      }
    }
  },

  async loadCreatorWorkflows() {
    const [claimsRes, appealsRes] = await Promise.all([
      Api.getMyClaims({ page: 1, limit: 100 }),
      Api.getAppeals({ limit: 100, offset: 0 }).catch(() => ({ data: { appeals: [] } })),
    ]);

    const claims = Array.isArray(claimsRes && claimsRes.data) ? claimsRes.data : [];
    const appeals = Array.isArray(appealsRes && appealsRes.data && appealsRes.data.appeals)
      ? appealsRes.data.appeals
      : [];

    const appealMap = new Map();
    appeals.forEach((appeal) => {
      const normalizedAppeal = normalizeAppeal(appeal);
      if (!normalizedAppeal.claimId) return;
      if (!appealMap.has(normalizedAppeal.claimId)) {
        appealMap.set(normalizedAppeal.claimId, normalizedAppeal);
      }
    });

    let candidateClaims = claims
      .map(normalizeClaim)
      .filter((claim) => claim.reviewResult === 3 || appealMap.has(claim.id));

    if (this.data.claimId) {
      candidateClaims = candidateClaims.filter((claim) => claim.id === this.data.claimId);
    }

    if (!candidateClaims.length) {
      return [];
    }

    const taskIds = Array.from(new Set(candidateClaims.map((claim) => claim.taskId).filter(Boolean)));
    const taskMap = await this.loadTaskMap(taskIds);

    return candidateClaims.map((claim) => buildWorkflowCard({
      claim,
      task: taskMap[claim.taskId] || {},
      appeal: appealMap.get(claim.id) || null,
      viewerRole: 'creator',
    }));
  },

  autoOpenComposerFromRoute(records = []) {
    if (this.data.viewerRole !== 'creator' || !this.data.claimId || this.data.showComposer) {
      return;
    }

    const record = records.find((item) => String(item.claimId) === String(this.data.claimId));
    if (!record || !record.canAppeal) {
      return;
    }

    this.setData({ claimId: '' });
    this.openComposerByRecord(record);
  },

  async loadBusinessWorkflows() {
    if (!this.data.taskId) {
      return [];
    }

    const [taskRes, claimsRes, appealsRes] = await Promise.all([
      Api.getTask(this.data.taskId).catch(() => ({ data: {} })),
      Api.getTaskClaims(this.data.taskId).catch(() => ({ data: [] })),
      Api.getBusinessAppeals({ limit: 100, offset: 0 }).catch(() => ({ data: { appeals: [] } })),
    ]);

    const task = taskRes && taskRes.data ? taskRes.data : {};
    const claims = Array.isArray(claimsRes && claimsRes.data) ? claimsRes.data : [];
    const appeals = Array.isArray(appealsRes && appealsRes.data && appealsRes.data.appeals)
      ? appealsRes.data.appeals
      : [];

    const appealMap = new Map();
    appeals.forEach((appeal) => {
      const normalizedAppeal = normalizeAppeal(appeal);
      if (!normalizedAppeal.claimId) return;
      if (!appealMap.has(normalizedAppeal.claimId)) {
        appealMap.set(normalizedAppeal.claimId, normalizedAppeal);
      }
    });

    let candidateClaims = claims
      .map(normalizeClaim)
      .filter((claim) => claim.reviewResult === 3 || appealMap.has(claim.id));

    if (this.data.claimId) {
      candidateClaims = candidateClaims.filter((claim) => claim.id === this.data.claimId);
    }

    return candidateClaims.map((claim) => buildWorkflowCard({
      claim,
      task,
      appeal: appealMap.get(claim.id) || null,
      viewerRole: 'business',
    }));
  },

  async loadTaskMap(taskIds = []) {
    const map = {};
    const ids = Array.from(new Set(taskIds.map((item) => String(item)).filter(Boolean)));
    await Promise.all(ids.map(async (taskId) => {
      try {
        const res = await Api.getTask(taskId);
        map[taskId] = res && res.data ? res.data : {};
      } catch (err) {
        map[taskId] = {};
      }
    }));
    return map;
  },

  openTaskDetail(e) {
    const taskId = String(pick(e.currentTarget.dataset.taskId, e.currentTarget.dataset.taskid, ''));
    if (!taskId) return;

    if (this.data.viewerRole === 'business') {
      wx.navigateTo({ url: `/pages/employer/task-detail/index?id=${encodeURIComponent(taskId)}` });
      return;
    }

    wx.navigateTo({ url: `/pages/creator/task-detail/index?id=${encodeURIComponent(taskId)}` });
  },

  previewMaterial(e) {
    const { claimId, previewType, previewUrl } = e.currentTarget.dataset;
    if (!previewUrl) return;

    if (previewType === 'video') {
      wx.navigateTo({
        url: `/pages/video-player/index?url=${encodeURIComponent(previewUrl)}`,
      });
      return;
    }

    const record = (this.data.records || []).find((item) => String(item.claimId) === String(claimId));
    const urls = record
      ? record.materials.filter((item) => !item.isVideo && item.previewUrl).map((item) => item.previewUrl)
      : [previewUrl];

    wx.previewImage({
      current: previewUrl,
      urls,
    });
  },

  openComposer(e) {
    const claimId = String(pick(e.currentTarget.dataset.claimId, e.currentTarget.dataset.claimid, e.currentTarget.dataset.claim, ''));
    if (!claimId) {
      wx.showToast({ title: '缺少申诉对象', icon: 'none' });
      return;
    }

    const record = (this.data.records || []).find((item) => String(item.claimId) === claimId);
    if (!record || !record.canAppeal) {
      wx.showToast({ title: '当前作品暂无可申诉状态', icon: 'none' });
      return;
    }

    this.openComposerByRecord(record);
  },

  openComposerByRecord(record = {}) {
    this.setData({
      showComposer: true,
      composerTarget: {
        claimId: record.claimId,
        taskId: record.taskId,
        taskTitle: record.taskTitle,
        reportReason: record.report.reason,
      },
      reason: '',
      uploadImages: [],
      submitError: '',
      submitting: false,
    });
  },

  closeComposer() {
    if (this.data.submitting) return;
    this.setData({
      showComposer: false,
      composerTarget: null,
      reason: '',
      uploadImages: [],
      submitError: '',
      submitting: false,
    });
  },

  onReasonInput(e) {
    this.setData({
      reason: e.detail.value,
      submitError: '',
    });
  },

  uploadImage() {
    if (this.data.submitting) return;
    const remaining = MAX_UPLOAD_IMAGES - this.data.uploadImages.length;
    if (remaining <= 0) return;

    wx.chooseMedia({
      count: remaining,
      mediaType: ['image'],
      sourceType: ['album', 'camera'],
      success: (res) => {
        const images = (res.tempFiles || []).map((item) => ({
          tempFilePath: item.tempFilePath,
          previewUrl: item.tempFilePath,
        }));
        this.setData({
          uploadImages: this.data.uploadImages.concat(images).slice(0, MAX_UPLOAD_IMAGES),
        });
      },
    });
  },

  removeImage(e) {
    if (this.data.submitting) return;
    const index = Number(e.currentTarget.dataset.index);
    if (!Number.isFinite(index)) return;

    const nextImages = this.data.uploadImages.slice();
    nextImages.splice(index, 1);
    this.setData({ uploadImages: nextImages });
  },

  async uploadEvidenceImages() {
    const uploadedUrls = [];
    const currentUser = app.globalData.user || {};

    for (let i = 0; i < this.data.uploadImages.length; i += 1) {
      const image = this.data.uploadImages[i];
      let uploadRes;
      try {
        uploadRes = await Api.uploadImage(image.tempFilePath || image, {
          bizType: 'appeal_evidence',
          bizId: currentUser.id ? String(currentUser.id) : '',
          jobId: `appeal-${this.data.composerTarget.claimId}-${Date.now()}-${i + 1}`,
          returnMeta: true,
        });
      } catch (err) {
        throw new Error(`第 ${i + 1} 张图片上传失败：${(err && err.message) || '请重试'}`);
      }
      uploadedUrls.push(uploadRes.url);
    }

    return uploadedUrls.join(',');
  },

  async submitAppeal() {
    const target = this.data.composerTarget;
    const claimId = toPositiveInt(target && target.claimId);
    if (!target || !claimId) {
      wx.showToast({ title: '缺少申诉对象', icon: 'none' });
      return;
    }

    const reason = String(this.data.reason || '').trim();
    if (!reason) {
      this.setData({ submitError: '请输入申诉说明' });
      return;
    }

    if (this.data.submitting) return;

    this.setData({
      submitting: true,
      submitError: '',
    });

    try {
      const evidence = this.data.uploadImages.length ? await this.uploadEvidenceImages() : '';
      await Api.createAppeal({
        type: 1,
        claim_id: claimId,
        reason,
        evidence,
      });

      wx.showToast({ title: '申诉已提交', icon: 'success' });
      this.closeComposer();
      await this.loadPageData(false);
    } catch (err) {
      const message = err && err.message ? err.message : '提交失败';
      this.setData({ submitError: message });
      wx.showToast({ title: message, icon: 'none' });
    } finally {
      this.setData({ submitting: false });
    }
  },

  goEntryPage() {
    if (this.data.viewerRole === 'business') {
      wx.navigateTo({ url: '/pages/employer/my-tasks/index' });
      return;
    }
    wx.navigateTo({ url: '/pages/mine/customer-service/index' });
  },
});
