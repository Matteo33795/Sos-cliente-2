-- Schema per il gestionale di stoccaggio
-- Esegui questo file nell'SQL Editor del tuo progetto Supabase (supabase.com)

create extension if not exists "pgcrypto";

-- ============================================================
-- PROFILI UTENTE
-- ============================================================
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  nome_completo text,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "I profili sono visibili a tutti gli utenti autenticati"
  on public.profiles for select
  to authenticated
  using (true);

create policy "Un utente puo' modificare solo il proprio profilo"
  on public.profiles for update
  to authenticated
  using (auth.uid() = id);

-- Crea automaticamente un profilo quando un utente si registra
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as '
begin
  insert into public.profiles (id, nome_completo)
  values (new.id, coalesce(new.raw_user_meta_data ->> ''nome_completo'', new.email));
  return new;
end;
';

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ============================================================
-- UBICAZIONI (scaffali / zone / magazzini)
-- ============================================================
create table if not exists public.ubicazioni (
  id uuid primary key default gen_random_uuid(),
  nome text not null unique,
  descrizione text,
  created_at timestamptz not null default now()
);

alter table public.ubicazioni enable row level security;

create policy "Ubicazioni visibili agli utenti autenticati"
  on public.ubicazioni for select
  to authenticated
  using (true);

create policy "Utenti autenticati possono creare ubicazioni"
  on public.ubicazioni for insert
  to authenticated
  with check (true);

create policy "Utenti autenticati possono modificare ubicazioni"
  on public.ubicazioni for update
  to authenticated
  using (true);

create policy "Utenti autenticati possono eliminare ubicazioni"
  on public.ubicazioni for delete
  to authenticated
  using (true);

-- ============================================================
-- MATERIALI (anagrafica)
-- ============================================================
create table if not exists public.materiali (
  id uuid primary key default gen_random_uuid(),
  codice text unique,
  nome text not null,
  categoria text,
  unita_misura text not null default 'pz',
  quantita_minima numeric not null default 0,
  note text,
  immagine_url text,
  created_by uuid references auth.users (id),
  created_at timestamptz not null default now()
);

alter table public.materiali enable row level security;

create policy "Materiali visibili agli utenti autenticati"
  on public.materiali for select
  to authenticated
  using (true);

create policy "Utenti autenticati possono creare materiali"
  on public.materiali for insert
  to authenticated
  with check (true);

create policy "Utenti autenticati possono modificare materiali"
  on public.materiali for update
  to authenticated
  using (true);

create policy "Utenti autenticati possono eliminare materiali"
  on public.materiali for delete
  to authenticated
  using (true);

-- ============================================================
-- GIACENZE (quantita' disponibile per materiale/ubicazione)
-- Aggiornate SOLO tramite il trigger sui movimenti, mai a mano.
-- ============================================================
create table if not exists public.giacenze (
  id uuid primary key default gen_random_uuid(),
  materiale_id uuid not null references public.materiali (id) on delete cascade,
  ubicazione_id uuid not null references public.ubicazioni (id) on delete cascade,
  quantita numeric not null default 0,
  aggiornato_il timestamptz not null default now(),
  unique (materiale_id, ubicazione_id)
);

alter table public.giacenze enable row level security;

create policy "Giacenze visibili agli utenti autenticati"
  on public.giacenze for select
  to authenticated
  using (true);

-- Nessuna policy di insert/update/delete per gli utenti: le giacenze
-- vengono scritte solo dalla funzione security definer applica_movimento().

-- ============================================================
-- MOVIMENTI (carico / scarico, storico)
-- ============================================================
create table if not exists public.movimenti (
  id uuid primary key default gen_random_uuid(),
  materiale_id uuid not null references public.materiali (id) on delete cascade,
  ubicazione_id uuid not null references public.ubicazioni (id) on delete restrict,
  tipo text not null check (tipo in ('carico', 'scarico')),
  quantita numeric not null check (quantita > 0),
  note text,
  -- Riferimento a public.profiles (non auth.users) per permettere a
  -- PostgREST di risolvere l'embedding movimenti -> profiles usato dalla UI
  -- per mostrare il nome di chi ha registrato il movimento.
  utente_id uuid not null references public.profiles (id),
  creato_il timestamptz not null default now()
);

-- Se la tabella esisteva gia' con il vecchio riferimento a auth.users,
-- questi due comandi correggono il collegamento senza perdere i dati.
alter table public.movimenti drop constraint if exists movimenti_utente_id_fkey;
alter table public.movimenti
  add constraint movimenti_utente_id_fkey
  foreign key (utente_id) references public.profiles (id);

alter table public.movimenti enable row level security;

create policy "Movimenti visibili agli utenti autenticati"
  on public.movimenti for select
  to authenticated
  using (true);

create policy "Un utente puo' registrare movimenti a proprio nome"
  on public.movimenti for insert
  to authenticated
  with check (auth.uid() = utente_id);

-- Funzione che applica il movimento alla giacenza corrispondente,
-- impedendo scarichi che porterebbero la quantita' sotto zero.
create or replace function public.applica_movimento()
returns trigger
language plpgsql
security definer set search_path = public
as '
declare
  delta numeric;
  giacenza_attuale numeric;
begin
  if new.tipo = ''carico'' then
    delta := new.quantita;
  else
    delta := -new.quantita;
  end if;

  insert into public.giacenze (materiale_id, ubicazione_id, quantita)
  values (new.materiale_id, new.ubicazione_id, 0)
  on conflict (materiale_id, ubicazione_id) do nothing;

  select quantita into giacenza_attuale
  from public.giacenze
  where materiale_id = new.materiale_id and ubicazione_id = new.ubicazione_id
  for update;

  if giacenza_attuale + delta < 0 then
    raise exception ''Quantita insufficiente in questa ubicazione (disponibili: %, richiesti: %)'',
      giacenza_attuale, new.quantita;
  end if;

  update public.giacenze
  set quantita = giacenza_attuale + delta, aggiornato_il = now()
  where materiale_id = new.materiale_id and ubicazione_id = new.ubicazione_id;

  return new;
end;
';

drop trigger if exists on_movimento_creato on public.movimenti;
create trigger on_movimento_creato
  before insert on public.movimenti
  for each row execute procedure public.applica_movimento();

-- ============================================================
-- INDICI utili per ricerca e ordinamento
-- ============================================================
create index if not exists idx_materiali_nome on public.materiali using gin (to_tsvector('simple', nome));
create index if not exists idx_movimenti_materiale on public.movimenti (materiale_id, creato_il desc);
create index if not exists idx_giacenze_materiale on public.giacenze (materiale_id);

-- Forza PostgREST a rileggere lo schema, cosi' le nuove relazioni tra
-- tabelle sono visibili subito alle query dell'app senza dover aspettare.
notify pgrst, 'reload schema';
