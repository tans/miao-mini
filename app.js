// Mini Program App - Video Task Platform

const App = {
  currentPage: 'home',
  detailTaskId: null,

  // Sample data
  tasks: [
    {
      id: 1,
      title: '美妆品牌新品推广视频',
      description: '需要拍摄一条30秒的产品种草视频，突出产品卖点和使用效果',
      budget: 5000,
      status: 'open',
      tags: ['美妆', '视频', '30秒'],
      creator: '小红书品牌方',
      deadline: '2026-04-20',
      proposals: 3,
      views: 128
    },
    {
      id: 2,
      title: '餐饮连锁店探店视频',
      description: '诚邀美食博主到店探访，拍摄店铺环境、菜品展示和用餐体验',
      budget: 3000,
      status: 'in-progress',
      tags: ['美食', '探店', '本地生活'],
      creator: '味道坊餐厅',
      deadline: '2026-04-18',
      proposals: 7,
      views: 256
    },
    {
      id: 3,
      title: '科技产品开箱评测',
      description: '新品蓝牙耳机开箱评测，需要展示外观、质感、音质测试',
      budget: 8000,
      status: 'pending',
      tags: ['科技', '评测', '开箱'],
      creator: '字节数码',
      deadline: '2026-04-25',
      proposals: 12,
      views: 512
    },
    {
      id: 4,
      title: '时尚穿搭分享视频',
      description: '春季新品穿搭分享，需要2-3套搭配展示，时长1-2分钟',
      budget: 4000,
      status: 'open',
      tags: ['时尚', '穿搭', '春季'],
      creator: '衣二三工作室',
      deadline: '2026-04-15',
      proposals: 5,
      views: 89
    }
  ],

  proposals: [
    {
      id: 1,
      taskId: 1,
      creator: '创意小王',
      avatar: '创',
      video: 'video1.mp4',
      cover: 'https://picsum.photos/400/225',
      description: '根据品牌调性，设计了快节奏的种草风格，突出产品核心卖点',
      price: 4800,
      status: 'pending',
      time: '2小时前'
    },
    {
      id: 2,
      taskId: 1,
      creator: '视频达人小李',
      avatar: '李',
      video: 'video2.mp4',
      cover: 'https://picsum.photos/400/226',
      description: '我是专业美妆博主，有丰富的产品推广经验，期待合作！',
      price: 5000,
      status: 'accepted',
      time: '5小时前'
    }
  ],

  myTasks: [
    { id: 1, title: '美妆品牌新品推广视频', status: 'in-review', budget: 5000, role: 'creator' },
    { id: 2, title: '餐饮连锁店探店视频', status: 'completed', budget: 3000, role: 'creator' }
  ],

  init() {
    this.bindEvents();
    this.render('home');
  },

  bindEvents() {
    // Tab bar navigation
    document.querySelectorAll('.tab-item').forEach(tab => {
      tab.addEventListener('click', (e) => {
        const page = tab.dataset.page;
        document.querySelectorAll('.tab-item').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        this.render(page);
      });
    });

    // Back button (delegated)
    document.getElementById('pageContainer').addEventListener('click', (e) => {
      if (e.target.closest('.back-btn')) {
        this.render('home');
      }
    });
  },

  setTitle(title) {
    document.getElementById('pageTitle').textContent = title;
  },

  render(page, data = {}) {
    this.currentPage = page;
    const container = document.getElementById('pageContainer');

    switch(page) {
      case 'home':
        this.setTitle('首页');
        container.innerHTML = this.renderHome();
        break;
      case 'create-task':
        this.setTitle('创建任务');
        container.innerHTML = this.renderCreateTask();
        break;
      case 'task-detail':
        this.setTitle('任务详情');
        container.innerHTML = this.renderTaskDetail(data.taskId);
        break;
      case 'video-proposals':
        this.setTitle('视频提案');
        container.innerHTML = this.renderProposals();
        break;
      case 'my-tasks':
        this.setTitle('我的任务');
        container.innerHTML = this.renderMyTasks();
        break;
    }
  },

  renderHome() {
    const openTasks = this.tasks.filter(t => t.status === 'open');
    return `
      <div class="section-header">
        <div class="section-title">最新任务</div>
        <span style="font-size:13px;color:var(--gray-400)">${openTasks.length}个开放中</span>
      </div>
      ${openTasks.map(task => `
        <div class="card task-card" onclick="App.render('task-detail', {taskId: ${task.id}})">
          <div class="task-header">
            <div class="task-title">${task.title}</div>
            <span class="task-status ${task.status}">${this.getStatusText(task.status)}</span>
          </div>
          <div class="task-tags">
            ${task.tags.map(tag => `<span class="tag">${tag}</span>`).join('')}
          </div>
          <div class="task-meta">
            <span>📅 ${task.deadline}</span>
            <span class="task-budget">¥${task.budget.toLocaleString()}</span>
          </div>
        </div>
      `).join('')}
    `;
  },

  renderCreateTask() {
    return `
      <form class="card" onsubmit="App.handleCreateTask(event)" style="padding:20px;">
        <div class="form-group">
          <label class="form-label">任务标题</label>
          <input type="text" class="form-input" placeholder="简洁描述任务需求" required>
        </div>
        <div class="form-group">
          <label class="form-label">详细描述</label>
          <textarea class="form-textarea" placeholder="详细说明任务要求、交付标准、注意事项..." required></textarea>
        </div>
        <div class="form-group">
          <label class="form-label">预算金额 (元)</label>
          <input type="number" class="form-input" placeholder="输入预算金额" min="100" required>
        </div>
        <div class="form-group">
          <label class="form-label">截止日期</label>
          <input type="date" class="form-input" required>
        </div>
        <div class="form-group">
          <label class="form-label">任务类型</label>
          <div class="chip-group">
            <span class="chip active">视频创作</span>
            <span class="chip">图文种草</span>
            <span class="chip">直播带货</span>
            <span class="chip">KOL合作</span>
          </div>
        </div>
        <div class="form-group">
          <label class="form-label">视频时长要求</label>
          <div class="chip-group">
            <span class="chip active">15秒</span>
            <span class="chip">30秒</span>
            <span class="chip">60秒</span>
            <span class="chip">1-3分钟</span>
          </div>
        </div>
        <button type="submit" class="btn btn-primary btn-block">发布任务</button>
      </form>
    `;
  },

  handleCreateTask(e) {
    e.preventDefault();
    this.showToast('任务发布成功！');
    setTimeout(() => this.render('home'), 1500);
  },

  renderTaskDetail(taskId) {
    const task = this.tasks.find(t => t.id === taskId) || this.tasks[0];
    const taskProposals = this.proposals.filter(p => p.taskId === task.id);

    return `
      <div class="page-detail">
        <div class="card" style="margin:0 -16px 16px; border-radius:0; padding:20px;">
          <div class="detail-title">${task.title}</div>
          <div class="detail-meta">
            <span>👤 ${task.creator}</span>
            <span>📅 ${task.deadline}</span>
            <span class="task-status ${task.status}">${this.getStatusText(task.status)}</span>
          </div>
        </div>

        <div class="detail-section">
          <div class="detail-section-title">任务描述</div>
          <p style="color:var(--gray-600); line-height:1.7;">${task.description}</p>
        </div>

        <div class="detail-section">
          <div class="detail-section-title">预算</div>
          <div style="font-size:28px; font-weight:700; color:var(--danger);">¥${task.budget.toLocaleString()}</div>
        </div>

        <div class="detail-section">
          <div class="detail-section-title">标签</div>
          <div class="task-tags">
            ${task.tags.map(tag => `<span class="tag video">${tag}</span>`).join('')}
          </div>
        </div>

        <div class="detail-section">
          <div class="detail-section-title">视频提案 (${taskProposals.length})</div>
          ${taskProposals.length > 0 ? taskProposals.map(p => `
            <div class="card proposal-card">
              <div class="proposal-header">
                <div style="display:flex;align-items:center;gap:10px;">
                  <div class="avatar">${p.avatar}</div>
                  <div>
                    <div class="proposal-creator">${p.creator}</div>
                    <div class="proposal-time">${p.time}</div>
                  </div>
                </div>
                <span class="task-status ${p.status}">${p.status === 'accepted' ? '已采纳' : '待审核'}</span>
              </div>
              <div class="proposal-video" style="background-image:url(${p.cover});background-size:cover;background-position:center;">
                <span style="display:flex;align-items:center;gap:6px;">
                  <span style="font-size:24px;">▶</span> 播放预览
                </span>
              </div>
              <p style="color:var(--gray-600);font-size:14px;margin-bottom:12px;">${p.description}</p>
              <div style="display:flex;justify-content:space-between;align-items:center;">
                <span style="font-weight:600;color:var(--danger);font-size:16px;">¥${p.price.toLocaleString()}</span>
                <div class="proposal-actions">
                  <button class="btn btn-secondary" style="padding:8px 16px;font-size:13px;">拒绝</button>
                  <button class="btn btn-primary" style="padding:8px 16px;font-size:13px;">采纳</button>
                </div>
              </div>
            </div>
          `).join('') : `
            <div class="empty-state" style="padding:30px;">
              <div class="empty-state-desc">暂无提案，等待创作者投递</div>
            </div>
          `}
        </div>

        ${task.status === 'open' ? `
          <div style="margin-top:20px;">
            <button class="btn btn-primary btn-block" onclick="App.showToast('已投递提案，等待商家审核')">投递我的提案</button>
          </div>
        ` : ''}
      </div>
    `;
  },

  renderProposals() {
    return `
      <div class="tabs">
        <button class="tab-btn active">全部</button>
        <button class="tab-btn">待审核</button>
        <button class="tab-btn">已采纳</button>
        <button class="tab-btn">已拒绝</button>
      </div>

      ${this.proposals.map(p => {
        const task = this.tasks.find(t => t.id === p.taskId);
        return `
          <div class="card proposal-card">
            <div style="font-size:13px;color:var(--gray-500);margin-bottom:8px;">投递于：${task?.title || '任务'}</div>
            <div class="proposal-header">
              <div style="display:flex;align-items:center;gap:10px;">
                <div class="avatar">${p.avatar}</div>
                <div>
                  <div class="proposal-creator">${p.creator}</div>
                  <div class="proposal-time">${p.time}</div>
                </div>
              </div>
              <span class="task-status ${p.status}">${p.status === 'accepted' ? '已采纳' : '待审核'}</span>
            </div>
            <div class="proposal-video" style="background-image:url(${p.cover});background-size:cover;background-position:center;">
              <span style="display:flex;align-items:center;gap:6px;">
                <span style="font-size:24px;">▶</span> 播放预览
              </span>
            </div>
            <p style="color:var(--gray-600);font-size:14px;margin:12px 0;">${p.description}</p>
            <div style="display:flex;justify-content:space-between;align-items:center;">
              <span style="font-weight:600;color:var(--danger);font-size:16px;">¥${p.price.toLocaleString()}</span>
            </div>
          </div>
        `;
      }).join('')}
    `;
  },

  renderMyTasks() {
    return `
      <div class="stats">
        <div class="stat-card">
          <div class="stat-value">2</div>
          <div class="stat-label">进行中</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">5</div>
          <div class="stat-label">已完成</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">¥8,500</div>
          <div class="stat-label">总收入</div>
        </div>
      </div>

      <div class="tabs">
        <button class="tab-btn active">接单</button>
        <button class="tab-btn">发布</button>
      </div>

      ${this.myTasks.map(task => `
        <div class="card task-card" onclick="App.render('task-detail', {taskId: ${task.id}})">
          <div class="task-header">
            <div class="task-title">${task.title}</div>
            <span class="task-status ${task.status === 'completed' ? 'completed' : 'in-progress'}">
              ${task.status === 'completed' ? '已完成' : '审核中'}
            </span>
          </div>
          <div class="task-meta">
            <span>你的报价</span>
            <span class="task-budget">¥${task.budget.toLocaleString()}</span>
          </div>
        </div>
      `).join('')}

      <div style="text-align:center;margin-top:30px;">
        <button class="btn btn-secondary" onclick="App.render('create-task')">发布新任务</button>
      </div>
    `;
  },

  getStatusText(status) {
    const map = {
      'open': '开放中',
      'in-progress': '进行中',
      'pending': '待开始',
      'completed': '已完成'
    };
    return map[status] || status;
  },

  showToast(message) {
    const existing = document.querySelector('.toast');
    if (existing) existing.remove();

    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.textContent = message;
    document.body.appendChild(toast);

    setTimeout(() => toast.remove(), 2500);
  }
};

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', () => App.init());