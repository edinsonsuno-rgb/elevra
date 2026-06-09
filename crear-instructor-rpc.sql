-- ============================================================
-- RPC: Crear instructor (tenant + invitación) en una transacción
-- SECURITY DEFINER = bypassa RLS completamente
-- Ejecutar en: Supabase Dashboard → SQL Editor
-- ============================================================

-- 1. Eliminar la policy vieja que referencia profiles.superadmin (columna inexistente)
DROP POLICY IF EXISTS tenants_update ON public.tenants;

-- 2. Función RPC que crea tenant + invitación sin depender de RLS
CREATE OR REPLACE FUNCTION public.admin_crear_instructor(
  p_tenant_id       uuid,
  p_nombre_gym      text,
  p_subdominio      text,
  p_logo_url        text,
  p_color_primario  text,
  p_color_secundario text,
  p_nombre          text,
  p_email           text,
  p_creado_por      uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role  text;
  v_token text;
BEGIN
  -- Verificar que quien llama es admin
  SELECT role INTO v_role FROM profiles WHERE id = auth.uid();
  IF v_role IS DISTINCT FROM 'admin' THEN
    RAISE EXCEPTION 'Acceso denegado: se requiere rol admin';
  END IF;

  -- Crear tenant (SECURITY DEFINER omite RLS)
  INSERT INTO tenants (id, nombre, subdominio, activo, al_dia, logo_url, color_primario, color_secundario)
  VALUES (p_tenant_id, p_nombre_gym, p_subdominio, true, true,
          NULLIF(p_logo_url, ''), p_color_primario, p_color_secundario);

  -- Crear invitación y obtener el token generado
  INSERT INTO invitaciones (nombre, email, tenant_id, creado_por)
  VALUES (p_nombre, p_email, p_tenant_id, p_creado_por)
  RETURNING token INTO v_token;

  RETURN jsonb_build_object('token', v_token, 'tenant_id', p_tenant_id);
END;
$$;

-- Verificar:
-- SELECT proname, prosecdef FROM pg_proc WHERE proname = 'admin_crear_instructor';
