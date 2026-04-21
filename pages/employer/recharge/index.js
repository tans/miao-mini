const Api = require('../../../utils/api.js');
const app = getApp();

Page({
  data: {
    balance: 0,
    balanceDisplay: '0.00',
    selectedAmount: 100,
    customAmount: '',
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
    if (app.isLoggedIn()) {
      this.loadWallet();
    }
  },

  async loadWallet() {
    try {
      const res = await Api.getWallet();
      const wallet = res.data || {};
      const balance = wallet.balance || 0;
      this.setData({
        balance: balance,
        balanceDisplay: Number(balance).toLocaleString('zh-CN', { minimumFractionDigits: 2 }),
      });
    } catch (err) {
      console.error('loadWallet error:', err);
    }
  },

  selectAmount(e) {
    const amount = parseInt(e.currentTarget.dataset.amount);
    this.setData({
      selectedAmount: amount,
      customAmount: '',
    });
  },

  onCustomAmountInput(e) {
    const value = e.detail.value;
    this.setData({
      customAmount: value,
      selectedAmount: 0,
    });
  },

  async handleRecharge() {
    let amount = this.data.selectedAmount;
    if (!amount && this.data.customAmount) {
      amount = parseFloat(this.data.customAmount);
    }

    if (!amount || amount <= 0) {
      wx.showToast({ title: '请选择或输入充值金额', icon: 'none' });
      return;
    }

    if (amount < 1) {
      wx.showToast({ title: '充值金额不能小于1元', icon: 'none' });
      return;
    }

    this.setData({ loading: true });
    try {
      const res = await Api.recharge(amount);
      if (res.code === 0) {
        wx.showToast({ title: '充值成功', icon: 'success' });
        // Update balance
        const newBalance = res.data && res.data.balance ? res.data.balance : this.data.balance + amount;
        this.setData({
          balance: newBalance,
          balanceDisplay: Number(newBalance).toLocaleString('zh-CN', { minimumFractionDigits: 2 }),
        });
        // Navigate back after success
        setTimeout(() => {
          wx.navigateBack();
        }, 1500);
      } else {
        wx.showToast({ title: res.message || '充值失败', icon: 'none' });
      }
    } catch (err) {
      wx.showToast({ title: err.message || '充值失败', icon: 'none' });
    } finally {
      this.setData({ loading: false });
    }
  },

  goBack() {
    wx.navigateBack();
  }
});