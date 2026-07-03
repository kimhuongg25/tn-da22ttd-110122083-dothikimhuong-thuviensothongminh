# 📚 Smart Library - Hệ thống Thư viện số thông minh

[![React](https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)](https://reactjs.org/)
[![Node.js](https://img.shields.io/badge/Node.js-43853D?style=for-the-badge&logo=node.js&logoColor=white)](https://nodejs.org/)
[![MongoDB](https://img.shields.io/badge/MongoDB-4EA94B?style=for-the-badge&logo=mongodb&logoColor=white)](https://www.mongodb.com/)
[![Python](https://img.shields.io/badge/Python-3776AB?style=for-the-badge&logo=python&logoColor=white)](https://www.python.org/)
[![Docker](https://img.shields.io/badge/Docker-2496ED?style=for-the-badge&logo=docker&logoColor=white)](https://www.docker.com/)

**Đồ án Khóa luận Tốt nghiệp**
* **Sinh viên thực hiện:** Đỗ Thị Kim Hương
* **Giảng viên hướng dẫn:** TS. Đoàn Phước Miền

---

## 📖 Giới thiệu
**Smart Library** là hệ thống thư viện số thông minh được thiết kế nhằm số hóa toàn diện quy trình quản lý mượn/trả sách. Dự án giải quyết triệt để các hạn chế của thư viện truyền thống bằng việc tự động hóa các luồng nghiệp vụ (tính phí phạt, nhắc nhở qua Email), chuẩn hóa định vị không gian lưu trữ vật lý, và cá nhân hóa trải nghiệm độc giả thông qua Trí tuệ nhân tạo (AI).

## 🎯 Mục tiêu đồ án
* Chuyển đổi quy trình quản lý thư viện truyền thống sang nền tảng số.
* Tự động hóa các nghiệp vụ như tính phí phạt, gửi email và quản lý trạng thái mượn trả.
* Cá nhân hóa trải nghiệm người dùng thông qua hệ thống gợi ý sách và trợ lý AI.
* Xây dựng hệ thống dễ mở rộng, dễ bảo trì và triển khai trên nhiều môi trường.
## 🏗 Kiến trúc & Công nghệ sử dụng
Hệ thống được phát triển dựa trên mô hình **Client - Server** và đóng gói bằng **Docker**:

* **Frontend (Client):** `ReactJS`, `TailwindCSS` (Thiết kế SPA mượt mà, hỗ trợ chuẩn font Times New Roman theo chuẩn học thuật).
* **Backend (Server):** `Node.js`, `Express.js`, `Mongoose`, Bảo mật xác thực bằng `JWT` & `Bcrypt`.
* **Cơ sở dữ liệu (Database):** `MongoDB` (Lưu trữ linh hoạt dữ liệu vòng đời phiếu mượn, người dùng, sách).
* **AI Service (Python):** `Flask/FastAPI` xử lý thuật toán Content-based Filtering và tích hợp LLM API.
* **Tích hợp Dịch vụ:** * `Google Books API` / `OpenLibrary API` (Tự động điền siêu dữ liệu sách).
  * `Cron Jobs` & `Nodemailer` (Chạy ngầm tác vụ gửi Email).
  * `Gemini API` (Trợ lý ảo AI Chatbot).

## ✨ Tính năng nổi bật
1. Quản lý sách, tác giả, thể loại và nhà xuất bản.
2. Quản lý tài khoản độc giả và nhân viên.
3. Quản lý phiếu mượn và trả sách.
4. Tìm kiếm sách theo nhiều tiêu chí trong một ô tìm kiếm.
5. Quản lý vị trí lưu trữ theo Khu vực → Kệ → Ngăn.
6. Tự động tính phí phạt quá hạn và bồi thường sách.
7. Gửi email xác nhận, nhắc hạn trả và thông báo thanh toán.
8. Chatbot AI hỗ trợ tư vấn và tra cứu sách.
9. Gợi ý sách dựa trên lịch sử mượn của người dùng.
---

# ⚙️ Yêu cầu hệ thống

Trước khi triển khai dự án, hãy đảm bảo máy tính đã cài đặt các công cụ sau:

- Docker Desktop (Windows/macOS) hoặc Docker Engine (Linux)
- Docker Compose
- Git

---

# 🚀 Hướng dẫn cài đặt và chạy dự án

## 1. Tải mã nguồn

Clone dự án từ GitHub và chuyển vào thư mục làm việc:

```bash
git clone https:https: //github.com/kimhuongg25/tn-da22ttd-110122083-dothikimhuong-thuviensothongminh.git
cd tn-da22ttd-110122083-dothikimhuong-thuviensothongminh
```

---

## 2. Cấu hình biến môi trường

### Backend

Tạo file **`.env`** trong thư mục gốc của dự án và cấu hình như sau:

```env
# Server
PORT=5000

# MongoDB
MONGODB_URI=mongodb://mongodb:27017/smart_library_db

# JWT
JWT_SECRET=your_jwt_secret

# Email
EMAIL_USER=your_email@gmail.com
EMAIL_PASS=your_google_app_password

# AI
GEMINI_API_KEY=your_gemini_api_key
```

### Frontend

Trong thư mục **frontend/** tạo file **`.env`**:

```env
REACT_APP_API_URL=http://localhost:5000
```

> **Lưu ý**
>
> - `EMAIL_PASS` là **Google App Password**, không phải mật khẩu Gmail.
> - Thay thế các giá trị mẫu bằng thông tin thực tế của bạn.

---

## 3. Khởi chạy hệ thống

Tại thư mục gốc của dự án, chạy lệnh:

```bash
docker-compose up --build -d
```

Docker sẽ tự động:

- Build Frontend
- Build Backend
- Build AI Service
- Khởi tạo MongoDB
- Kết nối toàn bộ các dịch vụ

Lần chạy đầu tiên có thể mất vài phút do Docker cần tải các image và cài đặt thư viện.

---

## 4. Truy cập hệ thống

Sau khi các container hoạt động thành công, bạn có thể sử dụng các dịch vụ tại:

| Dịch vụ | Địa chỉ |
|----------|----------|
| Frontend | http://localhost:3000 |
| Backend API | http://localhost:5000 |
| AI Service | http://localhost:8000 |

---

# 🛑 Quản lý hệ thống

### Dừng các container

```bash
docker-compose stop
```

Lệnh này chỉ dừng các container, toàn bộ dữ liệu vẫn được giữ nguyên.

---

### Dừng và xóa container

```bash
docker-compose down
```

Container sẽ được xóa nhưng dữ liệu MongoDB vẫn được lưu trong Docker Volume.

---

### Xây dựng lại dự án

Sau khi thay đổi mã nguồn hoặc Dockerfile, chạy:

```bash
docker-compose up --build
```

Docker sẽ build lại các service trước khi khởi động.

---

# 📂 Kiến trúc triển khai

```
Smart Library
│
├── Frontend (React)
│      │
│      ▼
├── Backend (Node.js + Express)
│      │
│      ├── MongoDB
│      │
│      └── AI Service (Python)
│
└── Docker Compose
```

Toàn bộ các thành phần của hệ thống được quản lý thông qua **Docker Compose**, giúp việc triển khai, cập nhật và mở rộng trở nên đơn giản, đồng thời đảm bảo môi trường chạy nhất quán trên mọi máy tính.
