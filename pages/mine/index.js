const Api = require('../../utils/api.js');
const app = getApp();
const buildInfo = require('../../build-info.js');

Page({
  data: {
    navPinned: false,
    navElevated: false,
    navSlotPx: 64,
    user: null,
    balance: '0.00',
    isLoggedIn: false,
    displayText: '',
    avatarSrc: Api.getAvatarMeta().avatarSrc,
    creatorStats: {
      level: 0,
      level_name: '试用创作者',
      adopted_count: 0,
      daily_limit: 3,
      commission_rate: '10%',
      next_level_name: '新手创作者',
      need_count: 1,
      level_rules: [],
      pending_count: 0
    },
    bizStats: {
      accepted_count: 0,
      pending_count: 0,
      adopted_count: 0
    },
    merchantAuthStatus: 'uncertified',
    merchantAuthActionText: '去认证',
    merchantAuthActionClass: 'is-uncertified',
    pendingAppealCount: 0
  },

  onLoad() {
    this._navScrollTimer = null;
    this._lastScrollTop = 0;
    const statusBar = app.globalData.statusBarHeight || 20;
    this.setData({ navSlotPx: statusBar + 44 });
  },

  onShow() {
    this.refreshPageData();
  },

  onHide() {
    if (this._navScrollTimer) {
      clearTimeout(this._navScrollTimer);
      this._navScrollTimer = null;
    }
  },

  onUnload() {
    if (this._navScrollTimer) {
      clearTimeout(this._navScrollTimer);
      this._navScrollTimer = null;
    }
  },

  onPageScroll(e) {
    this._lastScrollTop = Number(e.scrollTop) || 0;
    if (this._navScrollTimer) {
      clearTimeout(this._navScrollTimer);
    }
    this._navScrollTimer = setTimeout(() => {
      this._navScrollTimer = null;
      this._syncNavWithScroll(this._lastScrollTop);
    }, 16);
  },

  _syncNavWithScroll(scrollTop) {
    const pinned = scrollTop >= 1;
    const query = wx.createSelectorQuery().in(this);
    query.select('#mine-top-anchor').boundingClientRect();
    query.exec((res) => {
      const rect = res && res[0];
      if (!rect || typeof rect.top !== 'number') {
        if (pinned !== this.data.navPinned || this.data.navElevated) {
          this.setData({ navPinned: pinned, navElevated: false });
        }
        return;
      }
      const elevated = rect.top < 0;
      if (pinned !== this.data.navPinned || elevated !== this.data.navElevated) {
        this.setData({ navPinned: pinned, navElevated: elevated });
      }
    });
  },

  isLoginExpiredError(err) {
    return !!(err && err.message === '登录已过期');
  },

  async refreshPageData(retried = false) {
    this.setData({ isLoggedIn: app.isLoggedIn() });
    this.updateDisplayText();

    if (!app.isLoggedIn()) {
      this.setData({
        user: null,
        balance: '0.00',
        avatarSrc: Api.getAvatarMeta().avatarSrc,
        merchantAuthStatus: 'uncertified',
        merchantAuthActionText: '去认证',
        merchantAuthActionClass: 'is-uncertified',
        pendingAppealCount: 0
      });

      try {
        await app.silentLogin();
      } catch (err) {
        console.warn('[mine] silent login failed', err);
      }

      this.setData({ isLoggedIn: app.isLoggedIn() });
      if (!app.isLoggedIn()) {
        return;
      }
    }

    try {
      await this.loadUserAndWallet();
      await this.loadMineStats();
      await this.loadMerchantAuthStatus();
      await this.loadPendingAppealCount();
    } catch (err) {
      if (!retried && this.isLoginExpiredError(err)) {
        try {
          await app.silentLogin();
          this.setData({ isLoggedIn: app.isLoggedIn() });
          if (app.isLoggedIn()) {
            return this.refreshPageData(true);
          }
        } catch (loginErr) {
          console.warn('[mine] relogin failed', loginErr);
        }
      }
      console.warn('[mine] refresh page data failed', err);
    }
  },

  onPullDownRefresh() {
    this.refreshPageData().finally(() => wx.stopPullDownRefresh());
  },

  async loadUserAndWallet() {
    const [userResult, walletResult] = await Promise.all([
      Api.getMe()
        .then((value) => ({ ok: true, value }))
        .catch((error) => ({ ok: false, error })),
      Api.getWallet()
        .then((value) => ({ ok: true, value }))
        .catch((error) => ({ ok: false, error })),
    ]);

    const authError = [userResult, walletResult].find((result) => (
      !result.ok && this.isLoginExpiredError(result.error)
    ));
    if (authError) {
      throw authError.error;
    }

    if (userResult.ok) {
      const user = userResult.value.data || {};
      const previousUser = this.data.user || app.globalData.user || {};
      const normalizedAvatar = Api.getRawDisplayUrl(user.avatar) || Api.getRawDisplayUrl(previousUser.avatar);
      const normalizedUser = { ...user, avatar: normalizedAvatar };
      const avatarMeta = Api.getAvatarMeta(normalizedUser);
      // 更新全局用户缓存
      app.setAuth(app.getToken(), normalizedUser);
      this.setData({
        user: normalizedUser,
        avatarSrc: avatarMeta.avatarSrc,
      });
    } else {
      wx.showToast({ title: '加载失败', icon: 'none' });
    }

    if (walletResult.ok) {
      const wallet = walletResult.value.data || {};
      this.setData({
        balance: Number(wallet.balance || 0).toFixed(2)
      });
    }
  },

  normalizeMerchantAuthStatus(rawStatus, businessVerified) {
    const statusMap = {
      certified: { status: 'certified', text: '已认证', className: 'is-certified' },
      pending: { status: 'pending', text: '审核中', className: 'is-pending' },
      rejected: { status: 'rejected', text: '审核未通过', className: 'is-rejected' },
      uncertified: { status: 'uncertified', text: '去认证', className: 'is-uncertified' },
      0: { status: 'uncertified', text: '去认证', className: 'is-uncertified' },
      1: { status: 'pending', text: '审核中', className: 'is-pending' },
      2: { status: 'certified', text: '已认证', className: 'is-certified' },
      3: { status: 'rejected', text: '审核未通过', className: 'is-rejected' }
    };
    const normalized = statusMap[rawStatus] || (businessVerified ? statusMap.certified : statusMap.uncertified);
    return normalized;
  },

  async loadMerchantAuthStatus() {
    try {
      const res = await Api.getMerchantAuthStatus();
      const data = res.data || {};
      const normalized = this.normalizeMerchantAuthStatus(data.status || data.status_code, data.business_verified);
      this.setData({
        merchantAuthStatus: normalized.status,
        merchantAuthActionText: normalized.text,
        merchantAuthActionClass: normalized.className
      });
    } catch (err) {
      const fallback = this.normalizeMerchantAuthStatus(
        this.data.user && this.data.user.business_verified ? 'certified' : 'uncertified',
        this.data.user && this.data.user.business_verified
      );
      this.setData({
        merchantAuthStatus: fallback.status,
        merchantAuthActionText: fallback.text,
        merchantAuthActionClass: fallback.className
      });
    }
  },

  async loadMineStats() {
    try {
      const res = await Api.getMineStats();
      const stats = res.data || {};
      const creatorStats = stats.creator_stats || {};
      const businessStats = stats.business_stats || {};
      const level = Number(creatorStats.level || 0);
      const adopted = Number(creatorStats.adopted_count || 0);
      const commissionText = creatorStats.commission_text || (typeof creatorStats.commission_rate === 'number' ? `${Math.round(creatorStats.commission_rate * 100)}%` : '10%');
      this.setData({
        creatorStats: {
          level,
          level_name: creatorStats.level_name || '试用创作者',
          adopted_count: adopted,
          daily_limit: Number(creatorStats.daily_limit || 3),
          daily_limit_text: creatorStats.daily_limit_text || '',
          commission_rate: commissionText,
          commission_text: commissionText,
          next_level_name: creatorStats.next_level_name || '',
          need_count: Number(creatorStats.need_count || 0),
          level_rules: Array.isArray(creatorStats.level_rules) ? creatorStats.level_rules : [],
          pending_count: Number(stats.pending_claims || 0)
        }
      });
      this.setData({
        bizStats: {
          accepted_count: Number(businessStats.accepted_count || 0),
          pending_count: Number(stats.pending_reviews || 0),
          adopted_count: Number(businessStats.adopted_count || 0)
        }
      });
    } catch (err) {
      if (err && err.message === '登录已过期') {
        try {
          await app.silentLogin();
          if (app.isLoggedIn()) {
            return this.loadMineStats();
          }
        } catch (loginErr) {
          console.warn('[mine/stats] relogin failed', loginErr);
        }
      }

      const code = err && err.code !== undefined && err.code !== null ? String(err.code) : 'NO_CODE';
      const message = (err && err.message) ? String(err.message) : '未知错误';
      console.error('[mine/stats] load failed', {
        code,
        message,
        err
      });
      wx.showToast({
        title: '我的统计加载失败',
        icon: 'none'
      });
    }
  },

  async loadPendingAppealCount() {
    try {
      const [claimsRes, appealsRes] = await Promise.all([
        Api.getMyClaims({ page: 1, limit: 100 }),
        Api.getAppeals({ limit: 100, offset: 0 }).catch(() => ({ data: { appeals: [] } }))
      ]);

      const claims = Array.isArray(claimsRes && claimsRes.data) ? claimsRes.data : [];
      const appeals = Array.isArray(appealsRes && appealsRes.data && appealsRes.data.appeals)
        ? appealsRes.data.appeals
        : [];

      const appealedClaimIds = new Set();
      appeals.forEach((appeal) => {
        const claimId = appeal && (appeal.claim_id || appeal.claimId || appeal.target_id || appeal.targetId);
        if (claimId !== undefined && claimId !== null && claimId !== '') {
          appealedClaimIds.add(String(claimId));
        }
      });

      const pendingAppealCount = claims.reduce((count, claim) => {
        const claimId = claim && (claim.id || claim.claim_id || claim.claimId);
        const reviewResult = Number(claim && (claim.review_result || claim.reviewResult || 0)) || 0;
        if (!claimId || reviewResult !== 3 || appealedClaimIds.has(String(claimId))) {
          return count;
        }
        return count + 1;
      }, 0);

      this.setData({ pendingAppealCount });
    } catch (err) {
      console.warn('[mine/appeal] load pending count failed', err);
      this.setData({ pendingAppealCount: 0 });
    }
  },

  updateDisplayText() {
    const uploadTime = buildInfo.uploadTime;
    if (uploadTime) {
      this.setData({ displayText: String(uploadTime).trim() });
      return;
    }

    this.setData({ displayText: '' });
  },

  onAvatarError() {
    const user = this.data.user || app.globalData.user || {};
    const fallbackAvatar = Api.getDefaultAvatarUrlById(user.id);
    if (this.data.avatarSrc !== fallbackAvatar) {
      this.setData({
        avatarSrc: fallbackAvatar,
      });
    }
  },

  _ensureLogin(callback) {
    if (app.isLoggedIn()) {
      callback();
    } else {
      wx.showLoading({ title: '登录中...' });
      app.silentLogin().then(() => {
        wx.hideLoading();
        if (app.isLoggedIn()) {
          callback();
        } else {
          wx.showToast({ title: '登录失败，请稍后重试', icon: 'none' });
        }
      });
    }
  },

  goProfile() {
    this._ensureLogin(() => {
      wx.navigateTo({ url: '/pages/mine/profile/index' });
    });
  },
  goLevel() {
    this._ensureLogin(() => {
      wx.navigateTo({ url: '/pages/creator/level/index' });
    });
  },

  goWallet() {
    this._ensureLogin(() => {
      wx.navigateTo({ url: '/pages/wallet/index' });
    });
  },

  goMyTasks() {
    this._ensureLogin(() => {
      wx.navigateTo({ url: '/pages/employer/my-tasks/index' });
    });
  },

  goMyClaims() {
    this._ensureLogin(() => {
      wx.navigateTo({ url: '/pages/creator/my-claims/index' });
    });
  },

  goPublishTask() {
    this._ensureLogin(() => {
      wx.navigateTo({ url: '/pages/employer/create-task/index' });
    });
  },

  goAdoptedWorks() {
    this._ensureLogin(() => {
      wx.navigateTo({ url: '/pages/creator/adopted-works/index' });
    });
  },

  goCreatorData() {
    this._ensureLogin(() => {
      wx.navigateTo({ url: '/pages/creator/data/index' });
    });
  },

  goWorks() {
    this._ensureLogin(() => {
      wx.navigateTo({ url: '/pages/creator/my-works/index' });
    });
  },

  goHelp() {
    wx.navigateTo({ url: '/pages/mine/help/index' });
  },

  goAbout() {
    wx.navigateTo({ url: '/pages/mine/about/index' });
  },

  goHome() {
    wx.switchTab({ url: '/pages/home/index' });
  },

  goInspiration() {
    wx.switchTab({ url: '/pages/works/index' });
  },

  goMerchantAuth() {
    this._ensureLogin(() => {
      wx.navigateTo({ url: '/pages/mine/merchant-auth/index' });
    });
  },

  goPurchasedWorks() {
    this._ensureLogin(() => {
      wx.navigateTo({ url: '/pages/employer/purchased-works/index' });
    });
  },

  goAppeal() {
    this._ensureLogin(() => {
      wx.navigateTo({ url: '/pages/mine/appeal/index' });
    });
  },

  goCustomerService() {
    wx.navigateTo({ url: '/pages/mine/customer-service/index' });
  },

  goBack() {
    wx.navigateBack({ delta: 1 });
  },

  copyUserId() {
    const userId = this.data.user?.id;
    if (userId) {
      wx.setClipboardData({
        data: String(userId),
        success: () => {
          wx.showToast({
            title: '复制成功',
            icon: 'success'
          });
        },
        fail: () => {
          wx.showToast({
            title: '复制失败',
            icon: 'none'
          });
        }
      });
    }
  },
});
