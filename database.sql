-- WARNING: This schema is for context only and is not meant to be run.
-- Table order and constraints may not be valid for execution.

CREATE TABLE public.users (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  email character varying NOT NULL UNIQUE,
  password_hash character varying NOT NULL,
  first_name character varying NOT NULL,
  last_name character varying NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  role text NOT NULL CHECK (role = ANY (ARRAY['PATIENT'::text, 'DOCTOR'::text, 'INSPECTOR'::text, 'HEALTH_AUTHORITY'::text, 'SUPERADMIN'::text])),
  created_at timestamp with time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp with time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT users_pkey PRIMARY KEY (id)
);
CREATE TABLE public.facilities (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  name character varying NOT NULL,
  facility_type character varying NOT NULL CHECK (facility_type::text = ANY (ARRAY['EPSP'::character varying, 'EPH'::character varying, 'CHU'::character varying, 'Clinique privée'::character varying]::text[])),
  wilaya text NOT NULL,
  address text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp with time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_by uuid NOT NULL,
  CONSTRAINT facilities_pkey PRIMARY KEY (id),
  CONSTRAINT facilities_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id)
);
CREATE TABLE public.doctors (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL UNIQUE,
  nin character varying NOT NULL UNIQUE,
  specialty character varying NOT NULL,
  facility_id uuid NOT NULL,
  verified_by_facility uuid,
  verified_at timestamp with time zone,
  phone character varying NOT NULL,
  status character varying NOT NULL DEFAULT 'PENDING'::character varying CHECK (status::text = ANY (ARRAY['PENDING'::character varying, 'ACCEPTED'::character varying, 'REJECTED'::character varying]::text[])),
  created_at timestamp with time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp with time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  order_number character varying,
  CONSTRAINT doctors_pkey PRIMARY KEY (id),
  CONSTRAINT doctors_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id),
  CONSTRAINT doctors_facility_id_fkey FOREIGN KEY (facility_id) REFERENCES public.facilities(id),
  CONSTRAINT doctors_verified_by_facility_fkey FOREIGN KEY (verified_by_facility) REFERENCES public.facilities(id)
);
CREATE TABLE public.patients (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  nin character varying NOT NULL UNIQUE,
  date_of_birth date NOT NULL,
  gender character varying NOT NULL CHECK (gender::text = ANY (ARRAY['M'::character varying, 'F'::character varying]::text[])),
  blood_type character varying CHECK (blood_type::text = ANY (ARRAY['A+'::character varying, 'A-'::character varying, 'B+'::character varying, 'B-'::character varying, 'AB+'::character varying, 'AB-'::character varying, 'O+'::character varying, 'O-'::character varying]::text[])),
  created_at timestamp with time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp with time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  first_name character varying NOT NULL,
  last_name character varying NOT NULL,
  CONSTRAINT patients_pkey PRIMARY KEY (id)
);
CREATE TABLE public.inspectors (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL UNIQUE,
  job_function character varying NOT NULL,
  wilaya text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp with time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT inspectors_pkey PRIMARY KEY (id),
  CONSTRAINT inspectors_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id)
);
CREATE TABLE public.health_authorities (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL UNIQUE,
  position character varying NOT NULL,
  authority_type character varying NOT NULL DEFAULT 'OTHER'::character varying,
  created_at timestamp with time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp with time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT health_authorities_pkey PRIMARY KEY (id),
  CONSTRAINT health_authorities_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id)
);
CREATE TABLE public.superadmins (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL UNIQUE,
  phone character varying NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp with time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT superadmins_pkey PRIMARY KEY (id),
  CONSTRAINT superadmins_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id)
);
CREATE TABLE public.health_events (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  doctor_id uuid NOT NULL,
  facility_id uuid NOT NULL,
  patient_id uuid NOT NULL,
  description text NOT NULL,
  severity character varying NOT NULL CHECK (severity::text = ANY (ARRAY['LOW'::character varying, 'MEDIUM'::character varying, 'HIGH'::character varying, 'CRITICAL'::character varying]::text[])),
  patient_proof_url text,
  created_at timestamp with time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp with time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  reportable_disease_id uuid NOT NULL,
  CONSTRAINT health_events_pkey PRIMARY KEY (id),
  CONSTRAINT health_events_facility_id_fkey FOREIGN KEY (facility_id) REFERENCES public.facilities(id),
  CONSTRAINT health_events_patient_id_fkey FOREIGN KEY (patient_id) REFERENCES public.patients(id),
  CONSTRAINT health_events_reportable_disease_id_fkey FOREIGN KEY (reportable_disease_id) REFERENCES public.reportable_diseases(id),
  CONSTRAINT health_events_doctor_id_fkey FOREIGN KEY (doctor_id) REFERENCES public.doctors(id)
);
CREATE TABLE public.reportable_diseases (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  name character varying NOT NULL UNIQUE,
  created_at timestamp with time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT reportable_diseases_pkey PRIMARY KEY (id)
);
CREATE TABLE public.doctor_facility_change_requests (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  doctor_id uuid NOT NULL,
  current_facility_id uuid NOT NULL,
  requested_facility_id uuid NOT NULL,
  reason text NOT NULL,
  status character varying NOT NULL DEFAULT 'PENDING'::character varying CHECK (status::text = ANY (ARRAY['PENDING'::character varying, 'APPROVED'::character varying, 'REJECTED'::character varying, 'CANCELLED'::character varying]::text[])),
  reviewed_by uuid,
  reviewed_at timestamp with time zone,
  review_message text,
  created_at timestamp with time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp with time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT doctor_facility_change_requests_pkey PRIMARY KEY (id),
  CONSTRAINT doctor_facility_change_requests_doctor_fkey FOREIGN KEY (doctor_id) REFERENCES public.doctors(id),
  CONSTRAINT doctor_facility_change_requests_current_facility_fkey FOREIGN KEY (current_facility_id) REFERENCES public.facilities(id),
  CONSTRAINT doctor_facility_change_requests_requested_facility_fkey FOREIGN KEY (requested_facility_id) REFERENCES public.facilities(id),
  CONSTRAINT doctor_facility_change_requests_reviewer_fkey FOREIGN KEY (reviewed_by) REFERENCES public.users(id)
);
CREATE TABLE public.unlisted_clinic_requests (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL,
  clinic_name character varying NOT NULL,
  facility_type character varying NOT NULL DEFAULT 'Clinique privée'::character varying CHECK (facility_type::text = 'Clinique privée'::text),
  wilaya text NOT NULL,
  address text,
  nin character varying NOT NULL,
  specialty character varying NOT NULL,
  phone character varying NOT NULL,
  order_number character varying,
  status character varying NOT NULL DEFAULT 'PENDING'::character varying CHECK (status::text = ANY (ARRAY['PENDING'::character varying, 'APPROVED'::character varying, 'REJECTED'::character varying]::text[])),
  reviewed_by uuid,
  reviewed_at timestamp with time zone,
  rejection_reason text,
  created_at timestamp with time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp with time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT unlisted_clinic_requests_pkey PRIMARY KEY (id),
  CONSTRAINT unlisted_clinic_requests_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id),
  CONSTRAINT unlisted_clinic_requests_reviewed_by_fkey FOREIGN KEY (reviewed_by) REFERENCES public.users(id)
);