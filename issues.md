# Issues

基于 `/data/miao-mini/人工测试案例流程文档`（2026-04-27）对当前代码逐条核对后的问题清单。

说明：
- 本文件仅记录问题，不包含修复。
- 优先级口径：
  - `P1`：阻断测试执行、主流程不可达、或会产生错误业务结果
  - `P2`：流程可继续，但与测试预期明显不一致，或关键数据展示错误
  - `P3`：非阻断问题，主要影响易用性、引导性或页面完整度

## P1

### ISSUE-P1-001 申诉图片上传部分失败时，前端仍继续提交申诉
- 关联用例：`TC-ACC-009`
- 文件：
  - `pages/mine/appeal/index.js:123-150`
- 问题说明：
  - 上传凭证图片时，单张上传失败只会 toast 提示，但循环不会中断，随后仍会调用 `Api.createAppeal(...)`。
  - 这会导致“有图片时先上传图片，再提交申诉”的流程失真，并可能产生证据不完整的申诉单。

### ISSUE-P1-002 商家任务详情“下载已选稿件”入口被注释，测试用例不可执行
- 关联用例：`TC-BIZ-014`
- 文件：
  - `pages/employer/task-detail/index.wxml:57-69`
  - `pages/employer/task-detail/index.js:350-356`
  - `pages/employer/task-detail/index.js:456-520`
- 问题说明：
  - 批量操作条和“批量操作”开关均被注释，页面上没有入口切换到批量选择模式。
  - `downloadSelected()` 虽然存在，但人工测试无法从 UI 进入该流程，`TC-BIZ-014` 当前不可执行。

### ISSUE-P1-003 已购作品预览链路没有下载入口，下载测试不可执行
- 关联用例：`TC-BIZ-017`
- 文件：
  - `pages/employer/purchased-works/index.js:122-186`
  - `pages/employer/purchased-works/index.wxml:1-62`
  - `pages/video-player/index.wxml:1-44`
  - `pages/video-player/index.js:1-147`
- 问题说明：
  - 已购作品页脚本存在 `downloadWorkMaterial()`，但列表页没有下载按钮。
  - 进入作品预览页后，页面也只有预览能力，没有“下载素材”操作。
  - 文档要求“点击下载素材”，当前完整下载链路没有可触发的 UI。

## P3
