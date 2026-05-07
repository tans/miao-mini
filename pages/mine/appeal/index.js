const Api = require('../../../utils/api.js');
const { formatDateTime } = require('../../../utils/util.js');

const app = getApp();

const DEFAULT_REPORT_REASON = '违规';
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

function normalizeAppealReason(text) {
  const value = String(text || '').trim();
  if (!value) return '';
  return value
    .replace(/^(作品申诉|创作者申诉|申诉)[:：\s]*/i, '')
    .replace(/[。\.]+$/g, '')
    .trim();
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
  const rawResult = pick(appeal.result, '');

  return {
    id: String(pick(appeal.id, '')),
    claimId: String(pick(appeal.claim_id, appeal.claimId, appeal.target_id, appeal.targetId, '')),
    taskId: String(pick(appeal.task_id, appeal.taskId, '')),
    reason: normalizeAppealReason(pick(appeal.reason, '')),
    result: rawResult,
    decisionText: pick(appeal.decision_text, appeal.decisionText, ''),
    taskTitle: pick(appeal.task_title, appeal.taskTitle, ''),
    merchantResult: pick(appeal.merchant_result, appeal.merchantResult, ''),
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
  const creatorId = String(pick(claim.creator_id, claim.creatorId, ''));
  const createdAt = pick(claim.created_at, claim.createdAt, '');
  const reviewAt = pick(claim.review_at, claim.reviewAt, '');
  const submitAt = pick(claim.submit_at, claim.submitAt, '');
  const updatedAt = pick(claim.updated_at, claim.updatedAt, '');

  return {
    ...claim,
    id: String(pick(claim.id, claim.claim_id, '')),
    taskId,
    task_id: taskId,
    creatorId,
    creator_id: creatorId,
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

function mergeClaims(baseClaim = {}, extraClaim = {}) {
  const baseMaterials = Array.isArray(baseClaim.materials) ? baseClaim.materials : [];
  const extraMaterials = Array.isArray(extraClaim.materials) ? extraClaim.materials : [];
  return {
    ...baseClaim,
    ...extraClaim,
    materials: extraMaterials.length ? extraMaterials : baseMaterials,
    creatorName: extraClaim.creatorName || baseClaim.creatorName,
    creatorAvatar: extraClaim.creatorAvatar || baseClaim.creatorAvatar,
    reviewComment: extraClaim.reviewComment || baseClaim.reviewComment,
    reviewResult: extraClaim.reviewResult || baseClaim.reviewResult,
    reviewAt: extraClaim.reviewAt || baseClaim.reviewAt,
    submitAt: extraClaim.submitAt || baseClaim.submitAt,
    taskTitle: extraClaim.taskTitle || baseClaim.taskTitle,
  };
}

function getCurrentUserId() {
  return String(pick(app.globalData && app.globalData.user && app.globalData.user.id, ''));
}

function getPageMeta(hasTaskContext) {
  return {
    pageTitle: '申诉记录',
    heroDesc: hasTaskContext
      ? '当前任务的商家举报、创作者申诉和平台处理结果会统一显示在这里。'
      : '商家举报、创作者申诉和平台处理结果会统一显示在这里。',
    emptyTitle: hasTaskContext ? '暂无该任务申诉记录' : '暂无申诉记录',
    emptyDesc: hasTaskContext
      ? '这个任务还没有可展示的举报、申诉或处理记录。'
      : '商家举报、创作者申诉和平台处理结果会统一显示在这里。',
    emptyActionText: '联系客服',
  };
}

function buildWorkflowCard({ claim = {}, task = {}, appeal = null, currentUserId = '' }) {
  const claimId = String(pick(claim.id, claim.claim_id, ''));
  const taskId = String(pick(claim.task_id, claim.taskId, task.id, task.task_id, ''));
  const reviewResult = toNumber(pick(claim.review_result, claim.reviewResult, 0));
  const claimStatus = toNumber(pick(claim.status, 0));
  const claimCreatorId = String(pick(claim.creator_id, claim.creatorId, ''));
  const taskBusinessId = String(pick(task.business_id, task.businessId, claim.business_id, claim.businessId, ''));
  const appealStatus = appeal ? toNumber(appeal.status) : 0;
  const appealResolved = appealStatus === 2;
  const hasReport = reviewResult === 3 || !!appeal;
  const isBusinessTask = !!currentUserId && !!taskBusinessId && String(taskBusinessId) === String(currentUserId);
  const canAppeal = !!currentUserId
    && !!claimCreatorId
    && String(claimCreatorId) === String(currentUserId)
    && reviewResult === 3
    && !appeal;

  const taskTitle = pick(task.title, task.task_title, claim.task_title, claim.taskTitle, appeal && (appeal.taskTitle || appeal.task_title), `任务 #${taskId || claimId || '-'}`);
  const taskOwnerName = pick(task.business_name, task.businessName, task.merchant_name, task.merchantName, '');
  const creatorName = pick(claim.creator_name, claim.creatorName, '');
  const creatorAvatar = Api.getAvatarDisplayUrl(
    pick(claim.creator_avatar, claim.creatorAvatar, ''),
    pick(claimCreatorId, claim.creator_id, claim.creatorId, claimId)
  );
  const taskAvatar = Api.getAvatarDisplayUrl(
    pick(task.business_avatar, task.businessAvatar, task.merchantAvatar, claim.business_avatar, claim.businessAvatar, ''),
    pick(taskBusinessId, task.merchant_id, task.merchantId, taskId)
  );

  const reportReason = reviewResult === 3
    ? pick(claim.review_comment, claim.reviewComment, appeal && appeal.merchantResult, DEFAULT_REPORT_REASON)
    : pick(claim.review_comment, claim.reviewComment, appeal && appeal.merchantResult, '');
  const reportOwnerName = taskOwnerName || '商家';
  const taskTitleText = `任务《${taskTitle || '未命名'}》`;
  const reportTimeText = formatDateTime(pick(
    claim.review_at,
    claim.reviewAt,
    claim.updated_at,
    claim.updatedAt,
    claim.created_at,
    claim.createdAt,
    ''
  ));
  const reportMetaText = `商家:${reportOwnerName} 举报时间:${reportTimeText || '时间待更新'}`;

  const appealReason = appeal ? pick(appeal.reason, '') : '';
  const appealReasonText = appealReason || '';
  const appealTimeText = appeal ? formatDateTime(pick(appeal.handleAt, appeal.handle_at, appeal.createdAt, appeal.created_at, '')) : '';
  const appealCreatorText = creatorName ? `创作者:${creatorName}` : '创作者';
  const appealTimeLine = appeal
    ? `提交申诉:${appealTimeText || '时间待更新'}`
    : (canAppeal ? '点击按钮提交申诉说明' : (hasReport ? '等待创作者提交申诉' : '等待处理结果'));
  const appealMetaText = `${appealCreatorText} ${appealTimeLine}`.trim();
  const appealLabel = appeal ? '已申诉' : (hasReport ? '待申诉' : '待处理');
  const appealDetail = appeal
    ? appealCreatorText
    : (canAppeal ? '点击按钮提交申诉说明' : (hasReport ? '等待创作者提交申诉' : '等待处理结果'));

  const appealDecisionText = appeal ? pick(appeal.decisionText, '') : '';
  const appealReplyText = appeal ? pick(appeal.result, appealDecisionText, '') : '';
  const appealAccepted = appealDecisionText === '通过申诉' || (appealResolved && claimStatus === 2);
  const platformOutcomeText = appealResolved
    ? (appealDecisionText || (appealAccepted ? '通过申诉' : '拒绝申诉'))
    : '';
  const platformLabel = appeal
    ? (appealResolved ? platformOutcomeText : '处理中')
    : '待处理';
  const platformReason = appeal
    ? (appealResolved ? (platformOutcomeText || '等待平台处理') : '等待平台处理')
    : (hasReport ? '等待创作者申诉后进入平台处理' : '等待审核结果');
  const platformStateClass = appeal
    ? (appealResolved
      ? (appealAccepted ? 'resolved' : 'rejected')
      : 'processing')
    : (hasReport ? 'waiting' : 'muted');
  const platformReplyText = appealResolved && appealReplyText && appealReplyText !== platformOutcomeText
    ? appealReplyText
    : '';
  const platformReplyLine = appealResolved
    ? `回复说明：${platformReplyText || platformOutcomeText || '通过申诉'}`
    : platformReason;

  const reportLabel = hasReport ? '已举报' : '待处理';
  const overallStateText = appeal
    ? (appealResolved ? platformOutcomeText : '申诉中')
    : (hasReport ? '待申诉' : '待处理');
  const overallStateClass = appeal
    ? (appealResolved ? (appealAccepted ? 'resolved' : 'rejected') : 'processing')
    : (hasReport ? 'waiting' : 'muted');

  const materials = Array.isArray(claim.materials) ? claim.materials.slice(0, 4).map(normalizeWorkflowMaterial) : [];
  const headerInfoParts = [];
  if (claimId) headerInfoParts.push(`作品ID:${claimId}`);
  if (taskId) headerInfoParts.push(`任务ID:${taskId}`);
  if (appeal && appeal.id) headerInfoParts.push(`申诉ID:${appeal.id}`);
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
    creatorAvatar,
    creatorId: claimCreatorId,
    taskBusinessId,
    isBusinessTask,
    taskAvatar,
    taskHeaderTitle: taskTitleText,
    taskSubtitle: headerInfoParts.length ? headerInfoParts.join('  ') : `商家:${reportOwnerName} 举报时间:${reportTimeText || '待更新'}`,
    taskTitleLabel: taskTitle,
    overallStateText,
    overallStateClass,
    claimStatusText: reportLabel,
    report: {
      title: '商家举报',
      label: reportLabel,
      reason: reportReason || DEFAULT_REPORT_REASON,
      timeText: reportTimeText || '时间待更新',
      detail: reportMetaText,
      stateClass: hasReport ? 'reported' : 'waiting',
    },
    appeal: {
      title: '创作者申诉',
      label: appealLabel,
      reason: appeal ? appealReasonText : (canAppeal ? '点击按钮提交申诉说明' : (hasReport ? '等待创作者提交申诉' : '等待处理结果')),
      detail: appealDetail,
      metaText: appealMetaText,
      creatorText: appealCreatorText,
      timeLine: appealTimeLine,
      timeText: appealTimeText || '时间待更新',
      stateClass: appeal ? 'processing' : (hasReport ? 'waiting' : 'muted'),
      appealId: appeal ? String(appeal.id || '') : '',
      evidenceCount: appeal ? appeal.evidenceCount : 0,
      evidenceList: appeal ? appeal.evidence : [],
    },
    platform: {
      title: '平台处理',
      label: platformLabel,
      reason: platformReason,
      detail: appealResolved ? (platformOutcomeText || '通过申诉') : '等待平台处理',
      replyText: platformReplyText,
      replyLine: platformReplyLine,
      timeText: appealTimeText || '时间待更新',
      stateClass: platformStateClass,
    },
    materials,
    creatorMaterials: materials,
    canAppeal,
    sortAt,
  };
}

function sortWorkflowCards(cards = []) {
  return cards.sort((a, b) => (b.sortAt || 0) - (a.sortAt || 0));
}

Page({
  data: {
    loading: false,
    pageTitle: '申诉记录',
    heroDesc: '商家举报、创作者申诉和平台处理结果会统一显示在这里。',
    taskId: '',
    claimId: '',
    records: [],
    emptyTitle: '暂无申诉记录',
    emptyDesc: '商家举报、创作者申诉和平台处理结果会统一显示在这里。',
    emptyActionText: '联系客服',
    showComposer: false,
    composerTarget: null,
    reason: '',
    uploadImages: [],
    submitError: '',
    submitting: false,
  },

  onLoad(options = {}) {
    const taskId = String(pick(options.taskId, options.task_id, ''));
    const claimId = String(pick(options.claimId, options.claim_id, ''));
    const pageMeta = getPageMeta(!!taskId);

    this.setData({
      taskId,
      claimId,
      ...pageMeta,
    });

    wx.setNavigationBarTitle({ title: pageMeta.pageTitle });

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
      const records = await this.loadUnifiedWorkflows();
      const pageMeta = getPageMeta(!!this.data.taskId);
      this.setData({
        records: sortWorkflowCards(records),
        loading: false,
        ...pageMeta,
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

  autoOpenComposerFromRoute(records = []) {
    if (!this.data.claimId || this.data.showComposer) {
      return;
    }

    const record = records.find((item) => String(item.claimId) === String(this.data.claimId));
    if (!record || !record.canAppeal) {
      return;
    }

    this.setData({ claimId: '' });
    this.openComposerByRecord(record);
  },

  async loadUnifiedWorkflows() {
    const currentUserId = getCurrentUserId();
    const [creatorClaimsRes, creatorAppealsRes, businessClaimsRes, businessAppealsRes] = await Promise.all([
      Api.getMyClaims({ page: 1, limit: 100 }),
      Api.getAppeals({ limit: 100, offset: 0 }).catch(() => ({ data: { appeals: [] } })),
      Api.getBusinessClaims().catch(() => ({ data: [] })),
      Api.getBusinessAppeals({ limit: 100, offset: 0 }).catch(() => ({ data: { appeals: [] } })),
    ]);

    const appealMap = new Map();
    const allAppeals = []
      .concat(Array.isArray(creatorAppealsRes && creatorAppealsRes.data && creatorAppealsRes.data.appeals) ? creatorAppealsRes.data.appeals : [])
      .concat(Array.isArray(businessAppealsRes && businessAppealsRes.data && businessAppealsRes.data.appeals) ? businessAppealsRes.data.appeals : []);
    allAppeals.forEach((appeal) => {
      const normalizedAppeal = normalizeAppeal(appeal);
      if (!normalizedAppeal.claimId || appealMap.has(normalizedAppeal.claimId)) return;
      appealMap.set(normalizedAppeal.claimId, normalizedAppeal);
    });

    const claimMap = new Map();
    const currentUserClaims = Array.isArray(creatorClaimsRes && creatorClaimsRes.data) ? creatorClaimsRes.data : [];
    currentUserClaims.map(normalizeClaim).forEach((claim) => {
      if (!claim.id) return;
      claimMap.set(claim.id, claim);
    });

    const businessClaims = Array.isArray(businessClaimsRes && businessClaimsRes.data) ? businessClaimsRes.data : [];
    businessClaims.forEach((claim) => {
      const normalized = normalizeClaim(claim);
      if (!normalized.id) return;
      if (!claimMap.has(normalized.id)) {
        claimMap.set(normalized.id, normalized);
      } else {
        claimMap.set(normalized.id, {
          ...claimMap.get(normalized.id),
          ...normalized,
          materials: normalized.materials.length ? normalized.materials : claimMap.get(normalized.id).materials,
        });
      }
    });

    const claimList = Array.from(claimMap.values());
    const detailTasks = [];
    const detailCache = new Map();
    claimList.forEach((claim) => {
      const hasEnoughDetail = Array.isArray(claim.materials) && claim.materials.length > 0;
      if (!hasEnoughDetail && claim.id) {
        detailTasks.push(claim);
      }
    });

    await Promise.all(detailTasks.map(async (claim) => {
      const claimId = String(claim.id || '');
      if (!claimId || detailCache.has(claimId)) return;

      const preferredCreatorDetail = claim.creatorId && currentUserId && String(claim.creatorId) === String(currentUserId);
      const preferredBusinessDetail = claim.taskBusinessId && currentUserId && String(claim.taskBusinessId) === String(currentUserId);
      const fetchers = preferredCreatorDetail
        ? [() => Api.getClaimById(claimId), () => Api.getBusinessClaim(claimId)]
        : preferredBusinessDetail
          ? [() => Api.getBusinessClaim(claimId), () => Api.getClaimById(claimId)]
          : [() => Api.getBusinessClaim(claimId), () => Api.getClaimById(claimId)];

      for (let i = 0; i < fetchers.length; i += 1) {
        const fetchDetail = fetchers[i];
        try {
          const res = await fetchDetail();
          const detail = normalizeClaim(res && res.data ? res.data : {});
          if (detail && detail.id) {
            detailCache.set(claimId, detail);
            break;
          }
        } catch (err) {}
      }
    }));

    let candidateClaims = claimList
      .map((claim) => mergeClaims(claim, detailCache.get(claim.id) || {}))
      .filter((claim) => claim.reviewResult === 3 || appealMap.has(claim.id));

    if (this.data.taskId) {
      candidateClaims = candidateClaims.filter((claim) => String(claim.taskId) === String(this.data.taskId));
    }
    if (this.data.claimId) {
      candidateClaims = candidateClaims.filter((claim) => String(claim.id) === String(this.data.claimId));
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
      currentUserId,
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
    const record = (this.data.records || []).find((item) => String(item.taskId) === taskId);
    if (record && record.isBusinessTask) {
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
    wx.navigateTo({ url: '/pages/mine/customer-service/index' });
  },

  contactService() {
    wx.navigateTo({ url: '/pages/mine/customer-service/index' });
  },
});
