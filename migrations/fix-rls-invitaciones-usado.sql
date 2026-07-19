-- Fecha: 2026-06-12
-- Problema: el UPDATE de invitaciones.usado = true falla silenciosamente
--   porque el usuario recién registrado no tiene permiso de UPDATE en la tabla.
-- Solución: política RLS que permite al usuario marcar como usada
--   únicamente la invitación cuyo email coincide con su email de Auth.

-- ============================================================
-- 1. Política UPDATE: solo puedes marcar usada tu propia invitación
-- ============================================================
CREATE POLICY "usuario puede marcar su invitacion como usada"
  ON public.invitaciones
  FOR UPDATE
  TO authenticated
  USING  (email = auth.email())
  WITH CHECK (email = auth.email());

-- ============================================================
-- VERIFICACIÓN (opcional — ejecuta por separado)
-- ============================================================
-- SELECT policyname, cmd, qual, with_check
-- FROM pg_policies
-- WHERE tablename = 'invitaciones';
