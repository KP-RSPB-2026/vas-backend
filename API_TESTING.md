# VAS Backend API Testing

Base URL: `http://localhost:3000/api`

## 📋 Test Endpoints

### 1. Health Check
```http
GET http://localhost:3000/api/health
```

**Expected Response:**
```json
{
  "success": true,
  "message": "API is running",
  "timestamp": "2026-01-08T..."
}
```

---

### 2. Login
```http
POST http://localhost:3000/api/auth/login
Content-Type: application/json

{
  "email": "karyawan@test.com",
  "password": "password123"
}
```

**Expected Response:**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "uuid",
      "email": "karyawan@test.com",
      "name": "John Doe",
      "role": "user"
    },
    "session": {
      "access_token": "eyJhbGc...",
      "refresh_token": "...",
      "expires_in": 3600,
      "expires_at": 1234567890
    }
  }
}
```

**Save access_token untuk request selanjutnya!**

---

### 3. Validate Location (dengan token)
```http
GET http://localhost:3000/api/location/validate?latitude=-6.200000&longitude=106.816666
Authorization: Bearer YOUR_ACCESS_TOKEN
```

**Expected Response (dalam radius):**
```json
{
  "success": true,
  "data": {
    "isValid": true,
    "distance": 15,
    "allowedRadius": 50,
    "message": "You are within the office area"
  }
}
```

**Expected Response (di luar radius):**
```json
{
  "success": true,
  "data": {
    "isValid": false,
    "distance": 150,
    "allowedRadius": 50,
    "message": "You are 100m outside the allowed area"
  }
}
```

---

### 4. Check-in (dengan token dan foto)
```http
POST http://localhost:3000/api/attendance/check-in
Authorization: Bearer YOUR_ACCESS_TOKEN
Content-Type: multipart/form-data

Form Data:
- photo: [FILE] (image file)
- latitude: -6.200000
- longitude: 106.816666
- reason: "Macet" (optional, wajib jika telat)
```

**Expected Response (tepat waktu):**
```json
{
  "success": true,
  "data": {
    "attendance": {
      "id": "uuid",
      "user_id": "uuid",
      "check_in_time": "2026-01-08T06:30:00Z",
      "check_in_photo_url": "https://...",
      "status": "checked_in",
      ...
    },
    "isLate": false,
    "message": "Checked in successfully"
  }
}
```

**Expected Response (telat):**
```json
{
  "success": true,
  "data": {
    "attendance": { ... },
    "isLate": true,
    "message": "Checked in late"
  }
}
```

---

### 5. Check-out (dengan token dan foto)
```http
POST http://localhost:3000/api/attendance/check-out
Authorization: Bearer YOUR_ACCESS_TOKEN
Content-Type: multipart/form-data

Form Data:
- photo: [FILE] (image file)
- latitude: -6.200000
- longitude: 106.816666
- reason: "Ada keperluan" (optional, wajib jika pulang cepat)
```

---

### 6. Get Attendance History
```http
GET http://localhost:3000/api/attendance/history?limit=10&offset=0
Authorization: Bearer YOUR_ACCESS_TOKEN
```

**Expected Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "user_id": "uuid",
      "check_in_time": "2026-01-08T06:30:00Z",
      "check_out_time": "2026-01-08T16:05:00Z",
      "status": "completed",
      "date": "2026-01-08",
      ...
    }
  ]
}
```

---

### 7. Get Attendance Detail
```http
GET http://localhost:3000/api/attendance/detail/{attendance_id}
Authorization: Bearer YOUR_ACCESS_TOKEN
```

---

### 8. Get All Users (Admin only)
```http
GET http://localhost:3000/api/users
Authorization: Bearer ADMIN_ACCESS_TOKEN
```

Login dulu sebagai admin dengan `admin@test.com` untuk dapat token admin.

---

## 🧪 Testing Tools

### Option 1: VS Code REST Client Extension
1. Install extension "REST Client"
2. Buat file `test.http` dengan request di atas
3. Klik "Send Request"

### Option 2: Thunder Client (VS Code)
1. Install extension "Thunder Client"
2. Buat collection dan request
3. Test dengan GUI

### Option 3: Postman
1. Import collection ke Postman
2. Set environment variable untuk token
3. Test semua endpoints

### Option 4: cURL (Command Line)
```bash
# Health check
curl http://localhost:3000/api/health

# Login
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"karyawan@test.com","password":"password123"}'

# Validate location (ganti TOKEN)
curl http://localhost:3000/api/location/validate?latitude=-6.200000&longitude=106.816666 \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

## ✅ Testing Checklist

- [ ] Health check works
- [ ] Login with valid credentials works
- [ ] Login with invalid credentials fails
- [ ] Location validation works (in radius)
- [ ] Location validation works (out of radius)
- [ ] Check-in without token fails (401)
- [ ] Check-in at correct location works
- [ ] Check-in outside location fails
- [ ] Check-in twice same day fails
- [ ] Check-in late requires reason
- [ ] Check-out without check-in fails
- [ ] Check-out works successfully
- [ ] Check-out early requires reason
- [ ] Get history works
- [ ] Get detail works
- [ ] Admin can get all users
- [ ] User cannot access admin endpoints (403)

---

## 🐛 Common Issues

1. **401 Unauthorized**: Token expired atau salah
2. **400 Bad Request**: Parameter kurang atau format salah
3. **403 Forbidden**: User bukan admin untuk admin endpoints
4. **500 Internal Server Error**: Cek server logs untuk detail
