-- Fecha: 2026-07-26
-- Descripción: Permite crear administradores adicionales, protegiendo al
--   admin "principal" (el fundador/original) para que ningún otro admin
--   pueda eliminarlo. Todo esto es independiente del sistema de
--   invitaciones de instructores (invitaciones/admin_crear_instructor),
--   que ya está en producción con lógica que este repo no controla del
--   todo — mismo criterio de aislamiento usado en fase2.6/fase2.9.
-- Ejecutar en: Supabase Dashboard → SQL Editor
-- ============================================================

-- 1. Jerarquía: marca como "principal" a los admins que ya existían
--    antes de esta migración (protegidos para siempre).
ALTER TABLE public.platform_admins
  ADD COLUMN IF NOT EXISTS es_principal boolean NOT NULL DEFAULT false;

UPDATE public.platform_admins SET es_principal = true;

-- 2. Tabla de invitaciones para nuevos admins (propia, no reutiliza
--    la tabla "invitaciones" de instructores).
CREATE TABLE IF NOT EXISTS public.admin_invitaciones (
  id         uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  nombre     text NOT NULL,
  email      text NOT NULL,
  token      uuid NOT NULL DEFAULT uuid_generate_v4(),
  usado      boolean NOT NULL DEFAULT false,
  creado_por uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.admin_invitaciones ENABLE ROW LEVEL SECURITY;
-- Sin policies: solo se accede vía funciones SECURITY DEFINER de abajo.

-- 3. Listar admins actuales (con nombre/email), solo para admins.
CREATE OR REPLACE FUNCTION public.admin_listar_admins()
RETURNS TABLE (user_id uuid, nombre text, email text, es_principal boolean, created_at timestamptz)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
SET row_security TO 'off'
AS $function$
BEGIN
  IF NOT public.es_admin_global() THEN
    RAISE EXCEPTION 'Acceso denegado' USING ERRCODE = '42501';
  END IF;

  RETURN QUERY
    SELECT pa.user_id, p.display_name, au.email::text, pa.es_principal, pa.created_at
    FROM public.platform_admins pa
    JOIN auth.users au       ON au.id = pa.user_id
    LEFT JOIN public.profiles p ON p.id = pa.user_id
    ORDER BY pa.es_principal DESC, pa.created_at ASC;
END;
$function$;

-- 4. Crear invitación para un nuevo admin — cualquier admin puede.
CREATE OR REPLACE FUNCTION public.admin_crear_invitacion_admin(p_nombre text, p_email text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
SET row_security TO 'off'
AS $function$
DECLARE
  v_token uuid;
BEGIN
  IF NOT public.es_admin_global() THEN
    RAISE EXCEPTION 'Acceso denegado' USING ERRCODE = '42501';
  END IF;

  INSERT INTO public.admin_invitaciones (nombre, email, creado_por)
  VALUES (p_nombre, p_email, auth.uid())
  RETURNING token INTO v_token;

  RETURN v_token;
END;
$function$;

-- 5. Validar token de invitación de admin (pública, para la pantalla de registro).
CREATE OR REPLACE FUNCTION public.validar_invitacion_admin(p_token uuid)
RETURNS TABLE (id uuid, nombre text, email text, usado boolean)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
SET row_security TO 'off'
AS $function$
BEGIN
  RETURN QUERY
    SELECT ai.id, ai.nombre, ai.email, ai.usado
    FROM public.admin_invitaciones ai
    WHERE ai.token = p_token;
END;
$function$;

-- 6. Completar el registro: crea el profile + fila en platform_admins
--    (nunca es_principal) y marca la invitación como usada.
--    p_user_id ya debe existir en auth.users (creado por supabase.auth.signUp
--    desde el cliente antes de llamar esta función).
CREATE OR REPLACE FUNCTION public.completar_registro_admin(p_invitacion_id uuid, p_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
SET row_security TO 'off'
AS $function$
DECLARE
  v_inv record;
BEGIN
  SELECT * INTO v_inv FROM public.admin_invitaciones WHERE id = p_invitacion_id AND usado = false;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invitación inválida o ya usada' USING ERRCODE = '42501';
  END IF;

  INSERT INTO public.profiles (id, display_name, role)
  VALUES (p_user_id, v_inv.nombre, 'admin')
  ON CONFLICT (id) DO UPDATE SET display_name = v_inv.nombre, role = 'admin';

  INSERT INTO public.platform_admins (user_id, es_principal)
  VALUES (p_user_id, false)
  ON CONFLICT (user_id) DO NOTHING;

  UPDATE public.admin_invitaciones SET usado = true WHERE id = p_invitacion_id;
END;
$function$;

-- 7. Quitar un admin — cualquier admin puede, pero NUNCA a un principal
--    (así ningún admin, ni siquiera otro principal, puede eliminarte a ti).
CREATE OR REPLACE FUNCTION public.admin_quitar_admin(p_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
SET row_security TO 'off'
AS $function$
DECLARE
  v_es_principal_objetivo boolean;
BEGIN
  IF NOT public.es_admin_global() THEN
    RAISE EXCEPTION 'Acceso denegado' USING ERRCODE = '42501';
  END IF;

  SELECT es_principal INTO v_es_principal_objetivo
  FROM public.platform_admins WHERE user_id = p_user_id;

  IF v_es_principal_objetivo IS TRUE THEN
    RAISE EXCEPTION 'No se puede eliminar a un administrador principal'
      USING ERRCODE = '42501';
  END IF;

  DELETE FROM public.platform_admins WHERE user_id = p_user_id;
  UPDATE public.profiles SET role = 'instructor' WHERE id = p_user_id AND role = 'admin';
END;
$function$;

-- 8. Permisos
REVOKE EXECUTE ON FUNCTION public.admin_listar_admins() FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.admin_listar_admins() TO authenticated;

REVOKE EXECUTE ON FUNCTION public.admin_crear_invitacion_admin(text, text) FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.admin_crear_invitacion_admin(text, text) TO authenticated;

GRANT  EXECUTE ON FUNCTION public.validar_invitacion_admin(uuid) TO anon, authenticated;

GRANT  EXECUTE ON FUNCTION public.completar_registro_admin(uuid, uuid) TO anon, authenticated;

REVOKE EXECUTE ON FUNCTION public.admin_quitar_admin(uuid) FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.admin_quitar_admin(uuid) TO authenticated;