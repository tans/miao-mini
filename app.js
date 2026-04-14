// 创意喵 - 视频任务平台
App({
  globalData: {
    user: null,
    token: null,
    apiBase: '', // 动态设置
  },

  // 登录锁，防止 onLaunch 和 onShow 并发登录
  _loginLock: false,
  _loginPromise: null,

  onLaunch() {
    // 检测运行环境：只有微信开发者工具才用 localhost
    const info = wx.getDeviceInfo();
    const isDevtools = info.platform === 'devtools';
    this.globalData.apiBase = isDevtools
      ? 'http://localhost:8888/api/v1'
      : 'https://miao-test.clawos.cc/api/v1';

    // 读取缓存（同步），已登录则直接用缓存，未登录则静默登录
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
    } else {
      // 无缓存，静默登录
      this.silentLogin();
    }
  },

  // 静默登录：获取微信 code，调接口自动登录/注册
  silentLogin() {
    // 已有登录中的请求，等待它
    if (this._loginPromise) return this._loginPromise;
    // 正在登录中
    if (this._loginLock) return;

    this._loginLock = true;
    this._loginPromise = this._doSilentLogin()
      .finally(() => {
        this._loginLock = false;
        this._loginPromise = null;
      });

    return this._loginPromise;
  },

  async _doSilentLogin() {
    return new Promise((resolve) => {
      wx.login({
        success: (res) => {
          const code = res.code || 'dev_' + Date.now();
          const Api = require('./utils/api.js');
          Api.loginByWechat(code)
            .then(() => resolve())
            .catch(() => resolve()); // 静默失败不影响主流程
        },
        fail: () => resolve(), // 微信登录失败也继续
      });
    });
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
