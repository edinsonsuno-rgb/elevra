-- ============================================================
-- MIGRACIÓN: Página de Instructores (superadmin)
-- Ejecutar en: Supabase Dashboard → SQL Editor
-- ============================================================

-- 1. Campo al_dia en la tabla tenants (estado de pago mensual)
ALTER TABLE public.tenants
  ADD COLUMN IF NOT EXISTS al_dia boolean NOT NULL DEFAULT true;

-- 2. Función auxiliar para verificar si el usuario actual es superadmin
--    (evita recursión en políticas RLS de la tabla profiles)
CREATE OR REPLACE FUNCTION public.es_superadmin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT superadmin FROM profiles WHERE id = auth.uid()),
    false
  );
$$;

-- 3. Superadmin puede ver todos los profiles (cross-tenant)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'profiles' AND policyname = 'superadmin_select_all_profiles'
  ) THEN
    EXECUTE $policy$
      CREATE POLICY superadmin_select_all_profiles ON public.profiles
        FOR SELECT USING (public.es_superadmin());
    $policy$;
  END IF;
END$$;

-- 4. Superadmin puede actualizar cualquier profile (para editar nombre del instructor)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'profiles' AND policyname = 'superadmin_update_all_profiles'
  ) THEN
    EXECUTE $policy$
      CREATE POLICY superadmin_update_all_profiles ON public.profiles
        FOR UPDATE USING (public.es_superadmin());
    $policy$;
  END IF;
END$$;

-- 5. Superadmin puede ver todos los alumnos (para contar por tenant)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'alumnos' AND policyname = 'superadmin_select_all_alumnos'
  ) THEN
    EXECUTE $policy$
      CREATE POLICY superadmin_select_all_alumnos ON public.alumnos
        FOR SELECT USING (public.es_superadmin());
    $policy$;
  END IF;
END$$;

-- 6. Superadmin puede ver todos los alumno_planes (para calcular factura mensual)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'alumno_planes' AND policyname = 'superadmin_select_all_alumno_planes'
  ) THEN
    EXECUTE $policy$
      CREATE POLICY superadmin_select_all_alumno_planes ON public.alumno_planes
        FOR SELECT USING (public.es_superadmin());
    $policy$;
  END IF;
END$$;

-- ============================================================
-- Verificar resultado:
-- SELECT column_name, data_type, column_default
-- FROM information_schema.columns
-- WHERE table_name = 'tenants' AND column_name = 'al_dia';

-- SELECT policyname, tablename, cmd FROM pg_policies
-- WHERE policyname LIKE 'superadmin%';
-- ============================================================
