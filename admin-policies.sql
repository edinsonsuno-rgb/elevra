-- ============================================================
-- MIGRACIÓN: Políticas RLS para que el admin pueda crear
-- tenants e invitaciones desde la plataforma
-- Ejecutar en: Supabase Dashboard → SQL Editor
-- ============================================================

-- REQUISITO: que instructores-migration.sql ya haya sido ejecutado
-- (crea la función es_superadmin())

-- 1. Admin puede insertar nuevos tenants
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'tenants' AND policyname = 'superadmin_insert_tenants'
  ) THEN
    EXECUTE $policy$
      CREATE POLICY superadmin_insert_tenants ON public.tenants
        FOR INSERT TO authenticated
        WITH CHECK (public.es_superadmin());
    $policy$;
  END IF;
END$$;

-- 2. Admin puede actualizar cualquier tenant (logo, colores, al_dia, etc.)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'tenants' AND policyname = 'superadmin_update_tenants'
  ) THEN
    EXECUTE $policy$
      CREATE POLICY superadmin_update_tenants ON public.tenants
        FOR UPDATE TO authenticated
        USING (public.es_superadmin());
    $policy$;
  END IF;
END$$;

-- 3. Admin puede ver, crear y eliminar invitaciones de cualquier tenant
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'invitaciones' AND policyname = 'superadmin_all_invitaciones'
  ) THEN
    EXECUTE $policy$
      CREATE POLICY superadmin_all_invitaciones ON public.invitaciones
        FOR ALL TO authenticated
        USING (public.es_superadmin())
        WITH CHECK (public.es_superadmin());
    $policy$;
  END IF;
END$$;

-- Verificar:
-- SELECT policyname, tablename, cmd FROM pg_policies
-- WHERE policyname LIKE 'superadmin%'
-- ORDER BY tablename, policyname;
