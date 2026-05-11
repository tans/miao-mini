const Api = require('../../utils/api.js');
const { formatDateTime } = require('../../utils/util.js');
const app = getApp();
const MIN_WITHDRAW_AMOUNT = 50;

function formatMoneyText(value) {
  const num = Number(value);
  return Number.isFinite(num) ? num.toFixed(2) : '0.00';
}

function appendFeeRemarkText(baseRemark, fee, feeLabel) {
  const feeAmount = Number(fee || 0);
  if (feeAmount <= 0) {
    return baseRemark;
  }

  const label = String(feeLabel || '').trim() || '手续费';
  return `${baseRemark}，${label} ${formatMoneyText(feeAmount)} 元`;
}

function getTransactionTypeCode(tx) {
  return String(tx.type_code || '').toLowerCase();
}

function getTransactionCategory(tx) {
  const typeCode = getTransactionTypeCode(tx);
  if (typeCode === 'freeze' || typeCode === 'unfreeze') {
    return 'freeze';
  }
  if (typeCode === 'task_payment' || typeCode === 'consume' || typeCode === 'withdraw' || typeCode === 'freeze_fee') {
    return 'expense';
  }
  if (typeCode === 'recharge'
    || typeCode === 'task_reward'
    || typeCode === 'participation_payment'
    || typeCode === 'award_payment'
    || typeCode === 'refund'
    || typeCode === 'withdraw_refund'
    || typeCode === 'return_margin') {
    return 'income';
  }
  const amount = Number(tx.displayAmount || tx.amount || 0);
  if (amount < 0) {
    return 'expense';
  }
  return 'income';
}

function buildRemarkText(category, typeCode) {
  if (category === 'freeze') {
    if (typeCode === 'task_payment') {
      return '账款已从待解冻金额扣除';
    }
    if (typeCode === 'unfreeze') {
      return '账款已从待解冻金额回到可提现金额';
    }
    return '账款已从可提现金额转入待解冻金额';
  }

  if (category === 'expense') {
    if (typeCode === 'task_payment') {
      return '账款已从待解冻金额扣除';
    }
    if (typeCode === 'freeze_fee') {
      return '账款已从可提现金额扣除';
    }
    if (typeCode === 'withdraw') {
      return '账款已提现，预计1到3工作日到账';
    }
    return '账款已扣除';
  }

  if (typeCode === 'recharge') {
    return '账款充值';
  }
  if (typeCode === 'withdraw_refund') {
    return '账款提现退款';
  }

  return '账款已添加到可提现金额';
}

function buildReadableRemark(tx, category, typeCode, fee, feeLabel) {
  const originalRemark = String(tx.remark || '').trim();
  if (typeCode === 'withdraw') {
    return buildRemarkText(category, typeCode);
  }
  if (typeCode === 'withdraw_refund') {
    return originalRemark ? originalRemark.replace(/^提现退回[:：]?\s*/, '账款提现退款，原因：') : buildRemarkText(category, typeCode);
  }
  if (typeCode === 'recharge') {
    return buildRemarkText(category, typeCode);
  }
  return appendFeeRemarkText(buildRemarkText(category, typeCode), fee, feeLabel);
}

