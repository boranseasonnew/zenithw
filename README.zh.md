<p align="center">
  <img src="frontend/zenithw.png" width="96" height="96" alt="ZenithW 标志">
</p>

<h1 align="center">ZenithW</h1>

<p align="center">
  保存媒体，保持简单。<br>
  <a href="https://zenithw.space/zh/">网页应用</a> · <a href="https://github.com/boranseasonnew/zenithw/releases/latest">Windows</a> · <a href="https://github.com/boranseasonnew/zenithw-android/releases/latest">Android</a>
</p>

<p align="center">
  <a href="https://zenithw.space"><img src="https://img.shields.io/badge/Web-v17.2-7C3AED?style=for-the-badge" alt="ZenithW Web v17.2"></a>
  <a href="https://github.com/boranseasonnew/zenithw/releases/latest"><img src="https://img.shields.io/github/v/release/boranseasonnew/zenithw?style=for-the-badge&amp;labelColor=151922&amp;logoColor=white&amp;label=Windows&amp;logo=windows11&amp;color=2563EB" alt="Windows latest release"></a>
</p>

<p align="center"><strong><a href="why_zenithw.md">✦ 为什么创建 ZenithW？阅读项目故事（英文）</a></strong></p>

[English](README.md) · [Türkçe](README.tr.md) · [Français](README.fr.md) · [Deutsch](README.de.md) · [Русский](README.ru.md) · [Tiếng Việt](README.vi.md) · [简体中文](README.zh.md) · [日本語](README.ja.md)

ZenithW 是开源媒体工具，可下载视频与音频、提取声音、转换格式和重新封装。媒体工具无广告、无订阅，也不强制注册账户。

粘贴支持的链接，选择格式，然后下载文件。可用格式取决于来源。

[Zenith Type](https://zenithw.space/typing) 提供土耳其语和英语打字练习、个人主页、经过验证的排行榜、排位对战和私人房间。在线功能需要账户，本地练习则不需要。WPM 排行榜和排位 Elo 每 30 天重置；私人房间 Elo 独立且永久保留。规则、房间设置和部署状态见 [Type 文档](docs/TYPING.md)。

## 为什么选择 ZenithW？

一个开源媒体工作空间，用于下载和处理媒体，无需强制注册账户、订阅或忍受广告。

## 功能

- 通过简单的链接流程下载受支持来源的媒体。
- 从媒体中提取并处理音频。
- 转换媒体格式，并对兼容的 MKV/MP4 流进行无需重新编码的 remux。
- 直接在浏览器本地转换和调整图片尺寸。
- 使用 Audio Separator 分离人声与伴奏。

## 快速开始

克隆仓库并进入项目目录：

```bash
git clone https://github.com/boranseasonnew/zenithw.git
cd zenithw
cp .env.example .env
```

将 `.env.example` 复制为 `.env`，并将 `SECRET_KEY` 设置为强随机值。

```bash
docker compose up -d --build
```

在浏览器中打开 `http://localhost:8080`：

## 网页版 17.2 更新

- **公共网页应用已停用 Vimeo：**由于部分 Vimeo 链接需要 cookies，且与 yt-dlp 的兼容性不稳定，因此移除了网页端支持。
- **修正翻译：**AVI 等格式名称以及 Rumble 等平台名称不再被错误翻译。
- **修复设置快捷链接：**下载面板中的链接现在会直接打开相关的视频设置，而不是“外观”选项卡。
- **本地化 SEO 元数据：**页面标题和分享预览现在会根据网站语言显示对应内容。
- **移除应用推广弹窗：**用户输入链接时不再受到弹窗干扰。

Windows 和 Android 继续使用各自独立的版本编号；此处版本号仅指网页版。
## 项目

- [网页界面](frontend/)与 [API](backend/)
- [Windows 应用](desktop/) · [Android 源码](https://github.com/boranseasonnew/zenithw-android)

## 文档

- [用法与限制（英语）](docs/USAGE.md)
- [自行部署与开发（英语）](docs/SELF_HOSTING.md)
- [设备本地媒体处理（英语）](docs/LOCAL_MEDIA.md)
- [服务状态](https://zenithw.space/status) · [更新](https://zenithw.space/zh/updates)

公共网页服务已停用 YouTube 下载。Windows、Android 和自行部署的实例使用各自的网络连接；来源平台的限制仍然适用。

## 负责任地使用

只下载自己拥有或获准使用的内容。请遵守平台条款和版权规定。ZenithW 与支持的平台没有隶属关系。

网页下载历史记录保存在浏览器中，服务器上准备好的文件会过期删除。ZenithW 不提供永久云存储。

## 参与贡献

欢迎报告问题、提交翻译和拉取请求。请阅读[贡献指南](CONTRIBUTING.md)，或提交 [Issue](https://github.com/boranseasonnew/zenithw/issues)。

## 致谢

本项目使用 yt-dlp、FFmpeg、Mediabunny 等开源项目。感谢这些项目的维护者与所有 ZenithW 贡献者。

## 许可证

[AGPL-3.0-only](LICENSE)。第三方组件保留各自的许可证，详见[第三方声明](THIRD_PARTY_NOTICES.md)。
