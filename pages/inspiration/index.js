const Api = require('../../utils/api.js');
const app = getApp();

Page({
  data: {
    currentCategory: 'all',
    currentSort: 'default',
    inspirationList: [],
    leftColumn: [],
    rightColumn: [],
    navigating: false,
  },

  onLoad() {
    this.loadInspirationList();
  },

  async loadInspirationList() {
    wx.showLoading({ title: '加载中...' });
    try {
      const res = await Api.getInspirationList({
        category: this.data.currentCategory,
        sort: this.data.currentSort
      });
      const list = res.data || [];
      this.processColumns(list);
    } catch (err) {
      // 使用模拟数据
      const mockData = this.getMockData();
      this.processColumns(mockData);
    } finally {
      wx.hideLoading();
    }
  },

  processColumns(list) {
    // 简单的瀑布流分配：奇数项放左列，偶数项放右列
    const leftColumn = [];
    const rightColumn = [];
    list.forEach((item, index) => {
      if (index % 2 === 0) {
        leftColumn.push(item);
      } else {
        rightColumn.push(item);
      }
    });
    this.setData({
      inspirationList: list,
      leftColumn,
      rightColumn
    });
  },

  switchCategory(e) {
    const category = e.currentTarget.dataset.category;
    if (category === this.data.currentCategory) return;
    this.setData({ currentCategory: category });
    this.loadInspirationList();
  },

  switchSort(e) {
    const sort = e.currentTarget.dataset.sort;
    if (sort === this.data.currentSort) return;
    this.setData({ currentSort: sort });
    this.loadInspirationList();
  },

  goDetail(e) {
    if (this.navigating) return;
    const id = e.currentTarget.dataset.id;
    const isVideo = e.currentTarget.dataset.isVideo;
    if (!id) return;

    this.navigating = true;

    // 视频卡片跳转至播放页面，非视频跳转到预览页面
    if (isVideo) {
      wx.navigateTo({ url: `/pages/inspiration-detail/index?id=${id}` });
    } else {
      const workData = encodeURIComponent(JSON.stringify(this.data.inspirationList.find(item => item.id === id) || {}));
      wx.navigateTo({ url: `/pages/work-preview/index?data=${workData}` });
    }

    setTimeout(() => {
      this.navigating = false;
    }, 400);
  },

  goHome() {
    wx.switchTab({ url: '/pages/home/index' });
  },

  goMine() {
    wx.switchTab({ url: '/pages/mine/index' });
  },

  goBack() {
    wx.navigateBack({ delta: 1 });
  },

  getMockData() {
    // 返回模拟数据用于开发和测试
    return [
      {
        id: 1,
        title: '春日家居焕新脚本拆解',
        cover: '',
        likes: 2300,
        authorAvatar: '',
        authorName: '镜头研究社',
        isVideo: true,
        previewVideoSrc: '',
        displayCover: ''
      },
      {
        id: 2,
        title: '探店美食拍摄技巧分享',
        cover: '',
        likes: 1800,
        authorAvatar: '',
        authorName: '美食摄影君',
        isVideo: false
      },
      {
        id: 3,
        title: '酒店民宿宣传片拍摄思路',
        cover: '',
        likes: 1200,
        authorAvatar: '',
        authorName: '旅拍达人',
        isVideo: true,
        previewVideoSrc: '',
        displayCover: ''
      },
      {
        id: 4,
        title: '地产项目短视频营销方案',
        cover: '',
        likes: 980,
        authorAvatar: '',
        authorName: '地产视频圈',
        isVideo: false
      },
      {
        id: 5,
        title: '本地生活服务类视频创作指南',
        cover: '',
        likes: 2100,
        authorAvatar: '',
        authorName: '生活记录者',
        isVideo: true,
        previewVideoSrc: '',
        displayCover: ''
      },
      {
        id: 6,
        title: '美妆产品种草视频脚本',
        cover: '',
        likes: 3500,
        authorAvatar: '',
        authorName: '美妆控',
        isVideo: false
      }
    ];
  }
});