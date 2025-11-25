# Local Setup Guide for LeadMap

This guide will help you set up LeadMap to run locally on your computer.

## ✅ What's Already Done

- ✅ Node.js LTS (v24.11.0) installed
- ✅ npm dependencies installed
- ✅ Vercel CLI installed (v48.10.2)
- ✅ `.env.local` file created from template

## 📋 Next Steps: Configure Environment Variables

You need to configure your `.env.local` file with actual API keys and credentials. Here's what you need:

### 1. Supabase Setup (Required)

1. Go to [supabase.com](https://supabase.com) and create a free account
2. Create a new project
3. Go to Project Settings > API
4. Copy your:
   - **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
   - **anon/public key** → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - **service_role key** → `SUPABASE_SERVICE_ROLE_KEY`

5. In Supabase SQL Editor, run the SQL from `supabase/schema.sql` to create tables

### 2. Stripe Setup (Required for Payments)

1. Go to [stripe.com](https://stripe.com) and create an account
2. Go to Developers > API keys
3. Copy your:
   - **Publishable key** → `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`
   - **Secret key** → `STRIPE_SECRET_KEY`

4. Create products in Stripe Dashboard:
   - **Pro Plan Monthly**: $99/month
   - **Pro Plan Annual**: (optional)
   - Copy the Price IDs (starts with `price_`) to your `.env.local`

5. Set up webhook:
   - Go to Developers > Webhooks
   - Add endpoint: `http://localhost:3000/api/stripe/webhook` (for local)
   - Select events: `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`
   - Copy webhook secret → `STRIPE_WEBHOOK_SECRET`

### 3. Google Maps API (Required for Maps)

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create a new project or select existing
3. Enable "Maps JavaScript API"
4. Create API key
5. Copy API key → `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`

### 4. OpenRouter AI (Optional - for AI Assistant)

1. Go to [openrouter.ai](https://openrouter.ai/keys)
2. Create an API key
3. Copy key → `OPENROUTER_API_KEY`

### 5. App URL

For local development, keep:
```
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

## 🚀 Running the Application

### Option 1: Using Next.js Dev Server (Recommended for Development)

```bash
cd D:\Downloads\LeadMap-main\LeadMap-main
npm run dev
```

Then open [http://localhost:3000](http://localhost:3000) in your browser.

### Option 2: Using Vercel CLI (Recommended for Production-like Testing)

```bash
cd D:\Downloads\LeadMap-main\LeadMap-main
vercel dev
```

This will:
- Start a local development server
- Simulate Vercel's production environment
- Handle environment variables like production

### Option 3: Build and Run Production Build

```bash
cd D:\Downloads\LeadMap-main\LeadMap-main
npm run build
npm start
```

## 🔧 Quick Start (Minimal Setup)

If you just want to see the app run quickly, you can use placeholder values:

1. Edit `.env.local` and set at minimum:
   ```
   NEXT_PUBLIC_SUPABASE_URL=https://placeholder.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=placeholder_key
   SUPABASE_SERVICE_ROLE_KEY=placeholder_key
   NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=placeholder_key
   NEXT_PUBLIC_APP_URL=http://localhost:3000
   ```

2. Run `npm run dev` (some features won't work, but the app will load)

## 📝 Environment Variables Reference

All required variables in `.env.local`:

| Variable | Description | Required |
|----------|-------------|----------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL | ✅ Yes |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anonymous key | ✅ Yes |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key | ✅ Yes |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Stripe publishable key | ✅ Yes |
| `STRIPE_SECRET_KEY` | Stripe secret key | ✅ Yes |
| `STRIPE_WEBHOOK_SECRET` | Stripe webhook secret | ✅ Yes |
| `NEXT_PUBLIC_STRIPE_MONTHLY_PRICE_ID` | Stripe monthly price ID | ✅ Yes |
| `NEXT_PUBLIC_STRIPE_ANNUAL_PRICE_ID` | Stripe annual price ID | ⚠️ Optional |
| `STRIPE_MONTHLY_PRICE_ID` | Stripe monthly price ID | ✅ Yes |
| `STRIPE_ANNUAL_PRICE_ID` | Stripe annual price ID | ⚠️ Optional |
| `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` | Google Maps API key | ✅ Yes |
| `OPENROUTER_API_KEY` | OpenRouter AI API key | ⚠️ Optional |
| `NEXT_PUBLIC_APP_URL` | App URL (localhost:3000 for local) | ✅ Yes |

## 🐛 Troubleshooting

### Build Errors
- Make sure all required environment variables are set
- Check that Supabase URL is a valid HTTPS URL
- Verify API keys are correct

### Port Already in Use
If port 3000 is busy:
```bash
# Use a different port
npm run dev -- -p 3001
```

### Vercel CLI Issues
```bash
# Login to Vercel
vercel login

# Link your project (optional)
vercel link
```

## 📚 Additional Resources

- [DEPLOYMENT.md](./DEPLOYMENT.md) - Full deployment guide
- [README.md](./README.md) - Project overview
- [SETUP.md](./SETUP.md) - Detailed setup instructions

## 🎉 You're Ready!

Once you've configured your `.env.local` file with real API keys, run:

```bash
npm run dev
```

And visit [http://localhost:3000](http://localhost:3000) to see your LeadMap application!

