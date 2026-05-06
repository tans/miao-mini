const Api = require('../../../utils/api.js');
const { formatDateTime } = require('../../../utils/util.js');

const app = getApp();

const FILTERS = [
  { key: 'all', label: '全部' },
  { key: 'pending', label: '待处理' },
  { key: 'resolved', label: '已处理' },
];

const APPEAL_TYPES = [
  { id: 1, name: '作品申诉' },
];

function pick() {
  for (let i = 0; i < arguments.length; i += 1) {
    const value = arguments[i];
    if (value !== undefined && value !== null && value !== '') return value;
  }
  return '';
}

function toPositiveInt(value) {
  const num = Number(value);
  return Number.isFinite(num) && num > 0 ? num : 0;
}

function normalizeAppeal(remoteAppeal = {}) {
  const claimId = pick(remoteAppeal.claim_id, remoteAppeal.claimId, '');
  const taskId = pick(remoteAppeal.task_id, remoteAppeal.taskId, '');
  const createdAt = pick(remoteAppeal.created_at, remoteAppeal.createdAt, '');
  const handleAt = pick(remoteAppeal.handle_at, remoteAppeal.handleAt, '');
  const status = Number(pick(remoteAppeal.status, 1)) || 1;
  const resolved = status > 1;

  return {
    id: `appeal:${pick(remoteAppeal.id, Date.now())}`,
    source: 'initiated',
    claimId: String(claimId || ''),
    taskId: String(taskId || ''),
    title: '创作者申诉记录',
    subtitle: `作品ID：${claimId || '-'} · 任务ID：${taskId || '-'}`,
    reasonLabel: '申诉说明',
    reasonText: pick(remoteAppeal.reason, '已提交平台复核，请等待处理'),
    resultText: pick(remoteAppeal.result, ''),
    timeLabel: resolved ? '处理时间' : '发起时间',
    timeText: formatDateTime(pick(handleAt, createdAt)),
    statusText: pick(remoteAppeal.status_str, resolved ? '已处理' : '平台处理中'),
    statusClass: resolved ? 'resolved' : 'processing',
    createdAt,
    sortAt: new Date(createdAt || handleAt || 0).getTime() || 0,
    target: null,
  };
}

Page({
  data: {
    loading: false,
    tabs: FILTERS,
    activeTab: 'all',
    records: [],
    filteredRecords: [],
    customerServicePhone: '',
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
    this.setData({
      pendingClaimId,
      customerServicePhone: app.globalData.customerServicePhone || '',
    });

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
      const appealRes = await Api.getAppeals({ limit: 100, offset: 0 })
        .catch(() => ({ data: { appeals: [] } }));
      const remoteAppeals = Array.isArray(appealRes && appealRes.data && appealRes.data.appeals)
        ? appealRes.data.appeals
        : [];

      const records = remoteAppeals
        .map((appeal) => normalizeAppeal(appeal))
        .sort((a, b) => (b.sortAt || 0) - (a.sortAt || 0));

      this.applyFilter(this.data.activeTab, records);
      this.setData({ records, loading: false, filteredRecords: this.data.filteredRecords });

      if (allowAutoOpen) {
        this.autoOpenComposer();
      }
    } catch (err) {
      this.setData({ loading: false });
      wx.showToast({ title: err.message || '加载失败', icon: 'none' });
    }
  },

  applyFilter(tabKey, records = this.data.records) {
    const activeTab = tabKey || 'all';
    const filteredRecords = activeTab === 'all'
      ? records
      : records.filter((item) => (
        activeTab === 'pending'
          ? item.statusClass === 'processing'
          : item.statusClass === 'resolved'
      ));
    this.setData({ activeTab, filteredRecords });
  },

  switchTab(e) {
    const tabKey = e.currentTarget.dataset.tab;
    if (!tabKey || tabKey === this.data.activeTab) return;
    this.applyFilter(tabKey);
  },

  async autoOpenComposer() {
    const pendingClaimId = this.data.pendingClaimId;
    if (!pendingClaimId) return;

    this.setData({ pendingClaimId: '' });

    try {
      const claimRes = await Api.getClaimById(pendingClaimId);
      const claim = claimRes && claimRes.data ? claimRes.data : null;
      if (!claim) return;

      const reviewResult = Number(pick(claim.review_result, claim.reviewResult, 0)) || 0;
      const claimStatus = Number(pick(claim.status, 0)) || 0;
      if (claimStatus !== 1 || ![2, 3].includes(reviewResult)) {
        wx.showToast({ title: '当前作品暂无可申诉状态', icon: 'none' });
        return;
      }

      const taskRes = await Api.getTask(claim.task_id).catch(() => ({ data: null }));
      const task = taskRes && taskRes.data ? taskRes.data : null;

      this.openComposerByClaim(claim, task || {});
    } catch (err) {
      wx.showToast({ title: err.message || '无法打开申诉', icon: 'none' });
    }
  },

  openComposerByClaim(claim = {}, task = {}) {
    const reviewResult = Number(pick(claim.review_result, claim.reviewResult, 0)) || 0;
    const disputeKind = reviewResult === 3 ? 'reported' : 'rejected';
    const taskId = toPositiveInt(pick(claim.task_id, claim.taskId, ''));
    const claimId = toPositiveInt(pick(claim.id, claim.claim_id, ''));
    if (!claimId || !taskId) {
      wx.showToast({ title: '缺少申诉对象', icon: 'none' });
      return;
    }

    this.setData({
      showComposer: true,
      composerTarget: {
        claimId: String(claimId),
        taskId: String(taskId),
        taskTitle: pick(task.title, `任务 #${taskId}`),
        workTitle: `作品 #${claimId}`,
        disputeKind,
        reasonText: pick(claim.review_comment, claim.reviewComment, disputeKind === 'reported' ? '作品被举报' : '作品被淘汰'),
      },
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
      let uploadRes;
      try {
        uploadRes = await Api.uploadImage(image.tempFilePath || image, {
          bizType: 'appeal_evidence',
          bizId: currentUser.id ? String(currentUser.id) : '',
          jobId: `appeal-${Date.now()}-${i + 1}`,
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
    const taskId = toPositiveInt(target && target.taskId);
    if (!target || !claimId || !taskId) {
      wx.showToast({ title: '缺少申诉对象', icon: 'none' });
      return;
    }
    if (!this.data.reason.trim()) {
      wx.showToast({ title: '请输入申诉说明', icon: 'none' });
      return;
    }

    wx.showLoading({ title: '提交中...' });

    try {
      const evidence = this.data.uploadImages.length ? await this.uploadEvidenceImages() : '';
      const payload = {
        type: 1,
        claim_id: claimId,
        reason: `${this.data.selectedType.name}：${this.data.reason.trim()}`,
        evidence,
      };
      await Api.createAppeal(payload);
      wx.showToast({ title: '申诉已提交', icon: 'success' });
      this.closeComposer();
      this.loadPageData(false);
    } catch (err) {
      const message = err && err.message ? err.message : '提交失败';
      wx.showModal({
        title: '提交失败',
        content: message,
        showCancel: false,
      });
    } finally {
      wx.hideLoading();
    }
  },

  goCustomerService() {
    wx.navigateTo({ url: '/pages/mine/customer-service/index' });
  },

  copyServicePhone() {
    if (!this.data.customerServicePhone) return;
    wx.setClipboardData({
      data: this.data.customerServicePhone,
      success: () => wx.showToast({ title: '客服电话已复制', icon: 'success' }),
    });
  },
});
