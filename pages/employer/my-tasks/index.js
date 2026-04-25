// pages/employer/my-tasks/index.js
const Api = require('../../../utils/api.js');
const { formatDateTime } = require('../../../utils/util.js');
const app = getApp();

function normalizeTaskStatus(rawStatus) {
  const statusTextMap = {
    pending: '待审核',
    active: '征稿中',
    ended: '已结束',
  };

  const statusCode = typeof rawStatus === 'string' ? Number(rawStatus) : rawStatus;
  if (rawStatus === 'pending' || statusCode === 1) {
    return {
      statusKey: 'pending',
      statusText: statusTextMap.pending,
      cardClass: 'card-pending',
      statusClass: 'status-pending',
      actionText: '待审核',
      actionTap: 'goTaskDetail',
    };
  }

  if (rawStatus === 'active' || rawStatus === 'ongoing' || statusCode === 2 || statusCode === 3) {
    return {
      statusKey: 'active',
      statusText: statusTextMap.active,
      cardClass: 'card-active',
      statusClass: 'status-active',
      actionText: '去审核',
      actionTap: 'goReviewTask',
    };
  }

  return {
    statusKey: 'ended',
    statusText: statusTextMap.ended,
    cardClass: 'card-ended',
    statusClass: 'status-ended',
    actionText: '查看结果',
    actionTap: 'goTaskResult',
  };
}

function normalizeTask(task = {}) {
  const meta = normalizeTaskStatus(task.status);
  return {
    ...task,
    ...meta,
  };
}

Page({
  data: {
    tasks: [],
    filteredTasks: [],
    balance: '0.00',
    userInfo: null,
    currentFilter: 'all',
    pendingReviewCount: 0,
    loading: false
  },

  onLoad() {
    if (!app.isLoggedIn()) {
      app.silentLogin().then(() => {
        if (app.isLoggedIn()) {
          this.setData({ userInfo: app.getUser() });
          this.loadData();
        }
      });
      return;
    }
    const user = app.getUser();
    this.setData({ userInfo: user });
    this.loadData();
  },

  onShow() {
    if (app.isLoggedIn()) {
      this.loadData();
    }
  },

  onPullDownRefresh() {
    this.loadData().finally(() => wx.stopPullDownRefresh());
  },

  async loadData() {
    this.setData({ loading: true });
    wx.showLoading({ title: '加载中...' });
    try {
      const [tasksRes, walletRes] = await Promise.all([
        Api.getMyBusinessTasks({ page: 1 }),
        Api.getWallet()
      ]);
      const tasks = (tasksRes.data || []).map(normalizeTask);
      const pendingCount = tasks.reduce((sum, task) => sum + (task.pending_review_count || 0), 0);

      this.setData({
        tasks: tasks,
        pendingReviewCount: pendingCount,
        balance: walletRes.data && walletRes.data.balance !== undefined ? Number(walletRes.data.balance).toFixed(2) : '0.00',
        loading: false
      });
      this.applyFilter();
    } catch (err) {
      this.setData({ loading: false });
      wx.showToast({ title: '加载失败', icon: 'none' });
    } finally {
      wx.hideLoading();
    }
  },

  switchFilter(e) {
    const filter = e.currentTarget.dataset.filter;
    if (filter === this.data.currentFilter) return;
    this.setData({ currentFilter: filter });
    this.applyFilter();
  },

  applyFilter() {
    const { tasks, currentFilter } = this.data;
    let filtered = tasks;

    if (currentFilter === 'active') {
      filtered = tasks.filter(task => task.statusKey === 'active');
    } else if (currentFilter === 'ended') {
      filtered = tasks.filter(task => task.statusKey === 'ended');
    }

    filtered = filtered.map(task => ({
      ...task,
      created_at: this.formatDateTime(task.created_at)
    }));

    this.setData({ filteredTasks: filtered });
  },

  goBack() {
    wx.navigateBack({ fail: () => wx.switchTab({ url: '/pages/home/index' }) });
  },

  goTaskDetail(e) {
    const taskId = e.currentTarget.dataset.id;
    wx.navigateTo({ url: `/pages/employer/task-detail/index?id=${taskId}` });
  },

  goReviewTask(e) {
    const taskId = e.currentTarget.dataset.id;
    wx.navigateTo({ url: `/pages/employer/video-proposals/index?taskId=${taskId}` });
  },

  goTaskResult(e) {
    const taskId = e.currentTarget.dataset.id;
    wx.navigateTo({ url: `/pages/employer/task-detail/index?id=${taskId}&result=1` });
  },

  goCreateTask() {
    wx.navigateTo({ url: '/pages/employer/create-task/index' });
  },

  goWallet() {
    wx.navigateTo({ url: '/pages/wallet/index' });
  },

  formatDateTime(dateStr) {
    return formatDateTime(dateStr);
  }
});
