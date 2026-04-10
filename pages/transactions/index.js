const Api = require('../../utils/api.js');

Page({
  data: {
    transactions: [],
    loading: false
  },

  onLoad() {
    this.loadTransactions();
  },

  onPullDownRefresh() {
    this.loadTransactions().then(() => wx.stopPullDownRefresh());
  },

  async loadTransactions() {
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
      this.setData({ transactions, loading: false });
    } catch (err) {
      wx.showToast({ title: '加载失败', icon: 'none' });
      this.setData({ loading: false });
    } finally {
      wx.hideLoading();
    }
  }
});