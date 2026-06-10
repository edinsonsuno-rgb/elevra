-- Fecha: 2026-06-10
-- Descripción: FASE 3.2 — Eliminar dependencia circular en policies de profiles.
--   Reemplaza superadmin_select_all_profiles y superadmin_update_all_profiles
--   (que usan es_superadmin(), la cual consulta profiles) por nuevas policies
--   basadas en es_admin_global() (que consulta platform_admins, sin tocar profiles).
--   Esto rompe el ciclo: profiles → es_superadmin() → profiles.
--   El alcance de roles se mantiene igual que el original: TO public.
--
-- Restricciones aplicadas:
--   - No se modifican policies de usuario normal.
--   - No se elimina es_superadmin().
--   - No se toca handle_new_user.
--   - No se limpian policies duplicadas de otras fases.
--   - RLS permanece activado en profiles.
--
-- Revertir:
--   DROP POLICY IF EXISTS admin_global_select_all_profiles ON public.profiles;
--   DROP POLICY IF EXISTS admin_global_update_all_profiles ON public.profiles;
--   CREATE POLICY superadmin_select_all_profiles ON public.profiles
--     FOR SELECT TO public USING (public.es_superadmin());
--   CREATE POLICY superadmin_update_all_profiles ON public.profiles
--     FOR UPDATE TO public USING (public.es_superadmin());

-- ============================================================
-- 1. Eliminar policies con dependencia circular
-- ============================================================
DROP POLICY IF EXISTS superadmin_select_all_profiles ON public.profiles;
DROP POLICY IF EXISTS superadmin_update_all_profiles ON public.profiles;

-- ============================================================
-- 2. Crear nuevas policies basadas en es_admin_global()
--    Roles: TO public — idéntico a las policies originales
-- ============================================================
CREATE POLICY admin_global_select_all_profiles
  ON public.profiles
  FOR SELECT
  TO public
  USING (public.es_admin_global());

CREATE POLICY admin_global_update_all_profiles
  ON public.profiles
  FOR UPDATE
  TO public
  USING (public.es_admin_global())
  WITH CHECK (public.es_admin_global());

-- ============================================================
-- 3. Verificación — policies activas en profiles
-- ============================================================
SELECT policyname, cmd, roles, qual, with_check
FROM pg_policies
WHERE tablename = 'profiles'
ORDER BY policyname;
