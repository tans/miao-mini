// pages/submit-work/index.js
const Api = require('../../../utils/api.js');
const app = getApp();

Page({
  data: {
    claimId: null,
    taskId: null,
    description: '',
    video_url: '',
    materials: [],
    uploading: false,
    submitting: false,
    rules: [
      { prop: 'description', rules: [{ required: true, message: '请填写作品描述' }] },
    ],
    formData: {}
  },

  onLoad(options) {
    if (options.claimId) {
      this.setData({ claimId: options.claimId });
    }
    if (options.taskId) {
      this.setData({ taskId: options.taskId });
    }
    // 确保已登录
    if (!app.isLoggedIn()) {
      app.silentLogin();
    }
    // 如果是编辑已提交的任务，加载已有数据
    if (options.claimId) {
      this.loadClaimData(options.claimId);
    }
  },

  async loadClaimData(claimId) {
    try {
      const res = await Api.getClaimById(claimId);
      const claim = res.data;
      if (!claim) return;

      let description = '';
      let video_url = '';
      let materials = [];

      // 解析 content：格式为 "描述\n视频链接：url"
      if (claim.content) {
        const videoUrlMatch = claim.content.match(/视频链接：(.+)/);
        if (videoUrlMatch) {
          description = claim.content.replace(/视频链接：.+/, '').trim();
          video_url = videoUrlMatch[1].trim();
        } else {
          description = claim.content;
        }
      }

      // 解析 materials
      if (claim.materials && claim.materials.length > 0) {
        materials = claim.materials.map(m => ({
          url: m.file_path,
          fileName: m.file_name,
          fileType: m.file_type,
          fileSize: m.file_size || 0,
        }));
      }

      this.setData({ description, video_url, materials });
    } catch (err) {
      console.error('加载认领数据失败', err);
    }
  },

  onDescInput(e) {
    this.setData({ description: e.detail.value });
  },

  onVideoUrlInput(e) {
    this.setData({ video_url: e.detail.value });
  },

  // 添加素材
  async addMaterial() {
    try {
      const res = await new Promise((resolve, reject) => {
        wx.chooseMedia({
          count: 1,
          mediaType: ['image', 'video'],
          sourceType: ['album', 'camera'],
          success: resolve,
          fail: reject,
        });
      });

      const file = res.tempFiles[0];
      const isVideo = file.fileType === 'video' || (res.type === 'video');
      const fileType = isVideo ? 'video' : 'image';

      this.setData({ uploading: true });

      let url;
      if (fileType === 'image') {
        url = await Api.uploadImage(file.tempFilePath);
      } else {
        url = await Api.uploadVideo(file.tempFilePath);
      }

      const newMaterials = [...this.data.materials, {
        url,
        fileName: file.tempFilePath.split('/').pop(),
        fileType,
        fileSize: file.size || 0,
      }];
      this.setData({ materials: newMaterials });
    } catch (err) {
      if (err && err.errMsg && err.errMsg.includes('cancel')) return;
      wx.showToast({ title: err.message || '上传失败', icon: 'none' });
    } finally {
      this.setData({ uploading: false });
    }
  },

  // 删除素材
  deleteMaterial(e) {
    const index = e.currentTarget.dataset.index;
    const materials = [...this.data.materials];
    materials.splice(index, 1);
    this.setData({ materials });
  },

  // 预览素材
  previewMaterial(e) {
    const url = e.currentTarget.dataset.url;
    wx.previewImage({ urls: [url], current: url });
  },

  async handleSubmit() {
    const { claimId, description, video_url, materials } = this.data;

    if (!description) {
      wx.showToast({ title: '请填写作品描述', icon: 'none' });
      return;
    }

    // 内容至少要有素材或链接之一
    if (materials.length === 0 && !video_url) {
      wx.showToast({ title: '请上传素材或填写视频链接', icon: 'none' });
      return;
    }

    if (!claimId) {
      wx.showToast({ title: '缺少认领ID，请从任务详情页进入', icon: 'none' });
      return;
    }

    this.setData({ submitting: true });
    wx.showLoading({ title: '提交中...' });

    try {
      // 构建 content：描述 + 视频链接
      let content = description;
      if (video_url) {
        content = content + '\n视频链接：' + video_url;
      }

      await Api.submitClaim(claimId, {
        content,
        materials: materials.map((m, i) => ({
          file_name: m.fileName,
          file_path: m.url,
          file_size: m.fileSize,
          file_type: m.fileType,
          sort_order: i,
        })),
      });

      wx.showToast({ title: '提交成功！', icon: 'success' });
      setTimeout(() => {
        wx.navigateBack();
      }, 1500);
    } catch (err) {
      wx.showToast({ title: err.message || '提交失败', icon: 'none' });
    } finally {
      this.setData({ submitting: false });
      wx.hideLoading();
    }
  }
});
