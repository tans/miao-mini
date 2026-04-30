const Api = require('../../../utils/api.js');
const { formatDateTime } = require('../../../utils/util.js');
const app = getApp();

const COVER_THEME_COUNT = 6;

function createFallbackCover(seedText, description) {
  const text = (description || seedText || '').replace(/\s+/g, ' ').trim();
  let hash = 0;
  const source = seedText || text || 'miao';
  for (let i = 0; i < source.length; i += 1) {
    hash = (hash * 31 + source.charCodeAt(i)) >>> 0;
  }

  return {
    themeClass: `cover-theme-${hash % COVER_THEME_COUNT}`,
    summary: (text || '创作说明').slice(0, 34),
  };
}

Page({
  data: {
    works: [],
    pageTitle: '已购作品库',
    sort: 'latest',
    page: 1,
    loading: false,
    hasMore: true,
  },

  onLoad() {
    this.navigating = false;
    this.initialized = false;
  },

  onShow() {
    this.bootstrap();
  },

  onPullDownRefresh() {
    this.bootstrap(true).finally(() => wx.stopPullDownRefresh());
  },

  onReachBottom() {
    if (!this.data.loading && this.data.hasMore) {
      this.setData({ page: this.data.page + 1 });
      this.loadWorks();
    }
  },

  async resetAndLoad() {
    this.setData({ works: [], page: 1, hasMore: true });
    await this.loadWorks();
  },

  switchSort(e) {
    const sort = e.currentTarget.dataset.sort;
    if (!sort || sort === this.data.sort) return;
    this.setData({ sort });
    this.resetAndLoad();
  },

  async bootstrap(force = false) {
    if (this.initialized && !force) return;
    const loggedIn = await this.ensureLogin();
    if (!loggedIn) {
      wx.showToast({ title: '请先登录', icon: 'none' });
      return;
    }
    this.initialized = true;
    if (force || this.data.works.length === 0) {
      await this.resetAndLoad();
    }
  },

  async ensureLogin() {
    if (app.isLoggedIn()) return true;
    await app.silentLogin();
    return app.isLoggedIn();
  },

  async loadWorks() {
    if (this.data.loading) return;

    this.setData({ loading: true });
    try {
      const res = await Api.getBusinessWorks({
        sort: this.data.sort,
        page: this.data.page,
        limit: 20,
      });
      const payload = res.data || {};
      const newWorks = (payload.data || []).map((item) => this.normalizeWork(item));
      this.setData({
        works: this.data.page === 1 ? newWorks : [...this.data.works, ...newWorks],
        hasMore: newWorks.length >= 20,
        loading: false,
      });
    } catch (err) {
      this.setData({ loading: false });
      wx.showToast({ title: '加载失败', icon: 'none' });
    }
  },

  goWorkDetail(e) {
    if (this.navigating) return;
    const id = e.currentTarget.dataset.id;
    if (!id) return;
    this.navigating = true;
    const workData = encodeURIComponent(JSON.stringify(this.data.works.find(w => w.id === id) || {}));
    wx.navigateTo({ url: `/pages/video-player/index?data=${workData}` });
    setTimeout(() => {
      this.navigating = false;
    }, 400);
  },

  noop() {},

  goBack() {
    wx.navigateBack({ fail: () => wx.switchTab({ url: '/pages/home/index' }) });
  },

  downloadWorkMaterial(e) {
    const url = e.currentTarget.dataset.url;
    const type = e.currentTarget.dataset.type || '';
    if (!url) {
      wx.showToast({ title: '暂无可下载素材', icon: 'none' });
      return;
    }

    wx.showLoading({ title: '下载中...' });
    wx.downloadFile({
      url,
      success: (res) => {
        if (res.statusCode !== 200) {
          wx.hideLoading();
          wx.showToast({ title: '下载失败', icon: 'none' });
          return;
        }

        if (type === 'image' && wx.saveImageToPhotosAlbum) {
          wx.saveImageToPhotosAlbum({
            filePath: res.tempFilePath,
            success: () => {
              wx.hideLoading();
              wx.showToast({ title: '已保存到相册', icon: 'success' });
            },
            fail: () => this.fallbackOpenDownloadedFile(res.tempFilePath),
          });
          return;
        }

        if (type === 'video' && wx.saveVideoToPhotosAlbum) {
          wx.saveVideoToPhotosAlbum({
            filePath: res.tempFilePath,
            success: () => {
              wx.hideLoading();
              wx.showToast({ title: '已保存到相册', icon: 'success' });
            },
            fail: () => this.fallbackOpenDownloadedFile(res.tempFilePath),
          });
          return;
        }

        this.fallbackOpenDownloadedFile(res.tempFilePath);
      },
      fail: () => {
        wx.hideLoading();
        wx.showToast({ title: '下载失败', icon: 'none' });
      },
    });
  },

  fallbackOpenDownloadedFile(filePath) {
    wx.openDocument({
      filePath,
      showMenu: true,
      success: () => {
        wx.hideLoading();
        wx.showToast({ title: '已打开', icon: 'success' });
      },
      fail: () => {
        wx.hideLoading();
        wx.showToast({ title: '下载失败', icon: 'none' });
      },
    });
  },

  formatDateTime(value) {
    return formatDateTime(value) || '暂无';
  },

  normalizeWork(item = {}) {
    const materials = Array.isArray(item.materials) ? item.materials : [];
    const firstMaterial = materials[0] || null;
    const coverType = item.cover_type || (firstMaterial && firstMaterial.file_type) || 'image';
    const previewVideoSrc =
      item.cover_url ||
      item.image ||
      (firstMaterial && firstMaterial.file_path) ||
      '';

    let displayCover = '';
    if (coverType === 'video') {
      displayCover =
        item.thumbnail_path ||
        item.poster_url ||
        (firstMaterial && firstMaterial.thumbnail_path) ||
        '';
    } else {
      displayCover =
        item.cover_url ||
        item.image ||
        item.thumbnail_path ||
        (firstMaterial && (firstMaterial.thumbnail_path || firstMaterial.file_path)) ||
        '';
    }

    const fallbackCover = createFallbackCover(
      `${item.id || ''}-${item.title || ''}`,
      item.content || item.title || ''
    );
    const adoptedAt =
      item.review_at ||
      item.accepted_at ||
      item.adopted_at ||
      item.published_at ||
      item.updated_at ||
      item.created_at ||
      '';

    return {
      ...item,
      materials,
      coverType,
      isVideo: coverType === 'video',
      displayCover,
      previewVideoSrc,
      likesCount: Number(item.likes || 0),
      materialCount: materials.length,
      downloadUrl: (firstMaterial && firstMaterial.file_path) || previewVideoSrc || displayCover || '',
      downloadType: (firstMaterial && firstMaterial.file_type) || coverType,
      adoptedAtText: this.formatDateTime(adoptedAt),
      fallbackThemeClass: fallbackCover.themeClass,
      fallbackSummary: fallbackCover.summary,
    };
  },
});
