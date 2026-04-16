const Api = require('../../utils/api.js');
const app = getApp();

Page({
  data: {
    work: null,
    materials: [],
    isLiked: false,
    liking: false
  },

  onLoad(e) {
    if (e.id) {
      this.loadWork(e.id);
    }
  },

  async loadWork(id) {
    wx.showLoading({ title: '加载中...' });
    try {
      const res = await Api.getWork(id);
      const work = res.data;
      this.setData({
        work,
        materials: work.materials || []
      });
      await this.loadLikeStatus(id);
    } catch (err) {
      wx.showToast({ title: '加载失败', icon: 'none' });
    } finally {
      wx.hideLoading();
    }
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
        work: { ...work, likes }
      });
    } catch (err) {
      wx.showToast({ title: err.message || '操作失败', icon: 'none' });
    } finally {
      this.setData({ liking: false });
    }
  },

  previewMaterial(e) {
    const url = e.currentTarget.dataset.url;
    wx.previewImage({ urls: [url], current: url });
  }
});
