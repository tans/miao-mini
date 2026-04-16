const Api = require('../../utils/api.js');
const app = getApp();

Page({
  data: {
    feedItems: [],
    currentIndex: 0,
    loading: false,
    loadingMore: false,
    hasMore: true,
    page: 1,
    navTop: 56,
    pageSideInset: 12,
    overlayBottom: 0,
    leftActionInset: 10,
    rightActionInset: 8,
  },

  onLoad(e) {
    this.mediaTapTimer = null;
    this.mediaTapAt = 0;
    this.likeBurstTimer = null;
    this.setupViewportLayout();
    this.workId = Number(e.id || 0);
    this.videoContexts = {};
    if (this.workId) {
      this.bootstrapFeed(this.workId);
    }
  },

  onUnload() {
    this.clearMediaTapTimer();
    this.clearLikeBurstTimer();
    this.pauseAllVideos();
  },

  onShareAppMessage() {
    const current = this.getCurrentItem();
    return {
      title: current?.title || current?.task_title || '创意喵灵感',
      path: `/pages/work-detail/index?id=${current?.id || this.workId || ''}`,
      imageUrl: current?.posterUrl || '',
    };
  },

  setupViewportLayout() {
    let navTop = 8;
    let pageSideInset = 12;
    let overlayBottom = 0;
    let leftActionInset = 10;
    let rightActionInset = 8;

    try {
      const windowInfo = wx.getWindowInfo ? wx.getWindowInfo() : wx.getSystemInfoSync();

      const windowWidth = Number(windowInfo.windowWidth || 375);

      pageSideInset = Math.max(10, Math.round(windowWidth * 0.032));
      overlayBottom = Math.max(0, Math.round(windowWidth * 0.006));
      leftActionInset = 10;
      rightActionInset = 8;
    } catch (err) {}

    this.setData({
      navTop,
      pageSideInset,
      overlayBottom,
      leftActionInset,
      rightActionInset,
    });
  },

  clearMediaTapTimer() {
    if (this.mediaTapTimer) {
      clearTimeout(this.mediaTapTimer);
      this.mediaTapTimer = null;
    }
    this.mediaTapAt = 0;
  },

  clearLikeBurstTimer() {
    if (this.likeBurstTimer) {
      clearTimeout(this.likeBurstTimer);
      this.likeBurstTimer = null;
    }
  },

  async bootstrapFeed(id) {
    this.setData({ loading: true });
    wx.showLoading({ title: '加载中...' });
    try {
      const currentRes = await Api.getWork(id);
      const currentWork = this.normalizeWork(currentRes.data || {});

      const listRes = await Api.getWorks({ sort: 'latest', page: 1, limit: 10 });
      const list = (listRes.data?.data || []).map((item) => this.normalizeWork(item));

      const merged = this.mergeFeed(currentWork, list);
      const currentIndex = Math.max(0, merged.findIndex((item) => item.id === currentWork.id));

      this.setData({
        feedItems: merged,
        currentIndex,
        hasMore: (listRes.data?.data || []).length >= 10,
        page: 1,
        loading: false,
      });

      await this.ensureLikeStatus(merged[currentIndex], currentIndex);
      setTimeout(() => this.playCurrentVideo(), 80);
    } catch (err) {
      this.setData({ loading: false });
      wx.showToast({ title: '加载失败', icon: 'none' });
    } finally {
      wx.hideLoading();
    }
  },

  mergeFeed(currentWork, list) {
    const merged = [];
    const seen = new Set();
    [currentWork, ...list].forEach((item) => {
      if (!item || !item.id || seen.has(item.id)) return;
      seen.add(item.id);
      merged.push(item);
    });
    return merged;
  },

  normalizeWork(work = {}) {
    const materials = Array.isArray(work.materials) ? work.materials : [];
    const heroMedia = this.pickHeroMedia(work, materials);
    const posterUrl = this.pickPoster(work, materials, heroMedia);
    const tags = Array.isArray(work.tags) ? work.tags.slice(0, 3) : [];
    const comments = Number(work.comments || 0);

    return {
      ...work,
      materials,
      heroMedia,
      posterUrl,
      detailTags: tags,
      locationText: tags[0] || '',
      likeCountText: this.formatCount(work.likes),
      viewCountText: this.formatCount(work.views),
      commentCountText: this.formatCount(comments),
      isLiked: !!work.is_liked,
      paused: false,
      showLikeBurst: false,
    };
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
      type: imageUrl ? 'image' : '',
      url: imageUrl,
      thumbnail: imageUrl,
    };
  },

  pickPoster(work, materials, heroMedia) {
    if (heroMedia?.thumbnail) return heroMedia.thumbnail;
    if (work.thumbnail_path) return work.thumbnail_path;
    const imageMaterial = materials.find((item) => item.file_type === 'image' && item.file_path);
    return imageMaterial ? imageMaterial.file_path : (work.cover_url || work.image || '');
  },

  getCurrentItem() {
    return this.data.feedItems[this.data.currentIndex] || null;
  },

  getVideoContext(id) {
    if (!id) return null;
    if (!this.videoContexts[id]) {
      this.videoContexts[id] = wx.createVideoContext(`feed-video-${id}`, this);
    }
    return this.videoContexts[id];
  },

  pauseAllVideos() {
    (this.data.feedItems || []).forEach((item) => {
      if (item.heroMedia?.type === 'video') {
        const ctx = this.getVideoContext(item.id);
        if (ctx) ctx.pause();
      }
    });
  },

  playCurrentVideo() {
    const current = this.getCurrentItem();
    if (!current || current.heroMedia?.type !== 'video') return;
    const ctx = this.getVideoContext(current.id);
    if (ctx) {
      ctx.play();
      this.updateFeedItem(this.data.currentIndex, { paused: false });
    }
  },

  async ensureLikeStatus(item, index) {
    if (!item || !item.id) return;
    if (!app.isLoggedIn()) {
      await app.silentLogin();
    }
    if (!app.isLoggedIn()) return;
    try {
      const res = await Api.getWorkLikeStatus(item.id);
      this.updateFeedItem(index, { isLiked: !!(res.data && res.data.is_liked) });
    } catch (err) {}
  },

  updateFeedItem(index, patch) {
    if (index < 0) return;
    const key = `feedItems[${index}]`;
    const next = { ...this.data.feedItems[index], ...patch };
    this.setData({ [key]: next });
  },

  async toggleLike() {
    const index = this.data.currentIndex;
    const current = this.getCurrentItem();
    if (!current || !current.id) return;

    if (!app.isLoggedIn()) {
      await app.silentLogin();
    }
    if (!app.isLoggedIn()) {
      wx.showToast({ title: '请先登录', icon: 'none' });
      return;
    }

    try {
      const res = current.isLiked ? await Api.unlikeWork(current.id) : await Api.likeWork(current.id);
      const likes = res.data && typeof res.data.likes === 'number' ? res.data.likes : (current.likes || 0);
      this.updateFeedItem(index, {
        isLiked: !!(res.data && res.data.is_liked),
        likes,
        likeCountText: this.formatCount(likes),
      });
    } catch (err) {
      wx.showToast({ title: err.message || '操作失败', icon: 'none' });
    }
  },

  handleMediaTap() {
    const current = this.getCurrentItem();
    if (!current || current.heroMedia?.type !== 'video') return;

    const now = Date.now();
    if (this.mediaTapTimer) {
      clearTimeout(this.mediaTapTimer);
      this.mediaTapTimer = null;
    }

    if (this.mediaTapAt && now - this.mediaTapAt < 280) {
      this.mediaTapAt = 0;
      this.likeFromGesture();
      return;
    }

    this.mediaTapAt = now;
    this.mediaTapTimer = setTimeout(() => {
      this.mediaTapTimer = null;
      this.mediaTapAt = 0;
      this.togglePlay();
    }, 220);
  },

  async likeFromGesture() {
    const index = this.data.currentIndex;
    const current = this.getCurrentItem();
    if (!current || !current.id) return;

    if (current.isLiked) {
      this.showLikeBurst();
      return;
    }

    if (!app.isLoggedIn()) {
      await app.silentLogin();
    }
    if (!app.isLoggedIn()) return;

    try {
      const res = await Api.likeWork(current.id);
      const likes = res.data && typeof res.data.likes === 'number' ? res.data.likes : (current.likes || 0);
      this.updateFeedItem(index, {
        isLiked: true,
        likes,
        likeCountText: this.formatCount(likes),
      });
      this.showLikeBurst();
    } catch (err) {}
  },

  showLikeBurst() {
    const index = this.data.currentIndex;
    const current = this.getCurrentItem();
    if (!current || current.heroMedia?.type !== 'video') return;

    this.clearLikeBurstTimer();
    this.updateFeedItem(index, { showLikeBurst: true });
    this.likeBurstTimer = setTimeout(() => {
      this.updateFeedItem(index, { showLikeBurst: false });
      this.likeBurstTimer = null;
    }, 520);
  },

  togglePlay() {
    const index = this.data.currentIndex;
    const current = this.getCurrentItem();
    if (!current || current.heroMedia?.type !== 'video') return;
    const ctx = this.getVideoContext(current.id);
    if (!ctx) return;

    if (current.paused) {
      ctx.play();
      this.updateFeedItem(index, { paused: false });
    } else {
      ctx.pause();
      this.updateFeedItem(index, { paused: true });
    }
  },

  handleSwiperChange(e) {
    const currentIndex = Number(e.detail.current || 0);
    if (currentIndex === this.data.currentIndex) return;

    this.clearMediaTapTimer();
    this.clearLikeBurstTimer();
    this.pauseAllVideos();
    this.setData({ currentIndex });
    this.ensureLikeStatus(this.data.feedItems[currentIndex], currentIndex);
    setTimeout(() => this.playCurrentVideo(), 60);

    if (currentIndex >= this.data.feedItems.length - 3) {
      this.loadMoreWorks();
    }
  },

  async loadMoreWorks() {
    if (this.data.loadingMore || !this.data.hasMore) return;
    this.setData({ loadingMore: true });
    try {
      const nextPage = this.data.page + 1;
      const res = await Api.getWorks({ sort: 'latest', page: nextPage, limit: 10 });
      const incoming = (res.data?.data || []).map((item) => this.normalizeWork(item));
      const exists = new Set(this.data.feedItems.map((item) => item.id));
      const appended = incoming.filter((item) => item.id && !exists.has(item.id));

      this.setData({
        feedItems: [...this.data.feedItems, ...appended],
        page: nextPage,
        hasMore: incoming.length >= 10,
        loadingMore: false,
      });
    } catch (err) {
      this.setData({ loadingMore: false });
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
});
