const Api = require('../../../utils/api.js');
const app = getApp();

Page({
  data: {
    user: null,
    userIdDisplay: '--',
    nickname: '',
    phone: '',
    avatarSrc: Api.getAvatarMeta().avatarSrc
  },

  onLoad() {
    this.loadUser();
  },

  syncProfileState(user) {
    const normalizedUser = user ? { ...user, avatar: Api.getRawDisplayUrl(user.avatar) } : null;
    const avatarMeta = Api.getAvatarMeta(normalizedUser || {});
    const currentUser = this.data.user || {};
    this.setData({
      user: normalizedUser,
      userIdDisplay: normalizedUser && normalizedUser.id != null && normalizedUser.id !== '' ? String(normalizedUser.id) : '--',
      nickname: normalizedUser && (normalizedUser.nickname || normalizedUser.username) || currentUser.nickname || '',
      phone: normalizedUser && normalizedUser.phone || currentUser.phone || '',
      avatarSrc: avatarMeta.avatarSrc,
    });
    return normalizedUser;
  },

  async loadUser() {
    this.syncProfileState(app.globalData.user);

    if (!app.isLoggedIn()) {
      return;
    }

    try {
      const res = await Api.getMe();
      const latestUser = res.data || {};
      const normalizedUser = this.syncProfileState(latestUser);
      app.setAuth(app.getToken(), normalizedUser);
    } catch (err) {
      // 保留本地缓存内容
    }
  },

  onPullDownRefresh() {
    this.loadUser().finally(() => wx.stopPullDownRefresh());
  },

  onNicknameInput(e) {
    this.setData({ nickname: e.detail.value });
  },

  onPhoneInput(e) {
    this.setData({ phone: e.detail.value });
  },

  goBack() {
    wx.navigateBack({ delta: 1 });
  },

  copyUserId() {
    const id = this.data.user && this.data.user.id;
    if (id == null || id === '') {
      wx.showToast({ title: '暂无用户ID', icon: 'none' });
      return;
    }
    wx.setClipboardData({
      data: String(id),
      success: () => wx.showToast({ title: '已复制', icon: 'success' }),
      fail: () => wx.showToast({ title: '复制失败', icon: 'none' }),
    });
  },

  changeAvatar() {
    wx.chooseMedia({
      count: 1,
      mediaType: ['image'],
      sourceType: ['album', 'camera'],
      success: (res) => {
        const tempFilePath = res.tempFiles[0].tempFilePath;
        wx.showLoading({ title: '上传中...' });
        const currentUser = this.data.user || app.globalData.user || {};
        Api.uploadImage(tempFilePath, {
          bizType: 'avatar',
          bizId: currentUser.id ? String(currentUser.id) : '',
        }).then((url) => {
          const user = { ...currentUser, avatar: url };
          this.setData({
            user,
            avatarSrc: Api.getAvatarMeta(user).avatarSrc,
          });
          wx.hideLoading();
        }).catch((err) => {
          wx.hideLoading();
          wx.showToast({ title: err.message || '上传失败', icon: 'none' });
        });
      },
      fail: (res) => {
        if (res.errMsg && res.errMsg.includes('cancel')) {
          return;
        }
        wx.showToast({ title: '选择失败', icon: 'none' });
      }
    });
  },

  saveProfile() {
    const nickname = this.data.nickname.trim();
    const phone = this.data.phone.trim();
    const avatar = Api.getRawDisplayUrl(this.data.user && this.data.user.avatar || '');
    if (!nickname) {
      wx.showToast({ title: '请输入昵称', icon: 'none' });
      return;
    }
    if (phone && !/^1\d{10}$/.test(phone)) {
      wx.showToast({ title: '请输入正确手机号', icon: 'none' });
      return;
    }

    wx.showLoading({ title: '保存中...' });
    Api.updateProfile({ nickname, phone, avatar }).then(() => {
      const user = {
        ...(this.data.user || {}),
        nickname,
        phone,
        avatar,
      };
      app.setAuth(app.getToken(), user);
      this.syncProfileState(user);
      wx.hideLoading();
      wx.showToast({ title: '保存成功', icon: 'success' });
      setTimeout(() => wx.navigateBack(), 1500);
    }).catch((err) => {
      wx.hideLoading();
      wx.showToast({ title: err.message || '保存失败', icon: 'none' });
    });
  },

  onAvatarError() {
    const fallbackAvatar = Api.getDefaultAvatarUrlById(this.data.user && this.data.user.id);
    if (this.data.avatarSrc !== fallbackAvatar) {
      this.setData({ avatarSrc: fallbackAvatar });
    }
  }
});
