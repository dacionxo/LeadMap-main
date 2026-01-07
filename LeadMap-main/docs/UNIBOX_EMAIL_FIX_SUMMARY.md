# Unibox Email Reception Fix Summary

## Problem
OAuth emails were not displaying in the Unibox feature. Investigation revealed multiple root causes.

## Root Causes Identified

### 1. **Gmail Watch Not Set Up During OAuth** ✅ FIXED
- **Issue**: When users connected Gmail via OAuth, Gmail Watch subscriptions were not created
- **Impact**: No real-time push notifications, emails only synced via polling (every 5 minutes)
- **Fix**: Added Gmail Watch setup to OAuth callback (`app/api/mailboxes/oauth/gmail/callback/route.ts`)
- **Following**: james-project patterns for email push notifications

### 2. **Webhook Using Wrong Database Tables** ✅ FIXED
- **Issue**: Gmail webhook saved emails to `emails` table with `direction: 'received'`
- **Impact**: Unibox queries `email_threads` joined with `email_messages`, so webhook emails never appeared
- **Fix**: Changed webhook to use `syncGmailMessages()` function (same as cron job)
- **Result**: Webhook now saves to `email_messages` and `email_threads` tables with `direction: 'inbound'/'outbound'`

### 3. **Direction Value Mismatch** ✅ FIXED
- **Issue**: Webhook used `direction: 'received'`, sync used `direction: 'inbound'`, Unibox filtered by `direction === 'inbound'`
- **Impact**: Webhook emails filtered out by Unibox query
- **Fix**: Unified to use `'inbound'` and `'outbound'` consistently (following james-project patterns)

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

- [ ] Connect Gmail via OAuth → Verify Watch subscription created
- [ ] Send test email to Gmail → Verify webhook receives notification
- [ ] Check database → Verify email saved to `email_messages` and `email_threads`
- [ ] Open Unibox → Verify email appears in thread list
- [ ] Verify direction is 'inbound' for received emails
- [ ] Test cron sync → Verify emails still sync if webhook fails

## Environment Variables Required

- `GMAIL_PUBSUB_TOPIC_NAME`: Google Cloud Pub/Sub topic for Gmail Watch
- `GMAIL_PUBSUB_VERIFICATION_TOKEN`: (Optional) Token for webhook verification
- `NEXT_PUBLIC_APP_URL`: Base URL for webhook callbacks

## Next Steps

1. **Outlook Webhook**: Similar fix may be needed for Outlook (if using push notifications)
2. **Error Handling**: Add retry logic for Watch setup failures
3. **Monitoring**: Add metrics for webhook delivery success rate
4. **Documentation**: Update user-facing docs about real-time email sync

## References

- james-project: Email push notification patterns
- Gmail Watch API: https://developers.google.com/gmail/api/guides/push
- Google Cloud Pub/Sub: https://cloud.google.com/pubsub/docs

