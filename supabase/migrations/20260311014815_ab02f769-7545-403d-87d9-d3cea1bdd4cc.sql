
-- Add unique constraint on net_worth_snapshots to prevent duplicate snapshots per user per day
ALTER TABLE public.net_worth_snapshots 
ADD CONSTRAINT net_worth_snapshots_user_date_unique 
UNIQUE (user_id, snapshot_date);
