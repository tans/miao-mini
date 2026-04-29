const Api = require('../../../utils/api.js');
const app = getApp();

Page({
  data: {
    status: 'uncertified', // uncertified, pending, certified
    companyName: '',
    creditCode: '',
    contactName: '',
    contactPhone: '',
    licenseUrl: '',
    licensePreviewUrl: '',
    licenseKey: '',
    statusIcon: 'icon-uncertified',
    statusIconText: '未认证',
    statusTitle: '您尚未完成商家认证',
    statusDesc: '完成认证后可发布任务、享受更多权益',
    submitText: '提交'
  },

  onLoad() {
    this.loadAuthStatus();
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
        contactName: data.contact_name || '',
        contactPhone: data.contact_phone || '',
        licenseUrl: data.license_url || '',
        licensePreviewUrl: data.license_preview_url || data.license_url || '',
        licenseKey: ''
      });
      this._updateStatusUI(normalizedStatus);
    }).catch(err => {
    });
  },

  _updateStatusUI(status) {
    const statusMap = {
      certified: { icon: 'icon-certified', text: '已认证', title: '已通过商家认证', desc: '您已是认证商家，可发布任务', submitText: '已认证' },
      pending: { icon: 'icon-pending', text: '审核中', title: '认证申请已提交', desc: '平台将在1-3个工作日内完成审核，请保持联系电话畅通。', submitText: '审核中' },
      uncertified: { icon: 'icon-uncertified', text: '未认证', title: '您尚未完成商家认证', desc: '完成认证后可发布任务、享受更多权益', submitText: '提交' }
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
    if (this.data.licenseUrl) {
      if (this.data.status !== 'uncertified') {
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
    if (this.data.status !== 'uncertified') {
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
          try {
            const uploadRes = await Api.uploadImage(tempFilePath, {
              bizType: 'merchant_license',
              bizId: currentUser.id ? String(currentUser.id) : '',
              returnMeta: true,
            });

            const nextData = {
              licenseUrl: uploadRes.url,
              licensePreviewUrl: uploadRes.previewUrl || uploadRes.url,
              licenseKey: uploadRes.key || ''
            };

            let ocrFilled = false;
            if (uploadRes.key) {
              try {
                const ocrRes = await Api.recognizeMerchantAuthLicense({ key: uploadRes.key });
                const ocrData = ocrRes.data || {};
                if (ocrData.company_name) {
                  nextData.companyName = ocrData.company_name;
                  ocrFilled = true;
                }
                if (ocrData.credit_code) {
                  nextData.creditCode = String(ocrData.credit_code).trim().toUpperCase();
                  ocrFilled = true;
                }
                const legalPerson = ocrData.legal_person || ocrData.legalPerson || '';
                if (!this.data.contactName && legalPerson) {
                  nextData.contactName = legalPerson;
                  ocrFilled = true;
                }
              } catch (ocrErr) {
                // OCR failure should not block manual submission.
              }
            }

            this.setData(nextData);
            wx.showToast({ title: ocrFilled ? '已自动识别' : '已上传，请手动填写', icon: ocrFilled ? 'success' : 'none' });
          } catch (err) {
            wx.showToast({ title: err.message || '上传失败', icon: 'none' });
          } finally {
            wx.hideLoading();
          }
        })();
      }
    });
  },

  submitAuth() {
    const { status, companyName, creditCode, contactName, contactPhone, licenseUrl } = this.data;
    if (status !== 'uncertified') {
      return;
    }
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
    if (!contactName.trim()) {
      wx.showToast({ title: '请输入联系人', icon: 'none' });
      return;
    }
    if (!contactPhone.trim()) {
      wx.showToast({ title: '请输入联系电话', icon: 'none' });
      return;
    }
    // 手机号格式校验（11位手机号或带区号的固话）
    const phoneRegex = /^1[3-9]\d{9}$|^0\d{2,3}-?\d{7,8}$/;
    if (!phoneRegex.test(contactPhone.trim())) {
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
      contact_name: contactName.trim(),
      contact_phone: contactPhone.trim(),
      license_url: licenseUrl
    }).then(res => {
      wx.hideLoading();
      wx.showToast({ title: '提交成功，等待审核', icon: 'success' });
      this.setData({ status: 'pending' });
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
