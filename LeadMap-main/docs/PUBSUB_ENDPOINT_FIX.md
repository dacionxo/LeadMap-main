# Fix: Pub/Sub Not Writing to Supabase

## Problem

Your workflow shows:
```
Gmail → Pub/Sub → Cloud Run → Apps Script
```

But your codebase expects:
```
Gmail → Pub/Sub → Next.js Webhook → Supabase
```

**Result**: Emails are being processed by Cloud Run/Apps Script, but not saved to Supabase.

## Solution: Update Pub/Sub Subscription Endpoint

You need to change your Pub/Sub push subscription to point to your **Next.js webhook** instead of Cloud Run.

### Step 1: Find Your Next.js Webhook URL

Your webhook endpoint should be:
```
https://YOUR_DOMAIN.com/api/webhooks/gmail
```

Replace `YOUR_DOMAIN.com` with your actual domain (e.g., `www.growyourdigitalleverage.com`).

### Step 2: Update Pub/Sub Subscription

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Navigate to **Pub/Sub** → **Subscriptions**
3. Find your subscription (e.g., `gmail-webhook-subscription`)
4. Click on it to open details
5. Click **"EDIT"** button
6. In **"Endpoint URL"**, change from:
   ```
   https://your-cloud-run-url.run.app/...
   ```
   To:
   ```
   https://YOUR_DOMAIN.com/api/webhooks/gmail
   ```
7. Click **"UPDATE"**

### Step 3: Verify Webhook is Accessible

Test your webhook endpoint:

```bash
curl https://YOUR_DOMAIN.com/api/webhooks/gmail
```

**Expected Response:**
```json
{
  "status": "ok",
  "timestamp": "2025-01-08T00:00:00.000Z",
  "checks": {
    "supabase": true,
    "pubsub_topic": true,
    "pubsub_verification": false,
    "expired_watches": 0
  }
}
```

If you get a response, your webhook is accessible ✅

### Step 4: Test Email Flow

1. Send a test email to your Gmail inbox
2. Wait 10-30 seconds
3. Check Pub/Sub metrics:
   - Go to **Pub/Sub** → **Subscriptions** → Your subscription → **Metrics**
   - **Messages delivered** should increase
   - **Message backlog** should be 0 or low
4. Check your application logs for:
   ```
   [Gmail Webhook] Processing notification for {email}...
   [syncGmailMessages] Successfully inserted message...
   ```
5. Check Supabase database:
   ```sql
   SELECT * FROM email_messages 
   WHERE direction = 'inbound' 
   ORDER BY created_at DESC 
   LIMIT 5;
   ```

## Alternative: Keep Cloud Run but Add Supabase Integration

If you want to keep using Cloud Run → Apps Script, you need to modify your Apps Script to write to Supabase.

### Option A: Call Next.js Webhook from Apps Script

In your Apps Script, after processing the email, make an HTTP request to your Next.js webhook:

```javascript
// In Apps Script
function processGmailNotification(emailAddress, historyId) {
  // Your existing Apps Script logic...
  
  // Then call Next.js webhook to save to Supabase
  const webhookUrl = 'https://YOUR_DOMAIN.com/api/webhooks/gmail';
  const payload = {
    message: {
      data: Utilities.base64Encode(JSON.stringify({
        emailAddress: emailAddress,
        historyId: historyId
      }))
    }
  };
  
  const options = {
    method: 'post',
    contentType: 'application/json',
    payload: JSON.stringify(payload)
  };
  
  UrlFetchApp.fetch(webhookUrl, options);
}
```

### Option B: Direct Supabase Integration in Apps Script

Add Supabase client library to Apps Script and write directly:

1. Install Supabase JS library in Apps Script
2. Configure Supabase URL and service role key
3. Write emails directly to `email_messages` table

## Recommended Approach

**Use Option 1** (Update Pub/Sub subscription) because:
- ✅ Simpler - no code changes needed
- ✅ Uses existing Next.js webhook infrastructure
- ✅ Automatic token refresh and error handling
- ✅ Consistent with codebase architecture

## Verification Checklist

After updating the subscription:

- [ ] Pub/Sub subscription endpoint points to `https://YOUR_DOMAIN.com/api/webhooks/gmail`
- [ ] Webhook health check returns `status: "ok"`
- [ ] Test email triggers webhook (check logs)
- [ ] Emails appear in `email_messages` table
- [ ] Emails appear in `emails` table (with `direction='received'`)
- [ ] No errors in mailbox `last_error` field
- [ ] Pub/Sub message backlog is 0 or low

## Troubleshooting

### Issue: Webhook Not Receiving Requests

**Check:**
1. Pub/Sub subscription endpoint URL is correct
2. Webhook is publicly accessible (no localhost)
3. Webhook uses HTTPS (HTTP not allowed)
4. SSL certificate is valid

**Verify:**
```bash
# Check webhook is accessible
curl https://YOUR_DOMAIN.com/api/webhooks/gmail

# Check Pub/Sub subscription
gcloud pubsub subscriptions describe gmail-webhook-subscription \
  --format="value(pushConfig.endpoint)"
```

### Issue: Webhook Receiving but Not Processing

**Check:**
1. Application logs for errors
2. Supabase connection (`NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`)
3. RLS policies allow service_role (run `supabase/unibox_rls_service_role_fix.sql`)
4. Token decryption (`EMAIL_ENCRYPTION_KEY` is set correctly)

**Verify:**
```sql
-- Check for mailboxes with errors
SELECT email, last_error 
FROM mailboxes 
WHERE provider = 'gmail' 
AND last_error IS NOT NULL;
```

### Issue: Messages in Pub/Sub Backlog

**Check:**
1. Webhook returns `200 OK` within 60 seconds
2. Webhook doesn't throw unhandled exceptions
3. Check webhook logs for timeout errors

**Fix:**
- Ensure webhook responds quickly
- Return `200 OK` even on errors (to acknowledge message)
- Check for slow database queries or Gmail API calls

