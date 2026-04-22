const Api = require('../../utils/api.js');
const app = getApp();

Page({
  data: {
    taskId: '',
    task: {},
    materials: [],
    recommendations: [],
    currentTab: 'detail',
    hasSignedUp: false,
    canSubmit: false,
    countdownText: '',
    countdownTimer: null,
  },

  onLoad(options) {
    if (options.id) {
      this.setData({ taskId: options.id });
      this.loadTaskDetail(options.id);
    }
  },

  onUnload() {
    if (this.data.countdownTimer) {
      clearInterval(this.data.countdownTimer);
      this.setData({ countdownTimer: null });
    }
  },

  async loadTaskDetail(taskId) {
    wx.showLoading({ title: '加载中...' });
    try {
      const res = await Api.getTask(taskId);
      const task = res.data || {};
      this.setData({
        task,
        materials: task.materials || [],
        hasSignedUp: task.has_signed_up || false,
        canSubmit: task.can_submit || false,
      });
      this.startCountdownTimer(task.end_at);
    } catch (err) {
      wx.showToast({ title: '加载失败', icon: 'none' });
    } finally {
      wx.hideLoading();
    }
  },

  startCountdownTimer(endAt) {
    if (this.data.countdownTimer) {
      clearInterval(this.data.countdownTimer);
    }
    this.updateCountdown(endAt);
    const timer = setInterval(() => {
      this.updateCountdown(endAt);
    }, 60000);
    this.setData({ countdownTimer: timer });
  },

  updateCountdown(endAt) {
    if (!endAt) return;
    const endTime = new Date(endAt).getTime();
    const now = new Date().getTime();
    const diff = endTime - now;
    if (diff <= 0) {
      this.setData({ countdownText: '已截止' });
      if (this.data.countdownTimer) {
        clearInterval(this.data.countdownTimer);
        this.setData({ countdownTimer: null });
      }
      return;
    }
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    this.setData({ countdownText: `${hours}小时${minutes}分` });
  },

  switchTab(e) {
    const tab = e.currentTarget.dataset.tab;
    this.setData({ currentTab: tab });
  },

  goBack() {
    wx.navigateBack({ fail: () => wx.switchTab({ url: '/pages/home/index' }) });
  },

  copyTaskId() {
    const taskId = this.data.task.id || 'CC-20260418-000126';
    wx.setClipboardData({
      data: taskId,
      success: () => {
        wx.showToast({ title: '已复制', icon: 'success' });
      }
    });
  },

  previewMaterial(e) {
    const url = e.currentTarget.dataset.url;
    wx.previewImage({ urls: [url], current: url });
  },

  goTaskDetail(e) {
    const id = e.currentTarget.dataset.id;
    wx.navigateTo({ url: `/pages/creator/task-detail/index?id=${id}` });
  },

  handleSignUp() {
    wx.showLoading({ title: '报名中...' });
    setTimeout(() => {
      wx.hideLoading();
      this.setData({ hasSignedUp: true, canSubmit: true });
      wx.showToast({ title: '报名成功', icon: 'success' });
    }, 1000);
  },

  goSubmitWork() {
    wx.navigateTo({ url: `/pages/creator/submit-work/index?taskId=${this.data.taskId}` });
  }
});