# TabBar 图标要求

微信小程序 TabBar 图标要求：
- 尺寸：81px × 81px（推荐 144px × 144px 以支持高清屏幕）
- 格式：PNG（不支持网络图片）
- 颜色：仅支持黑/白两种颜色（tabBar 会自动处理选中/未选中颜色）

## 需要创建的图标文件

```
assets/icons/
├── home.png              # 首页 - 未选中
├── home-active.png       # 首页 - 选中
├── create.png            # 创建任务 - 未选中
├── create-active.png     # 创建任务 - 选中
├── mytasks.png           # 我的任务 - 未选中
├── mytasks-active.png    # 我的任务 - 选中
├── proposals.png         # 提案 - 未选中
└── proposals-active.png  # 提案 - 选中
```

## 快速生成图标

可以使用在线工具（如 [iconfont](https://www.iconfont.cn/) 或 [Figma](https://figma.com/)）生成，或使用以下命令：

```bash
# 使用 ImageMagick（需安装）
convert -size 81x81 xc:none icon.png
```

## 临时方案

如果暂时没有图标，可以将 `app.json` 中的 `iconPath` 和 `selectedIconPath` 字段暂时删除，
微信开发者工具会在没有图标时显示页面名称。
