# OAuth Redirect URI Fix - Common Error

## ❌ The Problem

You're seeing this error:
```
Invalid Redirect: must end with a public top-level domain (such as .com or .org).
Invalid Redirect: must use a domain that is a valid
```

**Your current redirect URI (WRONG):**
```
https://https://bqkucdaefpfkunceftye.supabase.co/auth/v1/callback
```

**The issue:** You have `https://` twice! Notice `https://https://` at the beginning.

## ✅ The Solution

### Correct Redirect URI Format

**For Supabase OAuth (Google & Microsoft):**
```
https://bqkucdaefpfkunceftye.supabase.co/auth/v1/callback
```

**Key points:**
- ✅ Start with `https://` (only once!)
- ✅ Your project reference: `bqkucdaefpfkunceftye`
- ✅ End with `/auth/v1/callback`
- ✅ No trailing slash

## 🔧 How to Fix

### Step 1: Fix in Google Cloud Console

1. **Go to Google Cloud Console**
   - Visit [console.cloud.google.com](https://console.cloud.google.com)
   - Select your project

2. **Navigate to OAuth Credentials**
   - Go to **APIs & Services** > **Credentials**
   - Find your OAuth 2.0 Client ID
   - Click the **pencil icon** (edit) or click on the client name

3. **Fix the Redirect URI**
   - In **Authorized redirect URIs**, find the incorrect one:
     - ❌ `https://https://bqkucdaefpfkunceftye.supabase.co/auth/v1/callback`
   - **Delete it** or **edit it** to:
     - ✅ `https://bqkucdaefpfkunceftye.supabase.co/auth/v1/callback`
   - Click **Save**

### Step 2: Fix in Azure Portal

1. **Go to Azure Portal**
   - Visit [portal.azure.com](https://portal.azure.com)
   - Sign in

2. **Navigate to App Registration**
   - Go to **Azure Active Directory** > **App registrations**
   - Click on your app (LeadMap)

3. **Fix the Redirect URI**
   - Click **Authentication** in the left sidebar
   - Find the incorrect redirect URI:
     - ❌ `https://https://bqkucdaefpfkunceftye.supabase.co/auth/v1/callback`
   - Click the **pencil icon** (edit) or **X** to remove it
   - Click **+ Add a platform** > **Web**
   - Add the correct URI:
     - ✅ `https://bqkucdaefpfkunceftye.supabase.co/auth/v1/callback`
   - Click **Configure**

## 📋 Complete Redirect URI Checklist

Make sure you have these **exact** redirect URIs configured:

### For Google Cloud Console:
```
https://bqkucdaefpfkunceftye.supabase.co/auth/v1/callback
```

### For Azure Portal:
```
https://bqkucdaefpfkunceftye.supabase.co/auth/v1/callback
```

### For Supabase Dashboard (if needed):
- Go to **Authentication** > **URL Configuration**
- **Site URL**: Your Vercel domain (e.g., `https://your-app.vercel.app`)
- **Redirect URLs**: 
  - `https://your-app.vercel.app/api/auth/callback` (for your app)
  - The Supabase callback is handled automatically

## 🚀 For Vercel Deployment

When deploying to Vercel, you **don't need to change** the OAuth redirect URIs in Google/Azure. The Supabase callback URL stays the same:

```
https://bqkucdaefpfkunceftye.supabase.co/auth/v1/callback
```

**Why?** Because:
1. User clicks "Sign in with Google/Microsoft"
2. User authenticates with Google/Microsoft
3. Google/Microsoft redirects to Supabase: `https://bqkucdaefpfkunceftye.supabase.co/auth/v1/callback`
4. Supabase processes the OAuth callback
5. Supabase redirects to your app: `https://your-app.vercel.app/api/auth/callback`
6. Your app handles the final callback

**The flow:**
```
User → Google/Microsoft → Supabase → Your Vercel App
```

## ✅ Verification Steps

After fixing, test your OAuth:

1. **Test Google OAuth**
   - Go to your app
   - Click "Sign in with Google"
   - You should be redirected to Google's sign-in page
   - After signing in, you should be redirected back to your app

2. **Test Microsoft OAuth**
   - Click "Sign in with Microsoft"
   - You should be redirected to Microsoft's sign-in page
   - After signing in, you should be redirected back to your app

3. **Check for Errors**
   - If you see "Redirect URI mismatch", double-check the URI is exactly:
     ```
     https://bqkucdaefpfkunceftye.supabase.co/auth/v1/callback
     ```
   - Make sure there's no `https://https://` at the beginning
   - Make sure there's no trailing slash

## 🎯 Quick Reference

**Your Supabase Project:**
- Project Reference: `bqkucdaefpfkunceftye`
- Project URL: `https://bqkucdaefpfkunceftye.supabase.co`
- OAuth Callback: `https://bqkucdaefpfkunceftye.supabase.co/auth/v1/callback`

**Common Mistakes:**
- ❌ `https://https://...` (double https)
- ❌ `http://...` (should be https)
- ❌ `.../auth/callback` (missing `/v1`)
- ❌ `.../auth/v1/callback/` (trailing slash)
- ❌ `.../api/auth/callback` (wrong path)

**Correct Format:**
- ✅ `https://bqkucdaefpfkunceftye.supabase.co/auth/v1/callback`

## 🔍 Still Having Issues?

1. **Clear your browser cache** - Sometimes old redirect URIs are cached
2. **Wait a few minutes** - OAuth provider changes can take 1-5 minutes to propagate
3. **Check Supabase Dashboard** - Make sure OAuth providers are enabled
4. **Check environment variables** - Make sure `NEXT_PUBLIC_SUPABASE_URL` is set correctly

## 📝 Summary

**The fix is simple:**
1. Remove the extra `https://` from your redirect URI
2. Use: `https://bqkucdaefpfkunceftye.supabase.co/auth/v1/callback`
3. Update in both Google Cloud Console and Azure Portal
4. Wait a few minutes for changes to propagate
5. Test OAuth sign-in

That's it! Your OAuth should work now. 🎉

