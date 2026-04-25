// utils/api.js - 创意喵小程序 API 服务层
const config = require('./config.js');

const Api = {
  tokenKey: 'miao_token',
  userKey: 'miao_user',

  // API 请求地址级别，可通过 setApiBase 修改
  _apiBase: '',

  getApiBase() {
    if (this._apiBase) return this._apiBase;
    // 优先使用 app.globalData 中配置的后端地址
    const app = getApp();
    return app && app.globalData && app.globalData.apiBase || config.apiBase;
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
            const msg = (data && data.message) || '请求失败';
            const err = new Error(msg);
            err.code = data && data.code;
            err.data = data && data.data;
            err.raw = data;
            reject(err);
          }
        },
        fail: (err) => {
          const msg = err && (err.message || err.errMsg) || '网络请求失败';
          const error = new Error(msg);
          error.raw = err;
          reject(error);
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
              // 保存上传时间
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


  // Upload video using Tencent COS pre-signed URL
  uploadVideo(tempFilePath, options = {}) {
    const query = [
      'type=video',
      `biz_type=${encodeURIComponent(options.bizType || '')}`,
      `biz_id=${encodeURIComponent(options.bizId || '')}`,
      `job_id=${encodeURIComponent(options.jobId || '')}`,
    ].join('&');
    const url = `${this.getApiBase()}/upload?${query}`;
    const token = this.getToken();

    return new Promise((resolve, reject) => {
      wx.uploadFile({
        url,
        filePath: tempFilePath,
        name: 'file',
        header: token ? { Authorization: 'Bearer ' + token } : {},
        success: (res) => {
          if (res.statusCode === 401) {
            Api.clearAuth();
            reject(new Error('登录已过期'));
            return;
          }
          let data = res.data;
          if (typeof data === 'string') {
            try {
              data = JSON.parse(data);
            } catch (e) {
              reject(new Error('上传响应解析失败'));
              return;
            }
          }
          if (data && data.code === 0 && data.data && data.data.url) {
            wx.setStorageSync('lastUploadTime', new Date().toISOString());
            const result = {
              url: data.data.url,
              key: data.data.key || '',
              jobId: data.data.job_id || options.jobId || '',
              filename: data.data.filename || tempFilePath.split('/').pop() || 'video.mp4',
              size: data.data.size || 0,
              type: data.data.type || 'video',
            };
            resolve(options.returnMeta ? result : result.url);
            return;
          }
          reject(new Error((data && data.message) || '上传失败'));
        },
        fail: (err) => {
          const msg = err && (err.message || err.errMsg) || '上传失败';
          reject(new Error(msg));
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
    // Carry auth when available so task detail can include current user's claim state.
    return this.request('GET', `/tasks/${id}`);
  },

  // Business
  createTask(data) {
    return this.request('POST', '/business/tasks', data);
  },

  // Merchant Auth
  getMerchantAuthStatus() {
    return this.request('GET', '/business/merchant/auth/status');
  },

  submitMerchantAuth(data) {
    // data: { company_name, contact_name, contact_phone, license_url }
    return this.request('POST', '/business/merchant/auth', data);
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

  reviewClaim(claimId, result, reason) {
    // result: 3=已采纳, 4=已取消, 5=已淘汰, 6=已举报
    const data = { result };
    if (reason) data.reason = reason;
    return this.request('PUT', `/business/claim/${claimId}/review`, data);
  },

  batchReviewClaim(claimIds, result, reason) {
    // result: 3=已采纳, 4=已取消, 5=已淘汰, 6=已举报
    const data = { claim_ids: claimIds, result };
    if (reason) data.reason = reason;
    return this.request('PUT', `/business/claims/batch-review`, data);
  },

  updateTaskJimengLink(taskId, jimengLink) {
    return this.request('PUT', `/business/tasks/${taskId}`, { jimeng_link: jimengLink });
  },

  // AI task description generation
  aiWriteTaskDescription(data) {
    // data: { title, industries, styles }
    return this.request('POST', '/business/tasks/ai-write', data);
  },

  // Creator
  claimTask(taskId) {
    const numericTaskId = Number(taskId);
    const payloadTaskId = Number.isFinite(numericTaskId) && String(numericTaskId) === String(taskId).trim()
      ? numericTaskId
      : taskId;
    return this.request('POST', '/creator/claim', { task_id: payloadTaskId });
  },

  getMyClaims(params = {}) {
    const q = [];
    if (params.page) q.push(`page=${params.page}`);
    if (params.limit) q.push(`limit=${params.limit}`);
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

  // Appeals
  createAppeal(data) {
    // data: { type: 1, target_id: claimId, reason: string, evidence: string (optional, image urls joined by comma) }
    return this.request('POST', '/appeals', data);
  },

  getAppeals(params = {}) {
    const q = [];
    if (params.limit) q.push(`limit=${params.limit}`);
    if (params.offset) q.push(`offset=${params.offset}`);
    const qs = q.length ? '?' + q.join('&') : '';
    return this.request('GET', '/appeals' + qs);
  },

  // Wallet
  getWallet() {
    return this.request('GET', '/creator/wallet');
  },

  recharge(amount) {
    return this.request('POST', '/business/recharge', { amount });
  },

  withdraw(amount) {
    return this.request('POST', '/creator/withdraw', { amount });
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

  getInspirationList(params = {}) {
    const q = [];
    if (params.category && params.category !== 'all') q.push(`category=${encodeURIComponent(params.category)}`);
    if (params.sort && params.sort !== 'default') q.push(`sort=${encodeURIComponent(params.sort)}`);
    if (params.keyword) q.push(`keyword=${encodeURIComponent(params.keyword)}`);
    if (params.tag) q.push(`tag=${encodeURIComponent(params.tag)}`);
    if (params.page) q.push(`page=${params.page}`);
    if (params.limit) q.push(`limit=${params.limit}`);
    const qs = q.length ? '?' + q.join('&') : '';
    return this.request('GET', '/inspirations' + qs, null, true);
  },

  getBusinessWorks(params = {}) {
    const q = [];
    if (params.sort) q.push(`sort=${encodeURIComponent(params.sort)}`);
    if (params.keyword) q.push(`keyword=${encodeURIComponent(params.keyword)}`);
    if (params.tag) q.push(`tag=${encodeURIComponent(params.tag)}`);
    if (params.page) q.push(`page=${params.page}`);
    if (params.limit) q.push(`limit=${params.limit}`);
    const qs = q.length ? '?' + q.join('&') : '';
    return this.request('GET', '/business/inspirations' + qs);
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
