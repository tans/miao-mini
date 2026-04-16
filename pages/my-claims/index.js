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

  onLoad(options) {
    if (!app.isLoggedIn()) {
      app.silentLogin().then(() => {
        if (app.isLoggedIn()) {
          this.loadClaims();
          // 处理跳转参数
          if (options.claimId && options.action === 'submit') {
            this.autoShowSubmitModal(options.claimId);
          }
        }
      });
      return;
    }
    this.loadClaims();
    // 处理跳转参数
    if (options.claimId && options.action === 'submit') {
      this.autoShowSubmitModal(options.claimId);
    }
  },

  // 自动显示提交弹窗（从任务详情页跳转过来时）
  autoShowSubmitModal(claimId) {
    this.setData({ showSubmitModal: true, submitClaimId: claimId, submitUrl: '', submitNote: '' });
  },

  onPullDownRefresh() {
    this.loadClaims().finally(() => wx.stopPullDownRefresh());
  },

  onShow() {
    // 从提交作品页返回时，刷新认领列表
    if (this.data.claims.length > 0) {
      this.loadClaims();
    }
  },

  async loadClaims() {
    if (this.data.loading) return;
    this.setData({ loading: true });
    wx.showLoading({ title: '加载中...' });
    try {
      const res = await Api.getMyClaims({ page: 1 });
      let claims = res.data || [];
      // 按状态排序：待提交(1) > 待验收(2) > 已完成(3)
      claims.sort((a, b) => a.status - b.status);
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
    // ClaimStatus: 1=待提交, 2=待验收, 3=已完成
    const statusMap = { all: null, pending: 1, submitted: 2, completed: 3 };
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
    const claimId = e.currentTarget.dataset.claimId;
    wx.navigateTo({ url: `/pages/submit-work/index?claimId=${claimId}` });
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
  },

  // 取消/放弃认领
  async cancelClaim(e) {
    const { claimId } = e.currentTarget.dataset;
    wx.showModal({
      title: '确认放弃',
      content: '确定要放弃该任务吗？放弃后将释放名额',
      success: async (res) => {
        if (res.confirm) {
          wx.showLoading({ title: '取消中...' });
          try {
            await Api.cancelClaim(claimId);
            wx.showToast({ title: '已取消认领', icon: 'success' });
            this.loadClaims();
          } catch (err) {
            wx.showToast({ title: err.message || '取消失败', icon: 'none' });
          } finally {
            wx.hideLoading();
          }
        }
      }
    });
  }
});