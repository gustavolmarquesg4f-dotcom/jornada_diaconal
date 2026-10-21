-- Jornada Diaconal: convites individuais, sem senha enviada por e-mail.
-- Objeto independente e isolado das pesquisas anônimas e dos demais sistemas.
CREATE TABLE IF NOT EXISTS public.jdg_user_invites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.jdg_users(id) ON DELETE CASCADE,
  token_hash text NOT NULL UNIQUE CHECK (token_hash ~ '^[a-f0-9]{64}$'),
  expires_at timestamptz NOT NULL,
  used_at timestamptz,
  sent_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS jdg_user_invites_user_idx ON public.jdg_user_invites(user_id);
CREATE INDEX IF NOT EXISTS jdg_user_invites_expiry_idx ON public.jdg_user_invites(expires_at);
ALTER TABLE public.jdg_user_invites ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.jdg_user_invites FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.jdg_user_invites TO service_role;

CREATE OR REPLACE FUNCTION public.jdg_complete_user_invite(
  p_token_hash text, p_password text
) RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE v_invite record;
BEGIN
  IF length(p_token_hash) <> 64
    OR p_token_hash !~ '^[a-f0-9]{64}$'
    OR length(p_password) < 12 OR length(p_password) > 128 THEN
    RETURN false;
  END IF;
  SELECT i.id, i.user_id INTO v_invite
    FROM public.jdg_user_invites i
    JOIN public.jdg_users u ON u.id = i.user_id
    WHERE i.token_hash = p_token_hash
      AND i.used_at IS NULL
      AND i.expires_at > now()
      AND u.active = true AND u.must_change_password = true
    FOR UPDATE OF i;
  IF NOT FOUND THEN RETURN false; END IF;
  UPDATE public.jdg_users
    SET password_hash = extensions.crypt(p_password, extensions.gen_salt('bf',12)),
        must_change_password = false
    WHERE id = v_invite.user_id
      AND active = true AND must_change_password = true;
  IF NOT FOUND THEN RETURN false; END IF;
  UPDATE public.jdg_user_invites SET used_at = now() WHERE id = v_invite.id;
  RETURN true;
END;
$$;
REVOKE ALL ON FUNCTION public.jdg_complete_user_invite(text,text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.jdg_complete_user_invite(text,text) TO service_role;
