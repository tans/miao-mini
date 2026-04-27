const config = require('./utils/config.js');
const Api = require('./utils/api.js');

const MESSAGE_TAB_PATH = '/pages/messages/index';
const MESSAGE_TAB_INDEX = 1;

App({
  globalData: {
    user: null,
    token: null,
    apiBase: config.apiBase,
    worksMode: 'public',
    statusBarHeight: 20,
    unreadNotificationCount: 0,
  },

  // 登录锁，防止 onLaunch 和 onShow 并发登录
  _loginLock: false,
  _loginPromise: null,

  onLaunch() {
    // 获取状态栏高度和设备信息
    const info = wx.getSystemInfoSync();
    this.globalData.statusBarHeight = info.statusBarHeight || 20;

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

  onShow() {
    this.refreshNotificationBadge();
  },

  // 静默登录：获取微信 code，调接口自动登录/注册
  silentLogin() {
    // 已有登录中的请求，等待它
    if (this._loginPromise) return this._loginPromise;
    // 正在登录中
    if (this._loginLock) return this._loginPromise;

    this._loginLock = true;
    this._loginPromise = this._doSilentLogin()
      .finally(() => {
        this._loginLock = false;
        this._loginPromise = null;
      });

    return this._loginPromise;
  },

  async _doSilentLogin() {
    return new Promise((resolve, reject) => {
      wx.login({
        success: (res) => {
          if (!res.code) {
            wx.showModal({
              title: '登录失败',
              content: '微信登录code无效，请检查网络后重试',
              showCancel: false,
            });
            return reject(new Error('invalid code'));
          }
          const Api = require('./utils/api.js');
          Api.loginByWechat(res.code)
            .then(() => resolve())
            .catch((err) => {
              wx.showModal({
                title: '登录失败',
                content: '服务器错误，请稍后重试',
                showCancel: false,
              });
              reject(err);
            });
        },
        fail: () => {
          wx.showModal({
            title: '登录失败',
            content: '无法连接微信，请检查网络后重试',
            showCancel: false,
          });
          reject(new Error('wx.login failed'));
        },
      });
    });
  },

  isLoggedIn() {
    return !!this.globalData.token;
  },

  // 等待登录完成（从缓存或静默登录）
  // 如果已登录则立即 resolve；如果正在登录则等待；如果未登录且无缓存则触发登录并等待
  waitForLogin() {
    const token = wx.getStorageSync("miao_token");
    const userStr = wx.getStorageSync("miao_user");
    if (token && userStr) {
      // 已有缓存，直接 resolve
      return Promise.resolve();
    }
    // 未登录，返回静默登录的 promise
    return this.silentLogin().catch(() => {});
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
    this.globalData.unreadNotificationCount = 0;
    wx.removeStorageSync("miao_token");
    wx.removeStorageSync("miao_user");
    wx.removeTabBarBadge({
      index: MESSAGE_TAB_INDEX,
      fail: () => {}
    });
  },

  setWorksMode(mode) {
    const nextMode = mode === 'adopted' ? 'adopted' : 'public';
    this.globalData.worksMode = nextMode;
  },

  getWorksMode() {
    return this.globalData.worksMode || 'public';
  },

  async refreshNotificationBadge() {
    if (!this.isLoggedIn()) {
      this.globalData.unreadNotificationCount = 0;
      wx.removeTabBarBadge({
        index: MESSAGE_TAB_INDEX,
        fail: () => {}
      });
      return 0;
    }

    try {
      const res = await Api.getUnreadNotificationCount();
      const count = Number(res && res.data && res.data.count) || 0;
      this.globalData.unreadNotificationCount = count;
      if (count > 0) {
        wx.setTabBarBadge({
          index: MESSAGE_TAB_INDEX,
          text: count > 99 ? '99+' : String(count),
          fail: () => {}
        });
      } else {
        wx.removeTabBarBadge({
          index: MESSAGE_TAB_INDEX,
          fail: () => {}
        });
      }
      return count;
    } catch (err) {
      if (err && err.message === '登录已过期') {
        this.clearAuth();
      }
      return this.globalData.unreadNotificationCount || 0;
    }
  },

  isTabPage(path) {
    return path === '/pages/home/index' || path === MESSAGE_TAB_PATH || path === '/pages/mine/index';
  }
});
