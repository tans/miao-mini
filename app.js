const config = require("./utils/config.js");
const Api = require("./utils/api.js");

const MESSAGE_TAB_PATH = "/pages/messages/index";
const MESSAGE_TAB_INDEX = 1;
const HOME_FONT_FAMILY = "home-din-pro-700-bold";
const HOME_FONT_PATH = "/assets/fonts/D-DIN-PRO-700-Bold.otf";
const PENDING_SUBMIT_KEY = "miao_pending_claim_submit";
const PENDING_POLL_INTERVAL = 4000;
const PENDING_POLL_MAX_DURATION = 15 * 60 * 1000;

App({
  globalData: {
    user: null,
    token: null,
    apiBase: config.apiBase,
    worksMode: "public",
    statusBarHeight: 20,
    unreadNotificationCount: 0,
  },

  // 登录锁，防止 onLaunch 和 onShow 并发登录
  _loginLock: false,
  _loginPromise: null,
  _homeFontLoaded: false,
  _pendingClaimTimer: null,
  _pendingClaimPolling: false,
  _pendingClaimStartedAt: 0,

  onLaunch() {
    this.loadHomeFontFace();

    // 获取状态栏高度和设备信息
    const info = wx.getSystemInfoSync();
    this.globalData.statusBarHeight = info.statusBarHeight || 20;

    // 读取缓存（同步），已登录则直接用缓存，未登录则静默登录
    const token = wx.getStorageSync("miao_token");
    const userStr = wx.getStorageSync("miao_user");
    if (token && userStr) {
      this.globalData.token = token;
      try {
        const parsedUser =
          typeof userStr === "string" ? JSON.parse(userStr) : userStr;
        this.globalData.user = Api.normalizeUserAvatar
          ? Api.normalizeUserAvatar(parsedUser)
          : parsedUser;
      } catch (e) {
        this.globalData.user = null;
      }
    } else {
      // 无缓存，静默登录
      this.silentLogin();
    }

    this.restorePendingClaimPolling();
  },

  onShow() {
    this.refreshNotificationBadge();
    this.restorePendingClaimPolling();
  },

  loadHomeFontFace() {
    if (this._homeFontLoaded) return;
    this._homeFontLoaded = true;

    try {
      wx.loadFontFace({
        global: true,
        family: HOME_FONT_FAMILY,
        source: `url("https://public.jisuhudong.com/minapp/D-DIN-PRO-700-Bold.ttf")`,
        success: () => {
          console.log('字体加载成功');
        },
        fail: (err) => {
          console.error('字体加载失败', err);
        }
      });
    } catch (err) {
      console.log(err);
      this._homeFontLoaded = false;
    }
  },

  // 静默登录：获取微信 code，调接口自动登录/注册
  silentLogin() {
    // 已有登录中的请求，等待它
    if (this._loginPromise) return this._loginPromise;
    // 正在登录中
    if (this._loginLock) return this._loginPromise;

    this._loginLock = true;
    this._loginPromise = this._doSilentLogin().finally(() => {
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
              title: "登录失败",
              content: "微信登录code无效，请检查网络后重试",
              showCancel: false,
            });
            return reject(new Error("invalid code"));
          }
          const Api = require("./utils/api.js");
          Api.loginByWechat(res.code)
            .then(() => resolve())
            .catch((err) => {
              wx.showModal({
                title: "登录失败",
                content: "服务器错误，请稍后重试",
                showCancel: false,
              });
              reject(err);
            });
        },
        fail: () => {
          wx.showModal({
            title: "登录失败",
            content: "无法连接微信，请检查网络后重试",
            showCancel: false,
          });
          reject(new Error("wx.login failed"));
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
    const normalizedUser = Api.normalizeUserAvatar
      ? Api.normalizeUserAvatar(user)
      : user;
    this.globalData.token = token;
    this.globalData.user = normalizedUser;
    wx.setStorageSync("miao_token", token);
    wx.setStorageSync("miao_user", JSON.stringify(normalizedUser));
  },

  clearAuth() {
    this.globalData.token = null;
    this.globalData.user = null;
    this.globalData.unreadNotificationCount = 0;
    wx.removeStorageSync("miao_token");
    wx.removeStorageSync("miao_user");
    wx.removeTabBarBadge({
      index: MESSAGE_TAB_INDEX,
      fail: () => {},
    });
  },

  startPendingClaimPolling(pending) {
    if (!pending || !pending.taskId) return;
    const previous = wx.getStorageSync(PENDING_SUBMIT_KEY) || {};
    const next = {
      taskId: String(pending.taskId),
      claimId: pending.claimId ? String(pending.claimId) : "",
      startedAt: Number(previous.startedAt) || Date.now(),
      state: "processing",
    };
    wx.setStorageSync(PENDING_SUBMIT_KEY, next);
    this._pendingClaimStartedAt = next.startedAt;
    this._ensurePendingClaimTimer();
  },

  restorePendingClaimPolling() {
    const pending = wx.getStorageSync(PENDING_SUBMIT_KEY);
    if (!pending || !pending.taskId) return;
    if (pending.state === "done") {
      this.stopPendingClaimPolling(true);
      return;
    }
    this._pendingClaimStartedAt = Number(pending.startedAt) || Date.now();
    this._ensurePendingClaimTimer();
  },

  stopPendingClaimPolling(keepStorage = false) {
    if (this._pendingClaimTimer) {
      clearInterval(this._pendingClaimTimer);
      this._pendingClaimTimer = null;
    }
    this._pendingClaimPolling = false;
    this._pendingClaimStartedAt = 0;
    if (!keepStorage) {
      wx.removeStorageSync(PENDING_SUBMIT_KEY);
    }
  },

  _ensurePendingClaimTimer() {
    if (this._pendingClaimTimer) return;
    this._pendingClaimTimer = setInterval(() => {
      this._pollPendingClaim();
    }, PENDING_POLL_INTERVAL);
    this._pollPendingClaim();
  },

  async _pollPendingClaim() {
    if (this._pendingClaimPolling) return;
    const pending = wx.getStorageSync(PENDING_SUBMIT_KEY);
    if (!pending || !pending.taskId) {
      this.stopPendingClaimPolling();
      return;
    }
    if (!this._pendingClaimStartedAt) {
      this._pendingClaimStartedAt = Number(pending.startedAt) || Date.now();
    }
    if (Date.now() - this._pendingClaimStartedAt >= PENDING_POLL_MAX_DURATION) {
      this.stopPendingClaimPolling();
      return;
    }

    this._pendingClaimPolling = true;
    try {
      const res = await Api.getTask(pending.taskId);
      const task = res && res.data ? res.data : {};
      const materials = Array.isArray(task.claim_materials) ? task.claim_materials : [];
      const hasRecoverableVideo = materials.some((item) => {
        const type = String(item && (item.file_type || item.fileType) || '').toLowerCase();
        if (!type.includes('video')) return false;
        const status = String(item && (item.process_status || item.processStatus) || '').toLowerCase();
        return status === 'pending' || status === 'processing' || status === 'failed';
      });
      if (!hasRecoverableVideo) {
        wx.setStorageSync(PENDING_SUBMIT_KEY, {
          ...pending,
          state: "done",
          finishedAt: Date.now(),
        });
        this.stopPendingClaimPolling(true);
      }
    } catch (err) {
      if (err && err.message === "登录已过期") {
        this.stopPendingClaimPolling();
      }
    } finally {
      this._pendingClaimPolling = false;
    }
  },

  setWorksMode(mode) {
    const nextMode = mode === "adopted" ? "adopted" : "public";
    this.globalData.worksMode = nextMode;
  },

  getWorksMode() {
    return this.globalData.worksMode || "public";
  },

  async refreshNotificationBadge() {
    if (!this.isLoggedIn()) {
      this.globalData.unreadNotificationCount = 0;
      wx.removeTabBarBadge({
        index: MESSAGE_TAB_INDEX,
        fail: () => {},
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
          text: count > 99 ? "99+" : String(count),
          fail: () => {},
        });
      } else {
        wx.removeTabBarBadge({
          index: MESSAGE_TAB_INDEX,
          fail: () => {},
        });
      }
      return count;
    } catch (err) {
      if (err && err.message === "登录已过期") {
        this.clearAuth();
      }
      return this.globalData.unreadNotificationCount || 0;
    }
  },

  isTabPage(path) {
    return (
      path === "/pages/home/index" ||
      path === MESSAGE_TAB_PATH ||
      path === "/pages/mine/index"
    );
  },
});
