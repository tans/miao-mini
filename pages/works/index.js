const Api = require('../../utils/api.js');
const app = getApp();

const TAG_OPTIONS = [
  '全部',
  '餐饮美食',
  '酒店民宿',
  '本地生活',
  '房产家居',
  '家居家电',
  '服饰穿搭',
  '美妆护肤',
  '母婴亲子',
  '数码科技',
  '教育培训',
  '汽车服务',
  '医疗健康',
  '金融理财',
  '企业商务',
  '电商零售',
  '其他行业',
];

const COVER_THEME_COUNT = 6;
const SEARCH_BAR_TOGGLE_DISTANCE = 36;
const SEARCH_BAR_SHOW_AT_TOP = 24;

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
    worksMode: 'public',
    worksModeLabel: '灵感',
    sort: 'latest',
    keyword: '',
    searchValue: '',
    searchBarHidden: false,
    activeTag: '全部',
    tags: TAG_OPTIONS,
    page: 1,
    loading: false,
    hasMore: true,
  },

  onLoad() {
    this.navigating = false;
    this._resetSearchBarScrollState();
  },

  onShow() {
    const nextMode = app.getWorksMode ? app.getWorksMode() : 'public';
    const worksMode = nextMode === 'adopted' ? 'adopted' : 'public';
    const worksModeLabel = worksMode === 'adopted' ? '采纳作品库' : '灵感';
    const modeChanged = worksMode !== this.data.worksMode;

    this.setData({ worksMode, worksModeLabel });
    if (modeChanged || this.data.works.length === 0) {
      this.resetAndLoad();
    }
  },

  onPageScroll(e) {
    const scrollTop = Math.max((e && e.scrollTop) || 0, 0);

    if (scrollTop <= SEARCH_BAR_SHOW_AT_TOP) {
      if (this.data.searchBarHidden) {
        this.setData({ searchBarHidden: false });
      }
      this._resetSearchBarScrollState(scrollTop);
      return;
    }

    const delta = scrollTop - this._lastScrollTop;
    this._lastScrollTop = scrollTop;

    if (Math.abs(delta) < 2) {
      return;
    }

    const direction = delta > 0 ? 'down' : 'up';
    if (direction !== this._scrollDirection) {
      this._scrollDirection = direction;
      this._scrollAnchorTop = scrollTop;
      return;
    }

    const travelled = Math.abs(scrollTop - this._scrollAnchorTop);
    if (travelled < SEARCH_BAR_TOGGLE_DISTANCE) {
      return;
    }

    if (direction === 'down' && !this.data.searchBarHidden) {
      this.setData({ searchBarHidden: true });
      this._scrollAnchorTop = scrollTop;
      return;
    }

    if (direction === 'up' && this.data.searchBarHidden) {
      this.setData({ searchBarHidden: false });
      this._scrollAnchorTop = scrollTop;
    }
  },

  onPullDownRefresh() {
    this.resetAndLoad().then(() => wx.stopPullDownRefresh());
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

  onSearchInput(e) {
    this.setData({ searchValue: e.detail.value });
  },

  onSearchConfirm() {
    const keyword = (this.data.searchValue || '').trim();
    this.setData({ keyword });
    this.resetAndLoad();
  },

  clearSearch() {
    if (!this.data.searchValue && !this.data.keyword) return;
    this.setData({ searchValue: '', keyword: '' });
    this.resetAndLoad();
  },

  _resetSearchBarScrollState(scrollTop = 0) {
    this._lastScrollTop = scrollTop;
    this._scrollAnchorTop = scrollTop;
    this._scrollDirection = '';
  },

  switchTag(e) {
    const activeTag = e.currentTarget.dataset.tag;
    if (!activeTag || activeTag === this.data.activeTag) return;
    this.setData({ activeTag });
    this.resetAndLoad();
  },

  switchSort(e) {
    const sort = e.currentTarget.dataset.sort;
    if (!sort || sort === this.data.sort) return;
    this.setData({ sort });
    this.resetAndLoad();
  },

  switchWorksMode() {
    const nextMode = this.data.worksMode === 'adopted' ? 'public' : 'adopted';
    if (app.setWorksMode) {
      app.setWorksMode(nextMode);
    }
    this.setData({
      worksMode: nextMode,
      worksModeLabel: nextMode === 'adopted' ? '采纳作品库' : '灵感',
      searchValue: '',
      keyword: '',
      activeTag: '全部',
      sort: 'latest',
    });
    this.resetAndLoad();
  },

  async loadWorks() {
    if (this.data.loading) return;

    this.setData({ loading: true });
    try {
      const tag = this.data.activeTag === '全部' ? '' : this.data.activeTag;
      const requestApi = this.data.worksMode === 'adopted' ? Api.getBusinessWorks.bind(Api) : Api.getWorks.bind(Api);
      const res = await requestApi({
        sort: this.data.sort,
        keyword: this.data.keyword,
        tag,
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
      url: `/pages/work-detail/index?id=${id}&mode=${this.data.worksMode}`,
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
