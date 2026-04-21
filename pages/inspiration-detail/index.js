const Api = require('../../utils/api.js');

Page({
  data: {
    inspiration: null,
    loading: true,
    // 可编辑字段
    editVideoAspect: '',
    editVideoResolution: '',
    editVideoDuration: '',
    editReward: '',
    editParticipationReward: '',
    editDeadline: '',
  },

  onLoad(options) {
    this.loadInspirationDetail(options.id);
  },

  async loadInspirationDetail(id) {
    wx.showLoading({ title: '加载中...' });

    // 超时保护：3秒后提示加载超时
    let timeoutId;
    const timeoutPromise = new Promise((_, reject) => {
      timeoutId = setTimeout(() => reject(new Error('网络超时，请检查网络后重试')), 3000);
    });

    try {
      const res = await Promise.race([Api.getWork(id), timeoutPromise]);
      clearTimeout(timeoutId);

      const inspiration = res.data;

      if (!inspiration) {
        wx.showToast({ title: '灵感不存在', icon: 'none' });
        setTimeout(() => wx.navigateBack(), 1500);
        this.setData({ loading: false });
        wx.hideLoading();
        return;
      }

      this.setData({
        inspiration,
        editVideoAspect: inspiration.videoAspect || '9:16 竖屏',
        editVideoResolution: inspiration.videoResolution || '1080P',
        editVideoDuration: inspiration.videoDuration || '30s',
        editReward: String(inspiration.reward || 100),
        editParticipationReward: String(inspiration.participationReward || 10),
        editDeadline: inspiration.deadline || '',
        loading: false
      });
    } catch (err) {
      clearTimeout(timeoutId);
      wx.hideLoading();
      wx.showToast({
        title: err.message || '加载失败，请重试',
        icon: 'none',
        duration: 2000
      });
      this.setData({ loading: false });
    } finally {
      wx.hideLoading();
    }
  },

  // 输入处理
  onVideoAspectInput(e) {
    this.setData({ editVideoAspect: e.detail.value });
  },

  onVideoResolutionInput(e) {
    this.setData({ editVideoResolution: e.detail.value });
  },

  onVideoDurationInput(e) {
    this.setData({ editVideoDuration: e.detail.value });
  },

  onRewardInput(e) {
    this.setData({ editReward: e.detail.value });
  },

  onParticipationRewardInput(e) {
    this.setData({ editParticipationReward: e.detail.value });
  },

  onDeadlineInput(e) {
    this.setData({ editDeadline: e.detail.value });
  },

  playVideo() {
    const videoCtx = wx.createVideoContext('inspirationVideo');
    if (videoCtx) {
      videoCtx.play();
    }
  },

  goBack() {
    wx.navigateBack({ fail: () => wx.switchTab({ url: '/pages/inspiration/index' }) });
  },

});