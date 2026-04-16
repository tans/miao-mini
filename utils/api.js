// utils/api.js - 创意喵小程序 API 服务层
const Api = {
  tokenKey: 'miao_token',
  userKey: 'miao_user',

  // API 璇锋眰鍩虹鍦板潃锛屽彲閫氳繃 setApiBase 淇敼
  _apiBase: '',

  getApiBase() {
    if (this._apiBase) return this._apiBase;
    // 浼樺厛浣跨敤 app.globalData 涓厤缃殑鍚庣鍦板潃
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
            reject(new Error('登录已过期'));
            return;
          }
          let data = res.data;
          // Handle non-JSON responses (e.g., HTML error pages)
          if (typeof data === 'string') {
            try {
              data = JSON.parse(data);
            } catch (e) {
              reject(new Error('服务器响应异常'));
              return;
            }
          }
          if (data && data.code === 0) {
            resolve(data);
          } else {
            const msg = (data && data.message) || '璇锋眰澶辫触';
            reject(new Error(msg));
          }
        },
        fail: (err) => {
          const msg = err && (err.message || err.errMsg) || '缃戠粶璇锋眰澶辫触';
          reject(new Error(msg));
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

  bindPhone(detail) {
    // detail: { code, encryptedData, iv } from getPhoneNumber
    return this.request('POST', '/users/bind-phone', detail);
  },

  // 上传图片到服务器，返回永久 URL
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
            reject(new Error('登录已过期'));
            return;
          }
          try {
            const data = JSON.parse(res.data);
            if (data.code === 0 && data.data && data.data.url) {
              // 淇濆瓨涓婁紶鏃堕棿
              wx.setStorageSync('lastUploadTime', new Date().toISOString());
              // Ensure URL is absolute for WeChat image component
              const url = data.data.url;
              if (url.startsWith('/')) {
                // Prepend API base (without /api/v1) to relative URLs
                const base = this.getApiBase().replace(/\/api\/v1$/, '');
                resolve(base + url);
              } else {
                resolve(url);
              }
            } else {
              const msg = (data && data.message) || '涓婁紶澶辫触';
              wx.showToast({ title: msg, icon: 'none' });
              reject(new Error(msg));
            }
          } catch (e) {
            wx.showToast({ title: '涓婁紶鍝嶅簲瑙ｆ瀽澶辫触', icon: 'none' });
            reject(e);
          }
        },
        fail: (err) => {
          wx.showToast({ title: '涓婁紶澶辫触', icon: 'none' });
          reject(err);
        },
      });
    });
  },


  // 上传视频到服务器，返回永久 URL
  uploadVideo(tempFilePath) {
    return new Promise((resolve, reject) => {
      wx.uploadFile({
        url: this.getApiBase() + '/upload?type=video',
        filePath: tempFilePath,
        name: 'file',
        header: { Authorization: 'Bearer ' + this.getToken() },
        success: (res) => {
          if (res.statusCode === 401) {
            Api.clearAuth();
            reject(new Error('登录已过期'));
            return;
          }
          try {
            const data = JSON.parse(res.data);
            if (data.code === 0 && data.data && data.data.url) {
              // 淇濆瓨涓婁紶鏃堕棿
              wx.setStorageSync('lastUploadTime', new Date().toISOString());
              // Ensure URL is absolute for WeChat video component
              const url = data.data.url;
              if (url.startsWith('/')) {
                const base = this.getApiBase().replace(/\/api\/v1$/, '');
                resolve(base + url);
              } else {
                resolve(url);
              }
            } else {
              const msg = (data && data.message) || '涓婁紶澶辫触';
              wx.showToast({ title: msg, icon: 'none' });
              reject(new Error(msg));
            }
          } catch (e) {
            wx.showToast({ title: '涓婁紶鍝嶅簲瑙ｆ瀽澶辫触', icon: 'none' });
            reject(e);
          }
        },
        fail: (err) => {
          wx.showToast({ title: '涓婁紶澶辫触', icon: 'none' });
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

  getTaskSignups(taskId) {
    return this.request('GET', `/business/tasks/${taskId}/signups`);
  },

  reviewClaim(claimId, result) {
    // result: 1=閫氳繃, 0=閫€鍥?    return this.request('PUT', `/business/claim/${claimId}/review`, { result });
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

  cancelClaim(claimId) {
    return this.request('DELETE', `/creator/claim/${claimId}`);
  },

  getClaimById(claimId) {
    return this.request('GET', `/creator/claim/${claimId}`);
  },

  getClaimByTaskId(taskId) {
    return this.request('GET', `/creator/claim/by-task/${taskId}`);
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
    return this.request('GET', `/inspirations/${id}`, null, true);
  },

  getWorkLikeStatus(id) {
    return this.request('GET', `/inspirations/${id}/like-status`);
  },

  likeWork(id) {
    return this.request('POST', `/inspirations/${id}/like`, {});
  },

  unlikeWork(id) {
    return this.request('DELETE', `/inspirations/${id}/like`);
  },

  getWorks(params = {}) {
    const q = [];
    if (params.sort) q.push(`sort=${encodeURIComponent(params.sort)}`);
    if (params.keyword) q.push(`keyword=${encodeURIComponent(params.keyword)}`);
    if (params.tag) q.push(`tag=${encodeURIComponent(params.tag)}`);
    if (params.page) q.push(`page=${params.page}`);
    if (params.limit) q.push(`limit=${params.limit}`);
    const qs = q.length ? '?' + q.join('&') : '';
    return this.request('GET', '/inspirations' + qs, null, true);
  },

  // Admin - User Management
  getAdminUsers(params = {}) {
    const q = [];
    if (params.page) q.push(`page=${params.page}`);
    if (params.page_size) q.push(`page_size=${params.page_size}`);
    if (params.role) q.push(`role=${params.role}`);
    if (params.status) q.push(`status=${params.status}`);
    if (params.search) q.push(`search=${encodeURIComponent(params.search)}`);
    const qs = q.length ? '?' + q.join('&') : '';
    return this.request('GET', '/admin/users' + qs);
  },

  updateUserStatus(id, status) {
    return this.request('PUT', `/admin/users/${id}/status`, { status });
  },

  updateUserBalance(id, change, reason) {
    return this.request('PUT', `/admin/users/${id}/balance`, { change, reason });
  },

  getAdminUserTransactions(userId, params = {}) {
    const q = [];
    if (params.type) q.push(`type=${params.type}`);
    if (params.page) q.push(`page=${params.page}`);
    if (params.limit) q.push(`limit=${params.limit}`);
    const qs = q.length ? '?' + q.join('&') : '';
    return this.request('GET', `/admin/users/${userId}/transactions` + qs);
  },
};

module.exports = Api;





