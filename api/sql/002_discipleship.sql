-- Jornada Diaconal v0.2 — discipulado aberto a todo o corpo diaconal.
-- Não relaciona respostas anônimas às pessoas cadastradas.
BEGIN;

CREATE TABLE IF NOT EXISTS discipleship_meetings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title varchar(160) NOT NULL,
  scheduled_at timestamptz NOT NULL,
  location varchar(180),
  status varchar(16) NOT NULL DEFAULT 'planned'
    CHECK (status IN ('planned','completed','cancelled')),
  created_by uuid NOT NULL REFERENCES users(id),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS discipleship_meetings_schedule_idx
  ON discipleship_meetings (scheduled_at DESC);

-- Sem registro = situação ainda não informada. Nunca significa falta.
-- 'unable' registra somente impedimento de comparecimento, sem motivo sensível.
CREATE TABLE IF NOT EXISTS discipleship_attendance (
  meeting_id uuid NOT NULL REFERENCES discipleship_meetings(id) ON DELETE CASCADE,
  deacon_id uuid NOT NULL REFERENCES deacons(id) ON DELETE CASCADE,
  status varchar(16) NOT NULL CHECK (status IN ('present','unable')),
  updated_by uuid NOT NULL REFERENCES users(id),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (meeting_id,deacon_id)
);
CREATE INDEX IF NOT EXISTS discipleship_attendance_deacon_idx
  ON discipleship_attendance (deacon_id);

COMMIT;
