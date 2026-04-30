const Api = require('../../../utils/api.js');
const app = getApp();

Page({
  _defaultContactPhone() {
    const user = app.globalData.user || {};
    return (this.data.userPhone || user.phone || '').trim();
  },

  _defaultContactName() {
    const user = app.globalData.user || {};
    return (this.data.userName || user.nickname || user.username || '').trim();
  },

  async loadCurrentUser() {
    try {
      const res = await Api.getMe();
      const user = res.data || {};
      this.setData({
        userName: user.nickname || user.username || '',
        userPhone: user.phone || ''
      });
      return user;
    } catch (e) {
      const user = app.globalData.user || {};
      this.setData({
        userName: user.nickname || user.username || '',
        userPhone: user.phone || ''
      });
      return user;
    }
  },

  data: {
    status: 'uncertified', // uncertified, pending, certified
    companyName: '',
    creditCode: '',
    contactName: '',
    contactPhone: '',
    userName: '',
    userPhone: '',
    licenseUrl: '',
    licensePreviewUrl: '',
    licenseKey: '',
    isEditing: false,
    canEditAuth: true,
    statusIcon: 'icon-uncertified',
    statusIconText: '未认证',
    statusTitle: '您尚未完成商家认证',
    statusDesc: '完成认证后可展示企业认证标志，提升账号可信度',
    submitText: '提交'
  },

  onLoad() {
    this.loadCurrentUser().finally(() => {
      this.loadAuthStatus();
    });
  },

  loadAuthStatus() {
    Api.getMerchantAuthStatus().then(res => {
      const data = res.data || {};
      // Normalize status: API may return numeric (0=uncertified, 1=pending, 2=certified) or string
      const statusMap = { 0: 'uncertified', 1: 'pending', 2: 'certified' };
      const normalizedStatus = statusMap[data.status || data.status_code] || data.status || data.status_code || 'uncertified';
      this.setData({
        status: normalizedStatus,
        companyName: data.company_name || '',
        creditCode: data.credit_code || data.social_credit_code || data.unified_social_credit_code || '',
        contactName: data.contact_name || this._defaultContactName(),
        contactPhone: data.contact_phone || this._defaultContactPhone(),
        licenseUrl: Api.getDisplayUrl(data.license_url || ''),
        licensePreviewUrl: Api.getDisplayUrl(data.license_preview_url || data.license_url || ''),
        licenseKey: '',
        isEditing: false,
        canEditAuth: normalizedStatus !== 'certified'
      });
      this._updateStatusUI(normalizedStatus);
    }).catch(err => {
    });
  },

  _updateStatusUI(status) {
    const statusMap = {
      certified: { icon: 'icon-certified', text: '已认证', title: '已通过商家认证', desc: '您已获得企业认证标志，可用于展示认证身份', submitText: '已认证' },
      pending: { icon: 'icon-pending', text: '审核中', title: '认证申请已提交', desc: '平台将在1-3个工作日内完成审核，请保持联系电话畅通。', submitText: '修改后重新提交' },
      rejected: { icon: 'icon-rejected', text: '已拒绝', title: '认证未通过', desc: '你可以修改资料后重新提交认证。', submitText: '修改后重新提交' },
      uncertified: { icon: 'icon-uncertified', text: '未认证', title: '您尚未完成商家认证', desc: '完成认证后可展示企业认证标志，提升账号可信度', submitText: '提交' }
    };
    const info = statusMap[status] || statusMap.uncertified;
    this.setData({
      statusIcon: info.icon,
      statusIconText: info.text,
      statusTitle: info.title,
      statusDesc: info.desc,
      submitText: info.submitText
    });
  },

  enterEditMode() {
    if (this.data.status === 'certified') {
      wx.showToast({ title: '已认证账号不能修改', icon: 'none' });
      return;
    }
    this.setData({ isEditing: true });
    this._updateStatusUI(this.data.status);
  },

  cancelEditMode() {
    this.setData({ isEditing: false });
    this._updateStatusUI(this.data.status);
  },

  onCompanyNameInput(e) {
    this.setData({ companyName: e.detail.value });
  },

  onCreditCodeInput(e) {
    this.setData({ creditCode: e.detail.value.trim().toUpperCase() });
  },

  onContactNameInput(e) {
    this.setData({ contactName: e.detail.value });
  },

  onContactPhoneInput(e) {
    this.setData({ contactPhone: e.detail.value });
  },

  previewLicense() {
    const previewUrl = this.data.licensePreviewUrl || this.data.licenseUrl;
    if (!previewUrl) return;
    wx.previewImage({
      urls: [previewUrl],
      current: previewUrl,
    });
  },

  onTapLicenseArea() {
    const canEdit = this.data.status === 'uncertified' || this.data.isEditing;
    if (this.data.licenseUrl) {
      if (!canEdit) {
        this.previewLicense();
        return;
      }
      wx.showActionSheet({
        itemList: ['查看营业执照', '重新上传'],
        success: (res) => {
          if (res.tapIndex === 0) {
            this.previewLicense();
          } else if (res.tapIndex === 1) {
            this.uploadLicense();
          }
        },
      });
      return;
    }
    this.uploadLicense();
  },

  uploadLicense() {
    if (!(this.data.status === 'uncertified' || this.data.isEditing)) {
      return;
    }
    wx.chooseMedia({
      count: 1,
      mediaType: ['image'],
      sourceType: ['album', 'camera'],
      success: (res) => {
        const tempFilePath = res.tempFiles[0].tempFilePath;
        wx.showLoading({ title: '上传并识别中...' });
        const currentUser = app.globalData.user || {};
        (async () => {
          let toastTitle = '';
          let toastIcon = 'none';
          try {
            const uploadRes = await Api.uploadImage(tempFilePath, {
              bizType: 'merchant_license',
              bizId: currentUser.id ? String(currentUser.id) : '',
              returnMeta: true,
            });

            const nextData = {
              licenseUrl: Api.getDisplayUrl(uploadRes.url),
              licensePreviewUrl: Api.getDisplayUrl(uploadRes.previewUrl || uploadRes.url),
              licenseKey: uploadRes.key || ''
            };

            let ocrCoreFilled = false;
            let ocrAnyFilled = false;
            if (uploadRes.key) {
              try {
                const ocrRes = await Api.recognizeMerchantAuthLicense({ key: uploadRes.key });
                const ocrData = ocrRes.data || {};
                if (ocrData.company_name) {
                  nextData.companyName = ocrData.company_name;
                  ocrCoreFilled = true;
                  ocrAnyFilled = true;
                }
                if (ocrData.credit_code) {
                  nextData.creditCode = String(ocrData.credit_code).trim().toUpperCase();
                  ocrCoreFilled = true;
                  ocrAnyFilled = true;
                }
                const legalPerson = ocrData.legal_person || ocrData.legalPerson || '';
                if (!this.data.contactName && legalPerson) {
                  nextData.contactName = legalPerson;
                  ocrAnyFilled = true;
                } else if (!this.data.contactName && this._defaultContactName()) {
                  nextData.contactName = this._defaultContactName();
                  ocrAnyFilled = true;
                }
                if (!this.data.contactPhone && this._defaultContactPhone()) {
                  nextData.contactPhone = this._defaultContactPhone();
                  ocrAnyFilled = true;
                }
              } catch (ocrErr) {
                // OCR failure should not block manual submission.
              }
            }

            this.setData(nextData);
            if (ocrCoreFilled) {
              toastTitle = '已自动识别';
              toastIcon = 'success';
            } else if (ocrAnyFilled) {
              toastTitle = '已识别部分信息';
              toastIcon = 'none';
            } else {
              toastTitle = '已上传，请手动填写';
              toastIcon = 'none';
            }
          } catch (err) {
            toastTitle = err.message || '上传失败';
            toastIcon = 'none';
          } finally {
            wx.hideLoading();
            if (toastTitle) {
              wx.showToast({ title: toastTitle, icon: toastIcon });
            }
          }
        })();
      }
    });
  },

  submitAuth() {
    const { status, isEditing, companyName, creditCode, contactName, contactPhone, licenseUrl } = this.data;
    if (!(status === 'uncertified' || isEditing)) {
      return;
    }
    const finalContactName = (contactName || this._defaultContactName()).trim();
    const finalContactPhone = (contactPhone || this._defaultContactPhone()).trim();
    if (!companyName.trim()) {
      wx.showToast({ title: '请输入企业名称', icon: 'none' });
      return;
    }
    if (!creditCode.trim()) {
      wx.showToast({ title: '请输入统一社会信用代码', icon: 'none' });
      return;
    }
    const creditCodeRegex = /^[0-9A-Z]{18}$/;
    if (!creditCodeRegex.test(creditCode.trim().toUpperCase())) {
      wx.showToast({ title: '请输入正确的统一社会信用代码', icon: 'none' });
      return;
    }
    if (!finalContactName) {
      wx.showToast({ title: '请输入联系人', icon: 'none' });
      return;
    }
    if (!finalContactPhone) {
      wx.showToast({ title: '请输入联系电话', icon: 'none' });
      return;
    }
    // 手机号格式校验（11位手机号或带区号的固话）
    const phoneRegex = /^1[3-9]\d{9}$|^0\d{2,3}-?\d{7,8}$/;
    if (!phoneRegex.test(finalContactPhone)) {
      wx.showToast({ title: '请输入正确的联系电话', icon: 'none' });
      return;
    }
    if (!licenseUrl) {
      wx.showToast({ title: '请上传营业执照', icon: 'none' });
      return;
    }

    wx.showLoading({ title: '提交中...' });
    Api.submitMerchantAuth({
      company_name: companyName.trim(),
      credit_code: creditCode.trim().toUpperCase(),
      social_credit_code: creditCode.trim().toUpperCase(),
      unified_social_credit_code: creditCode.trim().toUpperCase(),
      contact_name: finalContactName,
      contact_phone: finalContactPhone,
      license_url: licenseUrl
    }).then(res => {
      wx.hideLoading();
      wx.showToast({ title: '提交成功，等待审核', icon: 'success' });
      this.setData({ status: 'pending', isEditing: false });
      this._updateStatusUI('pending');
    }).catch(err => {
      wx.hideLoading();
      wx.showToast({ title: err.message || '提交失败', icon: 'none' });
    });
  },

  goBack() {
    wx.navigateBack({ delta: 1 });
  }
});
