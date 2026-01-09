# VAS Backend - Attendance Management System API

Backend API untuk sistem presensi karyawan menggunakan Express.js dan Supabase.

## 🚀 Tech Stack

- **Runtime:** Node.js
- **Framework:** Express.js
- **Database:** Supabase (PostgreSQL)
- **Storage:** Supabase Storage
- **Authentication:** Supabase Auth

## 📋 Prerequisites

- Node.js v18+ 
- npm atau yarn
- Akun Supabase

## 🛠️ Setup

1. Install dependencies:
```bash
npm install
```

2. Copy `.env.example` ke `.env` dan isi dengan kredensial Supabase:
```bash
cp .env.example .env
```

3. Isi variabel di `.env`:
   - `SUPABASE_URL`: URL project Supabase
   - `SUPABASE_ANON_KEY`: Anon/public key
   - `SUPABASE_SERVICE_ROLE_KEY`: Service role key (untuk admin operations)

4. Jalankan development server:
```bash
npm run dev
```

Server akan running di `http://localhost:3000`

## 📡 API Endpoints

### Authentication
- `POST /api/auth/login` - Login user

### Location
- `GET /api/location/validate` - Validasi GPS user di area kantor

### Attendance
- `POST /api/attendance/check-in` - Check-in dengan foto
- `POST /api/attendance/check-out` - Check-out dengan foto
- `GET /api/attendance/history` - Riwayat presensi
- `GET /api/attendance/detail/:id` - Detail presensi

### Users (Admin)
- `GET /api/users` - List semua karyawan

## 🏗️ Project Structure

```
vas-backend/
├── src/
│   ├── config/          # Configuration files
│   ├── controllers/     # Route controllers
│   ├── middleware/      # Custom middleware
│   ├── routes/          # API routes
│   ├── services/        # Business logic
│   ├── utils/           # Utility functions
│   ├── validators/      # Request validation
│   ├── app.js          # Express app setup
│   └── server.js       # Server entry point
├── .env.example
├── .gitignore
├── package.json
└── README.md
```

## 📝 Environment Variables

Lihat `.env.example` untuk daftar lengkap environment variables yang dibutuhkan.
