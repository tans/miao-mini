const Api = require('../../../utils/api.js');
const { formatDateTime } = require('../../../utils/util.js');
const { openCustomerServiceChat } = require('../../../utils/customer-service.js');

const app = getApp();

const DEFAULT_REPORT_REASON = '违规';
const MAX_UPLOAD_IMAGES = 3;
const APPEAL_TIMEOUT_HOURS = 48;
const APPEAL_TIMEOUT_MS = APPEAL_TIMEOUT_HOURS * 60 * 60 * 1000;

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

function formatRemainDuration(ms) {
  if (!Number.isFinite(ms) || ms <= 0) return '已超时';
  const totalMinutes = Math.ceil(ms / (60 * 1000));
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours <= 0) return `${minutes}分钟`;
  if (minutes <= 0) return `${hours}小时`;
  return `${hours}小时${minutes}分`;
}

function getAppealCountdownText(reviewAt, nowTs = Date.now()) {
  const reviewTs = toTimestamp(reviewAt);
  if (!reviewTs) return '';
  const remain = reviewTs + APPEAL_TIMEOUT_MS - nowTs;
  if (remain <= 0) return '已超时，平台将自动判拒';
  return `剩余 ${formatRemainDuration(remain)} 自动判拒`;
}

function isAppealDeadlineExpired(reviewAt, nowTs = Date.now()) {
  const reviewTs = toTimestamp(reviewAt);
  return !!reviewTs && reviewTs + APPEAL_TIMEOUT_MS <= nowTs;
}

function isExistingAppealError(err) {
  const code = toNumber(err && err.code);
  const message = String((err && err.message) || '').trim();
  return code === 40901 || message.includes('已有申诉记录');
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
  if (value === '系统自动处理：超时未申诉') return '';
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
    autoTimeout: !!pick(appeal.auto_timeout, appeal.autoTimeout, false),
    createdAt,
    handleAt,
    evidence,
    evidenceCount: evidence.length,
    sortAt: toTimestamp(handleAt || createdAt),
  };
}

function getAppealSettlementText(decisionText, reviewResult) {
  if (decisionText === '通过申诉') {
    return reviewResult === 1
      ? '采纳作品 补放参与奖励+采纳奖励'
      : '淘汰作品 补放参与奖励';
  }
  if (decisionText === '拒绝申诉') {
    return '拒绝申诉 不变更原诉';
  }
  return '';
}

function normalizeMerchantReportReason(text) {
  const value = String(text || '').trim();
  if (!value) return '';
  if (
    value === '合理合规'
    || value === '平台处理中'
    || value === '作品被举报'
    || value === '作品被退回'
    || value.indexOf('通过申诉') >= 0
    || value.indexOf('拒绝申诉') >= 0
  ) {
    return '';
  }
  return value;
}

function normalizeClaim(claim = {}) {
  const materials = Array.isArray(claim.materials) ? claim.materials.map(normalizeWorkflowMaterial) : [];
  const reviewResult = toNumber(pick(claim.review_result, claim.reviewResult, 0));
  const reviewComment = pick(claim.review_comment, claim.reviewComment, '');
  const taskId = String(pick(claim.task_id, claim.taskId, ''));
  const creatorId = String(pick(claim.creator_id, claim.creatorId, ''));
  const createdAt = pick(claim.created_at, claim.createdAt, '');
  const reviewAt = pick(claim.review_at, claim.reviewAt, '');
  const reportAt = pick(claim.report_at, claim.reportAt, '');
  const reportReason = pick(claim.report_reason, claim.reportReason, '');
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
    reportAt,
    report_at: reportAt,
    reportReason,
    report_reason: reportReason,
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
    reportAt: extraClaim.reportAt || baseClaim.reportAt,
    reportReason: extraClaim.reportReason || baseClaim.reportReason,
    submitAt: extraClaim.submitAt || baseClaim.submitAt,
    taskTitle: extraClaim.taskTitle || baseClaim.taskTitle,
  };
}

function getCurrentUserId() {
  return String(pick(app.globalData && app.globalData.user && app.globalData.user.id, ''));
}

