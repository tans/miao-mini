const Api = require('../../../utils/api.js');
const config = require('../../../utils/config.js');
const { formatDateTime } = require('../../../utils/util.js');
const {
  listDisputeRecords,
  patchDisputeRecord,
  saveDisputeRecord,
} = require('../../../utils/dispute-records.js');

const app = getApp();

const TABS = [
  { key: 'all', label: '全部' },
  { key: 'initiated', label: '我发起的' },
  { key: 'about_me', label: '关于我的' },
];

const APPEAL_TYPES = [
  { id: 1, name: '审核结果有误' },
  { id: 2, name: '举报原因不实' },
  { id: 3, name: '结算金额异议' },
  { id: 4, name: '其他问题' },
];

function pick() {
  for (let i = 0; i < arguments.length; i += 1) {
    const value = arguments[i];
    if (value !== undefined && value !== null && value !== '') return value;
  }
  return '';
}

function getClaimDisputeKind(claim = {}) {
  const status = Number(claim.status);
  const reviewResult = Number(pick(claim.review_result, claim.reviewResult, 0)) || 0;
  if (status === 1 && reviewResult === 3) return 'reported';
  if (status === 1 && reviewResult === 2) return 'rejected';
  if (status === 6) return 'reported';
  return '';
}

function getAppealStatusText(status, statusText, fallbackText) {
  if (statusText) return statusText;
  if (Number(status) === 1) return fallbackText || '平台处理中';
  if (Number(status) > 1) return '已裁决';
  return fallbackText || '平台处理中';
}

function getAppealStatusClass(status) {
  if (Number(status) === 1) return 'processing';
  if (Number(status) > 1) return 'resolved';
  return 'processing';
}

function buildAboutMeRecord(claim = {}, localAppeal = null) {
  const disputeKind = getClaimDisputeKind(claim);
  if (!disputeKind) return null;

  const taskId = pick(claim.task_id, claim.taskId, '');
  const taskTitle = pick(claim.task_title, claim.taskTitle, `任务 #${taskId || claim.id}`);
  const workTitle = pick(claim.title, claim.work_title, claim.workTitle, taskTitle);
  const reason = disputeKind === 'reported'
    ? pick(claim.report_reason, claim.reportReason, claim.review_comment, claim.reviewComment, '涉嫌敏感词、低俗内容、侵权内容、政治敏感、广告夸大。')
    : pick(claim.reject_reason, claim.rejectReason, claim.review_comment, claim.reviewComment, '品牌露出不足，镜头切换节奏不符合要求。');
  const happenedAt = pick(claim.reviewed_at, claim.reviewedAt, claim.updated_at, claim.updatedAt, claim.submitted_at, claim.submit_at, claim.created_at, '');
  const hasAppealed = !!localAppeal;
  const statusText = hasAppealed
    ? getAppealStatusText(localAppeal.remoteStatus, localAppeal.remoteStatusText, '平台处理中')
    : (disputeKind === 'reported' ? '待申诉' : '可申诉');

  return {
    id: `about:${claim.id}`,
    source: 'about_me',
    claimId: String(claim.id),
    taskId: String(taskId || ''),
    taskTitle,
    workTitle,
    title: disputeKind === 'reported'
      ? `您的《${workTitle}》作品被举报，如有异议可提起申诉`
      : `您的《${workTitle}》作品已被淘汰，如有异议可提起申诉`,
    subtitle: `关联任务：${taskTitle}`,
    reasonLabel: disputeKind === 'reported' ? '举报原因' : '淘汰原因',
    reasonText: reason,
    appealText: hasAppealed ? localAppeal.appealReason : '',
    timeLabel: disputeKind === 'reported' ? '举报时间' : '淘汰时间',
    timeText: formatDateTime(happenedAt),
    statusText,
    statusClass: hasAppealed ? getAppealStatusClass(localAppeal.remoteStatus) : 'actionable',
    actionText: hasAppealed ? '' : '我要申诉',
    actionType: hasAppealed ? '' : 'appeal',
    createdAt: happenedAt,
    sortAt: new Date(happenedAt || 0).getTime() || 0,
    target: {
      claimId: String(claim.id),
      taskId: String(taskId || ''),
      taskTitle,
      workTitle,
      disputeKind,
      reasonText: reason,
    },
  };
}

