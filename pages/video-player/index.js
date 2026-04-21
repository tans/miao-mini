const app = getApp();

Page({
  data: {
    videoUrl: '',
  },

  onLoad(options) {
    if (options.url) {
      this.setData({ videoUrl: decodeURIComponent(options.url) });
    }
  },

  goBack() {
    wx.navigateBack({
      fail: () => wx.switchTab({ url: '/pages/home/index' })
    });
  }
});