function getCurrentUserName() {
  return String(pick(
    app.globalData && app.globalData.user && app.globalData.user.nickname,
    app.globalData && app.globalData.user && app.globalData.user.username,
    ''
  ));
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
  const reportAt = pick(claim.report_at, claim.reportAt, claim.review_at, claim.reviewAt, '');
  const appealDeadlineExpired = isAppealDeadlineExpired(reportAt);
  const appealStatus = appeal ? toNumber(appeal.status) : 0;
  const appealResolved = appealStatus === 2;
  const appealAutoTimeout = !!(appeal && appeal.autoTimeout);
  const hasReport = reviewResult === 3 || !!appeal;
  const reportTimedOut = !appeal && hasReport && appealDeadlineExpired;
  const isBusinessTask = !!currentUserId && !!taskBusinessId && String(taskBusinessId) === String(currentUserId);
  const canAppeal = !!currentUserId
    && !!claimCreatorId
    && String(claimCreatorId) === String(currentUserId)
    && reviewResult === 3
    && !appeal
    && !appealDeadlineExpired;

  const taskTitle = pick(task.title, task.task_title, claim.task_title, claim.taskTitle, appeal && (appeal.taskTitle || appeal.task_title), `任务 #${taskId || claimId || '-'}`);
  const taskOwnerName = pick(task.business_name, task.businessName, task.merchant_name, task.merchantName, '');
  const currentUserName = getCurrentUserName();
  const creatorName = pick(
    claim.creator_name,
    claim.creatorName,
    String(claimCreatorId) === String(currentUserId) ? currentUserName : '',
    ''
  );
  const creatorAvatar = Api.getAvatarDisplayUrl(
    pick(claim.creator_avatar, claim.creatorAvatar, ''),
    pick(claimCreatorId, claim.creator_id, claim.creatorId, claimId)
  );
  const taskAvatar = Api.getAvatarDisplayUrl(
    pick(task.business_avatar, task.businessAvatar, task.merchantAvatar, claim.business_avatar, claim.businessAvatar, ''),
    pick(taskBusinessId, task.merchant_id, task.merchantId, taskId)
  );

  const reportReason = reviewResult === 3
    ? pick(
      normalizeMerchantReportReason(appeal && appeal.merchantResult),
      normalizeMerchantReportReason(claim.reportReason),
      normalizeMerchantReportReason(claim.report_reason),
      normalizeMerchantReportReason(claim.review_comment),
      DEFAULT_REPORT_REASON
    )
    : pick(
      normalizeMerchantReportReason(appeal && appeal.merchantResult),
      normalizeMerchantReportReason(claim.reportReason),
      normalizeMerchantReportReason(claim.report_reason),
      normalizeMerchantReportReason(claim.review_comment),
      ''
    );
  const reportOwnerName = taskOwnerName || '商家';
  const taskTitleText = `任务《${taskTitle || '未命名'}》`;
  const reportTimeText = formatDateTime(pick(
    reportAt,
    ''
  ));
  const reportMetaText = `商家:${reportOwnerName} 举报时间:${reportTimeText || '时间待更新'}`;

  const appealReason = appeal ? pick(appeal.reason, '') : '';
  const appealReasonText = appealReason || '';
  const appealCreatedTimeText = appeal ? formatDateTime(pick(appeal.createdAt, appeal.created_at, '')) : '';
  const appealHandledTimeText = appeal ? formatDateTime(pick(appeal.handleAt, appeal.handle_at, '')) : '';
  const appealCreatorText = creatorName ? `创作者:${creatorName}` : '创作者';
  const appealCountdownText = !appeal && hasReport && !reportTimedOut ? getAppealCountdownText(reportAt) : '';
  const appealTimeLine = appeal
    ? (appealAutoTimeout
      ? `超时未申诉:${appealCreatedTimeText || '时间待更新'}（48小时）`
      : `提交申诉:${appealCreatedTimeText || '时间待更新'}`)
    : (reportTimedOut
      ? '已超时，平台将自动判拒'
      : (appealCountdownText || (canAppeal ? '点击按钮提交申诉说明' : (hasReport ? '等待创作者提交申诉' : '等待处理结果'))));
  const appealMetaText = `${appealCreatorText} ${appealTimeLine}`.trim();
  const appealLabel = appeal
    ? (appealAutoTimeout ? '已超时' : '已申诉')
    : (reportTimedOut ? '已超时' : (hasReport ? '待申诉' : '待处理'));
  const appealDetail = appeal
    ? (appealAutoTimeout ? '创作者未在48小时内提交申诉，系统已自动处理' : appealCreatorText)
    : (reportTimedOut
      ? `创作者未在${APPEAL_TIMEOUT_HOURS}小时内提交申诉`
      : (canAppeal ? '点击按钮提交申诉说明' : (hasReport ? '等待创作者提交申诉' : '等待处理结果')));

  const appealDecisionText = appeal ? pick(appeal.decisionText, '') : '';
  const appealReplyText = appeal
    ? pick(appeal.result, appealDecisionText, '')
    : '';
  const appealAccepted = appealDecisionText === '通过申诉' || (appealResolved && claimStatus === 2);
  const platformOutcomeText = appealResolved
    ? (appealDecisionText || (appealAccepted ? '通过申诉' : '拒绝申诉'))
    : '';
  const platformSettlementText = appealResolved
    ? getAppealSettlementText(platformOutcomeText, reviewResult)
    : '';
  const platformLabel = appeal
    ? (appealResolved ? platformOutcomeText : '处理中')
    : (reportTimedOut ? '待判拒' : '待处理');
  const platformReason = appeal
    ? (appealResolved ? (platformOutcomeText || '等待平台处理') : '等待平台处理')
    : (reportTimedOut
      ? '等待平台自动判拒'
      : (hasReport ? '等待创作者申诉后进入平台处理' : '等待审核结果'));
  const platformStateClass = appeal
    ? (appealResolved
      ? (appealAccepted ? 'resolved' : 'rejected')
      : 'platform-pending')
    : (reportTimedOut ? 'rejected' : (hasReport ? 'waiting' : 'muted'));
  const platformReplyText = appealResolved && appealReplyText && appealReplyText !== platformOutcomeText
    ? appealReplyText
    : '';
  const platformReplyLine = appealResolved
    ? `回复说明：${[platformSettlementText, platformReplyText || platformOutcomeText || '通过申诉'].filter(Boolean).join('；')}`
    : platformReason;

  const reportLabel = hasReport ? '已举报' : '待处理';
  const overallStateText = appeal
    ? (appealResolved ? platformOutcomeText : '申诉中')
    : (reportTimedOut ? '已超时' : (hasReport ? '待申诉' : '待处理'));
  const overallStateClass = appeal
    ? (appealResolved ? (appealAccepted ? 'resolved' : 'rejected') : 'processing')
    : (reportTimedOut ? 'rejected' : (hasReport ? 'waiting' : 'muted'));

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
      rawTime: reportAt,
      timeText: reportTimeText || '时间待更新',
      detail: reportMetaText,
      stateClass: hasReport ? 'reported' : 'waiting',
    },
    appeal: {
      title: '创作者申诉',
      label: appealLabel,
      reason: appeal
        ? appealReasonText
        : (reportTimedOut
          ? '超时未申诉'
          : (canAppeal ? '点击按钮提交申诉说明' : (hasReport ? '等待创作者提交申诉' : '等待处理结果'))),
      detail: appealDetail,
      metaText: appealMetaText,
      creatorText: appealCreatorText,
      timeLine: appealTimeLine,
      timeText: appealCreatedTimeText || '时间待更新',
      stateClass: appeal ? (appealAutoTimeout ? 'rejected' : 'processing') : (reportTimedOut ? 'rejected' : (hasReport ? 'waiting' : 'muted')),
      countdownText: appealCountdownText,
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
      timeText: appealHandledTimeText || '时间待更新',
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

  countdownTimer: null,

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
    this.startCountdownTimer();
  },

  onHide() {
    this.stopCountdownTimer();
  },

  onUnload() {
    this.stopCountdownTimer();
  },

  startCountdownTimer() {
    if (this.countdownTimer) return;
    this.countdownTimer = setInterval(() => {
      this.refreshAppealCountdowns();
    }, 60 * 1000);
  },

  stopCountdownTimer() {
    if (!this.countdownTimer) return;
    clearInterval(this.countdownTimer);
    this.countdownTimer = null;
  },

  refreshAppealCountdowns() {
    const nowTs = Date.now();
    const records = (this.data.records || []).map((record) => {
      if (!record || !record.report || !record.appeal || record.appeal.appealId) {
        return record;
      }
      if (!record.report.rawTime) {
        return record;
      }
      const countdownExpired = isAppealDeadlineExpired(record.report.rawTime, nowTs);
      const countdownText = countdownExpired ? '' : getAppealCountdownText(record.report.rawTime, nowTs);
      if (!countdownExpired && !countdownText) {
        return record;
      }
      const nextMetaText = countdownExpired
        ? `${record.appeal.creatorText || '创作者'} 已超时，平台将自动判拒`.trim()
        : `${record.appeal.creatorText || '创作者'} ${countdownText}`.trim();
      const nextReason = countdownExpired
        ? '超时未申诉'
        : (record.canAppeal ? '点击按钮提交申诉说明' : '等待创作者提交申诉');
      const nextDetail = countdownExpired
        ? `创作者未在${APPEAL_TIMEOUT_HOURS}小时内提交申诉`
        : nextReason;
      const nextAppealLabel = countdownExpired ? '已超时' : '待申诉';
      const nextOverallStateText = countdownExpired ? '已超时' : '待申诉';
      const nextStateClass = countdownExpired ? 'rejected' : 'waiting';
      const nextCanAppeal = countdownExpired ? false : record.canAppeal;

      if (
        countdownText === record.appeal.countdownText
        && nextMetaText === record.appeal.metaText
        && nextReason === record.appeal.reason
        && nextDetail === record.appeal.detail
        && nextAppealLabel === record.appeal.label
        && nextStateClass === record.appeal.stateClass
        && nextCanAppeal === record.canAppeal
        && nextOverallStateText === record.overallStateText
        && nextStateClass === record.overallStateClass
      ) {
        return record;
      }
      return {
        ...record,
        canAppeal: nextCanAppeal,
        overallStateText: nextOverallStateText,
        overallStateClass: nextStateClass,
        appeal: {
          ...record.appeal,
          label: nextAppealLabel,
          reason: nextReason,
          detail: nextDetail,
          countdownText,
          metaText: nextMetaText,
          timeLine: countdownExpired ? '已超时，平台将自动判拒' : countdownText,
          stateClass: nextStateClass,
        },
        platform: countdownExpired
          ? {
            ...record.platform,
            label: '待判拒',
            reason: '等待平台自动判拒',
            detail: '等待平台自动判拒',
            replyLine: '等待平台自动判拒',
            stateClass: 'rejected',
          }
          : record.platform,
      };
    });
    this.setData({ records });
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
      this.refreshAppealCountdowns();
      this.startCountdownTimer();

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
    if (record && record.appeal && record.appeal.appealId) {
      wx.showToast({ title: '该作品已有申诉记录', icon: 'none' });
      return;
    }
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

  closeComposer(forceClose = false) {
    const forced = forceClose === true;
    if (this.data.submitting && !forced) return;
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

      this.closeComposer(true);
      wx.showToast({ title: '申诉已提交', icon: 'success' });
      await this.loadPageData(false);
    } catch (err) {
      const message = err && err.message ? err.message : '提交失败';
      if (isExistingAppealError(err)) {
        this.closeComposer(true);
        wx.showToast({ title: '该作品已有申诉记录', icon: 'none' });
        await this.loadPageData(false);
        return;
      }
      this.setData({ submitError: message });
      wx.showToast({ title: message, icon: 'none' });
    } finally {
      this.setData({ submitting: false });
    }
  },

  goEntryPage() {
    openCustomerServiceChat({
      sessionFrom: 'miao-mini:appeal-empty',
      sendMessageTitle: '创意喵申诉咨询',
    });
  },

  contactService() {
    openCustomerServiceChat({
      sessionFrom: 'miao-mini:appeal',
      sendMessageTitle: '创意喵申诉咨询',
    });
  },
});
