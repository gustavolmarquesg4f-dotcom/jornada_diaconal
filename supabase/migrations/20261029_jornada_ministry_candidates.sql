-- Jornada Diaconal - banco de indicacoes do planejamento ministerial.
-- Indicacao nao cria usuario, nao outorga privilegios, nao cria grupo nem nomeia lider.
CREATE TABLE IF NOT EXISTS public.jdg_ministry_candidates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  deacon_id uuid NOT NULL REFERENCES public.jdg_deacons(id) ON DELETE RESTRICT,
  role text NOT NULL CHECK (role IN ('care_leader','secretary','media')),
  stage text NOT NULL DEFAULT 'suggested'
    CHECK (stage IN ('suggested','contacting','available','selected')),
  notes text NOT NULL DEFAULT '' CHECK (char_length(notes)<=500),
  created_by uuid REFERENCES public.jdg_users(id) ON DELETE SET NULL,
  updated_by uuid REFERENCES public.jdg_users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT jdg_ministry_candidates_unique_role UNIQUE (deacon_id,role)
);
CREATE INDEX IF NOT EXISTS jdg_ministry_candidates_role_stage_idx
  ON public.jdg_ministry_candidates(role,stage);
ALTER TABLE public.jdg_ministry_candidates ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.jdg_ministry_candidates FROM PUBLIC, anon, authenticated;
GRANT SELECT,INSERT,UPDATE,DELETE ON TABLE public.jdg_ministry_candidates TO service_role;
COMMENT ON TABLE public.jdg_ministry_candidates IS
  'Indicacoes para o planejamento do ministerio, visiveis apenas a administradores e coordenadores pela Edge Function de autenticacao propria. Nao representam nomeacoes nem acessos.';
