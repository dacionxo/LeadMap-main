# 🚀 Quick Start Guide

## ✅ Setup Complete!

Your LeadMap project is now ready to run locally. Here's what has been installed:

- ✅ **Node.js v24.11.0** - JavaScript runtime
- ✅ **npm v11.6.1** - Package manager
- ✅ **Vercel CLI v48.10.2** - For local Vercel development
- ✅ **All npm dependencies** - Project packages installed
- ✅ **.env.local file** - Created with some pre-filled values

## ⚠️ Important: Complete Your Environment Variables

Your `.env.local` file has been created with some values, but you still need to add:

1. **Supabase Service Role Key** (Required)
   - Go to: https://supabase.com/dashboard/project/jmovjjmmfybqczxniewc/settings/api
   - Copy the `service_role` key (keep it secret!)
   - Update `SUPABASE_SERVICE_ROLE_KEY` in `.env.local`

2. **Stripe Keys** (Required for payments)
   - Go to: https://dashboard.stripe.com/apikeys
   - Copy your publishable and secret keys
   - Update `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` and `STRIPE_SECRET_KEY`

3. **Stripe Price IDs** (Required for subscriptions)
   - Go to: https://dashboard.stripe.com/products
   - Find your products and copy the Price IDs (start with `price_`)
   - Update the `STRIPE_MONTHLY_PRICE_ID` and `STRIPE_ANNUAL_PRICE_ID` variables

4. **Google Maps API Key** (Required for maps)
   - Go to: https://console.cloud.google.com
   - Enable "Maps JavaScript API"
   - Create an API key
   - Update `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`

## 🏃 Running the Application

### Option 1: Next.js Dev Server (Recommended)

```powershell
cd D:\Downloads\LeadMap-main\LeadMap-main
npm run dev
```

Then open: **http://localhost:3000**

### Option 2: Vercel CLI (Production-like)

```powershell
cd D:\Downloads\LeadMap-main\LeadMap-main
vercel dev
```

This simulates Vercel's production environment locally.

## 📝 Already Configured

These values are already set in your `.env.local`:

- ✅ `NEXT_PUBLIC_SUPABASE_URL` - Supabase project URL
- ✅ `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Supabase anonymous key
- ✅ `STRIPE_WEBHOOK_SECRET` - Stripe webhook secret
- ✅ `OPENROUTER_API_KEY` - OpenRouter AI API key
- ✅ `NEXT_PUBLIC_APP_URL` - Set to localhost:3000

## 🐛 Troubleshooting

### "Invalid supabaseUrl" Error
- Make sure `SUPABASE_SERVICE_ROLE_KEY` is set
- Verify the Supabase URL is correct

### Port 3000 Already in Use
```powershell
# Use a different port
npm run dev -- -p 3001
```

### Build Errors
- Check that all required environment variables are set
- Make sure you're in the correct directory: `D:\Downloads\LeadMap-main\LeadMap-main`

## 📚 More Help

- See [SETUP_LOCAL.md](./SETUP_LOCAL.md) for detailed setup instructions
- See [DEPLOYMENT.md](./DEPLOYMENT.md) for deployment guide
- See [README.md](./README.md) for project overview

## 🎉 Ready to Launch!

Once you've added the missing environment variables, run:

```powershell
npm run dev
```

And visit **http://localhost:3000** to see your LeadMap application!

