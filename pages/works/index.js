const Api = require('../../utils/api.js');

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
    sort: 'latest',
    keyword: '',
    searchValue: '',
    activeTag: '全部',
    tags: TAG_OPTIONS,
    page: 1,
    loading: false,
    hasMore: true,
  },

  onLoad() {
    this.loadWorks();
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

  async loadWorks() {
    if (this.data.loading) return;

    this.setData({ loading: true });
    try {
      const tag = this.data.activeTag === '全部' ? '' : this.data.activeTag;
      const res = await Api.getWorks({
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
    const id = e.currentTarget.dataset.id;
    wx.navigateTo({ url: `/pages/work-detail/index?id=${id}` });
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
