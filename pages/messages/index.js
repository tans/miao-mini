const Api = require('../../utils/api.js');

const app = getApp();

function pad(value) {
  return value < 10 ? `0${value}` : `${value}`;
}

function formatTimeLabel(value) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';

  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfTarget = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const diffDays = Math.round((startOfToday.getTime() - startOfTarget.getTime()) / 86400000);

  if (diffDays === 0) {
    return `${pad(date.getHours())}:${pad(date.getMinutes())}`;
  }
  if (diffDays === 1) {
    return '昨天';
  }
  return `${pad(date.getMonth() + 1)}/${pad(date.getDate())}`;
}

function getVisualMeta(item = {}) {
  const bizType = item.biz_type || '';
  const type = item.type || '';

  if (type === 'review_passed') {
    return { iconText: '过审', iconClass: 'success', typeLabel: '审核结果' };
  }
  if (type === 'review_rejected' || type === 'task_review_rejected') {
    return { iconText: '退回', iconClass: 'danger', typeLabel: '审核结果' };
  }
  if (type === 'appeal_created' || type === 'appeal_handled' || bizType === 'appeal') {
    return { iconText: '申诉', iconClass: 'purple', typeLabel: '申诉通知' };
  }
  if (type === 'task_cancelled') {
    return { iconText: '关闭', iconClass: 'danger', typeLabel: '任务变更' };
  }
  if (type === 'claim_created' || type === 'task_claimed' || bizType === 'claim') {
    return { iconText: '认领', iconClass: 'orange', typeLabel: '任务动态' };
  }
  if (type === 'submission_received' || type === 'submission_submitted') {
    return { iconText: '投稿', iconClass: 'blue', typeLabel: '投稿动态' };
  }
  if (type === 'task_created' || type === 'task_review_passed' || bizType === 'task') {
    return { iconText: '任务', iconClass: 'orange', typeLabel: '任务动态' };
  }
  if (type === 'wallet' || bizType === 'wallet') {
    return { iconText: '钱包', iconClass: 'success', typeLabel: '资金通知' };
  }
  return { iconText: '系统', iconClass: 'gray', typeLabel: item.type_str || '系统消息' };
}

function normalizeNotification(item = {}) {
  const visual = getVisualMeta(item);
  return {
    ...item,
    is_read: !!item.is_read,
    timeText: formatTimeLabel(item.created_at),
    iconText: visual.iconText,
    iconClass: visual.iconClass,
    typeLabel: visual.typeLabel
  };
}

Page({
  data: {
    statusBarHeight: 20,
    currentFilter: 'all',
    notifications: [],
    page: 1,
    limit: 20,
    hasMore: true,
    loading: false,
    unreadCount: 0,
    loaded: false
  },

  onLoad() {
    this.setData({
      statusBarHeight: app.globalData.statusBarHeight || 20
    });
  },

  onShow() {
    app.waitForLogin().finally(() => {
      this.refreshAll();
    });
  },

  onPullDownRefresh() {
    this.refreshAll().finally(() => wx.stopPullDownRefresh());
  },

  onReachBottom() {
    this.loadNotifications();
  },

  async refreshAll() {
    await Promise.all([
      this.refreshUnreadCount(),
      this.loadNotifications(true)
    ]);
  },

  async refreshUnreadCount() {
    try {
      const count = await app.refreshNotificationBadge();
      this.setData({ unreadCount: Number(count) || 0 });
    } catch (err) {
      this.setData({ unreadCount: 0 });
    }
  },

  async loadNotifications(refresh = false) {
    if (this.data.loading) return;
    if (!refresh && !this.data.hasMore) return;

    const nextPage = refresh ? 1 : this.data.page;
    this.setData({ loading: true });

    try {
      const res = await Api.getNotifications({
        page: nextPage,
        limit: this.data.limit,
        isRead: this.data.currentFilter === 'unread' ? false : null
      });
      const payload = res && res.data ? res.data : {};
      const list = Array.isArray(payload.notifications) ? payload.notifications.map(normalizeNotification) : [];
      const total = Number(payload.total) || 0;
      const notifications = refresh ? list : this.data.notifications.concat(list);
      this.setData({
        notifications,
        page: nextPage + 1,
        hasMore: notifications.length < total,
        loaded: true
      });
    } catch (err) {
      if (refresh) {
        this.setData({
          notifications: [],
          hasMore: false,
          loaded: true
        });
      }
      wx.showToast({
        title: err.message || '加载失败',
        icon: 'none'
      });
    } finally {
      this.setData({ loading: false });
    }
  },

  switchFilter(e) {
    const filter = e.currentTarget.dataset.filter || 'all';
    if (filter === this.data.currentFilter) return;
    this.setData({
      currentFilter: filter,
      notifications: [],
      page: 1,
      hasMore: true
    });
    this.loadNotifications(true);
  },

  async markAllRead() {
    if (!this.data.unreadCount) return;
    try {
      await Api.markAllNotificationsRead();
      this.setData({
        unreadCount: 0,
        notifications: this.data.notifications.map(item => ({ ...item, is_read: true }))
      });
      await app.refreshNotificationBadge();
      if (this.data.currentFilter === 'unread') {
        this.loadNotifications(true);
      }
      wx.showToast({
        title: '已全部标记为已读',
        icon: 'none'
      });
    } catch (err) {
      wx.showToast({
        title: err.message || '操作失败',
        icon: 'none'
      });
    }
  },

  async openNotification(e) {
    const id = e.currentTarget.dataset.id;
    const targetPath = e.currentTarget.dataset.target || '';
    const index = Number(e.currentTarget.dataset.index);
    const item = this.data.notifications[index];

    if (!item) return;

    if (!item.is_read) {
      try {
        await Api.markNotificationRead(id);
      } catch (err) {}
      const notifications = this.data.notifications.slice();
      notifications[index] = { ...item, is_read: true };
      this.setData({
        notifications,
        unreadCount: Math.max(0, this.data.unreadCount - 1)
      });
      app.refreshNotificationBadge();
      if (this.data.currentFilter === 'unread') {
        this.loadNotifications(true);
      }
    }

    if (!targetPath) return;

    if (app.isTabPage(targetPath)) {
      wx.switchTab({ url: targetPath });
      return;
    }

    wx.navigateTo({
      url: targetPath,
      fail: () => {
        wx.showToast({
          title: '暂不支持跳转',
          icon: 'none'
        });
      }
    });
  }
});
