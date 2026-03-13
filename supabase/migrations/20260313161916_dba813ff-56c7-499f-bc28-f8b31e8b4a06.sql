-- Update asset values
UPDATE public.assets 
SET value = 100000.00 
WHERE value = 100.00;

-- Update net worth snapshots
UPDATE public.net_worth_snapshots 
SET total_assets = 100000.00
WHERE total_assets = 100.00;