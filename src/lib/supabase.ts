import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey)

if (!isSupabaseConfigured) {
  console.warn(
    'Supabase non configurato: imposta VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY nel file .env (vedi .env.example e README.md).',
  )
}

// Il client non e' tipizzato con lo schema Database: le query usano cast
// mirati (vedi le interfacce in database.types.ts) per mantenere il codice
// semplice ed evitare i vincoli molto rigidi della generics di supabase-js.
// || invece di ?? apposta: una variabile d'ambiente lasciata vuota (stringa
// '') su Vercel non viene intercettata da ??, e createClient('') va in
// crash con "supabaseUrl is required", lasciando una pagina bianca senza
// nessun indizio visibile per chi non apre la console del browser.
export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'placeholder-anon-key',
)
