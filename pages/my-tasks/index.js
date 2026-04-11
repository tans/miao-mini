// pages/my-tasks/index.js
const Api = require('../../utils/api.js');
const { getStatusText, getStatusClass } = require('../../utils/util.js');
const app = getApp();

Page({
  data: {
    tasks: [],
    balance: '0.00',
    userInfo: null
  },

  onLoad() {
    if (!app.isLoggedIn()) {
      wx.navigateTo({ url: '/pages/login/index' });
      return;
    }
    const user = app.getUser();
    this.setData({ userInfo: user });
  },

  onShow() {
    if (app.isLoggedIn()) {
      this.loadData();
    }
  },

  onPullDownRefresh() {
    this.loadData().then(() => {
      wx.stopPullDownRefresh();
    });
  },

  async loadData() {
    wx.showLoading({ title: '加载中...' });
    try {
      const [tasksRes, walletRes] = await Promise.all([
        Api.getMyBusinessTasks({ page: 1 }),
        Api.getWallet()
      ]);
      this.setData({
        tasks: tasksRes.data || [],
        balance: walletRes.data && walletRes.data.balance !== undefined ? Number(walletRes.data.balance).toFixed(2) : '0.00'
      });
    } catch (err) {
      wx.showToast({ title: '加载失败', icon: 'none' });
    } finally {
      wx.hideLoading();
    }
  },

  goTaskDetail(e) {
    const taskId = e.currentTarget.dataset.id;
    wx.navigateTo({ url: `/pages/task-detail/index?id=${taskId}` });
  },

  goCreateTask() {
    wx.navigateTo({ url: '/pages/create-task/index' });
  },

  goWallet() {
    wx.navigateTo({ url: '/pages/wallet/index' });
  },

  getStatusText(status) {
    return getStatusText(status);
  }
});
