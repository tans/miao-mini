const Api = require('../../utils/api.js');
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
    pageTitle: '作品仓库',
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
    wx.navigateTo({
      url: `/pages/work-detail/index?id=${id}&mode=adopted`,
      complete: () => {
        setTimeout(() => {
          this.navigating = false;
        }, 400);
      },
    });
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

    return {
      ...item,
      coverType,
      isVideo: coverType === 'video',
      displayCover,
      previewVideoSrc,
      likesCount: Number(item.likes || 0),
      fallbackThemeClass: fallbackCover.themeClass,
      fallbackSummary: fallbackCover.summary,
    };
  },
});
