// utils/util.js - 工具函数

/**
 * 格式化日期
 */
function formatDate(dateStr) {
  if (!dateStr) return '不限';
  return dateStr.substring(0, 10);
}

/**
 * 格式化金额
 */
function formatPrice(price) {
  return Number(price || 0).toLocaleString();
}

/**
 * 获取任务状态文本
 * 任务状态: 0=待审核, 1=已上线(可接单), 2=进行中, 3=已结束, 4=已取消
 */
function getStatusText(status) {
  const num = typeof status === 'number' ? status : parseInt(status, 10);
  const map = {
    0: '待审核',
    1: '已上线',
    2: '进行中',
    3: '已结束',
    4: '已取消',
    'online': '已上线',
    'open': '已上线',
    'in_progress': '进行中',
    'pending': '待审核',
    'completed': '已完成',
    'closed': '已结束',
    'cancelled': '已取消',
  };
  return map[num] || map[status] || String(status) || '未知';
}

/**
 * 获取接单状态文本
 * 商家视角: 0=待交付, 1=待验收, 2=已完成, 3=已过期, 4=已取消, 5=已退回
 * 字符串视角: pending=待审核, submitted=已提交, passed=已采纳, rejected=已拒绝
 */
function getClaimStatusText(status) {
  // 数字类型状态
  if (typeof status === 'number') {
    const num = status;
    const numMap = {
      0: '待交付',
      1: '待验收',
      2: '已完成',
      3: '已过期',
      4: '已取消',
      5: '已退回',
    };
    return numMap[num] || `状态${num}`;
  }
  // 字符串类型状态
  const strMap = {
    'pending': '待审核',
    'submitted': '已提交',
    'passed': '已采纳',
    'rejected': '已拒绝',
  };
  return strMap[status] || status || '未知';
}

/**
 * 获取状态对应的样式类
 * 任务: 0=待审核, 1=已上线, 2=进行中, 3=已结束, 4=已取消
 */
function getStatusClass(status) {
  const map = {
    0: 'pending',
    1: 'open',
    2: 'in-progress',
    3: 'closed',
    4: 'cancelled',
    'online': 'open',
    'open': 'open',
    'in_progress': 'in-progress',
    'pending': 'pending',
    'completed': 'completed',
    'closed': 'closed',
    'cancelled': 'cancelled',
    'submitted': 'in-progress',
  };
  return map[status] || 'pending';
}

module.exports = {
  formatDate,
  formatPrice,
  getStatusText,
  getClaimStatusText,
  getStatusClass
};
