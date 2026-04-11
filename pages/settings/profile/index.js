const Api = require('../../../utils/api.js');
const app = getApp();

Page({
  data: {
    nickname: '',
    phone: '',
    avatar: '',
    _origNickname: '',
    _origPhone: '',
    _origAvatar: '',
    canSave: false,
    saving: false,
  },

  onLoad() {
    if (!app.isLoggedIn()) {
      wx.navigateTo({ url: '/pages/login/index' });
      return;
    }
    this.loadProfile();
  },

  async loadProfile() {
    try {
      const res = await Api.getMe();
      const user = res.data || {};
      const nickname = user.nickname || user.username || '';
      const phone = user.phone || '';
      const avatar = user.avatar || '';
      this.setData({
        nickname,
        phone,
        avatar,
        _origNickname: nickname,
        _origPhone: phone,
        _origAvatar: avatar,
      });
    } catch (e) {
      wx.showToast({ title: '加载失败', icon: 'none' });
    }
  },

  onNicknameInput(e) {
    const nickname = e.detail.value;
    this.setData({ nickname });
    this._checkDirty();
  },

  onPhoneInput(e) {
    const phone = e.detail.value;
    this.setData({ phone });
    this._checkDirty();
  },

  _checkDirty() {
    const { nickname, phone, avatar, _origNickname, _origPhone, _origAvatar } = this.data;
    const dirty = nickname !== _origNickname || phone !== _origPhone || avatar !== _origAvatar;
    this.setData({ canSave: dirty });
  },

  chooseAvatar() {
    wx.showActionSheet({
      itemList: ['使用微信头像', '从相册选择'],
      success: (res) => {
        if (res.tapIndex === 0) {
          this._useWechatAvatar();
        } else {
          this._chooseFromAlbum();
        }
      }
    });
  },

  _useWechatAvatar() {
    wx.getUserProfile({
      desc: '用于完善个人信息',
      success: (res) => {
        const avatar = res.userInfo.avatarUrl;
        this.setData({ avatar });
        this._checkDirty();
      },
      fail: () => {
        wx.showToast({ title: '获取头像失败', icon: 'none' });
      }
    });
  },

  _chooseFromAlbum() {
    wx.chooseMedia({
      count: 1,
      mediaType: ['image'],
      sourceType: ['album', 'camera'],
      success: (res) => {
        const tempPath = res.tempFiles[0].tempFilePath;
        this.setData({ avatar: tempPath });
        this._checkDirty();
      },
      fail: () => {
        wx.showToast({ title: '选择图片失败', icon: 'none' });
      }
    });
  },

  async handleSave() {
    const { nickname, phone, avatar, saving } = this.data;
    if (saving) return;

    if (!nickname.trim()) {
      wx.showToast({ title: '名称不能为空', icon: 'none' });
      return;
    }

    if (phone && !/^1\d{10}$/.test(phone)) {
      wx.showToast({ title: '手机号格式不正确', icon: 'none' });
      return;
    }

    this.setData({ saving: true });

    try {
      await Api.updateProfile({ nickname: nickname.trim(), phone, avatar });

      const user = app.getUser() || {};
      user.nickname = nickname.trim();
      user.phone = phone;
      user.avatar = avatar;
      app.setAuth(app.getToken(), user);

      wx.showToast({ title: '保存成功', icon: 'success' });
      setTimeout(() => wx.navigateBack(), 1000);
    } catch (e) {
      // Api.request 已弹 toast
    } finally {
      this.setData({ saving: false });
    }
  },
});
