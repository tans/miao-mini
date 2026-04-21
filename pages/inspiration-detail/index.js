const Api = require('../../utils/api.js');

Page({
  data: {
    inspiration: null,
    loading: true,
  },

  onLoad(options) {
    this.loadInspirationDetail(options.id);
  },

  async loadInspirationDetail(id) {
    wx.showLoading({ title: '加载中...' });
    try {
      const res = await Api.getWork(id);
      const inspiration = res.data;

      if (!inspiration) {
        wx.showToast({ title: '灵感不存在', icon: 'none' });
        setTimeout(() => wx.navigateBack(), 1500);
        this.setData({ loading: false });
        return;
      }

      this.setData({
        inspiration,
        loading: false
      });
    } catch (err) {
      // 使用mock数据
      const mockData = this.getMockData(id);
      this.setData({
        inspiration: mockData,
        loading: false
      });
    } finally {
      wx.hideLoading();
    }
  },

  playVideo() {
    // 视频播放
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
        authorName: '镜头研究社'
      },
      {
        id: 2,
        title: '探店美食拍摄技巧分享',
        cover: 'https://img.yzcdn.cn/vant/cat.jpeg',
        likes: 1800,
        authorAvatar: 'https://img.yzcdn.cn/vant/avatar.jpg',
        authorName: '美食摄影君'
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
        authorName: '旅拍达人'
      },
      {
        id: 4,
        title: '地产项目短视频营销方案',
        cover: 'https://img.yzcdn.cn/vant/cat.jpeg',
        likes: 980,
        authorAvatar: 'https://img.yzcdn.cn/vant/avatar.jpg',
        authorName: '地产视频圈'
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
        authorName: '生活记录者'
      },
      {
        id: 6,
        title: '美妆产品种草视频脚本',
        cover: 'https://img.yzcdn.cn/vant/cat.jpeg',
        likes: 3500,
        authorAvatar: 'https://img.yzcdn.cn/vant/avatar.jpg',
        authorName: '美妆控'
      }
    ];
    return mockList.find(item => item.id == id) || mockList[0];
  }
});