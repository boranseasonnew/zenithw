<p align="center">
  <img src="frontend/zenithw.png" width="96" height="96" alt="Logo ZenithW">
</p>

<h1 align="center">ZenithW</h1>

<p align="center">
  Lưu nội dung media. Giữ mọi thứ đơn giản.<br>
  <a href="https://zenithw.space/vi/">Ứng dụng web</a> · <a href="https://github.com/boranseasonnew/zenithw/releases/latest">Windows</a> · <a href="https://github.com/boranseasonnew/zenithw-android/releases/latest">Android</a>
</p>

<p align="center">
  <a href="https://zenithw.space"><img src="assets/web-v17.2.svg" alt="ZenithW Web v17.2"></a>
  <a href="https://github.com/boranseasonnew/zenithw/releases/latest"><img src="https://img.shields.io/github/v/release/boranseasonnew/zenithw?style=for-the-badge&amp;labelColor=151922&amp;logoColor=white&amp;label=Windows&amp;logo=windows11&amp;color=2563EB" alt="Windows latest release"></a>
</p>

<p align="center"><strong><a href="why_zenithw.md">✦ Vì sao có ZenithW? Đọc câu chuyện (tiếng Anh)</a></strong></p>

[English](README.md) · [Türkçe](README.tr.md) · [Français](README.fr.md) · [Deutsch](README.de.md) · [Русский](README.ru.md) · [Tiếng Việt](README.vi.md) · [简体中文](README.zh.md) · [日本語](README.ja.md)

ZenithW là công cụ media mã nguồn mở để tải video và âm thanh, trích xuất tiếng, chuyển đổi và remux. Các công cụ media không có quảng cáo, không cần thuê bao hay tài khoản bắt buộc.

Dán liên kết được hỗ trợ, chọn định dạng rồi tải tệp. Các định dạng có sẵn phụ thuộc vào nguồn.

[Zenith Type](https://zenithw.space/typing) có luyện gõ tiếng Thổ Nhĩ Kỳ/tiếng Anh, hồ sơ, bảng xếp hạng đã xác minh, đấu xếp hạng và phòng riêng. Tính năng trực tuyến cần tài khoản; luyện tập cục bộ thì không. Bảng WPM và Elo đấu xếp hạng đặt lại mỗi 30 ngày. Elo phòng riêng tách biệt và giữ lâu dài. Xem quy tắc, tùy chọn phòng và trạng thái triển khai trong [tài liệu Type](docs/TYPING.md).

## Vì sao có ZenithW?

Không gian media mã nguồn mở để tải xuống và xử lý media mà không cần tài khoản bắt buộc, thuê bao hay quảng cáo.

## Tính năng

- Tải media từ các nguồn được hỗ trợ bằng quy trình liên kết đơn giản.
- Trích xuất và xử lý âm thanh từ media.
- Chuyển đổi định dạng và remux luồng MKV/MP4 tương thích mà không mã hóa lại.
- Chuyển đổi và thay đổi kích thước hình ảnh ngay trong trình duyệt.
- Tách giọng hát và nhạc nền bằng Audio Separator.

## Bắt đầu nhanh

Sao chép kho mã nguồn và mở thư mục dự án:

```bash
git clone https://github.com/boranseasonnew/zenithw.git
cd zenithw
cp .env.example .env
```

Sao chép `.env.example` thành `.env`, sau đó đặt `SECRET_KEY` thành một giá trị ngẫu nhiên mạnh.

```bash
docker compose up -d --build
```

Mở `http://localhost:8080` trong trình duyệt:

## Có gì mới trong web 17.2

- **Đã tắt Vimeo trên ứng dụng web công khai:** tính năng hỗ trợ được gỡ bỏ vì một số liên kết Vimeo yêu cầu cookie và khả năng tương thích với yt-dlp không ổn định.
- **Sửa lỗi dịch thuật:** tên định dạng như AVI và tên nền tảng như Rumble không còn bị dịch sai.
- **Sửa liên kết Cài đặt:** liên kết trong bảng tải xuống giờ mở đúng phần cài đặt Video thay vì tab Giao diện.
- **Bản địa hóa siêu dữ liệu SEO:** tiêu đề trang và bản xem trước khi chia sẻ giờ sử dụng đúng ngôn ngữ của từng phiên bản trang web.
- **Đã xóa cửa sổ quảng bá ứng dụng:** cửa sổ này không còn làm gián đoạn người dùng khi nhập liên kết.

Windows và Android giữ số phiên bản riêng; số phiên bản này chỉ áp dụng cho web.
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