function buildInitiatedRecord(remoteAppeal = {}, localRecord = null) {
  const taskId = pick(remoteAppeal.target_id, remoteAppeal.task_id, localRecord && localRecord.taskId, '');
  const taskTitle = pick(localRecord && localRecord.taskTitle, remoteAppeal.task_title, `任务 #${taskId || remoteAppeal.id}`);
  const workTitle = pick(localRecord && localRecord.workTitle, taskTitle);
  const isMerchantReport = !!(localRecord && localRecord.sourceType === 'merchant_report');
  const createdAt = pick(remoteAppeal.created_at, localRecord && localRecord.createdAt, '');
  const reason = pick(localRecord && localRecord.appealReason, remoteAppeal.reason, '');
  const extraReason = isMerchantReport
    ? pick(localRecord && localRecord.reportReason, remoteAppeal.reason, '已提交平台核验')
    : pick(localRecord && localRecord.reportReason, localRecord && localRecord.rejectReason, '');

  return {
    id: `initiated:${pick(remoteAppeal.id, localRecord && localRecord.localId, Date.now())}`,
    source: 'initiated',
    claimId: pick(localRecord && localRecord.claimId, ''),
    taskId: String(taskId || ''),
    taskTitle,
    workTitle,
    title: isMerchantReport
      ? `您举报了《${workTitle}》，已生成纠纷记录`
      : `您对《${workTitle}》发起了申诉`,
    subtitle: `关联任务：${taskTitle}`,
    reasonLabel: isMerchantReport ? '举报原因' : '申诉说明',
    reasonText: isMerchantReport ? extraReason : (reason || '已提交平台复核，请等待处理'),
    appealText: !isMerchantReport && extraReason ? extraReason : '',
    timeLabel: Number(remoteAppeal.status || (localRecord && localRecord.remoteStatus) || 0) > 1 ? '裁决时间' : '发起时间',
    timeText: formatDateTime(createdAt),
    statusText: getAppealStatusText(
      pick(remoteAppeal.status, localRecord && localRecord.remoteStatus, 1),
      pick(remoteAppeal.status_str, remoteAppeal.statusStr, localRecord && localRecord.remoteStatusText, ''),
      '平台处理中'
    ),
    statusClass: getAppealStatusClass(pick(remoteAppeal.status, localRecord && localRecord.remoteStatus, 1)),
    actionText: '',
    actionType: '',
    createdAt,
    sortAt: new Date(createdAt || 0).getTime() || 0,
    target: null,
  };
}

function buildPendingLocalInitiatedRecord(localRecord = {}) {
  const taskTitle = localRecord.taskTitle || `任务 #${localRecord.taskId || localRecord.claimId}`;
  const workTitle = localRecord.workTitle || taskTitle;
  return {
    id: `pending:${localRecord.localId}`,
    source: 'initiated',
    claimId: localRecord.claimId || '',
    taskId: localRecord.taskId || '',
    taskTitle,
    workTitle,
    title: `您举报了《${workTitle}》，已生成纠纷记录`,
    subtitle: `关联任务：${taskTitle}`,
    reasonLabel: '举报原因',
    reasonText: localRecord.reportReason || '已提交平台核验',
    appealText: '',
    timeLabel: '发起时间',
    timeText: formatDateTime(localRecord.createdAt),
    statusText: '平台处理中',
    statusClass: 'processing',
    actionText: '',
    actionType: '',
    createdAt: localRecord.createdAt,
    sortAt: new Date(localRecord.createdAt || 0).getTime() || 0,
    target: null,
  };
}

