const Api = require('../../../utils/api.js');
const app = getApp();

Page({
  data: {
    balance: 0,
    withdrawableAmount: '0.00',
    amount: '',
    realNameVerified: false,
    loading: false,
    error: ''
  },

  onLoad() {
    this.loadWalletInfo();
  },

  onShow() {
    if (app.isLoggedIn() && !this.data.loading) {
      this.loadWalletInfo();
    }
  },

  async loadWalletInfo() {
    try {
      const [walletRes, userRes] = await Promise.all([
        Api.getWallet(),
        Api.getMe()
      ]);

      const wallet = walletRes.data || {};
      const user = userRes.data || {};
      const balance = wallet.balance || 0;
      const frozenAmount = wallet.frozen_amount || 0;
      const withdrawableAmount = Math.max(0, balance - frozenAmount).toFixed(2);

      this.setData({
        balance: balance,
        withdrawableAmount: withdrawableAmount,
        realNameVerified: user.real_name_verified || false
      });
    } catch (err) {
      console.error('loadWalletInfo error:', err);
    }
  },

  onAmountInput(e) {
    const value = e.detail.value;
    // 限制只能输入数字，保留两位小数
    const filtered = value.replace(/[^\d.]/g, '');
    const parts = filtered.split('.');
    let result = parts[0];
    if (parts.length > 1) {
      result = parts[0] + '.' + parts[1].slice(0, 2);
    }
    this.setData({ amount: result, error: '' });
  },

  handleAllAmount() {
    this.setData({
      amount: this.data.withdrawableAmount,
      error: ''
    });
  },

  async handleWithdraw() {
    const amount = parseFloat(this.data.amount);

    if (!amount || amount <= 0) {
      this.setData({ error: '请输入有效的提现金额' });
      return;
    }

    const maxAmount = parseFloat(this.data.withdrawableAmount);
    if (amount > maxAmount) {
      this.setData({ error: '超过可提现余额' });
      return;
    }

    if (!this.data.realNameVerified) {
      this.setData({ error: '请先完成实名认证' });
      wx.showModal({
        title: '实名认证',
        content: '首次提现需要先绑定实名认证，是否前往认证？',
        confirmText: '去认证',
        cancelText: '取消',
        success: (res) => {
          if (res.confirm) {
            wx.navigateTo({ url: '/pages/mine/index' });
          }
        }
      });
      return;
    }

    this.setData({ loading: true, error: '' });

    try {
      const res = await Api.withdraw(amount);
      if (res.code === 0) {
        wx.showToast({
          title: '提现申请已提交',
          icon: 'success'
        });
        setTimeout(() => {
          wx.navigateBack();
        }, 1500);
      } else {
        this.setData({ error: res.message || '提现失败' });
      }
    } catch (err) {
      this.setData({ error: err.message || '提现失败' });
    } finally {
      this.setData({ loading: false });
    }
  },

  goBack() {
    wx.navigateBack();
  }
});