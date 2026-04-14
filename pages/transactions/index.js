const Api = require('../../utils/api.js');
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
      const typeMap = { 1: '充值', 2: '提现', 3: '任务收入', 4: '冻结', 5: '解冻' };
      const transactions = transData.map(t => ({
        ...t,
        type_text: typeMap[t.type] || '其他'
      }));
      this.setData({ transactions });
    } catch (err) {
      wx.showToast({ title: '加载失败', icon: 'none' });
    } finally {
      this.setData({ loading: false });
      wx.hideLoading();
    }
  }
});