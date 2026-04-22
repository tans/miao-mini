const Api = require('../../utils/api.js');
const app = getApp();

Page({
  data: {
    balance: 0,
    balanceDisplay: '0.00',
    frozenAmount: 0,
    withdrawableAmount: '0.00',
    totalIncome: 0,
    transactions: [],
    filteredTransactions: [],
    currentTab: 'all',
    tabIndicatorLeft: '32rpx',
    loading: false,
  },

  onLoad() {
    if (!app.isLoggedIn()) {
      app.silentLogin().then(() => {
        if (app.isLoggedIn()) this.loadWallet();
      });
      return;
    }
    this.loadWallet();
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
      const transactions = (transData.data || []).map(t => ({
        ...t,
        type_text: t.type_str || '其他',
        amountDisplay: Math.abs(t.amount).toFixed(2),
        fee: t.fee || 0
      }));

      const balance = wallet.balance || 0;
      const frozenAmount = wallet.frozen_amount || 0;
      const withdrawableAmount = Math.max(0, balance - frozenAmount);

      this.setData({
        balance: wallet.balance || 0,
        balanceDisplay: Number(wallet.balance || 0).toLocaleString('zh-CN', { minimumFractionDigits: 2 }),
        frozenAmount: frozenAmount.toFixed(2),
        withdrawableAmount: withdrawableAmount,
        totalIncome: wallet.total_income || 0,
        transactions,
        loading: false,
      });
    } catch (err) {
      this.setData({ loading: false });
      wx.showToast({ title: '加载失败', icon: 'none' });
    } finally {
      wx.hideLoading();
    }
  },

  switchTab(e) {
    const tab = e.currentTarget.dataset.tab;
    const tabPositions = { all: '32rpx', income: '160rpx', expense: '288rpx' };
    const transactions = this.data.transactions;
    let filteredTransactions = transactions;
    if (tab === 'income') {
      filteredTransactions = transactions.filter(t => t.amount > 0);
    } else if (tab === 'expense') {
      filteredTransactions = transactions.filter(t => t.amount < 0);
    }
    this.setData({
      currentTab: tab,
      tabIndicatorLeft: tabPositions[tab] || '32rpx',
      filteredTransactions
    });
  },

  goBack() {
    wx.navigateBack({ fail: () => wx.switchTab({ url: '/pages/home/index' }) });
  },

  goRecharge() {
    wx.navigateTo({ url: '/pages/employer/recharge/index' });
  },

  goWithdraw() {
    wx.navigateTo({ url: '/pages/wallet/withdraw/index' });
  }
});