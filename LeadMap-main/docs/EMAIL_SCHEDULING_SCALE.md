# Email Scheduling Scale Guide (1,000+ Users/Emails)

This guide covers optimizations for scheduling and sending emails at scale—1,000+ users and 1,000+ emails per hour.

## Architecture Overview

1. **Compose/Schedule** → Send API inserts into `email_queue` (when `SYMPHONY_EMAIL_QUEUE_ENABLED=true`)
2. **process-email-queue** cron → Fetches queued emails, dispatches to Symphony `messenger_messages`
3. **symphony-worker** cron → Processes `messenger_messages` via `EmailMessageHandler` → `sendViaMailbox`

## Environment Variables for 1,000+ Scale

| Variable | Default | 1,000+ Scale | Description |
|----------|---------|--------------|-------------|
| `SYMPHONY_EMAIL_QUEUE_ENABLED` | `false` | `true` | Enable Symphony path (required for scale) |
| `EMAIL_QUEUE_BATCH_SIZE` | `500` | `500`–`1000` | Emails fetched per cron run |
| `SYMPHONY_WORKER_BATCH_SIZE` | `100` | `100`–`200` | Messages per Symphony worker run |
| `SYMPHONY_WORKER_MAX_CONCURRENCY` | `15` | `15`–`30` | Concurrent handler executions |
| `SYMPHONY_WORKER_POLL_INTERVAL` | `1000` | `500`–`1000` | Poll interval (ms) |
| `SYMPHONY_WORKER_TIME_LIMIT` | `50000` | `50000` | Max run time (ms, &lt; maxDuration) |

### Example Production Config

```bash
SYMPHONY_EMAIL_QUEUE_ENABLED=true
EMAIL_QUEUE_BATCH_SIZE=500
SYMPHONY_WORKER_BATCH_SIZE=100
SYMPHONY_WORKER_MAX_CONCURRENCY=15
```

### Aggressive Config (3,000+ emails/hour)

```bash
SYMPHONY_EMAIL_QUEUE_ENABLED=true
EMAIL_QUEUE_BATCH_SIZE=1000
SYMPHONY_WORKER_BATCH_SIZE=200
SYMPHONY_WORKER_MAX_CONCURRENCY=30
SYMPHONY_WORKER_POLL_INTERVAL=500
```

## Database Indexes

Run the scale migration:

```bash
supabase db push
# Or apply: supabase/migrations/add_email_queue_scale_indexes.sql
```

**email_queue** index:

- `idx_email_queue_queued_priority_created`: `(priority DESC, created_at ASC) WHERE status = 'queued'`  
  Speeds up the `process-email-queue` query.

**messenger_messages** (Symphony schema):

- Existing indexes in `create_symphony_messenger_schema.sql` are sufficient.

## Cron Frequency

For 1,000+ emails/hour:

1. **process-email-queue**: Every 1 minute (or more often if supported)
2. **symphony-worker**: Every 1 minute (or more often)

## Throughput Estimates

| Batch Size | Concurrency | Approx. throughput (emails/min) |
|------------|-------------|--------------------------------|
| 100 | 15 | ~60–90 |
| 200 | 15 | ~120–180 |
| 100 | 30 | ~120–180 |
| 200 | 30 | ~200–300 |

Estimates assume ~1–2s per `sendViaMailbox` call and that cron runs every minute.

## Vercel Limits

- `maxDuration` is 60s on Pro, 300s on Enterprise.
- Symphony worker uses `maxDuration = 60`.
- Keep `SYMPHONY_WORKER_TIME_LIMIT` below `maxDuration` (e.g. 50s default).

## Monitoring

1. **Queue depth**: Monitor `email_queue` where `status = 'queued'`
2. **messenger_messages depth**: `WHERE transport_name = 'default' AND status = 'pending'`
3. **Processing rate**: Successful sends per cron run
4. **Failures**: `status = 'failed'` in both tables

## Transport Alignment

The Symphony worker uses `SupabaseTransport('default')` and polls for `transport_name = 'default'`. Ensure `dispatchEmailMessage` uses a transport name that matches—either:

- Set `SYMPHONY_ROUTING` so `EmailMessage` routes to `default`, or
- Use `transport: 'default'` when dispatching.

If messages are stored with a different `transport_name`, the worker will not process them.

## See Also

- [Symphony Performance Tuning](symphony/PERFORMANCE_TUNING.md)
- [Scalability Guide](SCALABILITY_GUIDE.md)
