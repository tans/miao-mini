// pages/my-tasks/index.js
const Api = require('../../utils/api.js');
const { getStatusText, getClaimStatusText } = require('../../utils/util.js');
const app = getApp();

Page({
  data: {
    claims: [],
    tasks: [],
    activeTab: 'claims',
    userInfo: null,
    showSubmitModal: false,
    submitClaimId: null,
    submitUrl: '',
    submitNote: ''
  },

  onLoad() {
    if (!app.isLoggedIn()) {
      wx.navigateTo({ url: '/pages/login/index' });
      return;
    }
    const user = app.getUser();
    this.setData({
      userInfo: user,
      // 默认Tab根据角色设置
      activeTab: user && user.role === 'business' ? 'business' : 'claims'
    });
  },

  onShow() {
    if (app.isLoggedIn()) {
      this.loadData();
    }
  },

  onPullDownRefresh() {
    this.loadData().then(() => {
      wx.stopPullDownRefresh();
    });
  },

  async loadData() {
    wx.showLoading({ title: '加载中...' });
    try {
      const [claimsRes, tasksRes] = await Promise.all([
        Api.getMyClaims({ page: 1 }),
        Api.getMyBusinessTasks({ page: 1 })
      ]);

      this.setData({
        claims: claimsRes.data || [],
        tasks: tasksRes.data || []
      });
    } catch (err) {
      wx.showToast({ title: '加载失败', icon: 'none' });
    } finally {
      wx.hideLoading();
    }
  },

  switchTab(e) {
    const tab = e.currentTarget.dataset.tab;
    this.setData({ activeTab: tab });
  },

  goTaskDetail(e) {
    const taskId = e.currentTarget.dataset.id;
    wx.navigateTo({ url: `/pages/task-detail/index?id=${taskId}` });
  },

  goCreateTask() {
    wx.switchTab({ url: '/pages/create-task/index' });
  },

  goWallet() {
    wx.navigateTo({ url: '/pages/wallet/index' });
  },

  handleLogout() {
    wx.showModal({
      title: '确认退出',
      content: '确定要退出登录吗？',
      success: (res) => {
        if (res.confirm) {
          Api.logout();
          wx.showToast({ title: '已退出', icon: 'success' });
          setTimeout(() => {
            wx.navigateTo({ url: '/pages/login/index' });
          }, 1000);
        }
      }
    });
  },

  getClaimStatusText(status) {
    return getClaimStatusText(status);
  },

  getStatusText(status) {
    return getStatusText(status);
  },

  showSubmitModal(e) {
    const claimId = e.currentTarget.dataset.claimId;
    this.setData({
      showSubmitModal: true,
      submitClaimId: claimId,
      submitUrl: '',
      submitNote: ''
    });
  },

  hideSubmitModal() {
    this.setData({
      showSubmitModal: false,
      submitClaimId: null,
      submitUrl: '',
      submitNote: ''
    });
  },

  onSubmitUrlInput(e) {
    this.setData({ submitUrl: e.detail.value });
  },

  onSubmitNoteInput(e) {
    this.setData({ submitNote: e.detail.value });
  },

  stopPropagation() {},

  async confirmSubmit() {
    const { submitClaimId, submitUrl, submitNote } = this.data;
    if (!submitUrl) {
      wx.showToast({ title: '请输入视频链接', icon: 'none' });
      return;
    }

    wx.showLoading({ title: '提交中...' });
    try {
      const content = submitNote ? `${submitUrl}\n${submitNote}` : submitUrl;
      await Api.submitClaim(submitClaimId, { content });
      wx.showToast({ title: '提交成功！', icon: 'success' });
      this.hideSubmitModal();
      this.loadData();
    } catch (err) {
      wx.showToast({ title: err.message || '提交失败', icon: 'none' });
    } finally {
      wx.hideLoading();
    }
  }
});
