// utils/api.js - 创意喵小程序 API 服务层
const Api = {
  tokenKey: 'miao_token',
  userKey: 'miao_user',

  // API 请求基础地址，可通过 setApiBase 修改
  _apiBase: '',

  getApiBase() {
    if (this._apiBase) return this._apiBase;
    // 优先使用 app.globalData 中配置的后端地址
    const app = getApp();
    return app && app.globalData && app.globalData.apiBase || 'http://localhost:8888/api/v1';
  },

  setApiBase(base) {
    this._apiBase = base;
  },

  getToken() {
    return wx.getStorageSync(this.tokenKey);
  },

  setToken(token) {
    wx.setStorageSync(this.tokenKey, token);
  },

  clearToken() {
    wx.removeStorageSync(this.tokenKey);
    wx.removeStorageSync(this.userKey);
  },

  getUser() {
    const u = wx.getStorageSync(this.userKey);
    return u ? JSON.parse(u) : null;
  },

  setUser(user) {
    wx.setStorageSync(this.userKey, JSON.stringify(user));
  },

  isLoggedIn() {
    return !!this.getToken();
  },

  setAuth(token, user) {
    this.setToken(token);
    this.setUser(user);
    getApp().globalData.token = token;
    getApp().globalData.user = user;
  },

  clearAuth() {
    this.clearToken();
    getApp().globalData.token = null;
    getApp().globalData.user = null;
  },

  request(method, path, data = null, noAuth = false) {
    return new Promise((resolve, reject) => {
      const header = {
        'Content-Type': 'application/json',
      };
      if (!noAuth && this.getToken()) {
        header['Authorization'] = 'Bearer ' + this.getToken();
      }

      wx.request({
        url: this.getApiBase() + path,
        method,
        data,
        header,
        success: (res) => {
          if (res.data.code === 0) {
            resolve(res.data);
          } else {
            wx.showToast({ title: res.data.message || '请求失败', icon: 'none' });
            reject(new Error(res.data.message || '请求失败'));
          }
        },
        fail: (err) => {
          wx.showToast({ title: '网络请求失败', icon: 'none' });
          reject(err);
        }
      });
    });
  },

  // Auth
  loginByWechat(code) {
    return this.request('POST', '/auth/wechat-mini-login', { code }, true).then(res => {
      if (res.data && res.data.token) {
        this.setAuth(res.data.token, res.data.user);
      }
      return res;
    });
  },

  logout() {
    this.clearAuth();
  },

  getMe() {
    return this.request('GET', '/users/me');
  },

  // Tasks
  getTasks(params = {}) {
    const q = [];
    if (params.page) q.push(`page=${params.page}`);
    if (params.limit) q.push(`limit=${params.limit}`);
    if (params.keyword) q.push(`keyword=${params.keyword}`);
    if (params.sort) q.push(`sort=${params.sort}`);
    const qs = q.length ? '?' + q.join('&') : '';
    return this.request('GET', '/tasks' + qs, null, true);
  },

  async getTask(id) {
    // No single task fetch API, find in list
    const res = await this.getTasks({ limit: 100 });
    const task = (res.data && res.data.data || []).find(t => t.id == id || t.id === id);
    return { code: 0, message: 'success', data: task };
  },

  // Business
  createTask(data) {
    return this.request('POST', '/business/tasks', data);
  },

  getMyBusinessTasks(params = {}) {
    const q = [];
    if (params.page) q.push(`page=${params.page}`);
    if (params.status) q.push(`status=${params.status}`);
    const qs = q.length ? '?' + q.join('&') : '';
    return this.request('GET', '/business/tasks' + qs);
  },

  getTaskClaims(taskId) {
    return this.request('GET', `/business/tasks/${taskId}/claims`);
  },

  reviewClaim(claimId, result) {
    // result: 1=通过, 0=退回
    return this.request('PUT', `/business/claim/${claimId}/review`, { result });
  },

  // Creator
  claimTask(taskId) {
    return this.request('POST', '/creator/claim', { task_id: taskId });
  },

  getMyClaims(params = {}) {
    const q = [];
    if (params.page) q.push(`page=${params.page}`);
    const qs = q.length ? '?' + q.join('&') : '';
    return this.request('GET', '/creator/claims' + qs);
  },

  submitClaim(claimId, data) {
    return this.request('PUT', `/creator/claim/${claimId}/submit`, data);
  },

  // Wallet
  getWallet() {
    return this.request('GET', '/creator/wallet');
  },

  getTransactions() {
    return this.request('GET', '/creator/transactions');
  },

  // Stats
  getCreatorStats() {
    return this.request('GET', '/creator/stats');
  },

  getBusinessStats() {
    return this.request('GET', '/business/stats');
  },

  getBalance() {
    return this.request('GET', '/business/balance');
  },
};

module.exports = Api;
