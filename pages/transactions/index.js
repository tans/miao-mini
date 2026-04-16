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
      const typeMap = {
        1: '充值',
        2: '提现',
        3: '冻结',
        4: '解冻',
        5: '任务收入',
        6: '提现',
        7: '退保证金',
        8: '平台抽成',
        9: '参与奖励',
        10: '采纳奖励',
        11: '平台收入'
      };
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