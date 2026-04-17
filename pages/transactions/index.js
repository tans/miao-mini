const Api = require('../../utils/api.js');
const { formatDateTime } = require('../../utils/util.js');
const app = getApp();

Page({
  data: {
    transactions: [],
    loading: false
  },

  onLoad() {
    if (!app.isLoggedIn()) {
      app.silentLogin().then(() => {
        if (app.isLoggedIn()) this.loadTransactions();
      });
      return;
    }
    this.loadTransactions();
  },

  onPullDownRefresh() {
    this.loadTransactions().then(() => wx.stopPullDownRefresh());
  },

  async loadTransactions() {
    if (this.data.loading) return;
    this.setData({ loading: true });
    wx.showLoading({ title: '加载中...' });
    try {
      const res = await Api.getTransactions();
      const transData = res.data && res.data.transactions || [];
      // 使用服务器返回的 type_str，不再前端硬编码映射
      const transactions = transData.map(t => ({
        ...t,
        type_text: t.type_str || '其他'
      }));
      this.setData({ transactions });
    } catch (err) {
      wx.showToast({ title: '加载失败', icon: 'none' });
    } finally {
      this.setData({ loading: false });
      wx.hideLoading();
    }
  },

  formatDateTime(dateStr) {
    return formatDateTime(dateStr);
  }
});
