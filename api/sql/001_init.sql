-- Sistema do Diaconato: banco separado da pesquisa anônima.
BEGIN;
CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE TABLE IF NOT EXISTS users (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 name varchar(160) NOT NULL,
 email varchar(180) NOT NULL UNIQUE,
 password_hash text NOT NULL,
 role varchar(16) NOT NULL CHECK (role IN ('admin','coordinator','leader')),
 active boolean NOT NULL DEFAULT true,
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS deacons (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 full_name varchar(180) NOT NULL,
 cohort varchar(10) NOT NULL CHECK(cohort IN ('antigo','novo')),
 status varchar(16) NOT NULL DEFAULT 'active' CHECK(status IN ('active','away','inactive')),
 phone varchar(30),
 email varchar(180),
 availability text,
 started_at date,
 created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS deacons_name_idx ON deacons (full_name);
CREATE TABLE IF NOT EXISTS care_groups (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 name varchar(120) NOT NULL,
 leader_id uuid REFERENCES users(id) ON DELETE SET NULL,
 target_size integer NOT NULL DEFAULT 10 CHECK (target_size BETWEEN 1 AND 30),
 active boolean NOT NULL DEFAULT true,
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS group_members (
 deacon_id uuid PRIMARY KEY REFERENCES deacons(id) ON DELETE CASCADE,
 group_id uuid NOT NULL REFERENCES care_groups(id) ON DELETE CASCADE,
 joined_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS group_members_group_idx ON group_members(group_id);
CREATE TABLE IF NOT EXISTS followups (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 deacon_id uuid NOT NULL REFERENCES deacons(id) ON DELETE CASCADE,
 author_id uuid NOT NULL REFERENCES users(id),
 contacted_at timestamptz NOT NULL DEFAULT now(),
 method varchar(20) NOT NULL CHECK(method IN ('presencial','telefone','mensagem','outro')),
 outcome varchar(24) NOT NULL CHECK(outcome IN ('contato_realizado','retornar','sem_resposta','encaminhar')),
 summary varchar(1000),
 next_contact_on date,
 needs_pastoral_attention boolean NOT NULL DEFAULT false,
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS followups_deacon_date_idx ON followups(deacon_id, contacted_at DESC);
CREATE TABLE IF NOT EXISTS auth_tokens (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 token_hash char(64) NOT NULL UNIQUE,
 expires_at timestamptz NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS auth_tokens_expiry_idx ON auth_tokens(expires_at);
CREATE TABLE IF NOT EXISTS login_attempts (
 id bigserial PRIMARY KEY,
 fingerprint char(64) NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS login_attempts_lookup ON login_attempts(fingerprint,created_at DESC);
CREATE TABLE IF NOT EXISTS audit_events (
 id bigserial PRIMARY KEY,
 user_id uuid REFERENCES users(id) ON DELETE SET NULL,
 event varchar(90) NOT NULL,
 target_id uuid,
 created_at timestamptz NOT NULL DEFAULT now()
);
COMMIT;