function buildTransactionViews(tx) {
  const typeCode = getTransactionTypeCode(tx);
  const category = getTransactionCategory(tx);
  const createdAtText = formatDateTime(tx.created_at || tx.createdAt || '');
  const fee = Number(tx.fee || 0);
  const amount = Number(tx.amount || 0);
  const feeLabel = String(tx.fee_label || '').trim() || '手续费';
  const titleMap = {
    withdraw: '提现',
    withdraw_refund: '提现',
    recharge: '充值',
  };

  if (typeCode === 'freeze') {
    const principalAmount = Math.max(0, Math.abs(amount) - fee);
    const views = [{
      id: `${tx.id}-freeze`,
      sourceId: tx.id,
      category: 'freeze',
      type_code: typeCode,
      type_text: '冻结',
      displayAmount: -principalAmount,
      amountDisplay: formatMoneyText(principalAmount),
      remarkText: buildRemarkText('freeze', typeCode),
      createdAtText,
    }];

    if (fee > 0) {
      views.push({
        id: `${tx.id}-freeze-fee`,
        sourceId: tx.id,
        category: 'expense',
        type_code: 'freeze_fee',
        type_text: feeLabel,
        displayAmount: -fee,
        amountDisplay: formatMoneyText(fee),
        remarkText: '账款已从可提现金额扣除，用于寻找优质创作者',
        createdAtText,
      });
    }

    return views;
  }

  if (typeCode === 'task_payment') {
    return [{
      id: String(tx.id),
      sourceId: tx.id,
      category: 'expense',
      type_code: typeCode,
      type_text: tx.type_str || '奖励支出',
      displayAmount: amount,
      amountDisplay: formatMoneyText(Math.abs(amount)),
      remarkText: buildRemarkText('expense', typeCode),
      createdAtText,
    }];
  }

  if (typeCode === 'unfreeze') {
    return [{
      id: `${tx.id}-unfreeze`,
      sourceId: tx.id,
      category: 'freeze',
      type_code: typeCode,
      type_text: '解冻',
      displayAmount: amount,
      amountDisplay: formatMoneyText(Math.abs(amount)),
      remarkText: buildRemarkText('freeze', typeCode),
      createdAtText,
    }];
  }

  return [{
    id: String(tx.id),
    sourceId: tx.id,
    category,
    type_code: typeCode,
    type_text: titleMap[typeCode] || tx.type_str || '其他',
    displayAmount: amount,
    amountDisplay: formatMoneyText(Math.abs(amount)),
    remarkText: buildReadableRemark(tx, category, typeCode, fee, feeLabel),
    createdAtText,
  }];
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
    withdrawSubmitting: false,
    withdrawResult: null,
    
    // 输入金额
    rechargeAmount: '',
    withdrawAmount: '',
  },

  getFilteredTransactions(tab, transactions) {
    if (tab === 'income') {
      return transactions.filter((t) => t.category === 'income');
    }
    if (tab === 'expense') {
      return transactions.filter((t) => t.category === 'expense');
    }
    if (tab === 'freeze') {
      return transactions.filter((t) => t.category === 'freeze');
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
        Api.getTransactions({ scope: 'all', page: 1, limit: 100 })
      ]);

      const wallet = walletRes.data || {};
      const transData = transRes.data || {};
      const transactions = (transData.data || []).flatMap((t) => buildTransactionViews(t));

      const withdrawableAmount = Number(wallet.balance || 0);
      const frozenAmount = Number(wallet.frozen_amount || 0);
      const balance = withdrawableAmount + frozenAmount;
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
    this.setData({ showWithdrawModal: true, withdrawAmount: '', withdrawResult: null });
  },

  closeWithdrawModal() {
    this.setData({ showWithdrawModal: false, withdrawAmount: '' });
  },

  onWithdrawInput(e) {
    this.setData({ withdrawAmount: e.detail.value });
  },

  async submitWithdraw() {
    if (this.data.withdrawSubmitting) return;
    const amount = this.data.withdrawAmount;
    const parsedAmount = parseFloat(amount);
    if (!amount || parsedAmount <= 0) {
      wx.showToast({ title: '请输入有效金额', icon: 'none' });
      return;
    }
    if (parsedAmount < MIN_WITHDRAW_AMOUNT) {
      wx.showToast({ title: `满${MIN_WITHDRAW_AMOUNT}元才能提现`, icon: 'none' });
      return;
    }
    if (parsedAmount > parseFloat(this.data.withdrawableAmount || 0)) {
      wx.showToast({ title: '超过可提现余额', icon: 'none' });
      return;
    }

    this.setData({ withdrawSubmitting: true });
    try {
      const res = await Api.withdraw(parsedAmount);
      if (res.code === 0) {
        this.setData({
          showWithdrawModal: false,
          showWithdrawSuccessModal: true,
          withdrawResult: res.data || null,
          withdrawAmount: ''
        });
        await this.loadWallet();
      } else {
        wx.showToast({ title: res.message || '提现失败', icon: 'none' });
      }
    } catch (err) {
      wx.showToast({ title: err.message || '提现失败', icon: 'none' });
    } finally {
      this.setData({ withdrawSubmitting: false });
    }
  },

  closeWithdrawSuccessModal() {
    this.setData({ showWithdrawSuccessModal: false, withdrawAmount: '', withdrawResult: null });
  }
});
