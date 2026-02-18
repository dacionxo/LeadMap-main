# Notifications System

This document describes the in-app notifications system: database schema, how notifications are created, API endpoints, and how they appear in the UI.

---

## Table of Contents

1. [Overview](#overview)
2. [Database Schema](#database-schema)
3. [Notification Types and Codes](#notification-types-and-codes)
4. [How Notifications Are Created](#how-notifications-are-created)
5. [API Reference](#api-reference)
6. [User Interface](#user-interface)
7. [Migration and Setup](#migration-and-setup)

---

## Overview

The notifications system stores **per-user, in-app notifications** that appear in:

- The **notifications dropdown** (bell icon in the header or on the map)
- The **Notifications** page (`/dashboard/notifications`)
- **Recent Activity** sections on the dashboard (which pull from the same notifications and link to “See All” / “View All” → `/dashboard/notifications`)

Notifications are created by:

- **Database triggers** (emails, lists, deals, calendar, etc.)
- **Stripe webhook** (subscription and payment events)
- **Cron job** (trial reminders)
- **Application API** (e.g. sequence alerts, Apollo autopay failed, or any custom creation)

Each notification has a **type** (for behavior/backward compatibility) and an optional **notification_code** (for icons and grouping). Users can mark items as read and open optional links.

---

## Database Schema

### Table: `notifications`

Defined in `supabase/migrations/create_notifications_table.sql`.

| Column             | Type         | Constraints | Description |
|--------------------|-------------|-------------|-------------|
| `id`               | UUID        | PRIMARY KEY, default `uuid_generate_v4()` | Unique notification id |
| `user_id`          | UUID        | NOT NULL, REFERENCES `auth.users(id)` ON DELETE CASCADE | Owner of the notification |
| `type`             | TEXT        | NOT NULL, default `'system'`, CHECK IN (`comment`, `system`, `file`, `warning`) | Display/behavior category |
| `title`            | TEXT        | NOT NULL | Short title |
| `message`          | TEXT        | NOT NULL | Body text |
| `link`             | TEXT        | nullable | Optional URL/path to open when clicked |
| `attachment`       | TEXT        | nullable | Optional attachment label |
| `read`             | BOOLEAN     | NOT NULL, default FALSE | Whether the user has read it |
| `created_at`       | TIMESTAMPTZ | NOT NULL, default NOW() | When the notification was created |
| `notification_code`| TEXT        | nullable *(added in a later migration)* | Code used for icons and filtering (e.g. `trial_reminder`, `sequence_alert`) |

### Indexes

- `idx_notifications_user_id` — list by user
- `idx_notifications_user_read` — filter by user + read state
- `idx_notifications_user_created` — list by user, newest first
- `idx_notifications_notification_code` (partial) — filter by code when present

### Row Level Security (RLS)

- **SELECT**: user can read only their own rows (`auth.uid() = user_id`).
- **UPDATE**: user can update only their own rows (e.g. mark as read).
- **INSERT**: service role **or** the user themselves (so app/triggers/cron can insert for any user via service role; users can create for themselves via API).
- **DELETE**: user can delete only their own rows.

---

## Notification Types and Codes

### `type` (required)

Used for backward compatibility and fallback UI:

- **`system`** — General system/activity (emails, calendar, lists, deals, etc.).
- **`warning`** — Needs attention (trial ending, payment overdue, autopay failed).
- **`comment`** / **`file`** — Legacy; UI may show title initial in a circle.

### `notification_code` (optional)

Used for **icons and grouping**. When set, the UI chooses an icon and style by code instead of only by `type`.

| Code                  | Typical use                          | UI icon / style |
|-----------------------|--------------------------------------|------------------|
| `sequence_alert`      | Sequence/campaign step or alert      | Violet mail/sequence |
| `trial_reminder`      | Free trial ending in 1–7 days        | Amber clock      |
| `plan_overdue`        | Paid plan payment overdue            | Red calendar-mark |
| `account_overdue`    | Account past due / payment failed    | Red calendar-mark |
| `autopay_failed`      | Apollo (or other) autopay failed     | Orange card      |
| `subscription_upgrade`| User upgraded subscription           | Emerald star     |

If `notification_code` is null, the UI falls back to `type` (e.g. system → shield, warning → triangle, comment/file → initial).

---

## How Notifications Are Created

### 1. Database triggers (`notifications_event_triggers.sql`)

All trigger functions call `notify_user(user_id, type, title, message, link)`. They do **not** set `notification_code` (it stays NULL).

| Event | Table(s) | Trigger(s) | Resulting notification |
|-------|----------|------------|------------------------|
| Email sent | `emails` | `trigger_notify_email_sent` (UPDATE, status → sent) | “Email sent” + recipient/subject |
| Email received | `emails` | `trigger_notify_email_received` (INSERT, direction = received) | “New email received” + subject, link `/dashboard/unibox` |
| List item added/removed | `list_memberships` | INSERT/DELETE triggers | “Item moved in list” + list name, link to list or lists |
| Deal stage changed | `deals` | `trigger_notify_deal_stage` (UPDATE, stage change) | “Deal moved” + deal title + new stage, link `/dashboard/crm/deals` |
| Calendar event added | `calendar_events` | INSERT trigger | “Calendar event added” + title + time, link `/dashboard/crm/calendar` |
| Calendar event removed | `calendar_events` | DELETE trigger | “Calendar event removed” + title |
| Calendar connected / synced | `calendar_connections` | INSERT + UPDATE (last_sync_at) | “Calendar connected” or “Calendar synced” |
| New list created | `lists` | INSERT trigger | “New list created” + list name, link to list |

These run with **SECURITY DEFINER** so they can insert into `notifications` regardless of RLS.

### 2. Helper for code-based notifications (SQL)

In `add_notification_code_and_billing_notifications.sql`:

```sql
notify_user_with_code(p_user_id, p_type, p_title, p_message, p_link, p_notification_code)
```

Use this from other migrations, cron (e.g. via a DB cron like pg_cron), or server-side code that has a Supabase client with permission to run RPC. The app mainly uses the **API** and **Stripe webhook** instead of calling this from the app layer.

### 3. Stripe webhook (`app/api/stripe/webhook/route.ts`)

The webhook looks up the user by **Stripe customer id** (`users.stripe_customer_id`) and inserts into `notifications` (service role). Events that create notifications:

| Stripe event | Condition / meaning | notification_code | title / intent |
|--------------|---------------------|-------------------|----------------|
| `checkout.session.completed` | After subscription update | `subscription_upgrade` | “Subscription upgraded” |
| `customer.subscription.updated` | `subscription.status === 'past_due'` | `plan_overdue` | “Payment overdue” |
| `customer.subscription.deleted` | Subscription canceled | (none) | “Subscription canceled” |
| `invoice.payment_failed` | Invoice payment failed | `account_overdue` | “Payment failed” |

So: **subscription upgrade**, **plan overdue**, **account overdue**, and **subscription canceled** are all driven by Stripe.

### 4. Trial reminders cron (`app/api/cron/trial-reminders/route.ts`)

- **Endpoint**: `GET /api/cron/trial-reminders`
- **Auth**: `CRON_SECRET` or `CALENDAR_SERVICE_KEY` (see `lib/cron/auth.ts`).
- **Logic**:
  - Selects users where `subscription_status` is `none` or `trialing`, `is_subscribed = false`, and `trial_end` is within the **next 1–7 days**.
  - For each such user, if they don’t already have a `trial_reminder` notification **today**, inserts one with:
    - `type: 'warning'`, `notification_code: 'trial_reminder'`
    - Title: “Free trial ending soon”, message: “X days left in your free trial…”, link: `/dashboard/billing`.

So **trial reminders** (last 7 days of trial) are created by this cron when run daily.

### 5. Application API

- **`POST /api/notifications/create`**  
  Creates a notification for the **authenticated user**. Optional body fields: `type`, `link`, `attachment`, **`notification_code`**.  
  Use this for **sequence alerts** or any custom in-app notification (e.g. when a sequence step is sent or fails).  
  Allowed `notification_code` values: `sequence_alert`, `trial_reminder`, `plan_overdue`, `account_overdue`, `autopay_failed`, `subscription_upgrade`.

- **`POST /api/notifications/apollo-autopay-failed`**  
  Creates a single **autopay failed** notification for the authenticated user (`notification_code: 'autopay_failed'`, title “Apollo autopay failed”, link `/dashboard/billing`). Optional body: `{ "message": "…" }`.  
  Call this when Apollo (or your integration) reports an autopay failure and you have the user context (e.g. from a webhook handler that identifies the user).

---

## API Reference

All notification APIs require an **authenticated user** (session) unless noted.

### GET `/api/notifications`

List notifications for the current user.

- **Query**
  - `unread_only` (optional): `true` → only unread.
  - `limit` (optional): default 50, max 100.
- **Response**: `{ "notifications": [ { id, type, title, message, link, attachment, read, created_at, notification_code }, … ] }`
- **Order**: newest first by `created_at`.

### POST `/api/notifications/create`

Create one notification for the current user.

- **Body**
  - `title` (string, required)
  - `message` (string, required)
  - `type` (optional): `comment` | `system` | `file` | `warning`, default `system`
  - `link` (optional): string
  - `attachment` (optional): string
  - `notification_code` (optional): one of `sequence_alert`, `trial_reminder`, `plan_overdue`, `account_overdue`, `autopay_failed`, `subscription_upgrade`
- **Response**: `201` with `{ "notification": { … } }`.

### PATCH `/api/notifications/[id]`

Mark a single notification as read. User must own the notification.

- **Response**: `200` with `{ "notification": { … } }`, or `404` if not found.

### PATCH `/api/notifications/mark-all-read`

Mark **all** unread notifications for the current user as read.

- **Response**: `200` with `{ "marked": number, "message": "…" }`.

### POST `/api/notifications/apollo-autopay-failed`

Create an “Apollo autopay failed” notification for the current user.

- **Body** (optional): `{ "message": "custom message" }`
- **Response**: `201` with `{ "notification": { … } }`.

### GET `/api/cron/trial-reminders` (cron only)

Not for browser use. Creates trial reminder notifications for users whose trial ends in 1–7 days. Must be called with cron auth (`CRON_SECRET` or `CALENDAR_SERVICE_KEY`).

- **Response**: `200` with `{ "ok": true, "sent": number, "skipped": number }` or error.

---

## User Interface

### Notifications dropdown

- **Component**: `app/dashboard/components/NotificationsDropdown.tsx`
- **Where**: Header and map (e.g. `MapProfileNotificationButtons`).
- **Behavior**: On open, fetches `/api/notifications?limit=20`. Shows list with icon per item; click marks as read and optionally navigates to `link`. “See All Notifications” links to `/dashboard/notifications`.
- **Auto-updates**: The dropdown subscribes to Supabase Realtime **postgres_changes** on the `notifications` table (filtered by the current user’s `user_id`). When a row is inserted or updated, the list refetches in the background (no loading spinner) so new notifications and read-state changes appear without reopening the dropdown. This requires the `notifications` table to be in the `supabase_realtime` publication (see migration `enable_notifications_realtime.sql`).
- **Icons**: By `notification_code` first (see [Notification Types and Codes](#notification-types-and-codes)); if no code, by `type` (system → shield, warning → triangle, comment/file → first letter of title).

### Notifications page

- **Route**: `/dashboard/notifications`
- **Component**: `app/dashboard/notifications/page.tsx`
- **Behavior**: Fetches up to 100 notifications, same icon logic as dropdown. Click marks as read and can navigate to `link`. “Mark all as read” calls `PATCH /api/notifications/mark-all-read`.

### Recent Activity

- **Dashboard (CustomizableDashboard)**: Fetches `/api/notifications?limit=20` and uses the result as “recent activity” when available; “View all notifications” (or “View All”) goes to `/dashboard/notifications`.
- **DashboardContent**: “View All” for Recent Activity navigates to `/dashboard/notifications`.
- **RecentActivityWidget** (DashboardWidgets): “View All” link goes to `/dashboard/notifications`.

So **all “Recent Activity” / “View All” entry points lead to the same full list** at `/dashboard/notifications`.

---

## Migration and Setup

### Migration order

1. **`create_notifications_table.sql`** — Creates `notifications` table, indexes, and RLS.
2. **`notifications_event_triggers.sql`** — Creates `notify_user()` and all triggers (emails, lists, deals, calendar).
3. **`add_notification_code_and_billing_notifications.sql`** — Adds `notification_code` column and `notify_user_with_code()`.
4. **`enable_notifications_realtime.sql`** — Adds `notifications` to the `supabase_realtime` publication so the dropdown can auto-update via Realtime. If the table is already in the publication, skip or comment out this migration.

Apply in that order (e.g. `supabase db push` or run in SQL editor).

### Environment / ops

- **Stripe**: Configure Stripe webhook to point to `POST /api/stripe/webhook` and subscribe to at least:
  - `checkout.session.completed`
  - `customer.subscription.created`
  - `customer.subscription.updated`
  - `customer.subscription.deleted`
  - `invoice.payment_failed`
- **Trial reminders**: Schedule a daily job (e.g. Vercel Cron at 9:00 AM) to call `GET /api/cron/trial-reminders` with header `x-vercel-cron-secret: <CRON_SECRET>` (or use `CALENDAR_SERVICE_KEY` per `lib/cron/auth.ts`).
- **Sequence alerts**: Wherever you process sequence/campaign steps (e.g. cron or webhook), call `POST /api/notifications/create` with `notification_code: 'sequence_alert'` and the right `title` / `message` / `link` for the signed-in user (or use service role to insert into `notifications` for a given `user_id`).
- **Apollo autopay**: When you detect an Apollo autopay failure and have the user (e.g. in a webhook), call `POST /api/notifications/apollo-autopay-failed` with that user’s session, or insert a row into `notifications` with `notification_code: 'autopay_failed'` using the service role.

---

## Summary table: where each notification comes from

| Notification kind        | Source                    | notification_code       |
|--------------------------|---------------------------|------------------------|
| Email sent               | DB trigger (emails)       | (none)                 |
| Email received           | DB trigger (emails)       | (none)                 |
| List / deal / calendar   | DB triggers               | (none)                 |
| Subscription upgraded   | Stripe webhook            | `subscription_upgrade`  |
| Paid plan overdue       | Stripe webhook            | `plan_overdue`         |
| Account / payment failed| Stripe webhook            | `account_overdue`      |
| Subscription canceled   | Stripe webhook            | (none)                 |
| Trial ending (1–7 days) | Cron trial-reminders     | `trial_reminder`       |
| Sequence alert           | App (POST create)         | `sequence_alert`       |
| Apollo autopay failed    | App (POST apollo-autopay-failed) | `autopay_failed` |

This completes the description of the notifications system.
