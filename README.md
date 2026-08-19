# Stoccaggio — Gestionale di Magazzino (PWA)

App web installabile (PWA) per gestire lo stoccaggio e la disponibilità del
materiale in magazzino: anagrafica materiali, giacenze per ubicazione,
movimenti di carico/scarico con scanner barcode/QR, e login multiutente con
dati condivisi in tempo reale su Supabase.

Essendo una PWA, **non serve pubblicarla su App Store o Google Play**: basta
aprire il link da telefono e scegliere "Aggiungi a Home" — l'app compare
come icona sulla home, a schermo intero, e funziona anche offline per la
consultazione dei dati già caricati.

## 1. Crea il progetto Supabase (una volta sola)

1. Vai su [supabase.com](https://supabase.com), crea un account gratuito e
   un nuovo progetto.
2. Nel progetto, apri **SQL Editor** → **New query**, incolla il contenuto
   del file [`supabase/schema.sql`](./supabase/schema.sql) di questo
   repository ed esegui (▶ Run). Questo crea tutte le tabelle, i trigger
   che aggiornano automaticamente le giacenze e le regole di sicurezza
   (RLS) che permettono l'accesso solo agli utenti autenticati.

   ⚠️ **Attenzione a come copi il file**: se lo apri tramite un'app di note,
   una chat o un editor con formattazione automatica, alcuni caratteri
   possono venire alterati e la query fallisce con un errore di sintassi.
   Per essere sicuri, apri il file su GitHub, clicca il pulsante **"Raw"**
   (o l'icona di copia in alto a destra del file) e incolla direttamente
   da lì nell'SQL Editor di Supabase, senza passare da altre app.
3. Vai su **Project Settings → API**: copia **Project URL** e la chiave
   **anon public**. Non sono segrete (sono pensate per essere usate nel
   browser), ma vanno comunque prese da qui.
4. (Facoltativo) In **Authentication → Providers → Email**, se vuoi evitare
   la conferma via email durante i test, disattiva "Confirm email".

## 2. Configura l'app

```bash
cp .env.example .env
```

Apri `.env` e incolla i due valori presi da Supabase:

```
VITE_SUPABASE_URL=https://xxxxxxxxxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=la-tua-chiave-anon-pubblica
```

## 3. Avvia in locale

```bash
npm install
npm run dev
```

Apri l'indirizzo mostrato in terminale (es. `http://localhost:5173`).
Registra un account dalla pagina di login per iniziare a usare l'app.

## 4. Metti l'app online (perché sia scaricabile dal telefono)

L'app è un sito statico: puoi pubblicarla gratis su
[Vercel](https://vercel.com), [Netlify](https://netlify.com) o
[Cloudflare Pages](https://pages.cloudflare.com). In ogni caso:

- **Comando di build:** `npm run build`
- **Cartella di output:** `dist`
- **Variabili d'ambiente** da impostare sulla piattaforma di hosting:
  `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY` (stessi valori del tuo `.env`)

Esempio con Vercel (dalla cartella del progetto):

```bash
npm install -g vercel
vercel --prod
```

Una volta online, condividi il link con i colleghi. Ogni utente potrà
registrarsi con la propria email/password e vedere gli stessi dati in
tempo reale.

### Installare l'app sul telefono

- **Android (Chrome):** apri il link → menu ⋮ → "Installa app" /
  "Aggiungi a schermata Home".
- **iPhone (Safari):** apri il link → icona Condividi → "Aggiungi a
  Home".

L'icona comparirà come una vera app, a schermo intero, senza barra del
browser.

## 5. (Facoltativo) Notifiche push per scorta bassa

Quando un materiale scende sotto la scorta minima impostata, l'app può
inviare una notifica push al telefono di chi ha attivato le notifiche
(icona 🔔/🔕 in alto nell'app), anche ad app chiusa.

⚠️ Su iPhone funziona solo se l'app è installata sulla home screen (non
aperta da Safari) e con iOS 16.4 o successivo. Su Android funziona sempre.

Questa parte è più tecnica delle precedenti: se non ti serve subito puoi
saltarla, l'app funziona lo stesso senza.

### 5.1 Genera le chiavi VAPID (una volta sola)

Le notifiche push richiedono una coppia di chiavi "VAPID" che identificano
la tua installazione. Se hai Node.js installato sul computer:

```bash
npx web-push generate-vapid-keys
```

Otterrai una **Public Key** e una **Private Key**: tienile da parte, ti
servono nei prossimi due passaggi.

### 5.2 Crea la Edge Function su Supabase

1. Nel progetto Supabase, vai su **Edge Functions** (menu a sinistra) →
   **Deploy a new function** (o "Create a new function").
2. Chiamala esattamente `notifica-scorta-bassa`.
3. Se ti viene chiesto, disattiva **"Verify JWT"** / "Enforce JWT
   verification" — la funzione si protegge da sola con un codice segreto
   (vedi sotto), non con il login di Supabase.
4. Cancella il codice di esempio e incolla al suo posto il contenuto del
   file [`supabase/functions/notifica-scorta-bassa/index.ts`](./supabase/functions/notifica-scorta-bassa/index.ts)
   di questo repository (stesso avviso di prima: copialo dal pulsante
   "Raw" su GitHub, non da un'app che potrebbe alterare il testo).
5. Clicca **Deploy**.
6. Nella pagina della funzione, vai su **Secrets** e aggiungi queste
   quattro variabili:
   - `VAPID_PUBLIC_KEY` → la Public Key del passaggio 5.1
   - `VAPID_PRIVATE_KEY` → la Private Key del passaggio 5.1
   - `VAPID_SUBJECT` → `mailto:` seguito da un tuo indirizzo email di
     contatto (es. `mailto:nome@esempio.it`)
   - `FUNCTION_SECRET` → una password a scelta, inventata da te (es. una
     stringa lunga e casuale); serve a impedire che altri chiamino la
     funzione dall'esterno
7. Copia l'**URL della funzione** mostrato in alto nella pagina (tipo
   `https://xxxxxxxxxxxx.supabase.co/functions/v1/notifica-scorta-bassa`).

### 5.3 Collega database e funzione

Nell'SQL Editor di Supabase, esegui (sostituendo i due valori con l'URL
del passaggio precedente e lo stesso `FUNCTION_SECRET` che hai scelto):

```sql
update public.app_config
set
  edge_function_url = 'https://xxxxxxxxxxxx.supabase.co/functions/v1/notifica-scorta-bassa',
  edge_function_secret = 'lo-stesso-valore-di-FUNCTION_SECRET'
where id = true;
```

### 5.4 Configura l'app

Aggiungi al tuo `.env` (e, se l'app è già online, anche tra le variabili
d'ambiente su Vercel) la Public Key del passaggio 5.1:

```
VITE_VAPID_PUBLIC_KEY=la-tua-public-key
```

Ricompila/ridistribuisci l'app. Da questo momento chi apre l'app vedrà
l'icona 🔕 in alto: toccandola e accettando il permesso del browser,
riceverà una notifica ogni volta che un materiale scende sotto scorta.

## Funzionalità

- **Anagrafica materiali**: nome, codice/barcode, categoria, unità di
  misura, scorta minima, note.
- **Giacenze per ubicazione**: ogni materiale può essere distribuito su più
  ubicazioni (scaffali, zone, magazzini); la quantità totale è la somma
  delle giacenze.
- **Carico / Scarico**: registra movimenti di entrata e uscita; lo scarico
  è bloccato automaticamente se la quantità disponibile in
  quell'ubicazione non è sufficiente.
- **Scanner barcode/QR**: usa la fotocamera del telefono per cercare
  rapidamente un materiale durante un movimento, o per compilare il
  codice quando crei un nuovo materiale.
- **Storico movimenti**: cronologia completa di carichi/scarichi, con data,
  utente e ubicazione.
- **Materiali sotto scorta minima**: evidenziati in rosso nell'elenco e nel
  dettaglio.
- **Notifiche push** (facoltative): avviso sul telefono quando un materiale
  scende sotto la scorta minima, vedi punto 5 sopra.

## Stack tecnico

- [React](https://react.dev) + [Vite](https://vitejs.dev) + TypeScript
- [Tailwind CSS](https://tailwindcss.com) per lo stile mobile-first
- [Supabase](https://supabase.com) (Postgres + Auth + Row Level Security)
  come backend
- [vite-plugin-pwa](https://vite-pwa-org.netlify.app/) per rendere l'app
  installabile e utilizzabile offline
- [@zxing/browser](https://github.com/zxing-js/browser) per la scansione di
  barcode/QR da fotocamera
- [Web Push API](https://developer.mozilla.org/docs/Web/API/Push_API) +
  una Supabase Edge Function (Deno) per le notifiche di scorta bassa

## Struttura del progetto

```
src/
  components/     Layout, route protette, scanner barcode, campanella notifiche
  context/        Contesto di autenticazione (Supabase Auth)
  lib/            Client Supabase, tipi del database, notifiche push
  pages/          Le pagine dell'app (login, materiali, movimenti, ...)
public/
  push-sw.js      Gestione delle notifiche push nel service worker
supabase/
  schema.sql              Schema del database da eseguire su Supabase
  functions/
    notifica-scorta-bassa/  Edge Function che invia le notifiche push
```

## Comandi utili

```bash
npm run dev       # Avvia in sviluppo
npm run build     # Compila per la produzione (cartella dist/)
npm run preview   # Anteprima locale della build di produzione
npm run lint      # Controllo del codice
```
