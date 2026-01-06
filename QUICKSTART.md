# 🚀 Quick Start Guide

## Step-by-Step Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Create Environment File

```bash
# Copy the example file
cp .env.example .env.local

# Edit .env.local and add your MongoDB URI
# MONGODB_URI=mongodb://localhost:27017/ibex-sports-arena
```

### 3. Seed Database

```bash
npm run seed
```

This creates:

- ✅ Super Admin (admin@ibex.com / admin123)
- ✅ 6 Courts (2 Padel, 2 Cricket, 2 Pickleball)

### 4. Start Server

```bash
npm run dev
```

### 5. Open Browser

- Home: http://localhost:3000
- Booking: http://localhost:3000/booking
- Admin: http://localhost:3000/admin

---

## 🔑 Admin Login

- **Email**: `admin@ibex.com`
- **Password**: `admin123`

---

## 📝 Environment Variables

Minimum required in `.env.local`:

```env
MONGODB_URI=mongodb://localhost:27017/ibex-sports-arena
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-random-32-char-secret
```

Generate secret:

```bash
openssl rand -base64 32
```

---

That's it! 🎉
