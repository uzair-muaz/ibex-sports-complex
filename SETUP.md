# IBEX Sports Arena - Setup Guide

## 🚀 Quick Start Commands

### 1. Install Dependencies

```bash
npm install
```

### 2. Set Up Environment Variables

Create a `.env.local` file in the root directory:

```bash
cp .env.example .env.local
```

Then edit `.env.local` and add your MongoDB URI:

```env
# MongoDB Connection
MONGODB_URI=mongodb://localhost:27017/ibex-sports-arena
# OR for MongoDB Atlas:
# MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/ibex-sports-arena

# NextAuth (generate a random secret)
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-random-secret-key-min-32-characters

# Resend Email (optional - for email notifications)
RESEND_API_KEY=re_your_api_key_here
RESEND_FROM_EMAIL=noreply@ibexarena.com

# App URL
APP_URL=http://localhost:3000

# Admin Credentials (for seed script)
ADMIN_EMAIL=admin@ibex.com
ADMIN_PASSWORD=admin123
ADMIN_NAME=Super Admin
```

### 3. Seed the Database

This will create:

- 1 Super Admin user
- 6 Courts (2 Padel, 2 Cricket, 2 Pickleball)

```bash
npm run seed
```

### 4. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 📋 Complete Setup Steps

### Step 1: Prerequisites

- Node.js 18+ installed
- MongoDB running (local or MongoDB Atlas account)

### Step 2: Clone & Install

```bash
# Navigate to project directory
cd ibex-sports-arena

# Install dependencies
npm install
```

### Step 3: MongoDB Setup

**Option A: Local MongoDB**

```bash
# Make sure MongoDB is running locally
# Default connection: mongodb://localhost:27017/ibex-sports-arena
```

**Option B: MongoDB Atlas (Cloud)**

1. Go to [mongodb.com/cloud/atlas](https://www.mongodb.com/cloud/atlas)
2. Create a free cluster
3. Get your connection string
4. Add it to `.env.local` as `MONGODB_URI`

### Step 4: Environment Variables

Create `.env.local` file:

```env
MONGODB_URI=your_mongodb_connection_string
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=generate-random-32-char-secret
RESEND_API_KEY=your_resend_key (optional)
RESEND_FROM_EMAIL=noreply@ibexarena.com
APP_URL=http://localhost:3000
ADMIN_EMAIL=admin@ibex.com
ADMIN_PASSWORD=admin123
ADMIN_NAME=Super Admin
```

**Generate NEXTAUTH_SECRET:**

```bash
openssl rand -base64 32
```

### Step 5: Seed Database

```bash
npm run seed
```

Expected output:

```
✅ Connected to MongoDB
✅ Created Super Admin: admin@ibex.com
✅ Created court: Padel Court Alpha
✅ Created court: Padel Court Beta
✅ Created court: The Oval Net
✅ Created court: Lords Practice Area
✅ Created court: Pickleball Court Prime
✅ Created court: Pickleball Court Elite

🎉 Seed completed!
   - Super Admin: admin@ibex.com / admin123
   - Courts created: 6/6
```

### Step 6: Start Development Server

```bash
npm run dev
```

Visit:

- **Home**: http://localhost:3000
- **Booking**: http://localhost:3000/booking
- **Admin**: http://localhost:3000/admin

---

## 🔐 Default Admin Login

After seeding:

- **Email**: `admin@ibex.com`
- **Password**: `admin123`

⚠️ **Change these credentials in production!**

---

## 📦 Available Scripts

```bash
# Development
npm run dev          # Start dev server

# Production
npm run build        # Build for production
npm run start        # Start production server

# Database
npm run seed         # Seed database with initial data

# Code Quality
npm run lint         # Run ESLint
```

---

## 🏗️ Project Structure

```
ibex-sports-arena/
├── app/                    # Next.js App Router
│   ├── actions/           # Server actions
│   ├── admin/             # Admin dashboard
│   ├── api/               # API routes
│   ├── booking/           # Booking page
│   └── page.tsx           # Home page
├── components/            # React components
├── lib/                   # Utilities
├── models/                # Mongoose models
├── scripts/               # Seed scripts
└── types/                 # TypeScript types
```

---

## 💰 Currency

All prices are in **PKR (Pakistani Rupees)**.

Court Pricing:

- Padel Courts: PKR 5,000/hour
- Cricket Courts: PKR 8,000/hour
- Pickleball Courts: PKR 4,000/hour (or Free)

---

## 🐛 Troubleshooting

### MongoDB Connection Error

- Check if MongoDB is running
- Verify connection string in `.env.local`
- For Atlas: Check IP whitelist and credentials

### NextAuth Error

- Ensure `NEXTAUTH_SECRET` is set (min 32 chars)
- Check `NEXTAUTH_URL` matches your domain

### Build Errors

- Delete `.next` folder and rebuild
- Check Node.js version (18+)
- Run `npm install` again

---

## 📞 Support

For issues, check:

1. MongoDB connection
2. Environment variables
3. Node.js version
4. Port 3000 availability

---

**Ready to go! 🎉**
