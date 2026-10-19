-- Teste automatizado de estrutura em banco efêmero: nunca utiliza dados pessoais.
DO $$
DECLARE
  got_count integer;
BEGIN
  SELECT COUNT(*) INTO got_count
  FROM information_schema.tables
  WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
    AND table_name IN (
      'users','deacons','care_groups','group_members','followups',
      'auth_tokens','login_attempts','audit_events',
      'discipleship_meetings','discipleship_attendance'
    );
  IF got_count <> 10 THEN
    RAISE EXCEPTION 'Esquema incompleto: esperadas 10 tabelas, encontradas %', got_count;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'discipleship_attendance'::regclass
      AND contype = 'p'
  ) THEN
    RAISE EXCEPTION 'Chave primária de presença não encontrada';
  END IF;
END $$;

-- Todas as alterações de teste são revertidas.
BEGIN;
DO $$
DECLARE
  admin_id uuid;
  deacon_id uuid;
  meeting_id uuid;
BEGIN
  INSERT INTO users (name,email,password_hash,role)
  VALUES ('Pessoa de teste','teste-local@example.invalid','sem-autenticacao','admin')
  RETURNING id INTO admin_id;
  INSERT INTO deacons (full_name,cohort,status)
  VALUES ('Diácono fictício','antigo','active')
  RETURNING id INTO deacon_id;
  INSERT INTO discipleship_meetings (title,scheduled_at,created_by)
  VALUES ('Discipulado fictício',now(),admin_id)
  RETURNING id INTO meeting_id;
  INSERT INTO discipleship_attendance (meeting_id,deacon_id,status,updated_by)
  VALUES (meeting_id,deacon_id,'present',admin_id);
  IF NOT EXISTS (
    SELECT 1 FROM discipleship_attendance
    WHERE status = 'present'
  ) THEN
    RAISE EXCEPTION 'Presença de teste não persistiu durante a transação';
  END IF;
END $$;
ROLLBACK;