Page({
  data: {
    loading: false,
    tabs: TABS,
    activeTab: 'all',
    records: [],
    filteredRecords: [],
    customerServicePhone: config.customerServicePhone,
    showComposer: false,
    composerTarget: null,
    appealTypes: APPEAL_TYPES,
    selectedTypeIndex: 0,
    selectedType: APPEAL_TYPES[0],
    reason: '',
    uploadImages: [],
    pendingClaimId: '',
  },

  onLoad(options = {}) {
    const pendingClaimId = options.claimId ? String(options.claimId) : '';
    this.setData({ pendingClaimId });

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

  async loadPageData(allowAutoOpen = true) {
    if (this.data.loading) return;
    this.setData({ loading: true });

    try {
      const [claims, appealRes] = await Promise.all([
        Api.getMyClaims({ page: 1, limit: 100 }).then((res) => (Array.isArray(res.data) ? res.data : [])).catch(() => []),
        Api.getAppeals({ limit: 100, offset: 0 }).catch(() => ({ data: { appeals: [] } })),
      ]);

      const localRecords = listDisputeRecords();
      const remoteAppeals = Array.isArray(appealRes && appealRes.data && appealRes.data.appeals)
        ? appealRes.data.appeals
        : [];

      const localAppealByClaimId = {};
      const localAppealByRemoteId = {};
      localRecords.forEach((item) => {
        if (item.sourceType === 'creator_appeal' && item.claimId) {
          localAppealByClaimId[item.claimId] = item;
        }
        if (item.remoteAppealId) {
          localAppealByRemoteId[String(item.remoteAppealId)] = item;
        }
      });

      remoteAppeals.forEach((appeal) => {
        const matchedLocal = localAppealByRemoteId[String(appeal.id)];
        if (!matchedLocal) return;
        matchedLocal.remoteStatus = pick(appeal.status, matchedLocal.remoteStatus, 1);
        matchedLocal.remoteStatusText = pick(appeal.status_str, appeal.statusStr, matchedLocal.remoteStatusText, '');
        matchedLocal.updatedAt = pick(appeal.updated_at, appeal.updatedAt, matchedLocal.updatedAt, matchedLocal.createdAt);
        if (matchedLocal.claimId) {
          localAppealByClaimId[matchedLocal.claimId] = matchedLocal;
        }
        patchDisputeRecord(matchedLocal.localId, {
          remoteAppealId: pick(appeal.id, matchedLocal.remoteAppealId),
          remoteStatus: matchedLocal.remoteStatus,
          remoteStatusText: matchedLocal.remoteStatusText,
          updatedAt: matchedLocal.updatedAt,
        });
      });

      const aboutMeRecords = claims
        .map((claim) => buildAboutMeRecord(claim, localAppealByClaimId[String(claim.id)] || null))
        .filter(Boolean);

      const initiatedRecords = remoteAppeals.map((appeal) => buildInitiatedRecord(
        appeal,
        localAppealByRemoteId[String(appeal.id)] || null
      ));

      const remoteAppealIds = {};
      remoteAppeals.forEach((item) => {
        if (item && item.id != null) remoteAppealIds[String(item.id)] = true;
      });

      localRecords
        .filter((item) => item.sourceType === 'merchant_report' && !remoteAppealIds[item.remoteAppealId])
        .forEach((item) => initiatedRecords.push(buildPendingLocalInitiatedRecord(item)));

      const records = aboutMeRecords
        .concat(initiatedRecords)
        .sort((a, b) => (b.sortAt || 0) - (a.sortAt || 0));

      this.setData({ records, loading: false });
      this.applyFilter(this.data.activeTab);

      if (allowAutoOpen) {
        this.autoOpenComposer();
      }
    } catch (err) {
      this.setData({ loading: false });
      wx.showToast({ title: err.message || '加载失败', icon: 'none' });
    }
  },

  applyFilter(tabKey) {
    const activeTab = tabKey || 'all';
    const filteredRecords = activeTab === 'all'
      ? this.data.records
      : this.data.records.filter((item) => item.source === activeTab);
    this.setData({ activeTab, filteredRecords });
  },

  switchTab(e) {
    const tabKey = e.currentTarget.dataset.tab;
    if (!tabKey || tabKey === this.data.activeTab) return;
    this.applyFilter(tabKey);
  },

  autoOpenComposer() {
    const pendingClaimId = this.data.pendingClaimId;
    if (!pendingClaimId) return;
    const targetRecord = this.data.records.find((item) => item.claimId === pendingClaimId && item.actionType === 'appeal');
    if (!targetRecord) {
      this.setData({ pendingClaimId: '' });
      return;
    }
    this.setData({ pendingClaimId: '' });
    this.openComposerByRecord(targetRecord);
  },

  openComposer(e) {
    const recordId = e.currentTarget.dataset.id;
    const targetRecord = this.data.records.find((item) => item.id === recordId);
    if (!targetRecord || targetRecord.actionType !== 'appeal') return;
    this.openComposerByRecord(targetRecord);
  },

  openComposerByRecord(record) {
    this.setData({
      showComposer: true,
      composerTarget: record.target,
      selectedTypeIndex: 0,
      selectedType: APPEAL_TYPES[0],
      reason: '',
      uploadImages: [],
    });
  },

  closeComposer() {
    this.setData({
      showComposer: false,
      composerTarget: null,
      selectedTypeIndex: 0,
      selectedType: APPEAL_TYPES[0],
      reason: '',
      uploadImages: [],
    });
  },

  selectAppealType(e) {
    const index = Number(e.currentTarget.dataset.index);
    if (!Number.isFinite(index) || !this.data.appealTypes[index]) return;
    this.setData({
      selectedTypeIndex: index,
      selectedType: this.data.appealTypes[index],
    });
  },

  onReasonInput(e) {
    this.setData({ reason: e.detail.value });
  },

  uploadImage() {
    wx.chooseMedia({
      count: 3 - this.data.uploadImages.length,
      mediaType: ['image'],
      sourceType: ['album', 'camera'],
      success: (res) => {
        const images = (res.tempFiles || []).map((item) => ({
          tempFilePath: item.tempFilePath,
          previewUrl: item.tempFilePath,
        }));
        this.setData({ uploadImages: this.data.uploadImages.concat(images) });
      },
    });
  },

  removeImage(e) {
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
      const uploadRes = await Api.uploadImage(image.tempFilePath || image, {
        bizType: 'appeal_evidence',
        bizId: currentUser.id ? String(currentUser.id) : '',
        jobId: `appeal-${Date.now()}-${i + 1}`,
        returnMeta: true,
      });
      uploadedUrls.push(uploadRes.url);
    }

    return uploadedUrls.join(',');
  },

  async submitAppeal() {
    const target = this.data.composerTarget;
    if (!target || !target.claimId || !target.taskId) {
      wx.showToast({ title: '缺少申诉对象', icon: 'none' });
      return;
    }
    if (!this.data.reason.trim()) {
      wx.showToast({ title: '请输入申诉说明', icon: 'none' });
      return;
    }

    wx.showLoading({ title: '提交中...' });
    const localId = `creator_appeal:${target.claimId}`;

    try {
      const evidence = this.data.uploadImages.length ? await this.uploadEvidenceImages() : '';
      const payload = {
        type: 1,
        task_id: target.taskId,
        target_id: target.taskId,
        reason: `${this.data.selectedType.name}：${this.data.reason.trim()}`,
        evidence,
      };
      const res = await Api.createAppeal(payload);
      const remoteAppeal = (res && res.data) || {};

      saveDisputeRecord({
        localId,
        sourceType: 'creator_appeal',
        claimId: target.claimId,
        taskId: target.taskId,
        taskTitle: target.taskTitle,
        workTitle: target.workTitle,
        reportReason: target.disputeKind === 'reported' ? target.reasonText : '',
        rejectReason: target.disputeKind === 'rejected' ? target.reasonText : '',
        appealTypeName: this.data.selectedType.name,
        appealReason: this.data.reason.trim(),
        evidence,
        createdAt: pick(remoteAppeal.created_at, new Date().toISOString()),
        remoteAppealId: pick(remoteAppeal.id, ''),
        remoteStatus: pick(remoteAppeal.status, 1),
        remoteStatusText: pick(remoteAppeal.status_str, '平台处理中'),
      });

      wx.showToast({ title: '申诉已提交', icon: 'success' });
      this.closeComposer();
      this.loadPageData(false);
    } catch (err) {
      wx.showToast({ title: err.message || '提交失败', icon: 'none' });
    } finally {
      wx.hideLoading();
    }
  },

  goCustomerService() {
    wx.navigateTo({ url: '/pages/mine/customer-service/index' });
  },

  copyServicePhone() {
    wx.setClipboardData({
      data: this.data.customerServicePhone,
      success: () => wx.showToast({ title: '客服电话已复制', icon: 'success' }),
    });
  },
});
