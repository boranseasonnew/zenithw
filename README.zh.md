<p align="center">
  <img src="frontend/zenithw.png" width="96" height="96" alt="ZenithW 标志">
</p>

<h1 align="center">ZenithW</h1>

<p align="center">
  保存媒体，保持简单。<br>
  <a href="https://zenithw.space/zh/">网页应用</a> · <a href="https://github.com/boranseasonnew/zenithw/releases/latest">Windows</a> · <a href="https://github.com/boranseasonnew/zenithw-android/releases/latest">Android</a>
</p>

<p align="center">
  <a href="https://zenithw.space"><img src="https://img.shields.io/badge/Web-v17.0-7C3AED?style=for-the-badge&amp;labelColor=151922&amp;logoColor=white&amp;logo=html5" alt="ZenithW Web v17.0"></a>
  <a href="https://github.com/boranseasonnew/zenithw/releases/latest"><img src="https://img.shields.io/github/v/release/boranseasonnew/zenithw?style=for-the-badge&amp;labelColor=151922&amp;logoColor=white&amp;label=Windows&amp;logo=windows11&amp;color=2563EB" alt="Windows latest release"></a>
  <a href="https://github.com/boranseasonnew/zenithw-android/releases/latest"><img src="https://img.shields.io/github/v/release/boranseasonnew/zenithw-android?style=for-the-badge&amp;labelColor=151922&amp;logoColor=white&amp;label=Android&amp;logo=android&amp;color=2E7D32" alt="Android latest release"></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/License-AGPL--3.0--only-64748B?style=for-the-badge&amp;labelColor=151922&amp;logoColor=white" alt="AGPL-3.0-only license"></a>
</p>

<p align="center">
  <a href="https://github.com/boranseasonnew/zenithw/releases"><img src="https://img.shields.io/github/downloads/boranseasonnew/zenithw/total?style=for-the-badge&amp;labelColor=151922&amp;logoColor=white&amp;label=PC%20downloads&amp;logo=github&amp;color=7C3AED" alt="PC GitHub release asset downloads, all releases"></a>
  <a href="https://github.com/boranseasonnew/zenithw-android/releases"><img src="https://img.shields.io/github/downloads/boranseasonnew/zenithw-android/total?style=for-the-badge&amp;labelColor=151922&amp;logoColor=white&amp;label=Android%20downloads&amp;logo=android&amp;color=2E7D32" alt="Android GitHub release asset downloads, all releases"></a>
</p>

<p align="center"><sub>计数器累计所有 GitHub 发布文件的下载次数，不代表独立用户或 Microsoft Store 安装量。</sub></p>

<p align="center"><strong><a href="why_zenithw.md">✦ 为什么创建 ZenithW？阅读项目故事（英文）</a></strong></p>

[English](README.md) · [Türkçe](README.tr.md) · [Français](README.fr.md) · [Deutsch](README.de.md) · [Русский](README.ru.md) · [Tiếng Việt](README.vi.md) · [简体中文](README.zh.md) · [日本語](README.ja.md)

ZenithW 是开源媒体工具，可下载视频与音频、提取声音、转换格式和重新封装。媒体工具无广告、无订阅，也不强制注册账户。

粘贴支持的链接，选择格式，然后下载文件。可用格式取决于来源。

[Zenith Type](https://zenithw.space/typing) 提供土耳其语和英语打字练习、个人主页、经过验证的排行榜、排位对战和私人房间。在线功能需要账户，本地练习则不需要。WPM 排行榜和排位 Elo 每 30 天重置；私人房间 Elo 独立且永久保留。规则、房间设置和部署状态见 [Type 文档](docs/TYPING.md)。

## 网页版 17.0 的变化

- [音频分离](https://zenithw.space/zh/audio-separator)反馈更流畅：分批准备波形，按需分配播放内存，支持取消 WAV/ZIP 导出。MP3 和 FLAC 继续保留。
- [重新封装](https://zenithw.space/zh/remux)可在开始前选择目标容器，兼容的音视频流支持 MKV ↔ MP4。不兼容的编码需要转换。
- 网站现有八种语言的媒体说明和搜索信息更清楚，导航链接也已修复。
- 更新依赖安全补丁，明确封面下载的总等待上限，并防止 Type 头像并发修改互相覆盖。服务器和已安装应用仍需分别部署。

音频在设备本地分离：文件上限为 96 MiB，处理片段最长四分钟。首次使用会下载模型与运行环境，速度取决于设备。Windows、Android 的版本编号与 Web 17.0 分别管理。

[更新说明](https://zenithw.space/zh/updates) · [安全与验证报告（英语）](docs/full-code-audit-2026-11-02.md)

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
