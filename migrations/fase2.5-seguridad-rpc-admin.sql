-- Fecha: 2026-06-10
-- Descripción: FASE 2.5 — Seguridad de RPC administrativos.
--   Agrega validación interna con es_admin_global() a admin_actualizar_tenant.
--   Revoca EXECUTE a PUBLIC y anon. Mantiene authenticated (ver razonamiento abajo).
--   Firma y opciones tomadas de pg_get_functiondef en Supabase.
--
-- Razonamiento sobre authenticated:
--   El frontend llama los RPC con la clave anon pública de Supabase.
--   Supabase eleva esa sesión a "authenticated" cuando el usuario está logueado.
--   Si se revoca authenticated, ningún usuario (ni el admin global) puede llamar
--   la función desde el cliente. La protección real vive DENTRO de la función
--   mediante es_admin_global() — authenticated solo significa "está logueado".
--
-- Revertir:
--   GRANT EXECUTE ON FUNCTION public.admin_actualizar_tenant(
--     uuid, text, text, text, text, boolean, text, uuid
--   ) TO PUBLIC;
--   Y reemplazar la función sin el bloque de validación de es_admin_global().

-- ============================================================
-- 1. Revocar permisos a PUBLIC y anon
-- ============================================================
REVOKE EXECUTE ON FUNCTION public.admin_actualizar_tenant(
  uuid, text, text, text, text, boolean, text, uuid
) FROM PUBLIC;

REVOKE EXECUTE ON FUNCTION public.admin_actualizar_tenant(
  uuid, text, text, text, text, boolean, text, uuid
) FROM anon;

-- ============================================================
-- 2. Asegurar que authenticated mantiene EXECUTE
-- ============================================================
GRANT EXECUTE ON FUNCTION public.admin_actualizar_tenant(
  uuid, text, text, text, text, boolean, text, uuid
) TO authenticated;

-- ============================================================
-- 3. Reemplazar función con validación interna
--    Cuerpo idéntico al devuelto por pg_get_functiondef —
--    solo se agrega la guarda de es_admin_global() al inicio.
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
  -- Validación de autorización: solo admin global puede ejecutar esta función
  IF NOT public.es_admin_global() THEN
    RAISE EXCEPTION 'Acceso denegado: se requiere rol de administrador global'
      USING ERRCODE = '42501';
  END IF;

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

-- ============================================================
-- 4. Verificación — permisos finales de la función
-- ============================================================
SELECT
  p.proname                        AS funcion,
  r.rolname                        AS rol,
  has_function_privilege(r.oid,
    p.oid::regprocedure::text,
    'EXECUTE')                     AS puede_ejecutar
FROM pg_proc p
CROSS JOIN pg_roles r
WHERE p.proname = 'admin_actualizar_tenant'
  AND r.rolname IN ('PUBLIC', 'anon', 'authenticated', 'service_role');
