# Bring Obsidian to Front

[![GitHub release (latest SemVer)](https://img.shields.io/github/v/release/rockbenben/bring-obsidian-to-front?style=for-the-badge&sort=semver)](https://github.com/rockbenben/bring-obsidian-to-front/releases/latest)
[![GitHub License](https://img.shields.io/github/license/rockbenben/bring-obsidian-to-front?style=for-the-badge)](LICENSE)

[English](README.md) | 中文

## 简介

当 Obsidian 处于后台时，如果出现弹窗或通知，本插件会自动将窗口置顶。**无需配置**，安装启用即可使用。可通过关键词和监听范围进行过滤，仅对特定内容触发。

> **仅桌面端**（Windows / macOS / Linux），依赖 Electron API 实现窗口管理。

![demo](demo.gif)

## 核心功能

- **自动置顶：** 当 Obsidian 处于后台时，出现弹窗或通知自动将窗口带到前台
- **关键词过滤：** 可选的逗号分隔关键词，出现任一关键词即触发
- **灵活监听：** 可监听弹窗、通知、两者兼监，或自定义 CSS 选择器
- **冷却保护：** 可配置的最小聚焦间隔，避免频繁切换
- **双语界面：** 完整的中英文支持，自动检测语言

## 安装

### 方式一：手动安装

1. 从 [GitHub Releases](https://github.com/rockbenben/bring-obsidian-to-front/releases) 下载最新版本
2. 解压下载的文件
3. 将插件文件夹复制到你的 vault 插件目录：

   ```text
   YourVault/.obsidian/plugins/bring-obsidian-to-front/
   ```

4. 重启 Obsidian 或重新加载插件
5. 在设置 -> 社区插件中启用该插件

### 方式二：使用 BRAT

1. 安装 [BRAT 插件](https://github.com/TfTHacker/obsidian42-brat)
2. 打开 BRAT 设置，点击 Add Beta Plugin
3. 输入仓库地址：rockbenben/bring-obsidian-to-front
4. 点击 Add Plugin 并启用

## 配置

打开设置 -> 社区插件 -> Bring Obsidian to Front。

### 设置项

| 设置             | 说明                                                | 默认值        | 范围                     |
| ---------------- | --------------------------------------------------- | ------------- | ------------------------ |
| 语言             | 界面语言                                            | 自动检测      | 自动 / English / 中文    |
| 关键词           | 逗号分隔的关键词，不区分大小写（留空 = 匹配全部）    | 空            | 任意文本                 |
| 监听范围         | 监听哪类 DOM 元素                                   | 弹窗和通知    | 弹窗 / 通知 / 两者 / 自定义 |
| 自定义 CSS 选择器| 自定义选择器（仅当范围 = 自定义时）                  | 空            | 合法 CSS 选择器          |
| 聚焦冷却         | 两次置顶之间的最小间隔秒数（0 = 不限制）             | 5 秒          | >= 0                     |
| 调试模式         | 在控制台输出匹配日志                                | 关闭          | 开 / 关                  |

### 配置示例

| 用途             | 关键词          | 监听范围                              |
| ---------------- | --------------- | ------------------------------------- |
| 任意弹窗/通知    | （留空）        | 弹窗和通知                            |
| 提醒弹窗         | `Snooze, Done`  | 弹窗                                  |
| 错误提示         | `error, failed` | 通知                                  |
| 指定插件         | （留空）        | 自定义：`[data-type="my-plugin"]`     |

### 调优建议

- 聚焦冷却越短（1-30 秒）= 适合频繁触发
- 聚焦冷却越长（>= 120 秒）= 干扰更少

## 工作原理

1. **MutationObserver：** 实时监听 DOM 中与配置范围匹配的新增元素
2. **关键词匹配：** 如果配置了关键词，检查元素文本内容是否匹配
3. **冷却检查：** 确保两次置顶之间有最小间隔
4. **窗口置顶：** 通过 Electron API 将窗口置顶（恢复、显示、alwaysOnTop 技巧、聚焦）

## 故障排除

| 问题             | 可能原因                | 解决方案                                |
| ---------------- | ----------------------- | --------------------------------------- |
| 频繁置顶         | 聚焦冷却设置过短        | 增加聚焦冷却时间                        |
| 未检测到         | 范围或关键词配置有误    | 检查设置；尝试关键词留空 + 范围「两者」 |
| 语言未切换       | 缓存/重载问题           | 更改语言后重启 Obsidian                 |

### 调试步骤

1. 在设置中启用调试模式
2. 打开开发者工具控制台（Ctrl+Shift+I）
3. 触发你期望匹配的条件
4. 检查控制台中的 `[Bring to Front]` 日志消息
5. 在控制台运行 `document.querySelector("你的选择器")` 验证 CSS 选择器是否正确

## 开发

```bash
git clone https://github.com/rockbenben/bring-obsidian-to-front.git
cd bring-obsidian-to-front
npm install
npm run dev    # 开发模式，支持热重载
npm run build  # 生产构建
```

## 许可证

MIT

## 支持

如遇到任何问题或有建议，请在 GitHub 上提交 issue。
