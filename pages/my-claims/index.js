const Api = require('../../utils/api.js');
const { getClaimStatusText } = require('../../utils/util.js');
const app = getApp();

Page({
  data: {
    claims: [],
    filteredClaims: [],
    activeTab: 'all',
    loading: false,
    showSubmitModal: false,
    submitClaimId: null,
    submitUrl: '',
    submitNote: '',
    dialogButtons: [{ text: '取消', action: 'cancel' }, { text: '提交', type: 'primary', action: 'confirm' }]
  },

  onLoad() {
    if (!app.isLoggedIn()) {
      app.silentLogin().then(() => {
        if (app.isLoggedIn()) this.loadClaims();
      });
      return;
    }
    this.loadClaims();
  },

  onPullDownRefresh() {
    this.loadClaims().finally(() => wx.stopPullDownRefresh());
  },

  async loadClaims() {
    if (this.data.loading) return;
    this.setData({ loading: true });
    wx.showLoading({ title: '加载中...' });
    try {
      const res = await Api.getMyClaims({ page: 1 });
      const claims = res.data && res.data.data || [];
      this.setData({ claims, filteredClaims: claims });
    } catch (err) {
      wx.showToast({ title: '加载失败', icon: 'none' });
    } finally {
      this.setData({ loading: false });
      wx.hideLoading();
    }
  },

  switchTab(e) {
    const tab = e.currentTarget.dataset.tab;
    this.setData({ activeTab: tab });
    const statusMap = { all: null, pending: 0, submitted: 1, completed: 2 };
    const status = statusMap[tab];
    const filtered = status === null ? this.data.claims : this.data.claims.filter(c => c.status === status);
    this.setData({ filteredClaims: filtered });
  },

  goTaskDetail(e) {
    wx.navigateTo({ url: `/pages/task-detail/index?id=${e.currentTarget.dataset.id}` });
  },

  getClaimStatusText(status) {
    return getClaimStatusText(status);
  },

  showSubmitModal(e) {
    this.setData({ showSubmitModal: true, submitClaimId: e.currentTarget.dataset.claimId, submitUrl: '', submitNote: '' });
  },

  hideSubmitModal() {
    this.setData({ showSubmitModal: false });
  },

  onDialogTap(e) {
    const action = e.detail.action;
    if (action === 'cancel') {
      this.hideSubmitModal();
    } else if (action === 'confirm') {
      this.confirmSubmit();
    }
  },

  onSubmitUrlInput(e) { this.setData({ submitUrl: e.detail.value }); },
  onSubmitNoteInput(e) { this.setData({ submitNote: e.detail.value }); },
  stopPropagation() {},

  async confirmSubmit() {
    const { submitClaimId, submitUrl, submitNote } = this.data;
    if (!submitUrl) { wx.showToast({ title: '请输入视频链接', icon: 'none' }); return; }
    wx.showLoading({ title: '提交中...' });
    try {
      const content = submitNote ? `${submitUrl}\n${submitNote}` : submitUrl;
      await Api.submitClaim(submitClaimId, { content });
      wx.showToast({ title: '提交成功！', icon: 'success' });
      this.hideSubmitModal();
      this.loadClaims();
    } catch (err) {
      wx.showToast({ title: err.message || '提交失败', icon: 'none' });
    } finally {
      wx.hideLoading();
    }
  }
});
