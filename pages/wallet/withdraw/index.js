const Api = require('../../../utils/api.js');
const app = getApp();

function normalizeAmountInput(value) {
  const raw = String(value || '');
  const filtered = raw.replace(/[^\d.]/g, '');
  const parts = filtered.split('.');

  if (!parts.length) {
    return '';
  }

  const integerPart = parts[0];
  if (parts.length === 1) {
    return integerPart;
  }

  const decimalPart = parts.slice(1).join('').slice(0, 2);
  return `${integerPart}.${decimalPart}`;
}

Page({
  data: {
    balance: 0,
    withdrawableAmount: '0.00',
    minWithdrawAmount: '50.00',
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

  onPullDownRefresh() {
    this.loadWalletInfo().finally(() => wx.stopPullDownRefresh());
  },

  async loadWalletInfo() {
    try {
      const [walletRes, userRes] = await Promise.all([
        Api.getWallet(),
        Api.getMe()
      ]);

      const wallet = walletRes.data || {};
      const user = userRes.data || {};
      const withdrawableAmount = Number(wallet.balance || 0);
      const minWithdrawAmount = Number(wallet.min_withdraw_amount || 50);
      const balance = withdrawableAmount;

      this.setData({
        balance: balance,
        withdrawableAmount: Number(withdrawableAmount).toFixed(2),
        minWithdrawAmount: minWithdrawAmount.toFixed(2),
        realNameVerified: user.real_name_verified || false
      });
    } catch (err) {
      wx.showToast({ title: '加载失败', icon: 'none' });
    }
  },

  onAmountInput(e) {
    this.setData({ amount: normalizeAmountInput(e.detail.value), error: '' });
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
    const minWithdrawAmount = Number(this.data.minWithdrawAmount || 50);
    if (amount < minWithdrawAmount) {
      this.setData({ error: `满${minWithdrawAmount.toFixed(2)}元才能提现` });
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
            wx.navigateTo({ url: '/pages/mine/merchant-auth/index' });
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
