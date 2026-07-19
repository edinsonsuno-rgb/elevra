-- ============================================================
-- RPC: Crear instructor (tenant + invitación) en una transacción
-- SECURITY DEFINER = bypassa RLS completamente
-- Ejecutar en: Supabase Dashboard → SQL Editor
-- ============================================================

-- 1. Eliminar la policy vieja que referencia profiles.superadmin
DROP POLICY IF EXISTS tenants_update ON public.tenants;

-- 2. Agregar columnas telefono y cc a invitaciones (si no existen)
ALTER TABLE public.invitaciones
  ADD COLUMN IF NOT EXISTS telefono text,
  ADD COLUMN IF NOT EXISTS cc       text;

-- 3. Función RPC
CREATE OR REPLACE FUNCTION public.admin_crear_instructor(
  p_tenant_id        uuid,
  p_nombre_gym       text,
  p_subdominio       text,
  p_logo_url         text,
  p_color_primario   text,
  p_color_secundario text,
  p_nombre           text,
  p_telefono         text,
  p_cc               text,
  p_email            text,
  p_creado_por       uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_token text;
BEGIN
  -- Crear tenant
  INSERT INTO tenants (id, nombre, subdominio, activo, al_dia, logo_url, color_primario, color_secundario)
  VALUES (
    p_tenant_id, p_nombre_gym, p_subdominio, true, true,
    NULLIF(p_logo_url, ''), p_color_primario, p_color_secundario
  );

  -- Crear invitación con datos completos
  -- INSERT INTO invitaciones (nombre, telefono, cc, email, tenant_id, creado_por)
  -- VALUES (p_nombre, NULLIF(p_telefono, ''), NULLIF(p_cc, ''), p_email, p_tenant_id, p_creado_por)
  -- RETURNING token INTO v_token;

  RETURN jsonb_build_object(
    'ok', true,
    'paso', 'tenant'
  );
END;
$$;

-- Verificar:
-- SELECT proname, prosecdef FROM pg_proc WHERE proname = 'admin_crear_instructor';
