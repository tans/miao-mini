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
    return app && app.globalData && app.globalData.apiBase || 'https://miao-test.clawos.cc/api/v1';
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
    if (!u) return null;
    try {
      return JSON.parse(u);
    } catch (e) {
      return null;
    }
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
          if (res.statusCode === 401) {
            Api.clearAuth();
            wx.reLaunch({ url: '/pages/login/index' });
            reject(new Error('登录已过期'));
            return;
          }
          if (res.data && res.data.code === 0) {
            resolve(res.data);
          } else {
            const msg = (res.data && res.data.message) || '请求失败';
            wx.showToast({ title: msg, icon: 'none' });
            reject(new Error(msg));
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

  updateProfile(data) {
    // data: { nickname, phone, avatar }
    return this.request('PUT', '/users/me', data);
  },

  // 上传图片到服务器，返回永久 URL（string）
  uploadImage(tempFilePath) {
    return new Promise((resolve, reject) => {
      wx.uploadFile({
        url: this.getApiBase() + '/upload?type=image',
        filePath: tempFilePath,
        name: 'file',
        header: { Authorization: 'Bearer ' + this.getToken() },
        success: (res) => {
          if (res.statusCode === 401) {
            Api.clearAuth();
            wx.reLaunch({ url: '/pages/login/index' });
            reject(new Error('登录已过期'));
            return;
          }
          try {
            const data = JSON.parse(res.data);
            if (data.code === 0 && data.data && data.data.url) {
              resolve(data.data.url);
            } else {
              const msg = (data && data.message) || '上传失败';
              wx.showToast({ title: msg, icon: 'none' });
              reject(new Error(msg));
            }
          } catch (e) {
            wx.showToast({ title: '上传响应解析失败', icon: 'none' });
            reject(e);
          }
        },
        fail: (err) => {
          wx.showToast({ title: '上传失败', icon: 'none' });
          reject(err);
        },
      });
    });
  },

  // Tasks
  getTasks(params = {}) {
    const q = [];
    if (params.page) q.push(`page=${params.page}`);
    if (params.limit) q.push(`limit=${params.limit}`);
    if (params.keyword) q.push(`keyword=${params.keyword}`);
    if (params.sort) q.push(`sort=${params.sort}`);
    if (params.status != null) q.push(`status=${params.status}`);
    const qs = q.length ? '?' + q.join('&') : '';
    return this.request('GET', '/tasks' + qs, null, true);
  },

  async getTask(id) {
    // Use single task endpoint from OpenAPI: GET /tasks/{id}
    return this.request('GET', `/tasks/${id}`, null, true);
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

  // data: { content: string, materials: [{file_name, file_path, file_size, file_type, thumbnail_path?}] }
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

  // Works
  getWork(id) {
    return this.request('GET', `/works/${id}`, null, true);
  },

  getWorks(params = {}) {
    const q = [];
    if (params.sort) q.push(`sort=${params.sort}`);
    if (params.page) q.push(`page=${params.page}`);
    if (params.limit) q.push(`limit=${params.limit}`);
    const qs = q.length ? '?' + q.join('&') : '';
    return this.request('GET', '/works' + qs, null, true);
  },
};

module.exports = Api;
