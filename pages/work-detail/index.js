const Api = require('../../utils/api.js');
const app = getApp();

Page({
  data: {
    work: null,
    materials: [],
    isLiked: false,
    liking: false,
    heroMedia: null,
    posterUrl: '',
    viewCountText: '0',
    likeCountText: '0',
    commentCountText: '0',
    detailTags: [],
    locationText: '',
  },

  onLoad(e) {
    if (e.id) {
      this.workId = e.id;
      this.loadWork(e.id);
    }
  },

  onShareAppMessage() {
    const work = this.data.work || {};
    return {
      title: work.title || work.task_title || '创意喵灵感',
      path: `/pages/work-detail/index?id=${work.id || this.workId || ''}`,
      imageUrl: this.data.posterUrl || '',
    };
  },

  async loadWork(id) {
    wx.showLoading({ title: '加载中...' });
    try {
      const res = await Api.getWork(id);
      const work = res.data || {};
      const materials = Array.isArray(work.materials) ? work.materials : [];
      const heroMedia = this.pickHeroMedia(work, materials);
      const posterUrl = this.pickPoster(work, materials, heroMedia);

      this.setData({
        work,
        materials,
        heroMedia,
        posterUrl,
        viewCountText: this.formatCount(work.views),
        likeCountText: this.formatCount(work.likes),
        commentCountText: this.formatCount(work.comments || 0),
        detailTags: Array.isArray(work.tags) ? work.tags.slice(0, 3) : [],
        locationText: this.pickLocation(work),
      });
      await this.loadLikeStatus(id);
    } catch (err) {
      wx.showToast({ title: '加载失败', icon: 'none' });
    } finally {
      wx.hideLoading();
    }
  },

  pickHeroMedia(work, materials) {
    const videoMaterial = materials.find((item) => item.file_type === 'video' && item.file_path);
    if (videoMaterial) {
      return {
        type: 'video',
        url: videoMaterial.file_path,
        thumbnail: videoMaterial.thumbnail_path || '',
      };
    }

    const imageMaterial = materials.find((item) => item.file_type === 'image' && item.file_path);
    if (imageMaterial) {
      return {
        type: 'image',
        url: imageMaterial.file_path,
        thumbnail: imageMaterial.thumbnail_path || imageMaterial.file_path,
      };
    }

    if (work.cover_type === 'video' && work.cover_url) {
      return {
        type: 'video',
        url: work.cover_url,
        thumbnail: work.thumbnail_path || '',
      };
    }

    const imageUrl = work.cover_url || work.image || '';
    return {
      type: 'image',
      url: imageUrl,
      thumbnail: imageUrl,
    };
  },

  pickPoster(work, materials, heroMedia) {
    if (heroMedia && heroMedia.thumbnail) return heroMedia.thumbnail;
    if (work.thumbnail_path) return work.thumbnail_path;
    const imageMaterial = materials.find((item) => item.file_type === 'image' && item.file_path);
    return imageMaterial ? imageMaterial.file_path : (work.cover_url || work.image || '');
  },

  async loadLikeStatus(id) {
    if (!app.isLoggedIn()) {
      await app.silentLogin();
    }
    if (!app.isLoggedIn()) {
      this.setData({ isLiked: false });
      return;
    }
    try {
      const res = await Api.getWorkLikeStatus(id);
      this.setData({ isLiked: !!(res.data && res.data.is_liked) });
    } catch (err) {
      this.setData({ isLiked: false });
    }
  },

  async toggleLike() {
    const { work, isLiked, liking } = this.data;
    if (!work || !work.id || liking) return;

    if (!app.isLoggedIn()) {
      await app.silentLogin();
    }
    if (!app.isLoggedIn()) {
      wx.showToast({ title: '请先登录', icon: 'none' });
      return;
    }

    this.setData({ liking: true });
    try {
      const res = isLiked ? await Api.unlikeWork(work.id) : await Api.likeWork(work.id);
      const likes = res.data && typeof res.data.likes === 'number' ? res.data.likes : (work.likes || 0);
      this.setData({
        isLiked: !!(res.data && res.data.is_liked),
        work: { ...work, likes },
        likeCountText: this.formatCount(likes),
      });
    } catch (err) {
      wx.showToast({ title: err.message || '操作失败', icon: 'none' });
    } finally {
      this.setData({ liking: false });
    }
  },

  previewMaterial(e) {
    const url = e.currentTarget.dataset.url;
    if (!url) return;
    wx.previewImage({ urls: [url], current: url });
  },

  goBack() {
    if (getCurrentPages().length > 1) {
      wx.navigateBack();
      return;
    }
    wx.switchTab({ url: '/pages/works/index' });
  },

  formatCount(value) {
    const count = Number(value || 0);
    if (count >= 10000) {
      return `${(count / 10000).toFixed(1).replace(/\.0$/, '')}w`;
    }
    return String(count);
  },

  pickLocation(work = {}) {
    if (Array.isArray(work.tags) && work.tags.length) {
      return work.tags[0];
    }
    return '创意喵灵感';
  },
});
