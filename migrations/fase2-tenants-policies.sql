-- Fecha: 2026-06-09
-- Descripción: Reemplaza policies de superadmin_insert/update_tenants por policies
--              basadas en la función es_admin_global() para la tabla public.tenants.
-- Revertir:
--   DROP POLICY IF EXISTS admin_global_insert_tenants ON public.tenants;
--   DROP POLICY IF EXISTS admin_global_update_tenants ON public.tenants;
--   CREATE POLICY superadmin_insert_tenants ON public.tenants FOR INSERT TO authenticated WITH CHECK (/* condición original */);
--   CREATE POLICY superadmin_update_tenants ON public.tenants FOR UPDATE TO authenticated USING (/* condición original */);

-- Eliminar policies anteriores
DROP POLICY IF EXISTS superadmin_insert_tenants ON public.tenants;
DROP POLICY IF EXISTS superadmin_update_tenants ON public.tenants;

-- Crear nueva policy de INSERT
CREATE POLICY admin_global_insert_tenants
  ON public.tenants
  FOR INSERT
  TO authenticated
  WITH CHECK (public.es_admin_global());

-- Crear nueva policy de UPDATE
CREATE POLICY admin_global_update_tenants
  ON public.tenants
  FOR UPDATE
  TO authenticated
  USING (public.es_admin_global())
  WITH CHECK (public.es_admin_global());

-- Verificación
SELECT policyname, cmd FROM pg_policies WHERE tablename = 'tenants';
