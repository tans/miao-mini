// pages/task-detail/index.js
const Api = require('../../utils/api.js');
const { getStatusText, getClaimStatusText, getStatusClass } = require('../../utils/util.js');
const app = getApp();

Page({
  data: {
    task: null,
    loading: true,
    claims: [],
    materials: [],
    isMyTask: false,
    canClaim: false,
    claimReason: '',
    myClaim: null,      // 当前用户对该任务的认领记录
    hasClaimed: false,   // 是否已认领（待提交状态）
    claimStatus: 0,     // 认领状态：0=未认领, 1=待提交, 2=待验收, 3=已完成
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
        this.loadTaskClaims(task.id);
      }
    } catch (e) {
      // 忽略刷新错误
    }
  },

  async loadTaskDetail(taskId) {
    wx.showLoading({ title: '加载中...' });
    try {
      const res = await Api.getTask(taskId);
      const task = res.data;

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
      if (user && !isMyTask) {
        try {
          const claimRes = await Api.getClaimByTaskId(taskId);
          myClaim = claimRes.data;
          // 认领状态：1=待提交, 2=待验收, 3=已完成
          hasClaimed = myClaim && (myClaim.status === 1 || myClaim.status === 2);
          claimStatus = myClaim ? myClaim.status : 0;
        } catch (e) {
          // 忽略错误，继续显示领取按钮
        }

        // 如果未认领当前任务，检查是否有太多待提交任务
        if (!hasClaimed && canClaim) {
          try {
            const claimsRes = await Api.getMyClaims();
            const pendingCount = (claimsRes.data || []).filter(c => c.status === 1).length;
            if (pendingCount >= 3) {
              canClaim = false;
              claimReason = '已达未完成接单上限';
            }
          } catch (e) {
            // 忽略错误，不影响接单判断
          }
        }
      }

      this.setData({
        task,
        materials: task.materials || [],
        isMyTask,
        canClaim,
        claimReason,
        myClaim,
        hasClaimed,
        claimStatus,
        loading: false
      });

      if (isMyTask) {
        this.loadTaskClaims(taskId);
      }
    } catch (err) {
      wx.showToast({ title: '加载失败', icon: 'none' });
      this.setData({ loading: false });
    } finally {
      wx.hideLoading();
    }
  },

  async loadTaskClaims(taskId) {
    try {
      const res = await Api.getTaskClaims(taskId);
      this.setData({ claims: res.data || [] });
    } catch (err) {
      console.error('加载提案失败', err);
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
    const { task } = this.data;
    wx.showLoading({ title: '接单中...' });
    try {
      await Api.claimTask(task.id);
      wx.hideLoading();
      wx.showToast({ title: '接单成功！', icon: 'success', duration: 1500 });
      // 获取新创建的认领ID，跳转到提交页面
      const claimRes = await Api.getClaimByTaskId(task.id);
      if (claimRes && claimRes.data && claimRes.data.id) {
        setTimeout(() => {
          wx.navigateTo({
            url: `/pages/submit-work/index?claimId=${claimRes.data.id}&taskId=${task.id}`
          });
        }, 1500);
      }
      // Reload task detail to update claim state
      await this.loadTaskDetail(task.id);
    } catch (err) {
      wx.hideLoading();
      wx.showToast({ title: err.message || '接单失败', icon: 'none', duration: 3000 });
    }
  },

  // 跳转到提交作品页面
  goSubmitWork() {
    const { myClaim } = this.data;
    if (myClaim) {
      wx.navigateTo({
        url: `/pages/submit-work/index?claimId=${myClaim.id}&taskId=${myClaim.task_id}`
      });
    }
  },

  async reviewClaim(e) {
    const { claimId, result } = e.currentTarget.dataset;
    try {
      await Api.reviewClaim(claimId, result);
      wx.showToast({ title: result === 1 ? '已采纳' : '已拒绝', icon: 'success' });
      this.loadTaskClaims(this.data.task.id);
    } catch (err) {
      wx.showToast({ title: err.message || '操作失败', icon: 'none' });
    }
  },

  goReviewProposals() {
    wx.navigateTo({ url: '/pages/video-proposals/index' });
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
  }
});