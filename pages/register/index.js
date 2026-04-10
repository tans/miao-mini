// pages/register/index.js
const Api = require('../../utils/api.js');
const app = getApp();

Page({
  data: {
    username: '',
    phone: '',
    password: '',
    role: 'creator'
  },

  onLoad() {
    if (app.isLoggedIn()) {
      wx.switchTab({ url: '/pages/home/index' });
    }
  },

  onUsernameInput(e) {
    this.setData({ username: e.detail.value });
  },

  onPhoneInput(e) {
    this.setData({ phone: e.detail.value });
  },

  onPasswordInput(e) {
    this.setData({ password: e.detail.value });
  },

  selectRole(e) {
    const role = e.currentTarget.dataset.role;
    this.setData({ role });
  },

  async handleRegister() {
    const { username, phone, password, role } = this.data;

    if (!username || username.length < 3) {
      wx.showToast({ title: '用户名至少3个字符', icon: 'none' });
      return;
    }
    if (!phone) {
      wx.showToast({ title: '请输入手机号', icon: 'none' });
      return;
    }
    if (!password || password.length < 6) {
      wx.showToast({ title: '密码至少6位', icon: 'none' });
      return;
    }

    wx.showLoading({ title: '注册中...' });
    try {
      await Api.register({ username, phone, password, role });
      wx.showToast({ title: '注册成功，请登录', icon: 'success' });
      setTimeout(() => {
        wx.navigateBack();
      }, 1500);
    } catch (err) {
      wx.showToast({ title: err.message || '注册失败', icon: 'none' });
    } finally {
      wx.hideLoading();
    }
  },

  goLogin() {
    wx.navigateBack();
  }
});
