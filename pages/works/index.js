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

function getVideoMaterial(materials = []) {
  return materials.find((item) => item.file_type === 'video') || null;
}

function getImageMaterial(materials = []) {
  return materials.find((item) => item.file_type === 'image') || null;
}

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
    pageTitle: '灵感',
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
    if (this.data.works.length === 0) {
      this.resetAndLoad();
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

  async loadWorks() {
    if (this.data.loading) return;

    this.setData({ loading: true });
    try {
      const tag = this.data.activeTag === '全部' ? '' : this.data.activeTag;
      const res = await Api.getInspirationList({
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
    const isVideo = e.currentTarget.dataset.isVideo;
    if (!id) return;

    const work = this.data.works.find(w => w.id === id);
    if (!work) return;

    // 视频作品跳转详情页
    if (isVideo) {
      wx.setStorageSync(`work_preview_${id}`, work);
      wx.navigateTo({ url: `/pages/inspiration-detail/index?id=${id}` });
      return;
    }

    this.navigating = true;
    // 使用 storage 传递数据，避免 URL 长度超限
    wx.setStorageSync(`work_preview_${id}`, work);
    wx.navigateTo({ url: `/pages/video-player/index?id=${id}` });
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

  normalizeWork(item = {}) {
    const materials = Array.isArray(item.materials) ? item.materials : [];
    const firstMaterial = materials[0] || null;
    const videoMaterial = getVideoMaterial(materials);
    const imageMaterial = getImageMaterial(materials);
    const coverType = item.cover_type || (videoMaterial ? 'video' : '') || (imageMaterial ? 'image' : 'image');
    const previewVideoSrc = coverType === 'video'
      ? Api.getPlayableUrl(
        item.video_url ||
        item.previewVideoSrc ||
        (videoMaterial && (videoMaterial.previewUrl || videoMaterial.file_path || videoMaterial.processed_file_path)) ||
        ''
      )
      : Api.getDisplayUrl(item.cover_url || item.image || imageMaterial && imageMaterial.file_path || firstMaterial && firstMaterial.file_path || '');

    let displayCover = '';
    if (coverType === 'video') {
      displayCover = Api.getDisplayUrl(
        item.thumbnail_path ||
        item.poster_url ||
        (videoMaterial && (videoMaterial.thumbnail_path || videoMaterial.poster_url)) ||
        ''
      );
    } else {
      displayCover = Api.getDisplayUrl(
        item.cover_url ||
        item.image ||
        item.thumbnail_path ||
        (imageMaterial && (imageMaterial.thumbnail_path || imageMaterial.file_path)) ||
        (firstMaterial && (firstMaterial.thumbnail_path || firstMaterial.file_path)) ||
        ''
      );
    }

    const fallbackCover = createFallbackCover(
      `${item.id || ''}-${item.title || ''}`,
      item.content || item.title || ''
    );
    const creatorAvatar = Api.getAvatarDisplayUrl(
      item.creator_avatar || item.authorAvatar || '',
      item.creator_id || item.creatorId || item.author_id || item.authorId || item.user_id || item.userId
    );

    return {
      ...item,
      coverType,
      isVideo: coverType === 'video',
      displayCover,
      previewVideoSrc,
      likesCount: Number(item.likes || 0),
      creator_avatar: creatorAvatar,
      authorAvatar: creatorAvatar,
      fallbackThemeClass: fallbackCover.themeClass,
      fallbackSummary: fallbackCover.summary,
    };
  },
});
