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

    // 超时保护：5秒后强制结束
    const timeoutId = setTimeout(() => {
      if (this.data.loading) {
        const mockData = this.getMockData(id);
        this.setData({
          inspiration: mockData,
          editVideoAspect: mockData.videoAspect || '9:16 竖屏',
          editVideoResolution: mockData.videoResolution || '1080P',
          editVideoDuration: mockData.videoDuration || '30s',
          editReward: String(mockData.reward || 100),
          editParticipationReward: String(mockData.participationReward || 10),
          editDeadline: mockData.deadline || '',
          loading: false
        });
        wx.hideLoading();
      }
    }, 5000);

    try {
      const res = await Api.getWork(id);
      clearTimeout(timeoutId);
      const inspiration = res.data;

      if (!inspiration) {
        wx.showToast({ title: '灵感不存在', icon: 'none' });
        setTimeout(() => wx.navigateBack(), 1500);
        this.setData({ loading: false });
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
      const mockData = this.getMockData(id);
      this.setData({
        inspiration: mockData,
        editVideoAspect: mockData.videoAspect || '9:16 竖屏',
        editVideoResolution: mockData.videoResolution || '1080P',
        editVideoDuration: mockData.videoDuration || '30s',
        editReward: String(mockData.reward || 100),
        editParticipationReward: String(mockData.participationReward || 10),
        editDeadline: mockData.deadline || '',
        loading: false
      });
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

  getMockData(id) {
    const mockList = [
      {
        id: 1,
        title: '春日家居焕新脚本拆解',
        cover: 'https://img.yzcdn.cn/vant/cat.jpeg',
        video_url: 'https://v.megajinghua.com/template/20250421/1587627825767211008/transcode/1f65a77dd7d94e1593e7c3ea7a3ad8f4.mp4',
        previewVideoSrc: 'https://v.megajinghua.com/template/20250421/1587627825767211008/transcode/1f65a77dd7d94e1593e7c3ea7a3ad8f4.mp4',
        displayCover: 'https://img.yzcdn.cn/vant/cat.jpeg',
        likes: 2300,
        authorAvatar: 'https://img.yzcdn.cn/vant/avatar.jpg',
        authorName: '镜头研究社',
        videoAspect: '9:16 竖屏',
        videoResolution: '1080P',
        videoDuration: '30s',
        reward: 100,
        participationReward: 10,
        deadline: '2026-04-25 18:00'
      },
      {
        id: 2,
        title: '探店美食拍摄技巧分享',
        cover: 'https://img.yzcdn.cn/vant/cat.jpeg',
        likes: 1800,
        authorAvatar: 'https://img.yzcdn.cn/vant/avatar.jpg',
        authorName: '美食摄影君',
        videoAspect: '16:9 横屏',
        videoResolution: '720P',
        videoDuration: '60s',
        reward: 80,
        participationReward: 8,
        deadline: '2026-04-26 12:00'
      },
      {
        id: 3,
        title: '酒店民宿宣传片拍摄思路',
        cover: 'https://img.yzcdn.cn/vant/cat.jpeg',
        video_url: 'https://v.megajinghua.com/template/20250421/1587627825767211008/transcode/1f65a77dd7d94e1593e7c3ea7a3ad8f4.mp4',
        previewVideoSrc: 'https://v.megajinghua.com/template/20250421/1587627825767211008/transcode/1f65a77dd7d94e1593e7c3ea7a3ad8f4.mp4',
        displayCover: 'https://img.yzcdn.cn/vant/cat.jpeg',
        likes: 1200,
        authorAvatar: 'https://img.yzcdn.cn/vant/avatar.jpg',
        authorName: '旅拍达人',
        videoAspect: '9:16 竖屏',
        videoResolution: '1080P',
        videoDuration: '45s',
        reward: 150,
        participationReward: 15,
        deadline: '2026-04-27 20:00'
      },
      {
        id: 4,
        title: '地产项目短视频营销方案',
        cover: 'https://img.yzcdn.cn/vant/cat.jpeg',
        likes: 980,
        authorAvatar: 'https://img.yzcdn.cn/vant/avatar.jpg',
        authorName: '地产视频圈',
        videoAspect: '1:1 方屏',
        videoResolution: '720P',
        videoDuration: '15s',
        reward: 60,
        participationReward: 6,
        deadline: '2026-04-24 18:00'
      },
      {
        id: 5,
        title: '本地生活服务类视频创作指南',
        cover: 'https://img.yzcdn.cn/vant/cat.jpeg',
        video_url: 'https://v.megajinghua.com/template/20250421/1587627825767211008/transcode/1f65a77dd7d94e1593e7c3ea7a3ad8f4.mp4',
        previewVideoSrc: 'https://v.megajinghua.com/template/20250421/1587627825767211008/transcode/1f65a77dd7d94e1593e7c3ea7a3ad8f4.mp4',
        displayCover: 'https://img.yzcdn.cn/vant/cat.jpeg',
        likes: 2100,
        authorAvatar: 'https://img.yzcdn.cn/vant/avatar.jpg',
        authorName: '生活记录者',
        videoAspect: '9:16 竖屏',
        videoResolution: '1080P',
        videoDuration: '30s',
        reward: 120,
        participationReward: 12,
        deadline: '2026-04-28 18:00'
      },
      {
        id: 6,
        title: '美妆产品种草视频脚本',
        cover: 'https://img.yzcdn.cn/vant/cat.jpeg',
        likes: 3500,
        authorAvatar: 'https://img.yzcdn.cn/vant/avatar.jpg',
        authorName: '美妆控',
        videoAspect: '9:16 竖屏',
        videoResolution: '1080P',
        videoDuration: '20s',
        reward: 90,
        participationReward: 9,
        deadline: '2026-04-26 18:00'
      }
    ];
    return mockList.find(item => item.id == id) || mockList[0];
  }
});