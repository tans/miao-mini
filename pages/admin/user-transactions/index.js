const Api = require('../../../utils/api');

Page({
  data: {
    userId: null,
    transactions: [],
    loading: false,
    page: 1,
    limit: 20,
    hasMore: true,
    total: 0,
  },

  onLoad(options) {
    if (options.id) {
      this.setData({ userId: parseInt(options.id, 10) });
      this.loadTransactions();
    }
  },

  onPullDownRefresh() {
    this.refreshTransactions();
  },

  refreshTransactions() {
    this.setData({ page: 1, transactions: [], hasMore: true });
    this.loadTransactions();
  },

  loadTransactions() {
    if (this.data.loading || !this.data.hasMore) return;

    this.setData({ loading: true });

    Api.getAdminUserTransactions(this.data.userId, {
      limit: this.data.limit,
      offset: (this.data.page - 1) * this.data.limit,
    })
      .then((res) => {
        const data = res.data || {};
        const transactions = data.transactions || [];
        this.setData({
          transactions: this.data.page === 1 ? transactions : [...this.data.transactions, ...transactions],
          total: data.total || 0,
          hasMore: transactions.length >= this.data.limit,
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

  onReachBottom() {
    this.loadTransactions();
  },

  getTypeName(type) {
    const types = {
      1: '充值',
      2: '消费',
      3: '冻结',
      4: '解冻',
      5: '奖励',
      6: '提现',
      7: '退保证金',
      8: '抽成',
    };
    return types[type] || '未知';
  },

  formatTime(timeStr) {
    if (!timeStr) return '';
    const date = new Date(timeStr);
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
  },
});