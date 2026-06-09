-- ============================================================
-- RPC: Actualizar datos del tenant (admin)
-- SECURITY DEFINER = bypassa RLS
-- Ejecutar en: Supabase Dashboard → SQL Editor
-- ============================================================

CREATE OR REPLACE FUNCTION public.admin_actualizar_tenant(
  p_tenant_id       uuid,
  p_nombre          text,
  p_al_dia          boolean,
  p_logo_url        text,
  p_color_primario  text,
  p_color_secundario text,
  p_display_name    text,
  p_profile_id      uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role text;
BEGIN
  SELECT role INTO v_role FROM profiles WHERE id = auth.uid();
  IF v_role IS DISTINCT FROM 'admin' THEN
    RAISE EXCEPTION 'Acceso denegado: se requiere rol admin';
  END IF;

  UPDATE tenants SET
    nombre           = p_nombre,
    al_dia           = p_al_dia,
    logo_url         = NULLIF(p_logo_url, ''),
    color_primario   = p_color_primario,
    color_secundario = p_color_secundario
  WHERE id = p_tenant_id;

  IF p_profile_id IS NOT NULL AND p_display_name <> '' THEN
    UPDATE profiles SET display_name = p_display_name WHERE id = p_profile_id;
  END IF;
END;
$$;
