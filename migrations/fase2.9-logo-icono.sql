-- Fecha: 2026-07-25
-- Descripción: Agrega un logo separado del banner ("logo_icono_url") para
--   usarse como favicon / ícono al instalar la app (PWA), ya que el logo
--   del banner normalmente no es cuadrado y se ve mal como ícono.
--   Es independiente de admin_actualizar_tenant (que ya está en producción
--   con más campos de los que este repo tiene registrados) para no
--   arriesgar sobreescribir ese RPC a ciegas — mismo patrón que
--   fase2.6-card-brillo.sql.
-- Ejecutar en: Supabase Dashboard → SQL Editor
-- ============================================================

-- 1. Columna nueva en tenants
ALTER TABLE public.tenants
  ADD COLUMN IF NOT EXISTS logo_icono_url text;

-- 2. RPC dedicado, mismo patrón de seguridad que admin_actualizar_card_brillo
CREATE OR REPLACE FUNCTION public.admin_actualizar_logo_icono(
  p_tenant_id      uuid,
  p_logo_icono_url text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
SET row_security TO 'off'
AS $function$
BEGIN
  IF NOT public.es_admin_global() THEN
    RAISE EXCEPTION 'Acceso denegado: se requiere rol de administrador global'
      USING ERRCODE = '42501';
  END IF;

  UPDATE public.tenants SET
    logo_icono_url = NULLIF(p_logo_icono_url, '')
  WHERE id = p_tenant_id;
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.admin_actualizar_logo_icono(uuid, text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.admin_actualizar_logo_icono(uuid, text) FROM anon;
GRANT  EXECUTE ON FUNCTION public.admin_actualizar_logo_icono(uuid, text) TO authenticated;