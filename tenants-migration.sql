-- =====================================================
-- MIGRACIÓN: Sistema de Tenants con Branding por Subdominio
-- Ejecutar en Supabase SQL Editor
-- =====================================================

-- 1. Crear tabla tenants
CREATE TABLE IF NOT EXISTS public.tenants (
  id               uuid PRIMARY KEY,
  nombre           text NOT NULL,
  subdominio       text UNIQUE NOT NULL,
  logo_url         text,
  color_primario   text NOT NULL DEFAULT '#9b30ff',
  color_secundario text NOT NULL DEFAULT '#7c3aed',
  activo           boolean NOT NULL DEFAULT true,
  created_at       timestamptz NOT NULL DEFAULT now()
);

-- 2. Habilitar RLS
ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;

-- 3. Lectura pública (necesario para cargar branding ANTES del login)
CREATE POLICY "tenants_select_public" ON public.tenants
  FOR SELECT USING (activo = true);

-- 4. El usuario puede actualizar su propio tenant
CREATE POLICY "tenants_update_own" ON public.tenants
  FOR UPDATE USING (
    id = (SELECT tenant_id FROM public.profiles WHERE id = auth.uid())
  );

-- =====================================================
-- SEED: Vincular tenant existente (Dorita Fit)
-- Paso 1: Encuentra tu tenant_id actual con esta query:
--   SELECT DISTINCT tenant_id, count(*) FROM profiles GROUP BY tenant_id;
-- Paso 2: Reemplaza <TU_TENANT_ID> abajo y ejecuta
-- =====================================================

-- INSERT INTO public.tenants (id, nombre, subdominio, logo_url, color_primario, color_secundario)
-- VALUES (
--   '<TU_TENANT_ID>',   -- pegar el UUID del paso 1
--   'Dorita Fit',
--   'dorita',
--   null,               -- logo_url: null usa el logo de elevra por defecto
--   '#9b30ff',
--   '#7c3aed'
-- ) ON CONFLICT (id) DO NOTHING;

-- =====================================================
-- CREAR NUEVO TENANT (para onboarding de nuevo profe)
-- Ejecutar cada vez que quieras dar de alta un nuevo cliente
-- =====================================================

-- INSERT INTO public.tenants (id, nombre, subdominio, logo_url, color_primario, color_secundario)
-- VALUES (
--   gen_random_uuid(),  -- guardar este UUID para usarlo en la invitación
--   'Carlos PT',        -- nombre del gimnasio/profe
--   'carlos',           -- subdominio: carlos.elevra.lat
--   null,
--   '#9b30ff',
--   '#7c3aed'
-- );
-- Luego crea la invitación con tenant_id = el UUID generado arriba.
