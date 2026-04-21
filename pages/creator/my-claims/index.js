const Api = require('../../../utils/api.js');
const { getClaimStatusText, formatDateTime } = require('../../../utils/util.js');
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
    dialogButtons: [{ text: '取消', action: 'cancel' }, { text: '提交', type: 'primary', action: 'confirm' }],
    currentFilter: 'active',
    userLevel: 'Lv3优质创作者',
    dailyLimit: 8
  },

  onLoad(options) {
    if (!app.isLoggedIn()) {
      app.silentLogin().then(() => {
        if (app.isLoggedIn()) {
          this.loadClaims();
          if (options.claimId && options.action === 'submit') {
            this.autoShowSubmitModal(options.claimId);
          }
        }
      });
      return;
    }
    this.loadClaims();
    if (options.claimId && options.action === 'submit') {
      this.autoShowSubmitModal(options.claimId);
    }
  },

  autoShowSubmitModal(claimId) {
    this.setData({ showSubmitModal: true, submitClaimId: claimId, submitUrl: '', submitNote: '' });
  },

  onPullDownRefresh() {
    this.loadClaims().finally(() => wx.stopPullDownRefresh());
  },

  onShow() {
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
      let claims = (res.data || []).map(c => this.calculateRemainingTime(c));
      claims.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
      this.setData({ claims, loading: false });
      this.applyFilter(this.data.currentFilter);
    } catch (err) {
      this.setData({ loading: false });
      wx.showToast({ title: '加载失败', icon: 'none' });
    } finally {
      wx.hideLoading();
    }
  },

  calculateRemainingTime(claim) {
    const now = Date.now();
    const endAt = claim.end_at ? new Date(claim.end_at).getTime() : now + 86400000 * 7;
    const diff = endAt - now;

    let remainingTimeDisplay = '0秒';
    let remainingTimeClass = 'ended';

    if (diff > 0) {
      const days = Math.floor(diff / 86400000);
      const hours = Math.floor((diff % 86400000) / 3600000);
      const minutes = Math.floor((diff % 3600000) / 60000);
      const seconds = Math.floor((diff % 60000) / 1000);

      if (days > 0) {
        remainingTimeDisplay = `${days}天${hours}小时${minutes}分`;
      } else if (hours > 0) {
        remainingTimeDisplay = `${hours}小时${minutes}分${seconds}秒`;
      } else if (minutes > 0) {
        remainingTimeDisplay = `${minutes}分${seconds}秒`;
      } else {
        remainingTimeDisplay = `${seconds}秒`;
      }
      remainingTimeClass = 'active';
    }

    return {
      ...claim,
      remainingTimeDisplay,
      remainingTimeClass
    };
  },

  switchFilter(e) {
    const filter = e.currentTarget.dataset.filter;
    this.setData({ currentFilter: filter });
    this.applyFilter(filter);
  },

  applyFilter(filter) {
    let filtered = this.data.claims;
    if (filter === 'active') {
      // 进行中：已提交(2)及以上，排除待提交(1)
      filtered = this.data.claims.filter(c => c.status >= 2);
    } else if (filter === 'ended') {
      // 已结束：已取消(4)或已超时(5)
      filtered = this.data.claims.filter(c => c.status >= 4);
    }
    this.setData({ filteredClaims: filtered });
  },

  goBack() {
    wx.navigateBack({ fail: () => wx.switchTab({ url: '/pages/home/index' }) });
  },

  goTaskDetail(e) {
    const taskId = e.currentTarget.dataset.task || e.currentTarget.dataset.id;
    // 任务详情已拆分至商家/创作者视角，导航至创作者任务详情
    wx.navigateTo({ url: `/pages/creator/task-detail/index?id=${taskId}` });
  },

  getClaimStatusText(status) {
    return getClaimStatusText(status);
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
  },

  formatDateTime(dateStr) {
    return formatDateTime(dateStr);
  }
});
