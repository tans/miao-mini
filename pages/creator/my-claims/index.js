const Api = require('../../../utils/api.js');
const { getClaimStatusText, formatDateTime } = require('../../../utils/util.js');
const app = getApp();

function normalizeClaim(claim = {}) {
  const claimStatus = Number(claim.claim_status != null ? claim.claim_status : claim.status || 0);
  const reviewResult = Number(claim.review_result || claim.reviewResult || 0) || 0;
  const taskStatus = Number(claim.task_status || 0);
  const endAt = claim.endAt || claim.end_at || '';
  const now = Date.now();
  const endAtMs = endAt ? new Date(endAt).getTime() : 0;
  const normalizedStatus = claimStatus === 1 && reviewResult === 3 ? 6 : claimStatus;

  let isActive = claimStatus === 1 || claimStatus === 2;
  if (taskStatus) {
    isActive = isActive && (taskStatus === 2 || taskStatus === 3);
  }
  if (endAtMs) {
    isActive = isActive && endAtMs > now;
  }

  let claimActionText = '查看详情';
  let claimActionClass = 'btn-ended';
  if (normalizedStatus === 1 && reviewResult === 0) {
    claimActionText = isActive ? '立即交稿' : '已截止';
    claimActionClass = isActive ? 'btn-submit' : 'btn-ended';
  } else if (claimStatus === 1 && reviewResult === 2) {
    claimActionText = '已淘汰';
    claimActionClass = 'btn-rejected';
  } else if (claimStatus === 1 && reviewResult === 3) {
    claimActionText = '已举报';
    claimActionClass = 'btn-reported';
  } else if (normalizedStatus === 2) {
    claimActionText = '已提交，待审核';
    claimActionClass = 'btn-pending';
  } else if (normalizedStatus === 3) {
    claimActionText = '已采纳';
    claimActionClass = 'btn-approved';
  } else if (normalizedStatus === 4) {
    claimActionText = '已取消';
    claimActionClass = 'btn-cancelled';
  } else if (normalizedStatus === 5) {
    claimActionText = '已超时';
    claimActionClass = 'btn-timeout';
  } else if (normalizedStatus === 6) {
    claimActionText = '已举报';
    claimActionClass = 'btn-reported';
  }

  return {
    ...claim,
    claimStatus,
    reviewResult,
    taskStatus,
    endAt,
    end_at: endAt,
    deadlineText: formatDateTime(endAt) || '待更新',
    statusLabel: isActive ? '征稿中' : '已截止',
    isActive,
    normalizedStatus,
    claimActionText,
    claimActionClass,
  };
}

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
    const afterLoad = () => {
      if (options.claimId && options.action === 'submit') {
        this.autoShowSubmitModal(options.claimId);
      }
    };
    if (!app.isLoggedIn()) {
      app.silentLogin().then(() => {
        if (app.isLoggedIn()) {
          this.loadClaims().then(afterLoad);
        }
      });
      return;
    }
    this.loadClaims().then(afterLoad);
  },

  autoShowSubmitModal(claimId) {
    const claim = (this.data.claims || []).find(item => String(item.id) === String(claimId));
    if (!claim || !claim.task_id) {
      wx.showToast({ title: '未找到对应任务', icon: 'none' });
      return;
    }
    wx.navigateTo({
      url: `/pages/creator/task-detail/index?id=${claim.task_id}&action=submit`
    });
  },

  onPullDownRefresh() {
    this.loadClaims().finally(() => wx.stopPullDownRefresh());
  },

  onShow() {
    if (app.isLoggedIn()) {
      this.loadClaims();
    }
  },

  async loadClaims() {
    if (this.data.loading) return;
    this.setData({ loading: true });
    wx.showLoading({ title: '加载中...' });
    try {
      const res = await Api.getMyClaims({ page: 1 });
      let claims = (res.data || []).map(c => this.calculateRemainingTime(normalizeClaim(c)));
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
    const endAt = claim.end_at ? new Date(claim.end_at).getTime() : 0;
    if (!endAt) {
      return {
        ...claim,
        remainingTimeDisplay: '待更新',
        remainingTimeClass: claim.isActive ? 'active' : 'ended'
      };
    }
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
      filtered = this.data.claims.filter(c => c.isActive);
    } else if (filter === 'ended') {
      filtered = this.data.claims.filter(c => !c.isActive);
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
            wx.showToast({ title: '已取消报名', icon: 'success' });
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
