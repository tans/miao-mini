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
      const [walletRes, authRes] = await Promise.all([
        Api.getWallet(),
        Api.getWithdrawAuthorization().catch(() => ({ data: null }))
      ]);

      const wallet = walletRes.data || {};
      const withdrawAuthorization = authRes.data || null;
      const withdrawableAmount = Number(wallet.balance || 0);
      const minWithdrawAmount = Number(wallet.min_withdraw_amount || 50);
      const balance = withdrawableAmount;

      this.setData({
        balance: balance,
        withdrawableAmount: formatAmount(withdrawableAmount, { useGrouping: false }),
        minWithdrawAmount: formatAmount(minWithdrawAmount, { useGrouping: false }),
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
        Api.reportException({
          type: 'withdraw_authorization_empty',
          message: authRes.message || '提现授权创建失败',
          path: '/creator/withdraw-authorization',
          method: 'POST',
          statusCode: 200,
          responseBody: authRes,
          page: '/pages/wallet/withdraw/index',
          extra: {
            stage: 'create_authorization',
          },
        });
        throw new Error('提现授权创建失败');
      }
      if (!authData.package_info) {
        if (this.isWithdrawAuthorizationEffective(authData)) {
          return authData;
        }
        Api.reportException({
          type: 'withdraw_authorization_no_package',
          message: authRes.message || '未获取到微信提现授权信息',
          path: '/creator/withdraw-authorization',
          method: 'POST',
          statusCode: 200,
          responseBody: authRes,
          page: '/pages/wallet/withdraw/index',
          extra: {
            stage: 'create_authorization',
            state: authData.state || '',
            authorization_id: authData.authorization_id || '',
          },
        });
        throw new Error(authRes.message || '未获取到微信提现授权信息');
      }

      await new Promise((resolve, reject) => {
        if (typeof wx.requestMerchantTransfer !== 'function' || !wx.canIUse('requestMerchantTransfer')) {
          Api.reportException({
            type: 'withdraw_authorization_api_unsupported',
            message: '当前微信版本不支持提现授权',
            path: '/pages/wallet/withdraw/index',
            page: '/pages/wallet/withdraw/index',
            extra: {
              stage: 'request_merchant_transfer',
              canIUse: typeof wx.canIUse === 'function' ? wx.canIUse('requestMerchantTransfer') : false,
              hasApi: typeof wx.requestMerchantTransfer === 'function',
              app_id: authData.wechat_app_id || '',
              mch_id: authData.wechat_mch_id || '',
            },
          });
          reject(new Error('当前微信版本不支持提现授权，请升级后重试'));
          return;
        }
        const accountInfo = wx.getAccountInfoSync ? wx.getAccountInfoSync() : null;
        const miniProgramAppId = accountInfo && accountInfo.miniProgram && accountInfo.miniProgram.appId;
        wx.requestMerchantTransfer({
          mchId: authData.wechat_mch_id || '',
          appId: authData.wechat_app_id || miniProgramAppId || '',
          package: authData.package_info,
          success: resolve,
          fail: (err) => {
            const message = (err && (err.errMsg || err.message)) || '提现授权未完成';
            console.warn('[withdraw-authorization] requestMerchantTransfer failed:', message, err);
            Api.reportException({
              type: 'withdraw_authorization_launch_failed',
              message,
              path: '/pages/wallet/withdraw/index',
              page: '/pages/wallet/withdraw/index',
              extra: {
                stage: 'request_merchant_transfer',
                err: err || '',
                app_id: authData.wechat_app_id || miniProgramAppId || '',
                mch_id: authData.wechat_mch_id || '',
                package_info: authData.package_info || '',
                authorization_id: authData.authorization_id || '',
                state: authData.state || '',
              },
            });
            reject(new Error(message));
          }
        });
      });

      const latestRes = await Api.getWithdrawAuthorization();
      const latestAuth = latestRes.data || null;
      this.setData({ withdrawAuthorization: latestAuth });
      if (!this.isWithdrawAuthorizationEffective(latestAuth)) {
        Api.reportException({
          type: 'withdraw_authorization_not_effective',
          message: '微信提现授权尚未生效',
          path: '/creator/withdraw-authorization',
          method: 'GET',
          statusCode: 200,
          responseBody: latestRes,
          page: '/pages/wallet/withdraw/index',
          extra: {
            stage: 'refresh_authorization',
            state: latestAuth && latestAuth.state || '',
            authorization_id: latestAuth && latestAuth.authorization_id || '',
          },
        });
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
      Api.reportException({
        type: 'withdraw_flow_failed',
        message: err.message || '提现失败',
        path: '/pages/wallet/withdraw/index',
        page: '/pages/wallet/withdraw/index',
        extra: {
          stage: 'withdraw_flow',
          withdraw_authorization_state: this.data.withdrawAuthorization && this.data.withdrawAuthorization.state || '',
          withdraw_authorization_id: this.data.withdrawAuthorization && this.data.withdrawAuthorization.authorization_id || '',
        },
      });
      this.setData({ error: err.message || '提现失败' });
    } finally {
      this.setData({ loading: false });
    }
  },

  goBack() {
    wx.navigateBack();
  }
});
