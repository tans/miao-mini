const app = getApp();
const Api = require('../../utils/api.js');

Component({
  properties: {
    title: {
      type: String,
      value: '创意喵'
    },
    subtitle: {
      type: String,
      value: ''
    },
    msgCount: {
      type: Number,
      value: 0
    },
    showBack: {
      type: Boolean,
      value: false
    }
  },

  data: {
    statusBarHeight: 20,
    innerMsgCount: 0
  },

  lifetimes: {
    attached() {
      this.setData({
        statusBarHeight: app.globalData.statusBarHeight || 20
      });
      this.refreshUnreadCount();
    }
  },

  pageLifetimes: {
    show() {
      this.refreshUnreadCount();
    }
  },

  methods: {
    async refreshUnreadCount() {
      if (this.properties.msgCount > 0) {
        this.setData({ innerMsgCount: this.properties.msgCount });
        return;
      }
      if (!app.isLoggedIn()) {
        this.setData({ innerMsgCount: 0 });
        return;
      }
      try {
        const count = await app.refreshNotificationBadge();
        this.setData({ innerMsgCount: Number(count) || 0 });
      } catch (err) {
        this.setData({ innerMsgCount: 0 });
      }
    },

    onMessageTap() {
      wx.switchTab({
        url: '/pages/messages/index'
      });
    },

    onBackTap() {
      wx.navigateBack({
        delta: 1
      });
    }
  }
});
