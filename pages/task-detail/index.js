// pages/task-detail/index.js
const Api = require('../../utils/api.js');
const { getStatusText, getClaimStatusText, getStatusClass, formatDateTime } = require('../../utils/util.js');
const app = getApp();

Page({
  data: {
    task: null,
    loading: true,
    signups: [],
    submissions: [],  // 投稿列表（已提交的认领）
    materials: [],
    isMyTask: false,
    canClaim: false,
    claimReason: '',
    myClaim: null,      // 当前用户对该任务的认领记录
    hasClaimed: false,   // 是否已认领（待提交状态）
    claimStatus: 0,     // 认领状态：0=未认领, 1=待提交, 2=待验收, 3=已完成
    pendingCount: 0,    // 当前用户已接单数量（待提交状态）
    remainingSlots: 3,  // 剩余可接单数量
    currentTab: 'detail', // 当前标签页
  },

  onLoad(options) {
    // 详情允许未登录用户查看；仅在操作（接单/审核）时才要求登录
    this.loadTaskDetail(options.id);
  },

  onShow() {
    // 从提交作品页返回时，刷新认领状态
    if (this.data.task) {
      this.refreshClaimStatus();
    }
  },

  async refreshClaimStatus() {
    const { task } = this.data;
    if (!task) return;
    try {
      const claimRes = await Api.getClaimByTaskId(task.id);
      const myClaim = claimRes.data;
      const hasClaimed = myClaim && (myClaim.status === 1 || myClaim.status === 2);
      const claimStatus = myClaim ? myClaim.status : 0;
      this.setData({ myClaim, hasClaimed, claimStatus });
      if (this.data.isMyTask) {
        this.loadSignups(task.id);
        this.loadSubmissions(task.id);
      }
    } catch (e) {
      // 忽略刷新错误
    }
  },

  async loadTaskDetail(taskId) {
    wx.showLoading({ title: '加载中...' });
    try {
      const res = await Api.getTask(taskId);
      console.log('getTask response:', res);
      const task = res.data;
      console.log('task data:', task);

      if (!task) {
        wx.showToast({ title: '任务不存在', icon: 'none' });
        setTimeout(() => wx.navigateBack(), 1500);
        this.setData({ loading: false });
        return;
      }

      const user = app.getUser();
      const taskStatus = typeof task.status === 'number' ? task.status : parseInt(task.status, 10);
      const isMyTask = user && task.business_id === user.id;

      let claimReason = '';
      let canClaim = false;

      if (!user) {
        claimReason = '请先登录';
      } else if (isMyTask) {
        claimReason = '无法接自己的任务';
      } else if (taskStatus !== 2) {
        claimReason = '任务未开放领取';
      } else if (task.remaining_count <= 0) {
        claimReason = '名额已满';
      } else {
        canClaim = true;
      }

      // 检查当前用户是否已认领该任务
      let myClaim = null;
      let hasClaimed = false;
      let claimStatus = 0;
      let pendingCount = 0;
      if (user && !isMyTask) {
        try {
          const claimRes = await Api.getClaimByTaskId(taskId);
          myClaim = claimRes.data;
          // 认领状态：1=待提交, 2=待验收, 3=已完成
          hasClaimed = myClaim && (myClaim.status === 1 || myClaim.status === 2);
          claimStatus = myClaim ? myClaim.status : 0;
        } catch (e) {
          // 忽略错误，继续显示领取按钮
          // 如果获取认领状态失败，不允许接单，避免重复认领
          canClaim = false;
        }

        // 如果未认领当前任务，检查是否有太多待提交任务
        pendingCount = 0;
        if (!hasClaimed && canClaim) {
          try {
            const claimsRes = await Api.getMyClaims();
            pendingCount = (claimsRes.data || []).filter(c => c.status === 1).length;
            if (pendingCount >= 3) {
              canClaim = false;
              claimReason = '已达未完成接单上限';
            }
          } catch (e) {
            // 忽略错误，不影响接单判断
          }
        }
      }

      const remainingSlots = Math.max(0, 3 - pendingCount);

      // 解析 industries 从逗号分隔字符串为数组
      let industryArray = [];
      if (task.industries) {
        if (typeof task.industries === 'string') {
          industryArray = task.industries.split(',').map(s => s.trim()).filter(s => s);
        } else if (Array.isArray(task.industries)) {
          industryArray = task.industries;
        }
      }

      this.setData({
        task,
        materials: task.materials || [],
        industryArray, // 用于渲染标签
        isMyTask,
        canClaim,
        claimReason,
        myClaim,
        pendingCount,
        remainingSlots,
        hasClaimed,
        claimStatus,
        loading: false
      });

      if (isMyTask) {
        this.loadSignups(taskId);
        this.loadSubmissions(taskId);
      }
    } catch (err) {
      console.error('loadTaskDetail error:', err);
      wx.showToast({ title: '加载失败: ' + (err.message || '未知错误'), icon: 'none', duration: 3000 });
      this.setData({ loading: false });
    } finally {
      wx.hideLoading();
    }
  },

  async loadSignups(taskId) {
    try {
      const res = await Api.getTaskClaims(taskId);
      // 只显示已报名但未提交的认领（状态 = 1）
      const signups = (res.data || []).filter(c => {
        const status = typeof c.status === 'number' ? c.status : parseInt(c.status, 10);
        return status === 1;
      });
      this.setData({ signups });
    } catch (err) {
      console.error('加载报名列表失败', err);
    }
  },

  async loadSubmissions(taskId) {
    try {
      const res = await Api.getTaskClaims(taskId);
      console.log('getTaskClaims response:', res);
      // 只显示已提交的投稿（状态 >= 2，待验收或已完成）
      const submissions = (res.data || []).filter(c => {
        const status = typeof c.status === 'number' ? c.status : parseInt(c.status, 10);
        return status >= 2;
      });
      console.log('filtered submissions:', submissions);
      this.setData({ submissions });
    } catch (err) {
      console.error('加载投稿列表失败', err);
    }
  },

  async claimTask() {
    if (!app.isLoggedIn()) {
      wx.showLoading({ title: '登录中...' });
      await app.silentLogin();
      wx.hideLoading();
      if (!app.isLoggedIn()) {
        wx.showToast({ title: '登录失败，请稍后重试', icon: 'none' });
        return;
      }
    }
    const { task, pendingCount, remainingSlots } = this.data;

    // 显示二次确认弹窗
    const isFull = remainingSlots <= 0;
    const content = isFull
      ? `目前您已接单${pendingCount}个，剩余${remainingSlots}个\n\n请先完结当前任务再接单`
      : `目前您已接单${pendingCount}个，剩余${remainingSlots}个`;

    const confirmTitle = isFull ? '无法接单' : '确认接单';

    return new Promise((resolve) => {
      wx.showModal({
        title: confirmTitle,
        content: content,
        confirmText: isFull ? '我知道了' : '确认',
        cancelText: '取消',
        showCancel: !isFull,
        success: async (res) => {
          if (isFull) {
            resolve();
            return;
          }
          if (!res.confirm) {
            resolve();
            return;
          }

          // 用户确认接单
          wx.showLoading({ title: '接单中...' });
          try {
            await Api.claimTask(task.id);
            wx.hideLoading();
            wx.showToast({ title: '接单成功！', icon: 'success', duration: 1500 });
            // 不再跳转到提交作品页，仅刷新状态
            await this.loadTaskDetail(task.id);
          } catch (err) {
            wx.hideLoading();
            wx.showToast({ title: err.message || '接单失败', icon: 'none', duration: 3000 });
          }
          resolve();
        }
      });
    });
  },

  // 跳转到提交作品页面
  goSubmitWork() {
    const { myClaim } = this.data;
    if (myClaim) {
      wx.navigateTo({
        url: `/pages/creator/submit-work/index?claimId=${myClaim.id}&taskId=${myClaim.task_id}`
      });
    }
  },

  async reviewClaim(e) {
    const { claimId, result } = e.currentTarget.dataset;
    try {
      await Api.reviewClaim(claimId, result);
      wx.showToast({ title: result === 1 ? '已采纳' : '已拒绝', icon: 'success' });
      if (this.data.task) {
        this.loadSubmissions(this.data.task.id);
      }
    } catch (err) {
      wx.showToast({ title: err.message || '操作失败', icon: 'none' });
    }
  },

  goReviewProposals() {
    const taskId = this.data.task && this.data.task.id;
    const url = taskId
      ? `/pages/employer/video-proposals/index?taskId=${taskId}`
      : '/pages/employer/video-proposals/index';
    wx.navigateTo({ url });
  },

  getStatusText(status) {
    return getStatusText(status);
  },

  getClaimStatusText(status) {
    return getClaimStatusText(status);
  },

  getStatusClass(status) {
    return getStatusClass(status);
  },

  isAdopted(status) {
    const s = typeof status === 'number' ? status : parseInt(status, 10);
    return s === 3;
  },

  previewMaterial(e) {
    const url = e.currentTarget.dataset.url;
    wx.previewImage({ urls: [url], current: url });
  },

  downloadMaterial(e) {
    const url = e.currentTarget.dataset.url;
    const name = e.currentTarget.dataset.name || '素材';
    wx.showLoading({ title: '下载中...' });
    wx.downloadFile({
      url: url,
      success(res) {
        wx.hideLoading();
        if (res.statusCode === 200) {
          wx.saveFileToDisk({
            filePath: res.tempFilePath,
            success() {
              wx.showToast({ title: '保存成功', icon: 'success' });
            },
            fail(err) {
              // 兼容不支持保存到磁盘的情况，改为打开文件
              wx.openDocument({
                filePath: res.tempFilePath,
                showMenu: true,
                success() {
                  wx.showToast({ title: '已打开', icon: 'success' });
                },
                fail() {
                  wx.showToast({ title: '下载失败', icon: 'none' });
                }
              });
            }
          });
        } else {
          wx.showToast({ title: '下载失败', icon: 'none' });
        }
      },
      fail() {
        wx.hideLoading();
        wx.showToast({ title: '下载失败', icon: 'none' });
      }
    });
  },

  copyText(e) {
    const text = e.currentTarget.dataset.copy;
    wx.setClipboardData({
      data: text,
      success() {
        wx.showToast({ title: '已复制', icon: 'success' });
      },
      fail() {
        wx.showToast({ title: '复制失败', icon: 'none' });
      }
    });
  },

  formatDateTime(dateStr) {
    return formatDateTime(dateStr);
  },

  switchTab(e) {
    const tab = e.currentTarget.dataset.tab;
    this.setData({ currentTab: tab });
  },

  goBack() {
    wx.navigateBack({ fail: () => wx.switchTab({ url: '/pages/home/index' }) });
  },

  copyTaskId() {
    const taskId = this.data.task && this.data.task.id;
    if (taskId) {
      wx.setClipboardData({
        data: taskId,
        success() {
          wx.showToast({ title: '已复制', icon: 'success' });
        }
      });
    }
  }
});
