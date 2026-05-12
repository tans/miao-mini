const Api = require('../../../utils/api.js');
const app = getApp();
const { formatAmount } = require('../../../utils/util.js');

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
    withdrawAuthorization: null,
    authorizing: false,
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
      const [walletRes, userRes, authRes] = await Promise.all([
        Api.getWallet(),
        Api.getMe(),
        Api.getWithdrawAuthorization().catch(() => ({ data: null }))
      ]);

      const wallet = walletRes.data || {};
      const user = userRes.data || {};
      const withdrawAuthorization = authRes.data || null;
      const withdrawableAmount = Number(wallet.balance || 0);
      const minWithdrawAmount = Number(wallet.min_withdraw_amount || 50);
      const balance = withdrawableAmount;

      this.setData({
        balance: balance,
        withdrawableAmount: formatAmount(withdrawableAmount, { useGrouping: false }),
        minWithdrawAmount: formatAmount(minWithdrawAmount, { useGrouping: false }),
        realNameVerified: user.real_name_verified || false,
        withdrawAuthorization
      });
    } catch (err) {
      wx.showToast({ title: '加载失败', icon: 'none' });
    }
  },

  isWithdrawAuthorizationEffective(auth) {
    return !!(auth && auth.state === 'TAKING_EFFECT' && auth.authorization_id);
  },

  async ensureWithdrawAuthorization() {
    const currentAuth = this.data.withdrawAuthorization;
    if (this.isWithdrawAuthorizationEffective(currentAuth)) {
      return currentAuth;
    }

    this.setData({ authorizing: true, error: '' });
    try {
      const authRes = await Api.createWithdrawAuthorization();
      const authData = authRes.data || null;
      this.setData({ withdrawAuthorization: authData });

      if (!authData) {
        throw new Error('提现授权创建失败');
      }
      if (!authData.package_info) {
        if (this.isWithdrawAuthorizationEffective(authData)) {
          return authData;
        }
        throw new Error(authRes.message || '未获取到微信提现授权信息');
      }

      await new Promise((resolve, reject) => {
        if (typeof wx.requestMerchantTransfer !== 'function') {
          reject(new Error('当前微信版本不支持提现授权，请升级后重试'));
          return;
        }
        wx.requestMerchantTransfer({
          mchid: authData.wechat_mch_id || '',
          appid: authData.wechat_app_id || '',
          package: authData.package_info,
          success: resolve,
          fail: (err) => {
            reject(new Error((err && (err.errMsg || err.message)) || '提现授权未完成'));
          }
        });
      });

      const latestRes = await Api.getWithdrawAuthorization();
      const latestAuth = latestRes.data || null;
      this.setData({ withdrawAuthorization: latestAuth });
      if (!this.isWithdrawAuthorizationEffective(latestAuth)) {
        throw new Error('微信提现授权尚未生效，请稍后再试');
      }
      return latestAuth;
    } finally {
      this.setData({ authorizing: false });
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
      this.setData({ error: `满${formatAmount(minWithdrawAmount, { useGrouping: false })}元才能提现` });
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
      await this.ensureWithdrawAuthorization();
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
