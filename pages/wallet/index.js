const Api = require('../../utils/api.js');
const { formatDateTime } = require('../../utils/util.js');
const app = getApp();

function formatMoneyText(value) {
  const num = Number(value);
  return Number.isFinite(num) ? num.toFixed(2) : '0.00';
}

Page({
  data: {
    balance: 0,
    balanceDisplay: '0.00',
    frozenAmount: 0,
    withdrawableAmount: '0.00',
    totalIncome: 0,
    totalIncomeDisplay: '0.00',
    transactions: [],
    filteredTransactions: [],
    currentTab: 'all',
    loading: false,
    
    // 弹窗状态
    showRechargeModal: false,
    showRechargeSuccessModal: false,
    showWithdrawModal: false,
    showWithdrawSuccessModal: false,
    
    // 输入金额
    rechargeAmount: '',
    withdrawAmount: '',
  },

  getFilteredTransactions(tab, transactions) {
    if (tab === 'income') {
      return transactions.filter((t) => t.amount > 0);
    }
    if (tab === 'expense') {
      return transactions.filter((t) => t.amount < 0);
    }
    return transactions;
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

  onPullDownRefresh() {
    this.loadWallet().finally(() => wx.stopPullDownRefresh());
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
        amount: Number(t.amount || 0),
        type_text: t.type_str || '其他',
        amountDisplay: formatMoneyText(Math.abs(Number(t.amount || 0))),
        fee: Number(t.fee || 0),
        feeDisplay: formatMoneyText(Number(t.fee || 0)),
        createdAtText: formatDateTime(t.created_at || t.createdAt || '')
      }));

      const balance = Number(wallet.balance || 0);
      const frozenAmount = Number(wallet.frozen_amount || 0);
      const withdrawableAmount = Math.max(0, balance - frozenAmount);
      const filteredTransactions = this.getFilteredTransactions(this.data.currentTab, transactions);

      this.setData({
        balance,
        balanceDisplay: formatMoneyText(balance),
        frozenAmount: formatMoneyText(frozenAmount),
        withdrawableAmount: formatMoneyText(withdrawableAmount),
        totalIncome: Number(wallet.total_income || 0),
        totalIncomeDisplay: formatMoneyText(wallet.total_income || 0),
        transactions,
        filteredTransactions,
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
    const filteredTransactions = this.getFilteredTransactions(tab, this.data.transactions);
    this.setData({
      currentTab: tab,
      filteredTransactions
    });
  },

  goBack() {
    wx.navigateBack({ fail: () => wx.switchTab({ url: '/pages/home/index' }) });
  },

  goRecharge() {
    this.setData({ showRechargeModal: true, rechargeAmount: '' });
  },

  closeRechargeModal() {
    this.setData({ showRechargeModal: false, rechargeAmount: '' });
  },

  onRechargeInput(e) {
    this.setData({ rechargeAmount: e.detail.value });
  },

  submitRecharge() {
    const amount = this.data.rechargeAmount;
    if (!amount || parseFloat(amount) <= 0) {
      wx.showToast({ title: '请输入有效金额', icon: 'none' });
      return;
    }
    this.setData({ 
      showRechargeModal: false, 
      showRechargeSuccessModal: true 
    });
  },

  closeRechargeSuccessModal() {
    this.setData({ showRechargeSuccessModal: false, rechargeAmount: '' });
  },

  goWithdraw() {
    this.setData({ showWithdrawModal: true, withdrawAmount: '' });
  },

  closeWithdrawModal() {
    this.setData({ showWithdrawModal: false, withdrawAmount: '' });
  },

  onWithdrawInput(e) {
    this.setData({ withdrawAmount: e.detail.value });
  },

  submitWithdraw() {
    const amount = this.data.withdrawAmount;
    if (!amount || parseFloat(amount) <= 0) {
      wx.showToast({ title: '请输入有效金额', icon: 'none' });
      return;
    }
    this.setData({ 
      showWithdrawModal: false, 
      showWithdrawSuccessModal: true 
    });
  },

  closeWithdrawSuccessModal() {
    this.setData({ showWithdrawSuccessModal: false, withdrawAmount: '' });
  }
});
