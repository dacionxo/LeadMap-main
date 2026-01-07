# Unibox Email Reception Fix Summary

## Problem
OAuth emails were not displaying in the Unibox feature. Investigation revealed multiple root causes.

## Root Causes Identified

### 1. **Gmail Watch Not Set Up During OAuth** ✅ FIXED
- **Issue**: When users connected Gmail via OAuth, Gmail Watch subscriptions were not created
- **Impact**: No real-time push notifications, emails only synced via polling (every 5 minutes)
- **Fix**: Added Gmail Watch setup to OAuth callback (`app/api/mailboxes/oauth/gmail/callback/route.ts`)
- **Following**: james-project patterns for email pu sh notifications

### 2. **Webhook Using Wrong Database Tables** ✅ FIXED
- **Issue**: Gmail webhook saved emails to `emails` table with `direction: 'received'`
- **Impact**: Unibox queries `email_threads` joined with `email_messages`, so webhook emails never appeared
- **Fix**: Changed webhook to use `syncGmailMessages()` function (same as cron job)
- **Result**: Webhook now saves to `email_messages` and `email_threads` tables with `direction: 'inbound'/'outbound'`

### 3. **Direction Value Mismatch** ✅ FIXED
- **Issue**: Webhook used `direction: 'received'`, sync used `direction: 'inbound'`, Unibox filtered by `direction === 'inbound'`
- **Impact**: Webhook emails filtered out by Unibox query
- **Fix**: Unified to use `'inbound'` and `'outbound'` consistently (following james-project patterns)

### 4. **PGRST116 Error: Mailbox Not Found** ✅ FIXED
- **Issue**: Gmail webhook used `.single()` for mailbox lookup, causing PGRST116 errors when mailbox doesn't exist (e.g., disconnected accounts)
- **Impact**: 341+ errors logged, webhook retries causing unnecessary load, poor error handling
- **Error**: `Mailbox not found for email: david@growyourdigitalleverage.com { code: 'PGRST116', details: 'The result contains 0 rows', hint: null, message: 'Cannot coerce the result to a single JSON object' }`
- **Fix**: Changed `.single()` to `.maybeSingle()` in both Gmail and Outlook webhooks
- **Result**: 
  - No more PGRST116 errors when mailbox doesn't exist
  - Returns 200 OK instead of 404 to prevent webhook retries (following webhook best practices)
  - Better logging to identify disconnected mailboxes
  - Graceful handling of missing mailboxes

## Changes Made

### Files Modified

1. **`app/api/mailboxes/oauth/gmail/callback/route.ts`**
   - Added Gmail Watch setup after OAuth completion
   - Imports `setupGmailWatch` and `decryptMailboxTokens`
   - Sets up push notification subscription for real-time email delivery
   - Handles Watch setup failures gracefully (doesn't block OAuth flow)

2. **`app/api/webhooks/gmail/route.ts`**
   - Replaced custom email processing with `syncGmailMessages()` call
   - Now uses same logic as sync cron job
   - Saves to `email_messages` and `email_threads` tables
   - Uses consistent `direction: 'inbound'/'outbound'` values
   - **Fixed PGRST116 error**: Changed `.single()` to `.maybeSingle()` for mailbox lookup
   - Returns 200 OK when mailbox not found (prevents webhook retries)
   - Added better error logging for disconnected mailboxes

3. **`app/api/webhooks/outlook/route.ts`**
   - **Fixed PGRST116 error**: Changed `.single()` to `.maybeSingle()` for mailbox lookup
   - Added error handling for missing mailboxes
   - Improved logging for subscription ID mismatches

## Architecture

### Email Flow (After Fix)

1. **OAuth Connection**:
   - User connects Gmail → OAuth callback → Save mailbox → **Set up Gmail Watch** ✅

2. **Real-Time Push (Webhook)**:
   - Gmail sends push notification → Pub/Sub → Webhook endpoint
   - Webhook calls `syncGmailMessages()` → Saves to `email_messages` + `email_threads`
   - Unibox queries `email_threads` → Displays emails ✅

3. **Polling Fallback (Cron)**:
   - Cron runs every 5 minutes → Calls `syncGmailMessages()` → Same tables
   - Ensures emails are synced even if webhook fails

### Database Schema

- **`email_threads`**: Thread metadata (subject, status, unread count)
- **`email_messages`**: Individual messages (direction: 'inbound'/'outbound')
- **`email_participants`**: From/To/CC/BCC addresses

### Direction Logic

- **Inbound**: `from.email !== mailbox.email` (email sent TO the mailbox)
- **Outbound**: `from.email === mailbox.email` (email sent FROM the mailbox)
- **Unibox Filter**: Shows threads with `direction === 'inbound'` messages

## Testing Checklist

- [X] Connect Gmail via OAuth → Verify Watch subscription created
- [ ] Send test email to Gmail → Verify webhook receives notification
- [ ] Check database → Verify email saved to `email_messages` and `email_threads`
- [ ] Open Unibox → Verify email appears in thread list
- [ ] Verify direction is 'inbound' for received emails
- [ ] Test cron sync → Verify emails still sync if webhook fails

## Environment Variables Required

- `GMAIL_PUBSUB_TOPIC_NAME`: Google Cloud Pub/Sub topic for Gmail Watch
- `GMAIL_PUBSUB_VERIFICATION_TOKEN`: (Optional) Token for webhook verification
- `NEXT_PUBLIC_APP_URL`: Base URL for webhook callbacks

## Additional Fixes

### PGRST116 Error Resolution

**Problem**: Webhooks were throwing PGRST116 errors when mailboxes didn't exist in the database (e.g., disconnected accounts, expired subscriptions).

**Solution**: Following the pattern from `MAILBOX_RATE_LIMITS_406_FIX.md`:
- Changed `.single()` to `.maybeSingle()` in webhook handlers
- Returns 200 OK instead of 404 when mailbox not found (prevents webhook retries)
- Added comprehensive error logging to identify disconnected accounts
- Graceful handling prevents error spam in logs

**Files Fixed**:
- `app/api/webhooks/gmail/route.ts` - Gmail webhook handler
- `app/api/webhooks/outlook/route.ts` - Outlook webhook handler

**Benefits**:
- No more PGRST116 errors flooding logs
- Better webhook reliability (no unnecessary retries)
- Easier identification of disconnected mailboxes
- Follows webhook best practices (acknowledge receipt even on errors)

## Next Steps

1. ✅ **Outlook Webhook**: Fixed PGRST116 error (completed)
2. **Error Handling**: Add retry logic for Watch setup failures
3. **Monitoring**: Add metrics for webhook delivery success rate
4. **Documentation**: Update user-facing docs about real-time email sync
5. **Cleanup**: Consider adding a cleanup job to remove expired Gmail Watch subscriptions for disconnected mailboxes

## References

- james-project: Email push notification patterns
- Gmail Watch API: https://developers.google.com/gmail/api/guides/push
- Google Cloud Pub/Sub: https://cloud.google.com/pubsub/docs

