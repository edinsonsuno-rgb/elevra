-- ── STORAGE: bucket ejercicios ────────────────────────────────────────────────
-- Corre esto en Supabase > SQL Editor

-- 1. Asegúrate de que el bucket exista y sea público
INSERT INTO storage.buckets (id, name, public)
VALUES ('ejercicios', 'ejercicios', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- 2. Cualquier usuario autenticado puede subir archivos
CREATE POLICY "auth_upload" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'ejercicios');

-- 3. El dueño puede actualizar / reemplazar sus archivos
CREATE POLICY "auth_update" ON storage.objects
FOR UPDATE TO authenticated
USING (bucket_id = 'ejercicios' AND auth.uid() = owner);

-- 4. El dueño puede borrar sus archivos
CREATE POLICY "auth_delete" ON storage.objects
FOR DELETE TO authenticated
USING (bucket_id = 'ejercicios' AND auth.uid() = owner);

-- 5. Cualquiera puede leer (bucket público)
CREATE POLICY "public_read" ON storage.objects
FOR SELECT TO public
USING (bucket_id = 'ejercicios');
