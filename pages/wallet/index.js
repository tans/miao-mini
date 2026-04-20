// pages/wallet/index.js
const Api = require('../../utils/api.js');
const app = getApp();

Page({
  data: {
    balance: 0,
    frozenAmount: 0,
    marginFrozen: 0,
    totalIncome: 0,
    transactions: [],
    loading: false,
  },

  onLoad() {
    if (!app.isLoggedIn()) {
      app.silentLogin().then(() => {
        if (app.isLoggedIn()) this.loadWallet();
      });
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
      // 使用服务器返回的 type_str，不再前端硬编码映射
      const transactions = (transData.data || []).map(t => ({
        ...t,
        type_text: t.type_str || '其他'
      }));

      this.setData({
        balance: wallet.balance || 0,
        frozenAmount: wallet.frozen_amount || 0,
        marginFrozen: wallet.margin_frozen || 0,
        totalIncome: wallet.total_income || 0,
        transactions,
      });
    } catch (err) {
      wx.showToast({ title: '加载失败', icon: 'none' });
    } finally {
      wx.hideLoading();
      this.setData({ loading: false });
    }
  }
});