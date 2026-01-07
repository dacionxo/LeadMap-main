# Gmail Watch Permissions Fix Guide

Quick fix for "User not authorized to perform this action" error when setting up Gmail Watch.

## Error Message

```
[Gmail OAuth] Failed to set up Gmail Watch for mailbox [ID]: 
Error sending test message to Cloud PubSub projects/[PROJECT]/topics/[TOPIC]: 
User not authorized to perform this action.
```

## Root Cause

The Gmail API service account doesn't have permission to publish messages to your Pub/Sub topic.

## Solution: Grant Pub/Sub Publisher Permission

### Step 1: Identify Your Topic

From your error message:
- **Project**: `canvas-advice-479307-p4`
- **Topic**: `gmail-notifications3`
- **Full topic name**: `projects/canvas-advice-479307-p4/topics/gmail-notifications3`

### Step 2: Grant Permission via Google Cloud Console

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Select project: `canvas-advice-479307-p4`
3. Navigate to **Pub/Sub** → **Topics**
4. Click on topic: `gmail-notifications3`
5. Click **"Permissions"** tab (or **"SHOW INFO PANEL"** → **"Permissions"**)
6. Click **"Add Principal"**
7. In **"New principals"** field, enter:
   ```
   gmail-api-push@system.gserviceaccount.com
   ```
8. In **"Select a role"** dropdown, select:
   - **Pub/Sub Publisher** (or search for "Pub/Sub Publisher")
9. Click **"Save"**

### Step 3: Verify Permission

1. Wait 1-2 minutes for permissions to propagate
2. Try connecting Gmail again via OAuth
3. Check logs - should see: `[Gmail OAuth] Gmail Watch set up successfully`

## Alternative: Grant Permission via gcloud CLI

```bash
# Set your project
gcloud config set project canvas-advice-479307-p4

# Grant Pub/Sub Publisher role to Gmail API service account
gcloud pubsub topics add-iam-policy-binding gmail-notifications3 \
  --member="serviceAccount:gmail-api-push@system.gserviceaccount.com" \
  --role="roles/pubsub.publisher"
```

## Alternative: Grant Permission via IAM

1. Go to **IAM & Admin** → **IAM**
2. Click **"Grant Access"** (or **"ADD"**)
3. In **"New principals"** field, enter:
   ```
   gmail-api-push@system.gserviceaccount.com
   ```
4. In **"Select a role"** dropdown, select:
   - **Pub/Sub Publisher**
5. Click **"Save"**

**Note**: This grants permission at project level. For topic-level permission (more secure), use Step 2 above.

## Verify Service Account Exists

If the service account doesn't exist or you get an error:

1. The Gmail API service account is automatically created by Google
2. It should exist if Gmail API is enabled
3. Verify Gmail API is enabled:
   - Go to **APIs & Services** → **Enabled APIs**
   - Ensure **Gmail API** is listed and enabled

## Troubleshooting

### Issue: "Principal not found"

**Solution:**
1. Ensure Gmail API is enabled in your project
2. The service account is created automatically - wait a few minutes
3. Try the IAM method instead (project-level permission)

### Issue: Permission still not working after granting

**Solution:**
1. Wait 2-3 minutes for permissions to propagate
2. Check topic name matches exactly: `gmail-notifications3`
3. Verify project ID is correct: `canvas-advice-479307-p4`
4. Try disconnecting and reconnecting Gmail account

### Issue: Different topic name

If your topic has a different name:
- Update the permission command with your actual topic name
- Ensure `GMAIL_PUBSUB_TOPIC_NAME` environment variable matches

## Quick Reference

**Service Account Email:**
```
gmail-api-push@system.gserviceaccount.com
```

**Required Role:**
```
roles/pubsub.publisher
```

**Your Configuration:**
- Project: `canvas-advice-479307-p4`
- Topic: `gmail-notifications3`
- Full Topic: `projects/canvas-advice-479307-p4/topics/gmail-notifications3`

## Verification Command

After granting permission, verify it's set correctly:

```bash
# Check topic IAM policy
gcloud pubsub topics get-iam-policy gmail-notifications3

# Should show:
# bindings:
# - members:
#   - serviceAccount:gmail-api-push@system.gserviceaccount.com
#   role: roles/pubsub.publisher
```

## After Fixing Permissions

1. **Reconnect Gmail Account**:
   - Go to your application
   - Disconnect the Gmail account
   - Reconnect it (this triggers Watch setup again)

2. **Check Logs**:
   - Should see: `[Gmail OAuth] Gmail Watch set up successfully`
   - Should see: `watch_expiration` set in database

3. **Test Email Reception**:
   - Send test email to connected Gmail account
   - Verify webhook receives notification
   - Check Unibox displays the email

## Prevention

To avoid this issue in the future:

1. **Grant permissions before OAuth**: Set up Pub/Sub permissions before users connect Gmail
2. **Use Terraform/Infrastructure as Code**: Automate permission grants
3. **Document in setup guide**: Include permission setup in initial configuration

## Related Documentation

- [Gmail Watch Setup Manual](GMAIL_WATCH_SETUP_MANUAL.md)
- [Pub/Sub Topic Configuration](GMAIL_PUBSUB_TOPIC_CONFIGURATION.md)
- [Gmail API Push Notifications](https://developers.google.com/gmail/api/guides/push)

---

**Last Updated**: 2024-01-01
**Version**: 1.0

