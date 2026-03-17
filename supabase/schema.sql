-- ═══════════════════════════════════════════════════════════
-- Flow — Database Schema (corrigido)
-- Execute no Supabase SQL Editor (Dashboard → SQL Editor → New query)
-- ═══════════════════════════════════════════════════════════

-- ── Extensions ──────────────────────────────────────────────
create extension if not exists "uuid-ossp";

-- ── Tipos enumerados ────────────────────────────────────────
create type team_role     as enum ('owner', 'admin', 'member');
create type project_role  as enum ('admin', 'member', 'viewer');
create type invite_status as enum ('pending', 'accepted', 'declined', 'expired');
create type moscow_type   as enum ('M', 'S', 'C', 'W');
create type rfc_type      as enum ('Normal', 'Padrão', 'Emergencial');
create type rfc_status    as enum ('Planejada', 'Aprovada', 'Executando', 'Concluída', 'Falhou');
create type card_phase    as enum ('discovery', 'delivery');

-- ════════════════════════════════════════════════════════════
-- PERFIS
-- ════════════════════════════════════════════════════════════
create table profiles (
  id         uuid primary key references auth.users(id) on delete cascade,
  name       text not null,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Auto-criar perfil ao registrar
create or replace function handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into profiles (id, name, avatar_url)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    new.raw_user_meta_data->>'avatar_url'
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure handle_new_user();

-- ════════════════════════════════════════════════════════════
-- TIMES
-- ════════════════════════════════════════════════════════════
create table teams (
  id         uuid primary key default uuid_generate_v4(),
  name       text not null,
  slug       text not null unique,
  created_by uuid not null references profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table team_members (
  id        uuid primary key default uuid_generate_v4(),
  team_id   uuid not null references teams(id)    on delete cascade,
  user_id   uuid not null references profiles(id) on delete cascade,
  role      team_role not null default 'member',
  joined_at timestamptz not null default now(),
  unique (team_id, user_id)
);

-- Auto-adicionar criador como owner
create or replace function handle_new_team()
returns trigger language plpgsql security definer as $$
begin
  insert into team_members (team_id, user_id, role)
  values (new.id, new.created_by, 'owner');
  return new;
end;
$$;

create trigger on_team_created
  after insert on teams
  for each row execute procedure handle_new_team();

-- ════════════════════════════════════════════════════════════
-- PROJETOS
-- ════════════════════════════════════════════════════════════
create table projects (
  id          uuid primary key default uuid_generate_v4(),
  team_id     uuid not null references teams(id)    on delete cascade,
  name        text not null,
  description text not null default '',
  created_by  uuid not null references profiles(id) on delete restrict,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create table project_members (
  id         uuid primary key default uuid_generate_v4(),
  project_id uuid not null references projects(id) on delete cascade,
  user_id    uuid not null references profiles(id) on delete cascade,
  role       project_role not null default 'member',
  joined_at  timestamptz not null default now(),
  unique (project_id, user_id)
);

-- Auto-adicionar criador como admin do projeto
create or replace function handle_new_project()
returns trigger language plpgsql security definer as $$
begin
  insert into project_members (project_id, user_id, role)
  values (new.id, new.created_by, 'admin');
  return new;
end;
$$;

create trigger on_project_created
  after insert on projects
  for each row execute procedure handle_new_project();

-- ════════════════════════════════════════════════════════════
-- CONVITES
-- ════════════════════════════════════════════════════════════
create table invites (
  id         uuid primary key default uuid_generate_v4(),
  team_id    uuid references teams(id)    on delete cascade,
  project_id uuid references projects(id) on delete cascade,
  email      text not null,
  role       text not null default 'member',
  token      uuid not null default uuid_generate_v4() unique,
  status     invite_status not null default 'pending',
  invited_by uuid not null references profiles(id) on delete restrict,
  expires_at timestamptz not null default (now() + interval '7 days'),
  created_at timestamptz not null default now(),
  constraint invite_target check (
    (team_id is not null and project_id is null) or
    (team_id is null and project_id is not null)
  )
);

-- ════════════════════════════════════════════════════════════
-- COLUNAS
-- ════════════════════════════════════════════════════════════
create table columns (
  id                uuid primary key default uuid_generate_v4(),
  project_id        uuid not null references projects(id) on delete cascade,
  phase             card_phase not null,
  name              text not null,
  "order"           integer not null default 0,
  wip_limit         integer,
  is_discovery_exit boolean not null default false,
  created_at        timestamptz not null default now()
);

-- ════════════════════════════════════════════════════════════
-- CARDS
-- ════════════════════════════════════════════════════════════
create table cards (
  id          uuid primary key default uuid_generate_v4(),
  project_id  uuid not null references projects(id) on delete cascade,
  column_id   uuid not null references columns(id)  on delete restrict,
  phase       card_phase not null default 'discovery',
  title       text not null,
  description text not null default '',
  moscow      moscow_type not null default 'S',
  risk        smallint not null default 3 check (risk between 1 and 5),
  value       smallint not null default 3 check (value between 1 and 5),
  "order"     integer not null default 0,
  tags        text[] not null default '{}',
  assigned_to uuid references profiles(id) on delete set null,
  created_by  uuid not null references profiles(id) on delete restrict,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- ════════════════════════════════════════════════════════════
-- RFCs
-- ════════════════════════════════════════════════════════════
create table rfcs (
  id            uuid primary key default uuid_generate_v4(),
  project_id    uuid not null references projects(id) on delete cascade,
  card_id       uuid not null references cards(id)    on delete restrict,
  title         text not null,
  type          rfc_type not null default 'Normal',
  status        rfc_status not null default 'Planejada',
  description   text not null default '',
  rollback_plan text not null default '',
  responsible   text,
  scheduled_at  timestamptz not null,
  window_start  timestamptz,
  window_end    timestamptz,
  created_by    uuid not null references profiles(id) on delete restrict,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- ════════════════════════════════════════════════════════════
-- LOG DE ATIVIDADES
-- ════════════════════════════════════════════════════════════
create table activity_logs (
  id          uuid primary key default uuid_generate_v4(),
  project_id  uuid not null references projects(id) on delete cascade,
  entity_id   uuid not null,
  entity_type text not null check (entity_type in ('card', 'rfc', 'project', 'column')),
  action      text not null,
  payload     jsonb,
  actor_id    uuid references profiles(id) on delete set null,
  created_at  timestamptz not null default now()
);

-- ════════════════════════════════════════════════════════════
-- FUNÇÕES HELPER (RLS)
-- ════════════════════════════════════════════════════════════
create or replace function is_team_member(tid uuid)
returns boolean language sql security definer stable as $$
  select exists (
    select 1 from team_members
    where team_id = tid and user_id = auth.uid()
  );
$$;

create or replace function is_project_member(pid uuid)
returns boolean language sql security definer stable as $$
  select exists (
    select 1 from project_members
    where project_id = pid and user_id = auth.uid()
  );
$$;

create or replace function project_role_of(pid uuid)
returns project_role language sql security definer stable as $$
  select role from project_members
  where project_id = pid and user_id = auth.uid()
  limit 1;
$$;

create or replace function team_role_of(tid uuid)
returns team_role language sql security definer stable as $$
  select role from team_members
  where team_id = tid and user_id = auth.uid()
  limit 1;
$$;

-- ════════════════════════════════════════════════════════════
-- ROW LEVEL SECURITY
-- Regra: INSERT  → WITH CHECK apenas
--        SELECT / UPDATE / DELETE → USING apenas
--        FOR ALL → separar em políticas individuais por operação
-- ════════════════════════════════════════════════════════════
alter table profiles        enable row level security;
alter table teams           enable row level security;
alter table team_members    enable row level security;
alter table projects        enable row level security;
alter table project_members enable row level security;
alter table invites         enable row level security;
alter table columns         enable row level security;
alter table cards           enable row level security;
alter table rfcs            enable row level security;
alter table activity_logs   enable row level security;

-- ── profiles ──────────────────────────────────────────────
create policy "profiles: own full access"
  on profiles for all
  using (id = auth.uid())
  with check (id = auth.uid());

create policy "profiles: teammates can view"
  on profiles for select
  using (
    exists (
      select 1 from team_members tm
      join team_members tm2 on tm.team_id = tm2.team_id
      where tm.user_id = auth.uid() and tm2.user_id = profiles.id
    )
  );

-- ── teams ─────────────────────────────────────────────────
create policy "teams: members can select"
  on teams for select
  using (is_team_member(id));

create policy "teams: authenticated can insert"
  on teams for insert
  with check (created_by = auth.uid());

create policy "teams: admin can update"
  on teams for update
  using (team_role_of(id) in ('owner', 'admin'));

create policy "teams: owner can delete"
  on teams for delete
  using (team_role_of(id) = 'owner');

-- ── team_members ──────────────────────────────────────────
create policy "team_members: members can select"
  on team_members for select
  using (is_team_member(team_id));

create policy "team_members: admin can insert"
  on team_members for insert
  with check (team_role_of(team_id) in ('owner', 'admin'));

create policy "team_members: admin can update"
  on team_members for update
  using (team_role_of(team_id) in ('owner', 'admin'));

create policy "team_members: admin or self can delete"
  on team_members for delete
  using (
    team_role_of(team_id) in ('owner', 'admin')
    or user_id = auth.uid()
  );

-- ── projects ──────────────────────────────────────────────
create policy "projects: members can select"
  on projects for select
  using (is_project_member(id));

create policy "projects: team members can insert"
  on projects for insert
  with check (is_team_member(team_id));

create policy "projects: admin can update"
  on projects for update
  using (project_role_of(id) = 'admin');

create policy "projects: admin can delete"
  on projects for delete
  using (project_role_of(id) = 'admin');

-- ── project_members ───────────────────────────────────────
create policy "project_members: members can select"
  on project_members for select
  using (is_project_member(project_id));

create policy "project_members: admin can insert"
  on project_members for insert
  with check (project_role_of(project_id) = 'admin');

create policy "project_members: admin can update"
  on project_members for update
  using (project_role_of(project_id) = 'admin');

create policy "project_members: admin can delete"
  on project_members for delete
  using (project_role_of(project_id) = 'admin');

-- ── invites ───────────────────────────────────────────────
create policy "invites: invited or sender can select"
  on invites for select
  using (
    email = (select email from auth.users where id = auth.uid())
    or invited_by = auth.uid()
  );

create policy "invites: authenticated can insert"
  on invites for insert
  with check (invited_by = auth.uid());

create policy "invites: invited or sender can update"
  on invites for update
  using (
    email = (select email from auth.users where id = auth.uid())
    or invited_by = auth.uid()
  );

-- ── columns ───────────────────────────────────────────────
create policy "columns: project members can select"
  on columns for select
  using (is_project_member(project_id));

create policy "columns: admin/member can insert"
  on columns for insert
  with check (project_role_of(project_id) in ('admin', 'member'));

create policy "columns: admin/member can update"
  on columns for update
  using (project_role_of(project_id) in ('admin', 'member'));

create policy "columns: admin/member can delete"
  on columns for delete
  using (project_role_of(project_id) in ('admin', 'member'));

-- ── cards ─────────────────────────────────────────────────
create policy "cards: project members can select"
  on cards for select
  using (is_project_member(project_id));

create policy "cards: admin/member can insert"
  on cards for insert
  with check (project_role_of(project_id) in ('admin', 'member'));

create policy "cards: admin/member can update"
  on cards for update
  using (project_role_of(project_id) in ('admin', 'member'));

create policy "cards: admin/member can delete"
  on cards for delete
  using (project_role_of(project_id) in ('admin', 'member'));

-- ── rfcs ──────────────────────────────────────────────────
create policy "rfcs: project members can select"
  on rfcs for select
  using (is_project_member(project_id));

create policy "rfcs: admin/member can insert"
  on rfcs for insert
  with check (project_role_of(project_id) in ('admin', 'member'));

create policy "rfcs: admin/member can update"
  on rfcs for update
  using (project_role_of(project_id) in ('admin', 'member'));

create policy "rfcs: admin/member can delete"
  on rfcs for delete
  using (project_role_of(project_id) in ('admin', 'member'));

-- ── activity_logs ─────────────────────────────────────────
create policy "activity_logs: project members can select"
  on activity_logs for select
  using (is_project_member(project_id));

create policy "activity_logs: project members can insert"
  on activity_logs for insert
  with check (is_project_member(project_id));

-- ════════════════════════════════════════════════════════════
-- ÍNDICES
-- ════════════════════════════════════════════════════════════
create index on team_members    (user_id);
create index on team_members    (team_id);
create index on project_members (user_id);
create index on project_members (project_id);
create index on projects        (team_id);
create index on columns         (project_id, phase);
create index on cards           (project_id, phase);
create index on cards           (column_id);
create index on rfcs            (project_id);
create index on rfcs            (card_id);
create index on activity_logs   (project_id, created_at desc);
create index on invites         (token);
create index on invites         (email, status);
