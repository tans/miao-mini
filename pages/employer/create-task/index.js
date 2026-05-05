const Api = require('../../../utils/api.js');
const { formatAmount } = require('../../../utils/util.js');
const app = getApp();
const DEFAULT_DEADLINE_DAYS = 7;
const PLATFORM_FEE_RATE = 0.10;
const PRIVACY_DISCOUNT_RATE = 0.05;

function formatLocalDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function getDateAfterDays(days) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return formatLocalDate(date);
}

Page({
  data: {
    title: '',
    description: '',
    isAiWriting: false,
    unit_price: null,
    award_price: null,
    total_count: null,
    deadline: '',
    video_duration: '30秒',
    privacyProtected: false,
    jimengEnabled: false,
    jimeng_link: '',
    selectedIndustries: [],
    tempSelectedIndustries: [],
    selectedStyles: [],
    tempSelectedStyles: [],
    refImages: [],
    videoSpecOptions: {
      duration: ['15秒', '30秒', '60秒', '90秒'],
      ratio: ['9:16', '16:9', '1:1'],
      quality: ['720P', '1080P', '4K']
    },
    selectedDuration: '30秒',
    selectedRatio: '9:16',
    selectedQuality: '1080P',
    durationIndex: 1,
    ratioIndex: 0,
    qualityIndex: 1,
    industryOptions: [
      { id: 1001, name: '餐饮美食' },
      { id: 1002, name: '酒店民宿' },
      { id: 1003, name: '本地生活' },
      { id: 1004, name: '房产家居' },
      { id: 1005, name: '家居家电' },
      { id: 1006, name: '服饰穿搭' },
      { id: 1007, name: '美妆护肤' },
      { id: 1008, name: '母婴亲子' },
      { id: 1009, name: '数码科技' },
      { id: 1010, name: '教育培训' },
      { id: 1011, name: '汽车服务' },
      { id: 1012, name: '医疗健康' },
      { id: 1013, name: '金融理财' },
      { id: 1014, name: '企业商务' },
      { id: 1015, name: '电商零售' },
      { id: 1099, name: '其他行业' }
    ],
    styleOptions: ['口语化', '高级感', '接地气', '幽默风趣', '温馨治愈', '时尚潮流'],
    baseTotal: '20.00',
    awardTotal: '200.00',
    originalPlatformFee: '22.00',
    privacyDiscount: '11.00',
    platformFee: '11.00',
    totalBudget: '231.00',
    walletBalance: 0,
    walletBalanceDisplay: '0.00',
    isBalanceInsufficient: true,
    balanceShortfall: '231.00',
    isSubmitting: false,
    showDialog: false,
    showStyleDialog: false,
  },

  onLoad() {
    if (!app.isLoggedIn()) {
      wx.showLoading({ title: '登录中...' });
      app.silentLogin().then(() => {
        wx.hideLoading();
        if (!app.isLoggedIn()) {
          wx.showToast({ title: '登录失败，请稍后重试', icon: 'none' });
          return;
        }
        this.loadWalletBalance();
      });
    } else {
      this.loadWalletBalance();
    }
    this.initDefaultDeadline();
    this.updateBudgetPreview();
  },

  onShow() {
    if (app.isLoggedIn()) {
      this.loadWalletBalance();
    }
  },

  onPullDownRefresh() {
    this.loadWalletBalance().finally(() => wx.stopPullDownRefresh());
  },

  async loadWalletBalance() {
    try {
      const res = await Api.getWallet();
      const wallet = res.data || {};
      const balance = Number(wallet.balance || 0);
      this.setData({
        walletBalance: balance,
        walletBalanceDisplay: formatAmount(balance)
      });
      this.updateBalanceStatus();
    } catch (err) {
      this.setData({
        walletBalance: 0,
        walletBalanceDisplay: '0.00'
      });
      this.updateBalanceStatus();
    }
  },

  // 打开对话框
  openDialog() {
    this.setData({
      tempSelectedIndustries: [...this.data.selectedIndustries],
      showDialog: true
    });
  },
  
  // 关闭对话框
  onCloseDialog() {
    this.setData({ 
      showDialog: false,
      tempSelectedIndustries: []
    });
  },
  
  // 确认选择
  confirmIndustrySelection() {
    this.setData({
      selectedIndustries: this.data.tempSelectedIndustries.map((id) => Number(id)).slice(0, 1),
      showDialog: false
    });
  },
  
  // 重置选择
  resetIndustrySelection() {
    this.setData({ tempSelectedIndustries: [] });
  },
  
  // 确认风格选择
  confirmStyleSelection() {
    this.setData({
      selectedStyles: [...this.data.tempSelectedStyles],
      showStyleDialog: false
    });
  },
  
  // 重置风格选择
  resetStyleSelection() {
    this.setData({ tempSelectedStyles: [] });
  },
    // 打开对话框
    openStyleDialog() {
      this.setData({
        tempSelectedStyles: [...this.data.selectedStyles],
        showStyleDialog: true
      });
    },
    
    // 关闭对话框
    onCloseStyleDialog() {
      this.setData({ 
        showStyleDialog: false,
        tempSelectedStyles: []
      });
    },

  initDefaultDeadline() {
    this.setData({
      deadline: getDateAfterDays(DEFAULT_DEADLINE_DAYS)
    });
  },

  onTitleInput(e) {
    this.setData({ title: e.detail.value });
  },

  onDescInput(e) {
    this.setData({ description: e.detail.value });
  },

  applyAiSelections(aiIndustries, aiStyles) {
    const nextData = {};

    if (Array.isArray(aiIndustries) && aiIndustries.length && this.data.selectedIndustries.length === 0) {
      const matchedIndustryIds = aiIndustries.map((name) => {
        const item = this.data.industryOptions.find((option) => option.name === String(name).trim());
        return item ? item.id : null;
      }).filter((id) => id != null);
      if (matchedIndustryIds.length) {
        nextData.selectedIndustries = matchedIndustryIds.slice(0, 1);
      }
    }

    if (Array.isArray(aiStyles) && aiStyles.length && this.data.selectedStyles.length === 0) {
      const matchedStyles = aiStyles.map((name) => String(name).trim()).filter(Boolean);
      if (matchedStyles.length) {
        nextData.selectedStyles = matchedStyles.slice(0, 3);
      }
    }

    if (Object.keys(nextData).length) {
      this.setData(nextData);
    }
  },

  isIndustrySelected(id) {
    return this.data.selectedIndustries.indexOf(id) > -1;
  },

  isStyleSelected(style) {
    return this.data.selectedStyles.indexOf(style) > -1;
  },

  toggleIndustry(e) {
    const id = Number(e.currentTarget.dataset.id);
    const isSelected = this.data.tempSelectedIndustries.indexOf(id) > -1;
    this.setData({
      tempSelectedIndustries: isSelected ? [] : [id]
    });
  },

  toggleStyle(e) {
    const style = e.currentTarget.dataset.style;
    const { tempSelectedStyles } = this.data;
    const index = tempSelectedStyles.indexOf(style);
    if (index > -1) {
      tempSelectedStyles.splice(index, 1);
    } else {
      tempSelectedStyles.push(style);
    }
    this.setData({ tempSelectedStyles });
  },

  togglePrivacy() {
    const checked = arguments[0] && arguments[0].detail ? !!arguments[0].detail.value : !this.data.privacyProtected;
    this.setData({ privacyProtected: checked });
    this.updateBudgetPreview();
  },

  toggleJimeng() {
    const checked = arguments[0] && arguments[0].detail ? !!arguments[0].detail.value : !this.data.jimengEnabled;
    this.setData({ jimengEnabled: checked });
  },

  addRefImage() {
    const max = 6;
    const remain = max - this.data.refImages.length;
    if (remain <= 0) {
      wx.showToast({ title: '最多上传6个素材', icon: 'none' });
      return;
    }
    wx.chooseMedia({
      count: remain,
      mediaType: ['image', 'video'],
      sourceType: ['album', 'camera'],
      maxDuration: 300,
      sizeType: ['compressed'],
      success: (res) => {
        const picked = (res.tempFiles || []).map((f) => ({
          path: f.tempFilePath,
          isVideo: f.fileType === 'video',
        }));
        this.setData({
          refImages: this.data.refImages.concat(picked).slice(0, max),
        });
      },
      fail: (err) => {
        const msg = err && err.errMsg ? String(err.errMsg) : '';
        if (msg.includes('cancel')) return;
        wx.showToast({ title: '选择失败', icon: 'none' });
      },
    });
  },

  removeRefImage(e) {
    const index = e.currentTarget.dataset.index;
    this.data.refImages.splice(index, 1);
    this.setData({ refImages: this.data.refImages });
  },

  // ActionSheet for duration selection
  showDurationActionSheet() {
    const that = this;
    const durationOptions = this.data.videoSpecOptions.duration;
    const itemList = durationOptions.map((option, index) => {
      return `${option}`;
    });
    
    wx.showActionSheet({
      itemList: itemList,
      success(res) {
        const selectedIndex = res.tapIndex;
        that.setData({
          selectedDuration: durationOptions[selectedIndex],
          video_duration: durationOptions[selectedIndex],
          durationIndex: selectedIndex
        });
      },
      fail(res) {
        console.log(res.errMsg);
      }
    });
  },

  // ActionSheet for ratio selection
  showRatioActionSheet() {
    const that = this;
    const ratioOptions = this.data.videoSpecOptions.ratio;
    const itemList = [
      '9:16 (抖音/小红书竖屏)',
      '16:9 (抖音/视频号横屏)',
      '1:1 (小红书正方形)'
    ];
    
    wx.showActionSheet({
      itemList: itemList,
      success(res) {
        const selectedIndex = res.tapIndex;
        that.setData({
          selectedRatio: ratioOptions[selectedIndex],
          ratioIndex: selectedIndex
        });
      },
      fail(res) {
        console.log(res.errMsg);
      }
    });
  },

  // ActionSheet for quality selection
  showQualityActionSheet() {
    const that = this;
    const qualityOptions = this.data.videoSpecOptions.quality;
    const itemList = qualityOptions.map((option) => {
      return option;
    });
    
    wx.showActionSheet({
      itemList: itemList,
      success(res) {
        const selectedIndex = res.tapIndex;
        that.setData({
          selectedQuality: qualityOptions[selectedIndex],
          qualityIndex: selectedIndex
        });
      },
      fail(res) {
        console.log(res.errMsg);
      }
    });
  },

  onJimengLinkInput(e) {
    this.setData({ jimeng_link: e.detail.value });
  },

  onUnitPriceInput(e) {
    const val = e.detail.value ? parseFloat(e.detail.value) : 0;
    this.setData({ unit_price: val || 0 });
    this.updateBudgetPreview();
  },

  onAwardPriceInput(e) {
    const val = e.detail.value ? parseFloat(e.detail.value) : 0;
    this.setData({ award_price: val || 0 });
    this.updateBudgetPreview();
  },

  onTotalCountInput(e) {
    const val = e.detail.value ? parseInt(e.detail.value) : 0;
    this.setData({ total_count: val || 0 });
    this.updateBudgetPreview();
  },

  updateBudgetPreview() {
    const unitPrice = parseFloat(this.data.unit_price) || 0;
    const totalCount = parseInt(this.data.total_count) || 0;
    const awardPrice = parseFloat(this.data.award_price) || 0;
    const privacyDiscountEnabled = !this.data.privacyProtected;

    const baseTotal = unitPrice * totalCount;
    const awardTotal = awardPrice * totalCount;
    const subtotal = baseTotal + awardTotal;
    const originalPlatformFee = Math.round(subtotal * PLATFORM_FEE_RATE * 100) / 100;
    const privacyDiscount = privacyDiscountEnabled
      ? Math.round(subtotal * PRIVACY_DISCOUNT_RATE * 100) / 100
      : 0;
    const platformFee = Math.max(0, originalPlatformFee - privacyDiscount);
    const total = baseTotal + awardTotal + platformFee;

    this.setData({
      baseTotal: baseTotal.toFixed(2),
      awardTotal: awardTotal.toFixed(2),
      originalPlatformFee: originalPlatformFee.toFixed(2),
      privacyDiscount: privacyDiscount.toFixed(2),
      platformFee: platformFee.toFixed(2),
      totalBudget: total.toFixed(2)
    });
    this.updateBalanceStatus();
  },

  updateBalanceStatus() {
    const walletBalance = Number(this.data.walletBalance || 0);
    const totalBudget = Number(this.data.totalBudget || 0);
    const shortfall = Math.max(0, totalBudget - walletBalance);

    this.setData({
      isBalanceInsufficient: walletBalance < totalBudget,
      balanceShortfall: shortfall.toFixed(2)
    });
  },

  aiWriteDesc() {
    const { title, description, selectedIndustries, selectedStyles, isAiWriting } = this.data;

    if (isAiWriting) {
      return;
    }

    const cleanTitle = (title || '').trim();
    if (!cleanTitle) {
      wx.showToast({ title: '请先填写任务标题', icon: 'none' });
      return;
    }

    // Convert industry IDs to names
    const industryNames = selectedIndustries.map(id => {
      const industry = this.data.industryOptions.find(i => i.id === id);
      return industry ? industry.name : '';
    }).filter(name => name);

    this.setData({ isAiWriting: true });
    wx.showLoading({ title: 'AI帮写中...' });

    Api.aiWriteTaskDescription({
      title: cleanTitle,
      description: (description || '').trim(),
      industries: industryNames,
      styles: selectedStyles
    }).then(res => {
      wx.hideLoading();
      if (res.data && res.data.success && res.data.description) {
        this.applyAiSelections(res.data.industries, res.data.styles);
        this.setData({ description: String(res.data.description).trim() });
        wx.showToast({ title: 'AI帮写成功', icon: 'success' });
      } else if (res.data && res.data.error) {
        wx.showToast({ title: res.data.error, icon: 'none', duration: 3000 });
      } else {
        wx.showToast({ title: 'AI帮写失败', icon: 'none' });
      }
    }).catch(err => {
      wx.hideLoading();
      const msg = err && err.message || 'AI帮写失败';
      wx.showToast({ title: msg, icon: 'none', duration: 3000 });
    }).finally(() => {
      this.setData({ isAiWriting: false });
    });
  },

  showJimengTutorial() {
    wx.navigateTo({ url: '/pages/employer/jimeng-tutorial/index' });
  },

  goBack() {
    wx.navigateBack({ fail: () => wx.switchTab({ url: '/pages/home/index' }) });
  },

  goRecharge() {
    wx.navigateTo({ url: '/pages/employer/recharge/index' });
  },

  goMerchantAgreement() {
    wx.navigateTo({ url: '/pages/mine/merchant-agreement/index' });
  },

  async handleSubmit() {
    const { title, description, unit_price, total_count, selectedIndustries, selectedStyles, privacyProtected, jimeng_link, jimengEnabled } = this.data;

    if (this.data.isSubmitting) {
      return;
    }

    if (!title) {
      wx.showToast({ title: '请填写任务标题', icon: 'none' });
      return;
    }
    if (!description || description.length < 10) {
      wx.showToast({ title: '请输入不少于10个字的描述', icon: 'none' });
      return;
    }
    if (selectedIndustries.length === 0) {
      wx.showToast({ title: '请至少选择一个行业', icon: 'none' });
      return;
    }
    if (this.data.isBalanceInsufficient) {
      wx.showModal({
        title: '余额不足',
        content: `当前余额不足，还差 ¥${this.data.balanceShortfall}，请先充值后再创建任务。`,
        confirmText: '去充值',
        success: (res) => {
          if (res.confirm) {
            this.goRecharge();
          }
        }
      });
      return;
    }

    const industryNames = selectedIndustries.map(id => {
      const industry = this.data.industryOptions.find(i => i.id === id);
      return industry ? industry.name : '';
    }).filter(name => name);

    const hasMaterials = this.data.refImages.length > 0;
    this.setData({ isSubmitting: true });
    wx.showLoading({ title: hasMaterials ? '上传素材中...' : '提交中...' });
    try {
      const materials = [];
      if (hasMaterials) {
        const jobBase = `task-${Date.now()}`;
        for (let i = 0; i < this.data.refImages.length; i += 1) {
          const raw = this.data.refImages[i];
          const isVideo = !!(raw && raw.isVideo);
          const tempPath = typeof raw === 'string' ? raw : (raw && raw.path) || '';
          const uploadRes = isVideo
            ? await Api.uploadVideo(tempPath, {
              returnMeta: true,
              bizType: 'task_material',
              jobId: `${jobBase}-${i + 1}`,
            })
            : await Api.uploadImage(tempPath, {
              returnMeta: true,
              bizType: 'task_material',
              jobId: `${jobBase}-${i + 1}`,
            });
          materials.push({
            file_name: uploadRes.filename || (isVideo ? `material-${i + 1}.mp4` : `material-${i + 1}.jpg`),
            file_path: uploadRes.url,
            file_size: uploadRes.size || 0,
            file_type: isVideo ? 'video' : 'image',
            sort_order: i + 1,
          });
        }
      }

      wx.showLoading({ title: '发布中...' });
      const jimengLinkTrim = String(jimeng_link || '').trim();
      const res = await Api.createTask({
        title,
        description,
        unit_price: Number(unit_price),
        total_count: Number(total_count),
        award_price: Number(this.data.award_price) || 0,
        deadline: this.data.deadline,
        video_duration: this.data.selectedDuration,
        video_aspect: this.data.selectedRatio,
        video_resolution: this.data.selectedQuality,
        public: !privacyProtected,
        industries: industryNames,
        styles: selectedStyles,
        jimeng_enabled: !!jimengEnabled,
        jimeng_link: jimengEnabled ? jimengLinkTrim : '',
        materials,
      });
      wx.showToast({ title: (res && res.message) || '发布成功', icon: 'success' });
      setTimeout(() => {
        wx.redirectTo({ url: '/pages/employer/my-tasks/index' });
      }, 1500);
    } catch (err) {
      const msg = err && err.message || '发布失败';
      wx.showToast({ title: msg.slice(0, 20), icon: 'none', duration: 3000 });
      this.setData({ isSubmitting: false });
    } finally {
      wx.hideLoading();
    }
  }
});
