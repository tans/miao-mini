const Api = require('../../../utils/api.js');
const app = getApp();

Page({
  data: {
    taskId: '',
    claimId: '',
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
    Api.getClaimByTaskId(taskId).then(res => {
      if (res.data && res.data.claim) {
        const claim = res.data.claim;
        this.setData({
          claimId: claim.id || '',
          task: claim.task || claim,
          description: claim.content || '',
        });
      }
    }).catch(err => {
      // load task failed
    });
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
        wx.showToast({ title: '视频选择成功', icon: 'success' });
      },
      fail: (err) => {
        wx.showToast({ title: '选择失败', icon: 'none' });
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
      wx.showToast({ title: '请先选择视频', icon: 'none' });
      return;
    }

    const claimId = this.data.claimId || this.data.task.claim_id || this.data.task.id;
    if (!claimId) {
      wx.showToast({ title: '任务信息不完整', icon: 'none' });
      return;
    }

    this.setData({ isSubmitting: true });
    wx.showLoading({ title: '上传中...' });

    try {
      const videoUrl = await Api.uploadVideo(this.data.videoUrl);
      wx.showLoading({ title: '提交中...' });

      const submitData = {
        content: this.data.description,
        materials: [{
          file_name: 'video.mp4',
          file_path: videoUrl,
          file_type: 'video',
        }],
      };

      await Api.submitClaim(claimId, submitData);

      wx.hideLoading();
      wx.showToast({ title: '提交成功', icon: 'success' });
      setTimeout(() => {
        wx.navigateBack();
      }, 1500);
    } catch (err) {
      wx.hideLoading();
      wx.showToast({ title: err.message || '提交失败', icon: 'none' });
    } finally {
      this.setData({ isSubmitting: false });
    }
  },

  goBack() {
    wx.navigateBack({ fail: () => wx.switchTab({ url: '/pages/home/index' }) });
  }
});
