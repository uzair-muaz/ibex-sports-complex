# 🎯 Project Commands

## Essential Commands

### Install Dependencies

```bash
npm install
```

### Setup Environment

```bash
# Copy example file
cp .env.example .env.local

# Edit .env.local and add your MongoDB URI
# MONGODB_URI=mongodb://localhost:27017/ibex-sports-arena
```

### Seed Database

```bash
npm run seed
```

Creates:

- 1 Super Admin user
- 6 Courts (2 Padel, 2 Cricket, 2 Pickleball)

### Run Development Server

```bash
npm run dev
```

Opens at: http://localhost:3000

### Build for Production

```bash
npm run build
```

### Start Production Server

```bash
npm run start
```

### Lint Code

```bash
npm run lint
```

---

## Complete Setup Flow

```bash
# 1. Install
npm install

# 2. Setup environment
cp .env.example .env.local
# Edit .env.local with your MongoDB URI

# 3. Seed database
npm run seed

# 4. Run dev server
npm run dev
```

---

## Admin Access

After seeding:

- URL: http://localhost:3000/admin
- Email: admin@ibex.com
- Password: admin123

---

## MongoDB Connection

**Local MongoDB:**

```env
MONGODB_URI=mongodb://localhost:27017/ibex-sports-arena
```

**MongoDB Atlas:**

```env
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/ibex-sports-arena
```

---

## Generate NextAuth Secret

```bash
openssl rand -base64 32
```

Copy the output to `NEXTAUTH_SECRET` in `.env.local`

---

## Troubleshooting

**Port already in use:**

```bash
# Kill process on port 3000
lsof -ti:3000 | xargs kill -9
```

**Clear Next.js cache:**

```bash
rm -rf .next
npm run dev
```

**Reset database:**

```bash
# Delete all data and re-seed
npm run seed
```

---

**Ready to go! 🚀**
