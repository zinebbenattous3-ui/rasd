-- ====================================================================
-- MIGRATION: SECURE UNLISTED PRIVATE CLINIC REGISTRATION REQUESTS TABLE
-- ====================================================================

CREATE TABLE IF NOT EXISTS public.unlisted_clinic_requests (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  
  -- Doctor Metadata
  doctor_first_name character varying NOT NULL,
  doctor_last_name character varying NOT NULL,
  doctor_email character varying NOT NULL,
  doctor_nin character varying NOT NULL,
  doctor_specialty character varying NOT NULL,
  doctor_phone character varying NOT NULL,
  doctor_order_number character varying,
  doctor_password_hash character varying NOT NULL,
  
  -- Proposed Clinic Metadata
  clinic_name character varying NOT NULL,
  facility_type character varying NOT NULL DEFAULT 'Clinique privée' CHECK (facility_type = 'Clinique privée'),
  wilaya text NOT NULL,
  address text,
  
  -- Review Lifecycle
  status character varying NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED')),
  reviewed_by uuid REFERENCES public.users(id),
  reviewed_at timestamp with time zone,
  rejection_reason text,
  created_at timestamp with time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp with time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  
  CONSTRAINT unlisted_clinic_requests_pkey PRIMARY KEY (id)
);

-- Enable Row Level Security (RLS)
ALTER TABLE public.unlisted_clinic_requests ENABLE ROW LEVEL SECURITY;

-- 1. Allow public / anonymous users to submit unlisted clinic requests during signup
CREATE POLICY "Allow public insert for unlisted clinic requests"
  ON public.unlisted_clinic_requests
  FOR INSERT
  WITH CHECK (true);

-- 2. SECURE WILAYA-SCOPED SELECT FOR REGIONAL INSPECTORS
-- Inspectors can ONLY view unlisted clinic requests belonging to their assigned Wilaya
CREATE POLICY "Allow inspectors to view requests in their wilaya"
  ON public.unlisted_clinic_requests
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.inspectors i
      WHERE i.user_id = auth.uid()
      AND i.wilaya = unlisted_clinic_requests.wilaya
    )
    OR
    EXISTS (
      SELECT 1 FROM public.superadmins s
      WHERE s.user_id = auth.uid()
    )
  );

-- 3. SECURE WILAYA-SCOPED UPDATE FOR REGIONAL INSPECTORS
-- Inspectors can ONLY approve or reject requests within their assigned Wilaya
CREATE POLICY "Allow inspectors to update requests in their wilaya"
  ON public.unlisted_clinic_requests
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.inspectors i
      WHERE i.user_id = auth.uid()
      AND i.wilaya = unlisted_clinic_requests.wilaya
    )
    OR
    EXISTS (
      SELECT 1 FROM public.superadmins s
      WHERE s.user_id = auth.uid()
    )
  );
