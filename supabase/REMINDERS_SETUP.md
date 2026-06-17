# Booking Reminders Setup

## 1. Run the Migration

In the Supabase dashboard, go to **SQL Editor** and run the contents of `migration_blocked_periods.sql`. This adds the `blocked_periods` table and the `reminder_sent` column to `bookings`.

## 2. Deploy the Edge Function

```bash
supabase functions deploy send-reminders
```

Set the required environment secrets:

```bash
supabase secrets set BREVO_API_KEY=your_brevo_api_key
```

`SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are automatically available inside edge functions.

## 3. Set Up a Daily Cron Job

In the Supabase dashboard:

1. Go to **Database → Extensions** and enable `pg_cron` and `pg_net`.
2. Go to **SQL Editor** and run:

```sql
select cron.schedule(
  'send-reminders',
  '0 8 * * *',
  $$
  select net.http_post(
    url:='YOUR_SUPABASE_URL/functions/v1/send-reminders',
    headers:='{"Authorization": "Bearer YOUR_ANON_KEY"}'::jsonb
  ) as request_id;
  $$
);
```

Replace `YOUR_SUPABASE_URL` with your project URL (e.g. `https://xxxx.supabase.co`) and `YOUR_ANON_KEY` with your project's anon key (found in **Settings → API**).

This will run the reminder function every day at 08:00 UTC, sending emails to customers with approved bookings scheduled for the following day.
