const Api = require('../../utils/api.js');
const app = getApp();

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
    this.initMockData();
  },

  loadTaskInfo(taskId) {
  },

  initMockData() {
    const mockTask = {
      id: 'CC-20260418-000126',
      title: '高端楼盘春日氛围视频',
      unitPrice: 100,
      awardPrice: 10,
      videoAspect: '9:16 竖屏',
      videoResolution: '1080P',
      videoDuration: '30s',
    };
    this.setData({ task: mockTask });
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
    if (!this.data.videoUrl) {
      wx.showToast({ title: '请先选择视频', icon: 'none' });
      return;
    }

    this.setData({ isSubmitting: true });
    wx.showLoading({ title: '上传中...' });

    try {
      await new Promise(resolve => setTimeout(resolve, 2000));
      wx.hideLoading();
      wx.showToast({ title: '提交成功', icon: 'success' });
      setTimeout(() => {
        wx.navigateBack();
      }, 1500);
    } catch (err) {
      wx.hideLoading();
      wx.showToast({ title: '提交失败', icon: 'none' });
    } finally {
      this.setData({ isSubmitting: false });
    }
  },

  goBack() {
    wx.navigateBack({ fail: () => wx.switchTab({ url: '/pages/home/index' }) });
  }
});