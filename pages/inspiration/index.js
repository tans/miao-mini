const Api = require('../../utils/api.js');
const app = getApp();

function getVideoMaterial(materials = []) {
  return materials.find((item) => item.file_type === 'video') || null;
}

function getImageMaterial(materials = []) {
  return materials.find((item) => item.file_type === 'image') || null;
}

Page({
  data: {
    currentCategory: 'all',
    currentSort: 'default',
    inspirationList: [],
    leftColumn: [],
    rightColumn: [],
    navigating: false,
    columnWidth: 0, // 瀑布列宽度，用于计算图片真实高度
  },

  onLoad() {
    // 获取设备信息，计算瀑布列宽度
    const sysInfo = wx.getSystemInfoSync();
    const screenWidth = sysInfo.screenWidth;
    // 瀑布流容器左右各24rpx内边距，列间距24rpx
    // 每列宽度 = (屏幕宽度 - 48rpx - 24rpx) / 2
    const padding = 24 * (screenWidth / 750);
    const gap = 24 * (screenWidth / 750);
    this.data.columnWidth = (screenWidth - padding * 2 - gap) / 2;
    this.loadInspirationList();
  },

  async loadInspirationList() {
    wx.showLoading({ title: '加载中...' });
    try {
      const res = await Api.getInspirationList({
        category: this.data.currentCategory,
        sort: this.data.currentSort
      });
      const list = (res.data || []).map((item) => this.normalizeItem(item));
      this.processColumns(list);
    } catch (err) {
      // 使用模拟数据
      const mockData = this.getMockData();
      this.processColumns(mockData);
    } finally {
      wx.hideLoading();
    }
  },

  onPullDownRefresh() {
    this.loadInspirationList().finally(() => wx.stopPullDownRefresh());
  },

  processColumns(list) {
    // 瀑布流分配：根据实际图片尺寸分配到较短的列
    const leftColumn = [];
    const rightColumn = [];
    let leftHeight = 0;
    let rightHeight = 0;

    // 计算卡片高度（图片区域 + 信息区域）
    // 图片使用 aspectFill，宽度100%，高度按宽高比计算
    // 信息区域高度约100rpx（标题2行+作者信息）
    const getCardHeight = (item) => {
      const infoHeight = 100; // 信息区域高度（rpx转px）
      const infoHeightPx = infoHeight * (this.data.columnWidth / 750);

      // 使用真实图片尺寸计算图片高度
      const coverWidth = item.cover_width || 3;
      const coverHeight = item.cover_height || 4;
      const imageHeight = (this.data.columnWidth / coverWidth) * coverHeight;

      return imageHeight + infoHeightPx;
    };

    list.forEach((item) => {
      const cardHeight = getCardHeight(item);

      if (leftHeight <= rightHeight) {
        leftColumn.push(item);
        leftHeight += cardHeight;
      } else {
        rightColumn.push(item);
        rightHeight += cardHeight;
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
      const workData = this.data.inspirationList.find(item => item.id === id) || {};
      // 使用 storage 传递数据，避免 URL 长度超限
      wx.setStorageSync(`work_preview_${id}`, workData);
      wx.navigateTo({ url: `/pages/video-player/index?id=${id}` });
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

  normalizeItem(item = {}) {
    const materials = Array.isArray(item.materials) ? item.materials : [];
    const videoMaterial = getVideoMaterial(materials);
    const imageMaterial = getImageMaterial(materials);
    const isVideo = !!(item.isVideo || item.cover_type === 'video' || videoMaterial);

    return {
      ...item,
      isVideo,
      previewVideoSrc: isVideo
        ? Api.getPlayableUrl(
          item.previewVideoSrc ||
          item.video_url ||
          (videoMaterial && (videoMaterial.previewUrl || videoMaterial.file_path || videoMaterial.processed_file_path)) ||
          ''
        )
        : '',
      displayCover: Api.getDisplayUrl(
        item.displayCover ||
        item.thumbnail_path ||
        item.poster_url ||
        item.cover_url ||
        item.image ||
        (isVideo
          ? (videoMaterial && (videoMaterial.thumbnail_path || videoMaterial.poster_url || videoMaterial.file_path))
          : (imageMaterial && (imageMaterial.thumbnail_path || imageMaterial.file_path))) ||
        item.cover ||
        ''
      ),
      cover: Api.getDisplayUrl(item.cover || ''),
      authorAvatar: Api.getAvatarDisplayUrl(
        item.authorAvatar || item.creator_avatar || '',
        item.creator_id || item.creatorId || item.author_id || item.authorId || item.user_id || item.userId
      )
    };
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
