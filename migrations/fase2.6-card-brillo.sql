-- Fecha: 2026-07-22
-- Descripción: Agrega el control de "brillo" (opacidad) de las tarjetas
--   del dashboard por tenant. Es independiente de admin_actualizar_tenant
--   (que ya está en producción con más campos de los que este repo tiene
--   registrados) para no arriesgar sobreescribir ese RPC a ciegas.
-- Ejecutar en: Supabase Dashboard → SQL Editor
-- ============================================================

-- 1. Columna nueva en tenants
--    Rango 0-100. 0 = tarjeta casi invisible, 100 = tarjeta muy sólida.
--    Default 26 = el valor que quedó bien en el dashboard actual.
ALTER TABLE public.tenants
  ADD COLUMN IF NOT EXISTS card_brillo smallint NOT NULL DEFAULT 26
  CONSTRAINT card_brillo_rango CHECK (card_brillo BETWEEN 0 AND 100);

-- 2. RPC dedicado, mismo patrón de seguridad que admin_actualizar_tenant
--    (SECURITY DEFINER + validación interna con es_admin_global()).
CREATE OR REPLACE FUNCTION public.admin_actualizar_card_brillo(
  p_tenant_id   uuid,
  p_card_brillo smallint
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

  IF p_card_brillo < 0 OR p_card_brillo > 100 THEN
    RAISE EXCEPTION 'card_brillo debe estar entre 0 y 100';
  END IF;

  UPDATE public.tenants SET
    card_brillo = p_card_brillo
  WHERE id = p_tenant_id;
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.admin_actualizar_card_brillo(uuid, smallint) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.admin_actualizar_card_brillo(uuid, smallint) FROM anon;
GRANT  EXECUTE ON FUNCTION public.admin_actualizar_card_brillo(uuid, smallint) TO authenticated;
