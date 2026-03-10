# Reincorporate Email Campaigns & Email Analytics

This document describes the temporary hiding of Email Campaigns and Email Analytics throughout the software. Use it to restore these features when ready.

## Summary of Hidden Features

- **Email Campaigns**: Multi-step email sequences, campaign creation wizard, campaign list, campaign detail pages
- **Email Analytics**: Email performance analytics dashboard, open/click tracking views

## Routes (Still Active)

These routes remain functional—they are only hidden from navigation:

- `/dashboard/email/campaigns` - Campaign list
- `/dashboard/email/campaigns/new` - New campaign wizard
- `/dashboard/email/campaigns/[id]` - Campaign detail
- `/dashboard/marketing/analytics` - Email analytics dashboard

## Files Modified to Hide UI

Search for `REINCORPORATE_EMAIL_CAMPAIGNS` or `TEMP HIDDEN` to locate all changes.

### 1. Sidebar Navigation (already done previously)

| File | Change |
|------|--------|
| `app/dashboard/components/AppNavSidebar.tsx` | Email Marketing section: removed "Email Campaigns", "Email Analytics" (kept Unibox only) |
| `app/dashboard/components/Sidebar.tsx` | Same as above |
| `app/dashboard/prospect-enrich/components/ProspectNavSidebar.tsx` | Same as above |

**Restore**: Add back to the `items` array:
```ts
{ label: 'Email Campaigns', icon: 'send', href: '/dashboard/email/campaigns' },
{ label: 'Email Analytics', icon: 'analytics', href: '/dashboard/marketing/analytics' },
```

### 2. Header / Navbar Campaigns Links

| File | Change |
|------|--------|
| `app/dashboard/components/Header.tsx` | Removed Campaigns pill link (Calendar → Campaigns → Unibox) |
| `app/dashboard/crm/deals/components/DealsNavbar.tsx` | Removed Campaigns link |
| `app/dashboard/crm/calendar/components/CalendarNavbar.tsx` | Removed Campaigns link |

**Restore**: Add back the Campaigns Link block between Calendar and Unibox:
```tsx
<Link href="/dashboard/email/campaigns" className="...">
  <Icon icon="material-symbols:campaign" ... />
  <span>Campaigns</span>
</Link>
```

### 3. Unibox

| File | Change |
|------|--------|
| `app/dashboard/unibox/components/UniboxContent.tsx` | Removed Campaigns nav link (header pill: Calendar | Campaigns | Unibox) |

**Restore**: Add back the Campaigns Link between Calendar and the Unibox span.

### 4. Find Deals Modal

| File | Change |
|------|--------|
| `app/dashboard/prospect-enrich/components/FindDealsModal.tsx` | Removed from Email Marketing nav items: `email-campaigns`, `email-analytics` (kept Unibox only) |

**Restore**: Add to `NAV_SECTIONS` email-marketing items:
```ts
{ id: 'email-campaigns', label: 'Email Campaigns', icon: 'send' },
{ id: 'email-analytics', label: 'Email Analytics', icon: 'analytics' },
```

### 5. Email Marketing Page

| File | Change |
|------|--------|
| `app/dashboard/marketing/components/EmailMarketing.tsx` | - Removed "Create Campaign" header button<br>- Removed "Campaigns" and "Analytics" tabs<br>- Changed default `activeTab` from `'campaigns'` to `'compose-email'`<br>- Removed "View full analytics" link in Recent Performance section |

**Restore**:
- Add Create Campaign button: `onClick={() => window.location.href = '/dashboard/email/campaigns/new'}`
- Add tabs: `{ id: 'campaigns', label: 'Campaigns' }`, `{ id: 'analytics', label: 'Analytics' }`
- Restore default: `useState(..., 'campaigns')` if desired
- Add back the "View full analytics" Link to `/dashboard/marketing/analytics`

### 6. Email Compose Page

| File | Change |
|------|--------|
| `app/dashboard/email/compose/page.tsx` | Cancel button: changed navigation from `/dashboard/email/campaigns` to `/dashboard/unibox` |

**Restore**: Change Cancel button `onClick` back to `router.push('/dashboard/email/campaigns')` (or keep unibox if preferred).

### 7. Engage Page

| File | Change |
|------|--------|
| `app/dashboard/engage/page.tsx` | - Removed "Campaigns" card (Create and manage email campaigns...)<br>- Removed "Performance" card (View Analytics →)<br>- Removed unused `Target` and `TrendingUp` imports |

**Restore**: Add back the Campaigns and Performance cards to the grid, and restore the `Target` and `TrendingUp` icon imports.

## Quick Search for All Changes

```bash
# Find all TEMP HIDDEN / reincorporate comments
grep -r "REINCORPORATE_EMAIL_CAMPAIGNS\|TEMP HIDDEN" --include="*.tsx" --include="*.ts" .
```

## Backend / API

No backend or API changes were made. All campaign and analytics APIs remain active:

- `/api/campaigns` - CRUD for campaigns
- `/api/campaigns/[id]` - Campaign detail, PATCH, etc.
- `/api/campaigns/[id]/steps`, `/schedule`, `/recipients`, etc.
- `/api/campaigns/[id]/report`, `/performance`
- Cron jobs: `process-campaigns`, `process-emails`, `process-email-queue`
