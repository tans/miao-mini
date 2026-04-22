const Api = require('../../../utils/api.js');
const app = getApp();

Page({
  data: {
    user: null,
    nickname: ''
  },

  onLoad() {
    this.loadUser();
  },

  loadUser() {
    const user = app.globalData.user;
    this.setData({
      user: user,
      nickname: user && (user.nickname || user.username) || ''
    });
  },

  onNicknameInput(e) {
    this.setData({ nickname: e.detail.value });
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
        Api.uploadImage(tempFilePath).then((url) => {
          const user = this.data.user || {};
          user.avatar = url;
          this.setData({ user });
          wx.hideLoading();
        }).catch(() => {
          wx.hideLoading();
          wx.showToast({ title: '上传失败', icon: 'none' });
        });
      }
    });
  },

  saveProfile() {
    const nickname = this.data.nickname.trim();
    if (!nickname) {
      wx.showToast({ title: '请输入昵称', icon: 'none' });
      return;
    }

    wx.showLoading({ title: '保存中...' });
    Api.updateProfile({ nickname }).then(() => {
      const user = this.data.user || {};
      user.nickname = nickname;
      app.setAuth(app.getToken(), user);
      wx.hideLoading();
      wx.showToast({ title: '保存成功', icon: 'success' });
      setTimeout(() => wx.navigateBack(), 1500);
    }).catch((err) => {
      wx.hideLoading();
      wx.showToast({ title: err.message || '保存失败', icon: 'none' });
    });
  }
});