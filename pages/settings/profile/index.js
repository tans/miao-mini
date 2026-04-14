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
    avatarUploading: false,
  },

  onLoad() {
    if (!app.isLoggedIn()) {
      app.silentLogin().then(() => {
        if (app.isLoggedIn()) this.loadProfile();
      });
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
    this.setData({ nickname: e.detail.value }, () => this._checkDirty());
  },

  onPhoneInput(e) {
    this.setData({ phone: e.detail.value }, () => this._checkDirty());
  },

  _checkDirty() {
    const { nickname, phone, avatar, _origNickname, _origPhone, _origAvatar } = this.data;
    const dirty = nickname !== _origNickname || phone !== _origPhone || avatar !== _origAvatar;
    this.setData({ canSave: dirty });
  },

  // 原生头像选择（含微信头像 + 相册，由系统弹窗处理）
  async onChooseAvatar(e) {
    const tempPath = e.detail.avatarUrl;
    if (!tempPath) return;

    this.setData({ avatarUploading: true });
    try {
      const url = await Api.uploadImage(tempPath);
      this.setData({ avatar: url });
      this._checkDirty();
    } catch (err) {
      wx.showToast({ title: '头像上传失败', icon: 'none' });
    } finally {
      this.setData({ avatarUploading: false });
    }
  },

  async handleSave() {
    const { nickname, phone, avatar, saving, avatarUploading } = this.data;
    if (saving || avatarUploading) return;

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

      // 展开旧对象再覆盖，避免直接 mutate globalData 引用
      const user = { ...(app.getUser() || {}), nickname: nickname.trim(), phone, avatar };
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
