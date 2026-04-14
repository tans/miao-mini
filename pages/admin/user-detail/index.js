const Api = require('../../../utils/api');

Page({
  data: {
    userId: null,
    user: null,
    loading: false,
    showBalanceModal: false,
    balanceChange: '',
    balanceReason: '',
  },

  onLoad(options) {
    if (options.id) {
      this.setData({ userId: parseInt(options.id, 10) });
      this.loadUser();
    }
  },

  loadUser() {
    this.setData({ loading: true });
    // Get all users and find the one with matching id
    Api.getAdminUsers({ limit: 1000 })
      .then((res) => {
        const users = res.data || [];
        const user = users.find((u) => u.id === this.data.userId);
        this.setData({ user, loading: false });
      })
      .catch(() => {
        this.setData({ loading: false });
        wx.showToast({ title: '获取用户信息失败', icon: 'none' });
      });
  },

  onModifyBalance() {
    this.setData({ showBalanceModal: true });
  },

  onCancelBalance() {
    this.setData({ showBalanceModal: false, balanceChange: '', balanceReason: '' });
  },

  onBalanceChangeInput(e) {
    this.setData({ balanceChange: e.detail.value });
  },

  onBalanceReasonInput(e) {
    this.setData({ balanceReason: e.detail.value });
  },

  onConfirmBalance() {
    const change = parseFloat(this.data.balanceChange);
    const reason = this.data.balanceReason.trim();

    if (isNaN(change)) {
      wx.showToast({ title: '请输入有效金额', icon: 'none' });
      return;
    }

    if (!reason) {
      wx.showToast({ title: '请输入操作原因', icon: 'none' });
      return;
    }

    wx.showLoading({ title: '处理中...' });
    Api.updateUserBalance(this.data.userId, change, reason)
      .then(() => {
        wx.hideLoading();
        wx.showToast({ title: '余额已更新' });
        this.setData({ showBalanceModal: false, balanceChange: '', balanceReason: '' });
        this.loadUser();
      })
      .catch((err) => {
        wx.hideLoading();
        wx.showToast({ title: err.message || '操作失败', icon: 'none' });
      });
  },

  onToggleStatus() {
    if (!this.data.user) return;

    const newStatus = this.data.user.status === 1 ? 0 : 1;
    const action = newStatus === 1 ? '启用' : '禁用';

    wx.showModal({
      title: '确认' + action,
      content: `确定要${action}该用户吗？`,
      success: (res) => {
        if (res.confirm) {
          wx.showLoading({ title: '处理中...' });
          Api.updateUserStatus(this.data.userId, newStatus)
            .then(() => {
              wx.hideLoading();
              wx.showToast({ title: `已${action}` });
              this.loadUser();
            })
            .catch(() => {
              wx.hideLoading();
              wx.showToast({ title: '操作失败', icon: 'none' });
            });
        }
      },
    });
  },

  onViewTransactions() {
    wx.navigateTo({
      url: `/pages/admin/user-transactions/index?id=${this.data.userId}`,
    });
  },
});