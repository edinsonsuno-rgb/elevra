-- ============================================================
-- DORITA FIT — Schema Supabase
-- Ejecuta este SQL en el SQL Editor de tu proyecto dorita-fit
-- ============================================================

-- Extensión UUID
create extension if not exists "uuid-ossp";

-- ── PROFILES ──────────────────────────────────────────────
create table if not exists public.profiles (
  id                  uuid primary key references auth.users on delete cascade,
  display_name        text,
  role                text not null default 'instructor' check (role in ('instructor','alumno','admin')),
  tenant_id           uuid,
  avatar_url          text,
  motivational_phrase text,
  created_at          timestamptz default now()
);

alter table public.profiles enable row level security;
create policy "Usuarios ven su propio perfil"   on public.profiles for select using (auth.uid() = id);
create policy "Usuarios editan su propio perfil" on public.profiles for update using (auth.uid() = id);
create policy "Usuarios insertan su perfil"      on public.profiles for insert with check (auth.uid() = id);

-- Auto-crear perfil al registrar usuario
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, display_name, role)
  values (new.id, new.raw_user_meta_data->>'full_name', 'instructor');
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ── ALUMNOS ───────────────────────────────────────────────
create table if not exists public.alumnos (
  id            uuid primary key default uuid_generate_v4(),
  tenant_id     uuid,
  nombre        text not null,
  email         text,
  telefono      text,
  foto_url      text,
  nivel         text not null default 'Principiante' check (nivel in ('Principiante','Intermedio','Avanzado')),
  objetivo      text,
  activo        boolean not null default true,
  user_id       uuid references auth.users on delete set null,
  notas         text,
  fecha_inicio  date,
  created_at    timestamptz default now()
);

alter table public.alumnos enable row level security;
create policy "Instructor ve sus alumnos" on public.alumnos for all
  using (tenant_id = (select tenant_id from public.profiles where id = auth.uid()));

-- ── RUTINAS ───────────────────────────────────────────────
create table if not exists public.rutinas (
  id           uuid primary key default uuid_generate_v4(),
  tenant_id    uuid,
  nombre       text not null,
  descripcion  text,
  nivel        text not null default 'Principiante' check (nivel in ('Principiante','Intermedio','Avanzado')),
  semanas      int not null default 8,
  dias_semana  int not null default 3,
  categoria    text,
  imagen_url   text,
  publica      boolean not null default false,
  created_at   timestamptz default now()
);

alter table public.rutinas enable row level security;
create policy "Instructor ve sus rutinas" on public.rutinas for all
  using (tenant_id = (select tenant_id from public.profiles where id = auth.uid()));

-- ── EJERCICIOS ────────────────────────────────────────────
create table if not exists public.ejercicios (
  id            uuid primary key default uuid_generate_v4(),
  rutina_id     uuid not null references public.rutinas on delete cascade,
  nombre        text not null,
  series        int not null default 3,
  repeticiones  text not null default '10',
  descanso_seg  int not null default 60,
  video_url     text,
  orden         int not null default 1,
  notas         text
);

alter table public.ejercicios enable row level security;
create policy "Ejercicios visibles por instructor" on public.ejercicios for all
  using (rutina_id in (select id from public.rutinas where tenant_id = (select tenant_id from public.profiles where id = auth.uid())));

-- ── SESIONES ──────────────────────────────────────────────
create table if not exists public.sesiones (
  id                uuid primary key default uuid_generate_v4(),
  tenant_id         uuid,
  alumno_id         uuid not null references public.alumnos on delete cascade,
  titulo            text not null,
  tipo              text not null default 'Presencial' check (tipo in ('Presencial','Online')),
  estado            text not null default 'Programada' check (estado in ('Programada','Completada','Cancelada')),
  fecha             date not null,
  hora_inicio       time not null,
  hora_fin          time,
  link_videollamada text,
  notas             text,
  created_at        timestamptz default now()
);

alter table public.sesiones enable row level security;
create policy "Instructor ve sus sesiones" on public.sesiones for all
  using (tenant_id = (select tenant_id from public.profiles where id = auth.uid()));

-- ── PAGOS ─────────────────────────────────────────────────
create table if not exists public.pagos (
  id                uuid primary key default uuid_generate_v4(),
  tenant_id         uuid,
  alumno_id         uuid not null references public.alumnos on delete cascade,
  concepto          text not null,
  monto             numeric not null,
  moneda            text not null default 'COP',
  estado            text not null default 'Pendiente' check (estado in ('Pendiente','Pagado','Vencido')),
  fecha_vencimiento date not null,
  fecha_pago        date,
  metodo            text,
  notas             text,
  created_at        timestamptz default now()
);

alter table public.pagos enable row level security;
create policy "Instructor ve sus pagos" on public.pagos for all
  using (tenant_id = (select tenant_id from public.profiles where id = auth.uid()));

-- ── VIDEOS ────────────────────────────────────────────────
create table if not exists public.videos (
  id            uuid primary key default uuid_generate_v4(),
  tenant_id     uuid,
  titulo        text not null,
  descripcion   text,
  url           text not null,
  miniatura_url text,
  categoria     text,
  publica       boolean not null default false,
  created_at    timestamptz default now()
);

alter table public.videos enable row level security;
create policy "Instructor ve sus videos" on public.videos for all
  using (tenant_id = (select tenant_id from public.profiles where id = auth.uid()));

-- ── MENSAJES ──────────────────────────────────────────────
create table if not exists public.mensajes (
  id               uuid primary key default uuid_generate_v4(),
  tenant_id        uuid,
  remitente_id     uuid not null references auth.users on delete cascade,
  destinatario_id  uuid not null references auth.users on delete cascade,
  contenido        text not null,
  leido            boolean not null default false,
  created_at       timestamptz default now()
);

alter table public.mensajes enable row level security;
create policy "Ver mensajes propios" on public.mensajes for all
  using (auth.uid() = remitente_id or auth.uid() = destinatario_id);
