// 创意喵 - 视频任务平台
App({
  globalData: {
    user: null,
    token: null,
    // apiBase: 'https://miao-test.clawos.cc/api/v1'
    apiBase: "http://localhost:8888/api/v1",
  },

  onLaunch() {
    // 检查登录状态
    const token = wx.getStorageSync("miao_token");
    const userStr = wx.getStorageSync("miao_user");
    if (token && userStr) {
      this.globalData.token = token;
      try {
        this.globalData.user =
          typeof userStr === "string" ? JSON.parse(userStr) : userStr;
      } catch (e) {
        this.globalData.user = null;
      }
    }
  },

  isLoggedIn() {
    return !!this.globalData.token;
  },

  getUser() {
    return this.globalData.user;
  },

  getToken() {
    return this.globalData.token;
  },

  setAuth(token, user) {
    this.globalData.token = token;
    this.globalData.user = user;
    wx.setStorageSync("miao_token", token);
    wx.setStorageSync("miao_user", JSON.stringify(user));
  },

  clearAuth() {
    this.globalData.token = null;
    this.globalData.user = null;
    wx.removeStorageSync("miao_token");
    wx.removeStorageSync("miao_user");
  },
});
