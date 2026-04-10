// pages/video-proposals/index.js
const Api = require('../../utils/api.js');
const { getClaimStatusText } = require('../../utils/util.js');
const app = getApp();

Page({
  data: {
    allClaims: [],
    filteredClaims: [],
    activeFilter: 'all',
    filters: ['all', 'pending', 'passed', 'rejected']
  },

  onLoad() {
    if (!app.isLoggedIn()) {
      wx.navigateTo({ url: '/pages/login/index' });
      return;
    }
    const user = app.getUser();
    if (user && user.role !== 'business') {
      wx.showToast({ title: '只有商家才能查看提案', icon: 'none' });
      wx.switchTab({ url: '/pages/home/index' });
      return;
    }
    this.loadProposals();
  },

  onShow() {
    if (app.isLoggedIn()) {
      this.loadProposals();
    }
  },

  onPullDownRefresh() {
    this.loadProposals().then(() => {
      wx.stopPullDownRefresh();
    });
  },

  async loadProposals() {
    wx.showLoading({ title: '加载中...' });
    try {
      const allClaims = [];
      let page = 1;
      let hasMore = true;

      // 分页获取所有商家任务及其提案
      while (hasMore) {
        const tasksRes = await Api.getMyBusinessTasks({ page, status: 2 });
        const tasks = tasksRes.data || [];
        if (tasks.length === 0) break;

        const claimsPromises = tasks.map(task =>
          Api.getTaskClaims(task.id).catch(() => ({ data: [] }))
        );
        const claimsResults = await Promise.all(claimsPromises);

        claimsResults.forEach((res, i) => {
          const claims = res.data || [];
          claims.forEach(c => {
            allClaims.push({ ...c, task_title: tasks[i].title });
          });
        });

        hasMore = tasks.length >= 20;
        page++;
      }

      this.setData({ allClaims, filteredClaims: allClaims });
    } catch (err) {
      wx.showToast({ title: '加载失败', icon: 'none' });
    } finally {
      wx.hideLoading();
    }
  },

  switchFilter(e) {
    const filter = e.currentTarget.dataset.filter;
    this.setData({ activeFilter: filter });
    // status: 1=待验收, 2=已完成 (验收通过), 5=已退回
    const filterMap = { 'pending': 1, 'passed': 2, 'rejected': 5 };
    const filtered = filter === 'all'
      ? this.data.allClaims
      : this.data.allClaims.filter(c => c.status === filterMap[filter]);
    this.setData({ filteredClaims: filtered });
  },

  async reviewClaim(e) {
    const { claimId, result } = e.currentTarget.dataset;
    try {
      await Api.reviewClaim(claimId, result);
      wx.showToast({ title: result == 1 ? '已采纳' : '已拒绝', icon: 'success' });
      this.loadProposals();
    } catch (err) {
      wx.showToast({ title: err.message || '操作失败', icon: 'none' });
    }
  },

  getClaimStatusText(status) {
    return getClaimStatusText(status);
  }
});
