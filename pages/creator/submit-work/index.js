const Api = require('../../../utils/api.js');

Page({
  data: {
    taskId: '',
    task: {},
    videoUrl: '',
    coverUrl: '',
    description: '',
    isSubmitting: false,
  },

  onLoad(options) {
    if (options.taskId) {
      this.setData({ taskId: options.taskId });
      this.loadTaskInfo(options.taskId);
    }
  },

  loadTaskInfo(taskId) {
    Api.getClaimByTaskId(taskId).then((res) => {
      if (res.data && res.data.claim) {
        this.setData({ task: res.data.claim.task || res.data.claim });
      }
    }).catch(() => {});
  },

  chooseVideo() {
    wx.chooseMedia({
      count: 1,
      mediaType: ['video'],
      sourceType: ['album', 'camera'],
      maxDuration: 60,
      camera: 'back',
      success: (res) => {
        const tempFilePath = res.tempFiles[0].tempFilePath;
        this.setData({ videoUrl: tempFilePath });
        wx.showToast({ title: 'Video selected', icon: 'success' });
      },
      fail: () => {
        wx.showToast({ title: 'Select failed', icon: 'none' });
      }
    });
  },

  deleteVideo() {
    this.setData({ videoUrl: '' });
  },

  previewVideo() {
    if (this.data.videoUrl) {
      wx.navigateTo({
        url: `/pages/video-player/index?url=${encodeURIComponent(this.data.videoUrl)}`
      });
    }
  },

  bindDescriptionInput(e) {
    this.setData({ description: e.detail.value });
  },

  async submitWork() {
    if (this.data.isSubmitting) {
      return;
    }

    if (!this.data.videoUrl) {
      wx.showToast({ title: 'Please choose a video', icon: 'none' });
      return;
    }

    const claimId = this.data.task.claim_id || this.data.task.id;
    if (!claimId) {
      wx.showToast({ title: 'Invalid task info', icon: 'none' });
      return;
    }

    this.setData({ isSubmitting: true });
    wx.showLoading({ title: 'Uploading...' });

    try {
      const uploadJobId = `claim-${claimId}-${Date.now()}`;
      const uploadRes = await Api.uploadVideo(this.data.videoUrl, {
        bizType: 'claim_source',
        bizId: claimId,
        jobId: uploadJobId,
        returnMeta: true,
      });

      wx.showLoading({ title: 'Submitting...' });

      const submitRes = await Api.submitClaim(claimId, {
        content: this.data.description,
        materials: [{
          file_name: uploadRes.filename || 'video.mp4',
          file_path: uploadRes.url,
          file_type: 'video',
        }],
      });

      wx.hideLoading();
      const summary = submitRes && submitRes.data && submitRes.data.process_status_summary;
      const pendingCount = summary ? ((summary.pending || 0) + (summary.processing || 0)) : 0;
      wx.showToast({
        title: pendingCount ? 'Submitted, processing' : 'Submitted',
        icon: 'success'
      });
      setTimeout(() => {
        wx.navigateBack();
      }, 1500);
    } catch (err) {
      wx.hideLoading();
      wx.showToast({ title: err.message || 'Submit failed', icon: 'none' });
    } finally {
      this.setData({ isSubmitting: false });
    }
  },

  goBack() {
    wx.navigateBack({ fail: () => wx.switchTab({ url: '/pages/home/index' }) });
  }
});
