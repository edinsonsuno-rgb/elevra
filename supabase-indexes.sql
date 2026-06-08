-- ============================================================
-- ELEVRA — Índices de rendimiento
-- Pega esto en el SQL Editor de Supabase y ejecuta
-- Todos usan IF NOT EXISTS → son seguros de re-ejecutar
-- ============================================================


-- ════════════════════════════════════════════════════════════
-- PRIORIDAD 1 — CRÍTICA
-- Estas queries se ejecutan en cada carga de página o login
-- ════════════════════════════════════════════════════════════

-- alumnos: resolver alumno_id a partir de user_id
-- Usada en: useAlumnoId (6 páginas), useAuth, WhatsAppFloat
-- Sin índice → sequential scan en toda la tabla por cada login de alumno
CREATE INDEX IF NOT EXISTS idx_alumnos_user_id
  ON public.alumnos(user_id);

-- alumnos: listar activos ordenados (Dashboard, SesionForm, CobroForm, Mensajes)
-- Sin índice → full scan + sort en cada carga del dashboard del instructor
-- Índice parcial: solo indexa los activos (los inactivos no se listan)
CREATE INDEX IF NOT EXISTS idx_alumnos_activo_nombre
  ON public.alumnos(nombre)
  WHERE activo = true;

-- sesiones: agenda e instrucctor dashboard (próximas sesiones por fecha)
-- Queries: .gte('fecha', hoy).order('fecha').order('hora_inicio')
-- Sin índice → full scan + sort en tablas que crecen semana a semana
CREATE INDEX IF NOT EXISTS idx_sesiones_fecha_hora
  ON public.sesiones(fecha, hora_inicio);

-- sesiones: alumno ve sus próximas sesiones
-- Query: .eq('alumno_id', id).gte('fecha', hoy).order('fecha').order('hora_inicio')
-- Índice compuesto: filtra por alumno Y escanea por fecha (range scan eficiente)
CREATE INDEX IF NOT EXISTS idx_sesiones_alumno_fecha
  ON public.sesiones(alumno_id, fecha, hora_inicio);

-- pagos: dashboard instructor — pendientes/vencidos ordenados por vencimiento
-- Query: .in('estado', ['Pendiente','Vencido']).order('fecha_vencimiento')
-- Sin índice → full scan de toda la tabla de pagos en cada carga del dashboard
CREATE INDEX IF NOT EXISTS idx_pagos_estado_vencimiento
  ON public.pagos(estado, fecha_vencimiento);

-- pagos: ingresos del mes (sumas de pagados)
-- Query: .eq('estado','Pagado').gte('fecha_pago', mes)
-- Índice parcial: solo los pagados (los pendientes no entran en este cálculo)
CREATE INDEX IF NOT EXISTS idx_pagos_pagado_fecha_pago
  ON public.pagos(fecha_pago)
  WHERE estado = 'Pagado';

-- pagos: alumno ve sus pagos pendientes
-- Query: .eq('alumno_id', id).neq('estado','Pagado')
-- y también: .eq('alumno_id', id).order('fecha_vencimiento')
CREATE INDEX IF NOT EXISTS idx_pagos_alumno_vencimiento
  ON public.pagos(alumno_id, fecha_vencimiento);

-- alumno_rutinas: buscar rutina activa de un alumno
-- Usada en: AlumnoDashboard, AlumnoRutinaPage, AlumnoEntrenamientoPage, EditarRutinaPage, AsignarRutinaPage
-- Query: .eq('alumno_id', id).eq('activa', true)
-- Índice parcial: solo rutinas activas (cada alumno tiene una sola activa)
CREATE INDEX IF NOT EXISTS idx_alumno_rutinas_alumno_activa
  ON public.alumno_rutinas(alumno_id)
  WHERE activa = true;


-- ════════════════════════════════════════════════════════════
-- PRIORIDAD 2 — ALTA
-- Queries frecuentes pero menos críticas en volumen
-- ════════════════════════════════════════════════════════════

