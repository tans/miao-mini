const Api = require('../../../utils/api');

Page({
  data: {
    users: [],
    loading: false,
    search: '',
    page: 1,
    pageSize: 20,
    hasMore: true,
  },

  onLoad() {
    this.loadUsers();
  },

  onShow() {
    // Refresh on show to catch changes
    if (this.data.users.length > 0) {
      this.refreshUsers();
    }
  },

  onPullDownRefresh() {
    this.refreshUsers();
  },

  refreshUsers() {
    this.setData({ page: 1, users: [], hasMore: true });
    this.loadUsers();
  },

  loadUsers() {
    if (this.data.loading || !this.data.hasMore) return;

    this.setData({ loading: true });

    Api.getAdminUsers({
      page: this.data.page,
      page_size: this.data.pageSize,
      search: this.data.search,
    })
      .then((res) => {
        const data = res.data || {};
        const users = data.users || [];
        this.setData({
          users: this.data.page === 1 ? users : [...this.data.users, ...users],
          hasMore: users.length >= this.data.pageSize,
          page: this.data.page + 1,
          loading: false,
        });
        wx.stopPullDownRefresh();
      })
      .catch(() => {
        this.setData({ loading: false });
        wx.stopPullDownRefresh();
      });
  },

  onSearch(e) {
    const search = e.detail.value || '';
    this.setData({ search, page: 1, users: [], hasMore: true });
    this.loadUsers();
  },

  onUserTap(e) {
    const { id } = e.currentTarget.dataset;
    wx.navigateTo({
      url: `/pages/admin/user-detail/index?id=${id}`,
    });
  },

  onReachBottom() {
    this.loadUsers();
  },
});