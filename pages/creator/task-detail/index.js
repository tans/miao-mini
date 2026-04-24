const Api = require('../../../utils/api.js');
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
    // 提交模态框相关
    showSubmitModal: false,
    submitClaimId: '',
    submitVideoUrl: '',
    submitDescription: '',
    submitting: false,
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
      this.loadClaimId();
    }, 1000);
  },

  loadClaimId() {
    Api.getClaimByTaskId(this.data.taskId).then((res) => {
      if (res.data && res.data.claim) {
        this.setData({ submitClaimId: res.data.claim.id || '' });
      }
    }).catch(() => {});
  },

  goSubmitWork() {
    if (!this.data.submitClaimId) {
      this.loadClaimId();
    }
    this.setData({ showSubmitModal: true, submitVideoUrl: '', submitDescription: '' });
  },

  onCloseSubmitModal() {
    this.setData({ showSubmitModal: false, submitVideoUrl: '', submitDescription: '', submitting: false });
  },

  onChooseVideo() {
    wx.chooseMedia({
      count: 1,
      mediaType: ['video'],
      sourceType: ['album', 'camera'],
      maxDuration: 60,
      camera: 'back',
      success: (res) => {
        const tempFilePath = res.tempFiles[0].tempFilePath;
        this.setData({ submitVideoUrl: tempFilePath });
        wx.showToast({ title: '视频已选择', icon: 'success' });
      },
      fail: () => {
        wx.showToast({ title: '选择失败', icon: 'none' });
      }
    });
  },

  onDescriptionInput(e) {
    this.setData({ submitDescription: e.detail.value });
  },

  async onSubmitWork() {
    if (this.data.submitting) return;
    if (!this.data.submitVideoUrl) {
      wx.showToast({ title: '请先选择视频', icon: 'none' });
      return;
    }
    const claimId = this.data.submitClaimId;
    if (!claimId) {
      wx.showToast({ title: '认领不存在，请重新报名', icon: 'none' });
      return;
    }

    this.setData({ submitting: true });
    wx.showLoading({ title: '上传中...' });

    try {
      const uploadJobId = `claim-${claimId}-${Date.now()}`;
      const uploadRes = await Api.uploadVideo(this.data.submitVideoUrl, {
        bizType: 'claim_source',
        bizId: claimId,
        jobId: uploadJobId,
        returnMeta: true,
      });

      wx.showLoading({ title: '提交中...' });

      await Api.submitClaim(claimId, {
        content: this.data.submitDescription,
        materials: [{
          file_name: uploadRes.filename || 'video.mp4',
          file_path: uploadRes.url,
          file_type: 'video',
        }],
      });

      wx.hideLoading();
      const summary = uploadRes && uploadRes.process_status_summary;
      const pendingCount = summary ? ((summary.pending || 0) + (summary.processing || 0)) : 0;
      wx.showToast({
        title: pendingCount ? '提交成功，处理中' : '提交成功',
        icon: 'success'
      });
      this.onCloseSubmitModal();
      this.loadTaskDetail(this.data.taskId);
    } catch (err) {
      wx.hideLoading();
      wx.showToast({ title: err.message || '提交失败', icon: 'none' });
    } finally {
      this.setData({ submitting: false });
    }
  },

  stopPropagation() {}
});