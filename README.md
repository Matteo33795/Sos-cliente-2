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

## Stack tecnico

- [React](https://react.dev) + [Vite](https://vitejs.dev) + TypeScript
- [Tailwind CSS](https://tailwindcss.com) per lo stile mobile-first
- [Supabase](https://supabase.com) (Postgres + Auth + Row Level Security)
  come backend
- [vite-plugin-pwa](https://vite-pwa-org.netlify.app/) per rendere l'app
  installabile e utilizzabile offline
- [@zxing/browser](https://github.com/zxing-js/browser) per la scansione di
  barcode/QR da fotocamera

## Struttura del progetto

```
src/
  components/     Layout, route protette, scanner barcode
  context/        Contesto di autenticazione (Supabase Auth)
  lib/            Client Supabase e tipi del database
  pages/          Le pagine dell'app (login, materiali, movimenti, ...)
supabase/
  schema.sql      Schema del database da eseguire su Supabase
```

## Comandi utili

```bash
npm run dev       # Avvia in sviluppo
npm run build     # Compila per la produzione (cartella dist/)
npm run preview   # Anteprima locale della build di produzione
npm run lint      # Controllo del codice
```
