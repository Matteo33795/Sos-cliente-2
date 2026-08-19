-- Schema per il gestionale di stoccaggio
-- Esegui questo file nell'SQL Editor del tuo progetto Supabase (supabase.com)

create extension if not exists "pgcrypto";
create extension if not exists "pg_net";

-- ============================================================
-- PROFILI UTENTE
-- ============================================================
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  nome_completo text,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

drop policy if exists "I profili sono visibili a tutti gli utenti autenticati" on public.profiles;
create policy "I profili sono visibili a tutti gli utenti autenticati"
  on public.profiles for select
  to authenticated
  using (true);

drop policy if exists "Un utente puo' modificare solo il proprio profilo" on public.profiles;
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

drop policy if exists "Ubicazioni visibili agli utenti autenticati" on public.ubicazioni;
create policy "Ubicazioni visibili agli utenti autenticati"
  on public.ubicazioni for select
  to authenticated
  using (true);

drop policy if exists "Utenti autenticati possono creare ubicazioni" on public.ubicazioni;
create policy "Utenti autenticati possono creare ubicazioni"
  on public.ubicazioni for insert
  to authenticated
  with check (true);

drop policy if exists "Utenti autenticati possono modificare ubicazioni" on public.ubicazioni;
create policy "Utenti autenticati possono modificare ubicazioni"
  on public.ubicazioni for update
  to authenticated
  using (true);

drop policy if exists "Utenti autenticati possono eliminare ubicazioni" on public.ubicazioni;
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

-- Evita di rimandare piu' notifiche di seguito per lo stesso calo di scorta:
-- si azzera automaticamente appena la quantita' torna sopra la soglia.
alter table public.materiali add column if not exists sotto_scorta_notificato boolean not null default false;

alter table public.materiali enable row level security;

drop policy if exists "Materiali visibili agli utenti autenticati" on public.materiali;
create policy "Materiali visibili agli utenti autenticati"
  on public.materiali for select
  to authenticated
  using (true);

drop policy if exists "Utenti autenticati possono creare materiali" on public.materiali;
create policy "Utenti autenticati possono creare materiali"
  on public.materiali for insert
  to authenticated
  with check (true);

drop policy if exists "Utenti autenticati possono modificare materiali" on public.materiali;
create policy "Utenti autenticati possono modificare materiali"
  on public.materiali for update
  to authenticated
  using (true);

drop policy if exists "Utenti autenticati possono eliminare materiali" on public.materiali;
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

drop policy if exists "Giacenze visibili agli utenti autenticati" on public.giacenze;
create policy "Giacenze visibili agli utenti autenticati"
  on public.giacenze for select
  to authenticated
  using (true);

-- Nessuna policy di insert/update/delete per gli utenti: le giacenze
-- vengono scritte solo dalla funzione security definer applica_movimento().

-- ============================================================
-- NOTIFICHE PUSH (iscrizioni dei dispositivi e configurazione)
-- ============================================================
create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  created_at timestamptz not null default now()
);

alter table public.push_subscriptions enable row level security;

drop policy if exists "Un utente vede solo le proprie iscrizioni" on public.push_subscriptions;
create policy "Un utente vede solo le proprie iscrizioni"
  on public.push_subscriptions for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists "Un utente puo' iscrivere il proprio dispositivo" on public.push_subscriptions;
create policy "Un utente puo' iscrivere il proprio dispositivo"
  on public.push_subscriptions for insert
  to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "Un utente puo' cancellare le proprie iscrizioni" on public.push_subscriptions;
create policy "Un utente puo' cancellare le proprie iscrizioni"
  on public.push_subscriptions for delete
  to authenticated
  using (auth.uid() = user_id);

-- Riga unica di configurazione con l'indirizzo della Edge Function che
-- invia le notifiche e un segreto condiviso per autorizzarne la chiamata.
-- Non e' leggibile dal client (nessuna policy select): va impostata a mano
-- una volta dall'SQL Editor con una UPDATE, vedi README.md.
create table if not exists public.app_config (
  id boolean primary key default true check (id),
  edge_function_url text,
  edge_function_secret text,
  -- Chiave "publishable"/anon del progetto: alcune Edge Function restano
  -- protette dalla verifica JWT di Supabase anche quando "Verify JWT" non
  -- si riesce a disattivare dall'editor. Questa chiave viene inviata come
  -- Authorization/apikey per superare quel controllo.
  edge_function_anon_key text
);

insert into public.app_config (id) values (true) on conflict (id) do nothing;
alter table public.app_config add column if not exists edge_function_anon_key text;

alter table public.app_config enable row level security;

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

drop policy if exists "Movimenti visibili agli utenti autenticati" on public.movimenti;
create policy "Movimenti visibili agli utenti autenticati"
  on public.movimenti for select
  to authenticated
  using (true);

drop policy if exists "Un utente puo' registrare movimenti a proprio nome" on public.movimenti;
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

-- Dopo che il movimento e' stato applicato (giacenze gia' aggiornate dal
-- trigger sopra), controlla se il totale e' sceso sotto la soglia minima e,
-- in tal caso, chiama la Edge Function che invia le notifiche push.
-- Non fa nulla se public.app_config non e' stata configurata.
create or replace function public.notifica_se_sotto_scorta()
returns trigger
language plpgsql
security definer set search_path = public
as '
declare
  tot numeric;
  minima numeric;
  gia_notificato boolean;
  nome_materiale text;
  unita text;
  url text;
  segreto text;
  chiave_anon text;
begin
  select coalesce(sum(quantita), 0) into tot
  from public.giacenze
  where materiale_id = new.materiale_id;

  select quantita_minima, sotto_scorta_notificato, nome, unita_misura
  into minima, gia_notificato, nome_materiale, unita
  from public.materiali
  where id = new.materiale_id;

  if tot <= minima and not gia_notificato then
    update public.materiali set sotto_scorta_notificato = true where id = new.materiale_id;

    select edge_function_url, edge_function_secret, edge_function_anon_key
    into url, segreto, chiave_anon
    from public.app_config where id = true;

    if url is not null and url <> '''' then
      perform net.http_post(
        url := url,
        body := jsonb_build_object(
          ''secret'', segreto,
          ''materiale_id'', new.materiale_id,
          ''nome'', nome_materiale,
          ''quantita_totale'', tot,
          ''quantita_minima'', minima,
          ''unita_misura'', unita
        ),
        headers := jsonb_build_object(
          ''Content-Type'', ''application/json'',
          ''apikey'', coalesce(chiave_anon, ''''),
          ''Authorization'', ''Bearer '' || coalesce(chiave_anon, '''')
        )
      );
    end if;
  elsif tot > minima and gia_notificato then
    update public.materiali set sotto_scorta_notificato = false where id = new.materiale_id;
  end if;

  return new;
end;
';

drop trigger if exists on_movimento_verifica_scorta on public.movimenti;
create trigger on_movimento_verifica_scorta
  after insert on public.movimenti
  for each row execute procedure public.notifica_se_sotto_scorta();

-- ============================================================
-- INDICI utili per ricerca e ordinamento
-- ============================================================
create index if not exists idx_materiali_nome on public.materiali using gin (to_tsvector('simple', nome));
create index if not exists idx_movimenti_materiale on public.movimenti (materiale_id, creato_il desc);
create index if not exists idx_giacenze_materiale on public.giacenze (materiale_id);

-- Forza PostgREST a rileggere lo schema, cosi' le nuove relazioni tra
-- tabelle sono visibili subito alle query dell'app senza dover aspettare.
notify pgrst, 'reload schema';
