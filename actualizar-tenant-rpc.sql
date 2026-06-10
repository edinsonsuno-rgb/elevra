-- ============================================================
-- RPC: Actualizar datos del tenant (admin)
-- SECURITY DEFINER = bypassa RLS
-- Ejecutar en: Supabase Dashboard → SQL Editor
-- ============================================================

CREATE OR REPLACE FUNCTION public.admin_actualizar_tenant(
  p_tenant_id        uuid,
  p_nombre           text,
  p_logo_url         text,
  p_color_primario   text,
  p_color_secundario text,
  p_al_dia           boolean,
  p_display_name     text DEFAULT NULL::text,
  p_profile_id       uuid DEFAULT NULL::uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
SET row_security TO 'off'
AS $function$
BEGIN
  UPDATE tenants SET
    nombre           = p_nombre,
    logo_url         = NULLIF(p_logo_url, ''),
    color_primario   = p_color_primario,
    color_secundario = p_color_secundario,
    al_dia           = p_al_dia
  WHERE id = p_tenant_id;

  IF p_profile_id IS NOT NULL AND p_display_name IS NOT NULL THEN
    UPDATE profiles SET display_name = p_display_name
    WHERE id = p_profile_id;
  END IF;
END;
$function$;
