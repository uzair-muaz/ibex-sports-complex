# IBEx Arena - Premium Sports Court Booking Platform

A premium Next.js booking platform for sports courts (Padel, Cricket, Pickleball) built with modern technologies and Apple-inspired design.

## 🚀 Features

- **Premium UI/UX**: Apple-inspired design with smooth GSAP animations
- **Smart Booking System**: Automatic court assignment with conflict detection
- **Admin Panel**: Full court and booking management
- **Authentication**: Secure NextAuth-based authentication
- **Email Notifications**: Resend integration for booking confirmations
- **SEO Optimized**: Complete metadata, sitemap, and robots.txt
- **Server-Side Rendering**: Optimized performance with Next.js App Router
- **Type-Safe**: Full TypeScript support

## 🛠️ Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Database**: MongoDB with Mongoose
- **Authentication**: NextAuth.js v5
- **UI Components**: shadcn/ui + TailwindCSS
- **Animations**: GSAP + Framer Motion
- **Email**: Resend
- **Language**: TypeScript

## 📋 Prerequisites

- Node.js 18+ 
- MongoDB (local or MongoDB Atlas)
- Resend API key (optional - for email functionality)

## 🔧 Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd ibex-sports-arena
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   
   Create a `.env.local` file in the root directory:
   ```env
   # MongoDB
   MONGODB_URI=mongodb://localhost:27017/ibex-sports-arena
   # Or use MongoDB Atlas:
   # MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/ibex-sports-arena

   # NextAuth
   NEXTAUTH_URL=http://localhost:3000
   NEXTAUTH_SECRET=your-secret-key-here-change-in-production

   # Resend
   RESEND_API_KEY=re_your_resend_api_key_here
   RESEND_FROM_EMAIL=noreply@ibexarena.com

   # App
   APP_URL=http://localhost:3000

   # Admin Seed (for initial setup)
   ADMIN_EMAIL=admin@ibex.com
   ADMIN_PASSWORD=admin123
   ADMIN_NAME=Super Admin
   ```

4. **Seed the database**
   ```bash
   npm run seed
   ```
   
   This will create:
   - 1 Super Admin user
   - 2 Padel courts
   - 2 Cricket courts
   - 2 Pickleball courts

5. **Run the development server**
   ```bash
   npm run dev
   ```

6. **Open your browser**
   Navigate to [http://localhost:3000](http://localhost:3000)

## 📁 Project Structure

```
ibex-sports-arena/
├── app/                    # Next.js App Router
│   ├── actions/           # Server actions
│   │   ├── bookings.ts   # Booking operations
│   │   └── courts.ts     # Court operations
│   ├── admin/            # Admin dashboard
│   ├── api/              # API routes
│   │   └── auth/         # NextAuth routes
│   ├── booking/          # Booking page
│   ├── layout.tsx        # Root layout
│   ├── page.tsx          # Home page
│   ├── sitemap.ts        # SEO sitemap
│   └── robots.ts         # SEO robots.txt
├── components/           # React components
│   ├── 3d/              # 3D/Visual components
│   ├── ui/              # UI components (shadcn/ui)
│   ├── Footer.tsx
│   └── Navbar.tsx
├── lib/                 # Utilities
│   ├── auth.ts          # NextAuth configuration
│   ├── email.ts         # Email service (Resend)
│   ├── mongodb.ts       # MongoDB connection
│   └── utils.ts         # Helper functions
├── models/              # Mongoose models
│   ├── Booking.ts
│   ├── Court.ts
│   └── User.ts
├── scripts/             # Scripts
│   └── seed.ts          # Database seed script
└── types/               # TypeScript types
    └── index.ts
```

## 🎯 Key Features Explained

### Booking System

- **Minimum booking**: 1 hour
- **Duration increments**: 30 minutes (1, 1.5, 2, 2.5, etc.)
- **Smart court assignment**: Automatically assigns available courts
- **Conflict detection**: Prevents overlapping bookings
- **Consecutive slot booking**: Users can book multiple consecutive hours

### Admin Panel

- **Super Admin**: Can create/manage admins, courts, and all bookings
- **Admin**: Can view bookings and manage courts (based on permissions)
- **Court Management**: Add, edit, delete courts with pricing
- **Booking Management**: View, filter, and cancel bookings

### Security

- **Password hashing**: bcryptjs for secure password storage
- **JWT sessions**: Secure session management with NextAuth
- **Server actions**: All database operations are server-side
- **Input validation**: Zod schemas for data validation

## 🔐 Default Admin Credentials

After running the seed script:
- **Email**: `admin@ibex.com` (or from `.env.local`)
- **Password**: `admin123` (or from `.env.local`)

**⚠️ Change these in production!**

## 💰 Currency

All prices are displayed in **PKR (Pakistani Rupees)**.

Default Court Pricing:
- Padel Courts: PKR 5,000/hour
- Cricket Courts: PKR 8,000/hour
- Pickleball Courts: PKR 4,000/hour (or Free)

You can adjust pricing in the Admin Panel after seeding.

## 📧 Email Configuration

The platform uses Resend for sending booking confirmation emails. Make sure to:

1. Sign up at [resend.com](https://resend.com)
2. Get your API key
3. Verify your sending domain (or use the test domain)
4. Add `RESEND_API_KEY` and `RESEND_FROM_EMAIL` to `.env.local`

## 🚀 Deployment

### Vercel (Recommended)

1. Push your code to GitHub
2. Import project in Vercel
3. Add environment variables
4. Deploy!

### Other Platforms

Make sure to:
- Set all environment variables
- Run `npm run build` to test the build
- Configure MongoDB connection string
- Set `NEXTAUTH_URL` to your production URL
- Update `APP_URL` in environment variables

## 📝 Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint
- `npm run seed` - Seed database with initial data

## 🎨 Customization

### Branding

Replace "IBEx" throughout the codebase:
- Search for "IBEx" in all files
- Update logo in `components/Navbar.tsx`
- Update metadata in `app/layout.tsx`

### Styling

- Colors: Edit `tailwind.config.ts` and `app/globals.css`
- Theme: Modify `app/theme-provider.tsx`
- Components: Customize shadcn/ui components in `components/ui/`

## 🐛 Troubleshooting

### MongoDB Connection Issues

- Ensure MongoDB is running locally, or
- Check your MongoDB Atlas connection string
- Verify network access for Atlas

### NextAuth Issues

- Ensure `NEXTAUTH_SECRET` is set
- Check `NEXTAUTH_URL` matches your domain
- Clear browser cookies if session issues persist

### Email Not Sending

- Verify Resend API key is correct
- Check Resend dashboard for errors
- Ensure domain is verified (if using custom domain)

## 📄 License

This project is private and proprietary.

## 👥 Support

For issues or questions, please contact the development team.

---

**Built with ❤️ for IBEx Arena**
