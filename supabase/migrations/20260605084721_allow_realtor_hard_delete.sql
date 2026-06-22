-- Allow hard deletion of realtors by changing FK constraints from RESTRICT to SET NULL.
-- This preserves historical data (shares, events, downloads, leads) while nullifying the realtor reference.

-- listing_shares.realtor_id: NOT NULL -> nullable, ON DELETE SET NULL
ALTER TABLE public.listing_shares ALTER COLUMN realtor_id DROP NOT NULL;
ALTER TABLE public.listing_shares DROP CONSTRAINT listing_shares_realtor_id_fkey;
ALTER TABLE public.listing_shares
  ADD CONSTRAINT listing_shares_realtor_id_fkey
  FOREIGN KEY (realtor_id) REFERENCES public.realtors(id) ON DELETE SET NULL;

-- listing_events.realtor_id: already nullable, just change ON DELETE
ALTER TABLE public.listing_events DROP CONSTRAINT listing_events_realtor_id_fkey;
ALTER TABLE public.listing_events
  ADD CONSTRAINT listing_events_realtor_id_fkey
  FOREIGN KEY (realtor_id) REFERENCES public.realtors(id) ON DELETE SET NULL;

-- download_logs.realtor_id: already nullable, just change ON DELETE
ALTER TABLE public.download_logs DROP CONSTRAINT download_logs_realtor_id_fkey;
ALTER TABLE public.download_logs
  ADD CONSTRAINT download_logs_realtor_id_fkey
  FOREIGN KEY (realtor_id) REFERENCES public.realtors(id) ON DELETE SET NULL;

-- leads.realtor_id: already nullable, just change ON DELETE
ALTER TABLE public.leads DROP CONSTRAINT leads_realtor_id_fkey;
ALTER TABLE public.leads
  ADD CONSTRAINT leads_realtor_id_fkey
  FOREIGN KEY (realtor_id) REFERENCES public.realtors(id) ON DELETE SET NULL;

-- listing_realtors.realtor_id already has ON DELETE CASCADE (correct behavior)
-- No change needed there.