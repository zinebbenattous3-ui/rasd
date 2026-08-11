-- WARNING: This schema is for context only and is not meant to be run.
-- Table order and constraints may not be valid for execution.

CREATE TABLE public.users (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  email character varying NOT NULL UNIQUE,
  password_hash character varying NOT NULL,
  is_active boolean DEFAULT true,
  role text NOT NULL,
  created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT users_pkey PRIMARY KEY (id)
);
CREATE TABLE public.facilities (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  user_id uuid,
  name character varying NOT NULL,
  facility_type character varying CHECK (facility_type::text = ANY (ARRAY['Hôpital'::character varying, 'EPH'::character varying, 'EPSP'::character varying, 'Clinique privée'::character varying, 'Autre'::character varying]::text[])),
  wilaya text,
  address text,
  created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT facilities_pkey PRIMARY KEY (id),
  CONSTRAINT facilities_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id)
);
CREATE TABLE public.doctors (
  id character varying NOT NULL,
  user_id uuid,
  nin character varying UNIQUE,
  first_name character varying NOT NULL,
  last_name character varying NOT NULL,
  specialty character varying NOT NULL,
  facility_id uuid,
  verified_by_facility uuid,
  verified_at timestamp with time zone,
  phone character varying,
  professional_email character varying,
  created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT doctors_pkey PRIMARY KEY (id),
  CONSTRAINT doctors_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id),
  CONSTRAINT doctors_facility_id_fkey FOREIGN KEY (facility_id) REFERENCES public.facilities(id),
  CONSTRAINT doctors_verified_by_facility_fkey FOREIGN KEY (verified_by_facility) REFERENCES public.facilities(id)
);
CREATE TABLE public.patients (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  nin character varying NOT NULL UNIQUE,
  user_id uuid,
  first_name character varying NOT NULL,
  last_name character varying NOT NULL,
  date_of_birth date NOT NULL,
  gender character varying CHECK (gender::text = ANY (ARRAY['M'::character varying, 'F'::character varying]::text[])),
  blood_type character varying,
  created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT patients_pkey PRIMARY KEY (id),
  CONSTRAINT patients_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id)
);
CREATE TABLE public.health_authorities (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  user_id uuid,
  structure_name character varying NOT NULL,
  job_function character varying NOT NULL,
  authority_type character varying DEFAULT 'OTHER'::character varying CHECK (authority_type::text = ANY (ARRAY['DSS'::character varying, 'DSP'::character varying, 'OTHER'::character varying]::text[])),
  created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT health_authorities_pkey PRIMARY KEY (id),
  CONSTRAINT health_authorities_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id)
);
CREATE TABLE public.inspectors (
  id character varying NOT NULL,
  user_id uuid,
  first_name character varying NOT NULL,
  last_name character varying NOT NULL,
  job_function character varying NOT NULL,
  created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  wilaya text,
  CONSTRAINT inspectors_pkey PRIMARY KEY (id),
  CONSTRAINT inspectors_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id)
);
CREATE TABLE public.health_events (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  doctor_id character varying,
  facility_id uuid,
  patient_nin character varying,
  incident_type character varying NOT NULL,
  description text NOT NULL,
  severity character varying CHECK (severity::text = ANY (ARRAY['LOW'::character varying, 'MEDIUM'::character varying, 'HIGH'::character varying, 'CRITICAL'::character varying]::text[])),
  status character varying DEFAULT 'PENDING'::character varying CHECK (status::text = ANY (ARRAY['PENDING'::character varying, 'VALIDATED'::character varying, 'REJECTED'::character varying, 'ARCHIVED'::character varying]::text[])),
  patient_proof_url text,
  created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT health_events_pkey PRIMARY KEY (id),
  CONSTRAINT health_events_doctor_id_fkey FOREIGN KEY (doctor_id) REFERENCES public.doctors(id),
  CONSTRAINT health_events_facility_id_fkey FOREIGN KEY (facility_id) REFERENCES public.facilities(id),
  CONSTRAINT health_events_patient_nin_fkey FOREIGN KEY (patient_nin) REFERENCES public.patients(nin)
);