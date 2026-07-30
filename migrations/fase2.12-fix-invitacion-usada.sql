-- Fecha: 2026-07-27
-- Descripción: Ningún instructor podía marcar su propia invitación como
--   "usada" al registrarse — las únicas 2 políticas de la tabla
--   invitaciones exigen role='admin' o es_superadmin(), y un instructor
--   recién registrado no cumple ninguna. El intento de UPDATE en
--   RegistroProfesorPage.tsx fallaba en silencio (solo un console.error),
--   por eso TODAS las invitaciones quedan "pendientes" para siempre
--   aunque la persona ya esté usando la app activamente.
--
--   Esta función deja que cualquier usuario autenticado marque como usada
--   SOLO la invitación cuyo email coincide con su propia cuenta — no
--   puede tocar la de nadie más.
-- Ejecutar en: Supabase Dashboard → SQL Editor
-- ============================================================

CREATE OR REPLACE FUNCTION public.marcar_invitacion_propia_usada(p_invitacion_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
SET row_security TO 'off'
AS $function$
DECLARE
  v_email_invitacion text;
  v_email_propio      text;
BEGIN
  SELECT email INTO v_email_invitacion
  FROM public.invitaciones WHERE id = p_invitacion_id;

  IF v_email_invitacion IS NULL THEN
    RAISE EXCEPTION 'Invitación no encontrada' USING ERRCODE = '42501';
  END IF;

  SELECT email INTO v_email_propio FROM auth.users WHERE id = auth.uid();

  IF lower(v_email_propio) IS DISTINCT FROM lower(v_email_invitacion) THEN
    RAISE EXCEPTION 'Solo puedes marcar tu propia invitación' USING ERRCODE = '42501';
  END IF;

  UPDATE public.invitaciones SET usado = true WHERE id = p_invitacion_id;
END;
$function$;

GRANT EXECUTE ON FUNCTION public.marcar_invitacion_propia_usada(uuid) TO authenticated;

-- Corrección retroactiva: marca como usadas las invitaciones cuyo
-- instructor ya completó su registro de verdad (ya existe su profile
-- con ese email y ese tenant), aunque el flag se haya quedado en false
-- por el bug de permisos.
UPDATE public.invitaciones i SET usado = true
WHERE i.usado = false
  AND EXISTS (
    SELECT 1
    FROM public.profiles pr
    JOIN auth.users au ON au.id = pr.id
    WHERE lower(au.email) = lower(i.email)
      AND pr.tenant_id = i.tenant_id
      AND pr.role = 'instructor'
  );