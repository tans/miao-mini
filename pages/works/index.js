const Api = require('../../utils/api.js');

const TAG_OPTIONS = [
  '全部',
  '探店',
  '口播',
  '剧情',
  '种草',
  '服饰',
  '美妆',
  '餐饮',
  '模板',
];

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

    return {
      ...item,
      coverType,
      isVideo: coverType === 'video',
      displayCover,
      likesCount: Number(item.likes || 0),
    };
  },
});
