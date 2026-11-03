<p align="center">
  <img src="frontend/zenithw.png" width="96" height="96" alt="Logo ZenithW">
</p>

<h1 align="center">ZenithW</h1>

<p align="center">
  Lưu nội dung media. Giữ mọi thứ đơn giản.<br>
  <a href="https://zenithw.space/vi/">Ứng dụng web</a> · <a href="https://github.com/boranseasonnew/zenithw/releases/latest">Windows</a> · <a href="https://github.com/boranseasonnew/zenithw-android/releases/latest">Android</a>
</p>

<p align="center">
  <a href="https://zenithw.space"><img src="https://img.shields.io/badge/Web-v17.0-7C3AED?style=for-the-badge&amp;labelColor=151922&amp;logoColor=white&amp;logo=html5" alt="ZenithW Web v17.0"></a>
  <a href="https://github.com/boranseasonnew/zenithw/releases/latest"><img src="https://img.shields.io/github/v/release/boranseasonnew/zenithw?style=for-the-badge&amp;labelColor=151922&amp;logoColor=white&amp;label=Windows&amp;logo=electron&amp;color=2563EB" alt="Windows latest release"></a>
  <a href="https://github.com/boranseasonnew/zenithw-android/releases/latest"><img src="https://img.shields.io/github/v/release/boranseasonnew/zenithw-android?style=for-the-badge&amp;labelColor=151922&amp;logoColor=white&amp;label=Android&amp;logo=android&amp;color=2E7D32" alt="Android latest release"></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/License-AGPL--3.0--only-64748B?style=for-the-badge&amp;labelColor=151922&amp;logoColor=white" alt="AGPL-3.0-only license"></a>
</p>

<p align="center">
  <a href="https://github.com/boranseasonnew/zenithw/releases"><img src="https://img.shields.io/github/downloads/boranseasonnew/zenithw/total?style=for-the-badge&amp;labelColor=151922&amp;logoColor=white&amp;label=PC%20downloads&amp;logo=github&amp;color=7C3AED" alt="PC GitHub release asset downloads, all releases"></a>
  <a href="https://github.com/boranseasonnew/zenithw-android/releases"><img src="https://img.shields.io/github/downloads/boranseasonnew/zenithw-android/total?style=for-the-badge&amp;labelColor=151922&amp;logoColor=white&amp;label=Android%20downloads&amp;logo=android&amp;color=2E7D32" alt="Android GitHub release asset downloads, all releases"></a>
</p>

<p align="center"><sub>Bộ đếm cộng lượt tải tệp của mọi bản phát hành GitHub, không phải người dùng duy nhất hay lượt cài từ Microsoft Store.</sub></p>

[English](README.md) · [Türkçe](README.tr.md) · [Français](README.fr.md) · [Deutsch](README.de.md) · [Русский](README.ru.md) · [Tiếng Việt](README.vi.md) · [简体中文](README.zh.md) · [日本語](README.ja.md)

Web v17.0 · ZenithW Desktop v4.2.0 · Android v3.0.0

ZenithW là công cụ media mã nguồn mở để tải video và âm thanh, trích xuất tiếng, chuyển đổi và remux. Các công cụ media không có quảng cáo, không cần thuê bao hay tài khoản bắt buộc.

Dán liên kết được hỗ trợ, chọn định dạng rồi tải tệp. Các định dạng có sẵn phụ thuộc vào nguồn.

[Zenith Type](https://zenithw.space/typing) có luyện gõ tiếng Thổ Nhĩ Kỳ/tiếng Anh, hồ sơ, bảng xếp hạng đã xác minh, đấu xếp hạng và phòng riêng. Tính năng trực tuyến cần tài khoản; luyện tập cục bộ thì không. Bảng WPM và Elo đấu xếp hạng đặt lại mỗi 30 ngày. Elo phòng riêng tách biệt và giữ lâu dài. Xem quy tắc, tùy chọn phòng và trạng thái triển khai trong [tài liệu Type](docs/TYPING.md).

## Có gì mới trong web 17.0

- [Tách âm thanh](https://zenithw.space/vi/audio-separator) phản hồi tốt hơn: tạo dạng sóng theo các phần nhỏ, cấp bộ nhớ phát khi cần và xuất WAV/ZIP có thể hủy. MP3 và FLAC vẫn có sẵn.
- [Remux](https://zenithw.space/vi/remux) cho chọn định dạng đích trước khi bắt đầu, bao gồm MKV ↔ MP4 nếu các luồng tương thích. Codec không tương thích cần chuyển đổi.
- Hướng dẫn media và thông tin tìm kiếm rõ hơn bằng tám ngôn ngữ của trang; sửa các liên kết điều hướng.
- Cập nhật bảo mật thư viện, giới hạn tổng thời gian tải ảnh bìa và bảo vệ trước các yêu cầu đổi ảnh Type đồng thời. Thay đổi máy chủ và ứng dụng đã cài cần được triển khai riêng.

Âm thanh được tách trên thiết bị: tệp tối đa 96 MiB và đoạn xử lý tối đa bốn phút. Lần đầu cần tải mô hình và môi trường xử lý. Tốc độ tùy thiết bị. Windows và Android có số phiên bản riêng, độc lập với Web 17.0.

[Ghi chú phát hành](https://zenithw.space/vi/updates) · [Báo cáo bảo mật và kiểm tra — tiếng Anh](docs/full-code-audit-2026-11-02.md)

## Dự án

- [Giao diện web](frontend/) và [API](backend/)
- [Ứng dụng Windows](desktop/) · [Mã nguồn Android](https://github.com/boranseasonnew/zenithw-android)

## Tài liệu

- [Cách dùng và giới hạn — tiếng Anh](docs/USAGE.md)
- [Tự lưu trữ và phát triển — tiếng Anh](docs/SELF_HOSTING.md)
- [Xử lý media trên thiết bị — tiếng Anh](docs/LOCAL_MEDIA.md)
- [Trạng thái dịch vụ](https://zenithw.space/status) · [Cập nhật](https://zenithw.space/vi/updates)

Dịch vụ web công khai không cho tải từ YouTube. Windows, Android và bản tự lưu trữ dùng kết nối riêng; các giới hạn của nguồn vẫn áp dụng.

## Sử dụng có trách nhiệm

Chỉ tải nội dung bạn sở hữu hoặc được phép sử dụng. Tôn trọng điều khoản nền tảng và bản quyền. ZenithW không liên kết với các nền tảng được hỗ trợ.

Lịch sử tải trên web được lưu trong trình duyệt; tệp đã chuẩn bị trên máy chủ sẽ hết hạn. ZenithW không phải dịch vụ lưu trữ đám mây lâu dài.

## Đóng góp

Chào đón báo lỗi, bản dịch và pull request. Xem [hướng dẫn đóng góp](CONTRIBUTING.md) hoặc mở [issue](https://github.com/boranseasonnew/zenithw/issues).

## Lời cảm ơn

Được xây dựng với yt-dlp, FFmpeg, Mediabunny và các dự án mã nguồn mở khác. Cảm ơn những người duy trì và mọi người đóng góp cho ZenithW.

## Giấy phép

[AGPL-3.0-only](LICENSE). Các thành phần bên thứ ba giữ giấy phép riêng; xem [thông báo bên thứ ba](THIRD_PARTY_NOTICES.md).
