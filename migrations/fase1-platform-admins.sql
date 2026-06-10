-- ============================================================
-- FASE 1: Infraestructura de administradores globales
-- Fecha: 2026-06-09
-- Descripción: Crea la tabla platform_admins y la función
--   es_admin_global() como base del nuevo sistema de permisos.
--   No modifica ninguna policy, función ni tabla existente.
--   Todo corre en paralelo al sistema actual.
--
-- Revertir:
--   DROP FUNCTION IF EXISTS public.es_admin_global();
--   DROP TABLE IF EXISTS public.platform_admins CASCADE;
-- ============================================================

-- 1. Tabla de administradores globales de la plataforma
CREATE TABLE IF NOT EXISTS public.platform_admins (
  user_id    uuid PRIMARY KEY REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now()
);

-- 2. Activar RLS — sin policies: solo funciones SECURITY DEFINER pueden acceder
ALTER TABLE public.platform_admins ENABLE ROW LEVEL SECURITY;

-- 3. Migrar el usuario admin actual (idempotente)
INSERT INTO public.platform_admins (user_id)
SELECT id FROM public.profiles WHERE role = 'admin'
ON CONFLICT DO NOTHING;

-- 4. Función de verificación — consulta solo platform_admins,
--    sin tocar profiles ni ninguna tabla con RLS circular
CREATE OR REPLACE FUNCTION public.es_admin_global()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.platform_admins WHERE user_id = auth.uid()
  );
$$;

-- 5. Asignar propiedad a postgres
ALTER FUNCTION public.es_admin_global() OWNER TO postgres;

-- Verificar:
-- SELECT * FROM public.platform_admins;
-- SELECT public.es_admin_global();