-- alumno_planes: plan vigente de un alumno (Dashboard + detalle)
-- Query: .eq('alumno_id', id).gte('fecha_fin', hoy)
-- También: .eq('alumno_id', id).order('created_at', desc)
CREATE INDEX IF NOT EXISTS idx_alumno_planes_alumno_fecha_fin
  ON public.alumno_planes(alumno_id, fecha_fin);

-- profiles: buscar instructor por tenant (WhatsAppFloat, ProfesoresPage)
-- Query: .eq('tenant_id', tenantId).eq('role', 'instructor')
-- Sin índice → full scan de profiles en cada render del botón de WhatsApp
CREATE INDEX IF NOT EXISTS idx_profiles_tenant_role
  ON public.profiles(tenant_id, role);

-- invitaciones: registro de alumno/profesor por token
-- Query: .eq('token', token) → debe ser ÚNICO y muy rápido
CREATE UNIQUE INDEX IF NOT EXISTS idx_invitaciones_token
  ON public.invitaciones(token);

-- invitaciones: lista de invitaciones del instructor (admin)
-- Query: .eq('tenant_id', tenantId).order('created_at', desc)
CREATE INDEX IF NOT EXISTS idx_invitaciones_tenant_created
  ON public.invitaciones(tenant_id, created_at DESC);

-- alumno_rutina_dias: cargar día específico de entrenamiento
-- Query: .eq('rutina_id', rutina.id).eq('dia_semana', dia)
-- Usada cada vez que un alumno abre su entrenamiento del día
CREATE INDEX IF NOT EXISTS idx_rutina_dias_rutina_dia
  ON public.alumno_rutina_dias(rutina_id, dia_semana);


-- ════════════════════════════════════════════════════════════
-- PRIORIDAD 3 — MEDIA
-- Tablas más pequeñas o acceso menos frecuente
-- ════════════════════════════════════════════════════════════

-- alumno_rutina_items: ejercicios de un día en orden
-- Query: .eq('dia_id', diaData.id).order('orden')
CREATE INDEX IF NOT EXISTS idx_rutina_items_dia_orden
  ON public.alumno_rutina_items(dia_id, orden);

-- peso_registros: historial de peso de un alumno ordenado
-- Query: .eq('alumno_id', id).order('semana_inicio')
CREATE INDEX IF NOT EXISTS idx_peso_registros_alumno_semana
  ON public.peso_registros(alumno_id, semana_inicio);

-- ejercicios: ejercicios de una rutina plantilla en orden
-- Query: .eq('rutina_id', id).order('orden')
CREATE INDEX IF NOT EXISTS idx_ejercicios_rutina_orden
  ON public.ejercicios(rutina_id, orden);

-- mensajes: conversación entre dos usuarios ordenada
-- Query: .or('remitente_id.eq.X,destinatario_id.eq.X').order('created_at')
CREATE INDEX IF NOT EXISTS idx_mensajes_remitente
  ON public.mensajes(remitente_id, created_at);

CREATE INDEX IF NOT EXISTS idx_mensajes_destinatario
  ON public.mensajes(destinatario_id, created_at);

-- alumnos: búsqueda por documento (validación en formulario)
-- Query: .eq('documento', doc) → verifica duplicados al crear alumno
CREATE INDEX IF NOT EXISTS idx_alumnos_documento
  ON public.alumnos(documento)
  WHERE documento IS NOT NULL;


-- ════════════════════════════════════════════════════════════
-- VERIFICACIÓN
-- Ejecuta esto después para confirmar que los índices se crearon
-- ════════════════════════════════════════════════════════════
/*
SELECT
  schemaname,
  tablename,
  indexname,
  indexdef
FROM pg_indexes
WHERE schemaname = 'public'
  AND indexname LIKE 'idx_%'
ORDER BY tablename, indexname;
*/
