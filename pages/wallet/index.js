// pages/wallet/index.js
const Api = require('../../utils/api.js');
const app = getApp();

Page({
  data: {
    balance: 0,
    totalIncome: 0,
    transactions: [],
    loading: false,
  },

  onLoad() {
    if (!app.isLoggedIn()) {
      wx.navigateTo({ url: '/pages/login/index' });
      return;
    }
  },

  onShow() {
    if (app.isLoggedIn() && !this.data.loading) {
      this.loadWallet();
    }
  },

  async loadWallet() {
    if (this.data.loading) return;
    this.setData({ loading: true });
    wx.showLoading({ title: '加载中...' });
    try {
      const [walletRes, transRes] = await Promise.all([
        Api.getWallet(),
        Api.getTransactions()
      ]);

      const wallet = walletRes.data || {};
      const transData = transRes.data || {};
      const transactions = (transData.transactions || []).map(t => ({
        ...t,
        type_text: this.getTransTypeText(t.type)
      }));

      this.setData({
        balance: wallet.balance || 0,
        totalIncome: wallet.total_income || 0,
        transactions,
      });
    } catch (err) {
      wx.showToast({ title: '加载失败', icon: 'none' });
    } finally {
      wx.hideLoading();
      this.setData({ loading: false });
    }
  },

  getTransTypeText(type) {
    const map = { 1: '充值', 2: '提现', 3: '任务收入', 4: '冻结', 5: '解冻' };
    return map[type] || '其他';
  }
});
