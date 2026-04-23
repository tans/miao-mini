const app = getApp();

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
    statusBarHeight: 20
  },

  lifetimes: {
    attached() {
      this.setData({
        statusBarHeight: app.globalData.statusBarHeight || 20
      });
    }
  },

  methods: {
    onMessageTap() {
      // 跳转到消息页面
      wx.navigateTo({
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