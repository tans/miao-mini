const Api = require('../../../utils/api.js');
const app = getApp();

Page({
  data: {
    user: null,
    nickname: '',
    phone: '',
    avatarSrc: '/assets/icons/avatar-default.jpg'
  },

  onLoad() {
    this.loadUser();
  },

  async loadUser() {
    const user = app.globalData.user;
    const rawAvatar = Api.getRawDisplayUrl(user && user.avatar);
    this.setData({
      user: user ? { ...user, avatar: rawAvatar } : user,
      nickname: user && (user.nickname || user.username) || '',
      phone: user && user.phone || '',
      avatarSrc: Api.getDisplayUrl(rawAvatar) || '/assets/icons/avatar-default.jpg'
    });

    if (!app.isLoggedIn()) {
      return;
    }

    try {
      const res = await Api.getMe();
      const latestUser = res.data || {};
      const latestAvatar = Api.getRawDisplayUrl(latestUser.avatar);
      const normalizedUser = { ...latestUser, avatar: latestAvatar };
      app.setAuth(app.getToken(), normalizedUser);
      this.setData({
        user: normalizedUser,
        nickname: normalizedUser.nickname || normalizedUser.username || '',
        phone: normalizedUser.phone || '',
        avatarSrc: Api.getDisplayUrl(latestAvatar) || '/assets/icons/avatar-default.jpg'
      });
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
          const user = this.data.user || {};
          user.avatar = url;
          this.setData({ user, avatarSrc: Api.getDisplayUrl(url) || '/assets/icons/avatar-default.jpg' });
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
      const user = this.data.user || {};
      user.nickname = nickname;
      user.phone = phone;
      user.avatar = avatar;
      app.setAuth(app.getToken(), user);
      this.setData({ user, avatarSrc: Api.getDisplayUrl(avatar) || '/assets/icons/avatar-default.jpg' });
      wx.hideLoading();
      wx.showToast({ title: '保存成功', icon: 'success' });
      setTimeout(() => wx.navigateBack(), 1500);
    }).catch((err) => {
      wx.hideLoading();
      wx.showToast({ title: err.message || '保存失败', icon: 'none' });
    });
  },

  onAvatarError() {
    if (this.data.avatarSrc !== '/assets/icons/avatar-default.jpg') {
      this.setData({ avatarSrc: '/assets/icons/avatar-default.jpg' });
    }
  }
});
