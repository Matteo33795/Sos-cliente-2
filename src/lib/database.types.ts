export type TipoMovimento = 'carico' | 'scarico'

export interface Profile {
  id: string
  nome_completo: string | null
  created_at: string
}

export interface Ubicazione {
  id: string
  nome: string
  descrizione: string | null
  created_at: string
}

export interface Materiale {
  id: string
  codice: string | null
  nome: string
  categoria: string | null
  unita_misura: string
  quantita_minima: number
  note: string | null
  immagine_url: string | null
  created_by: string | null
  created_at: string
}

export interface Giacenza {
  id: string
  materiale_id: string
  ubicazione_id: string
  quantita: number
  aggiornato_il: string
}

export interface Movimento {
  id: string
  materiale_id: string
  ubicazione_id: string
  tipo: TipoMovimento
  quantita: number
  note: string | null
  utente_id: string
  creato_il: string
}

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: Profile
        Insert: Partial<Profile> & { id: string }
        Update: Partial<Profile>
      }
      ubicazioni: {
        Row: Ubicazione
        Insert: Partial<Ubicazione> & { nome: string }
        Update: Partial<Ubicazione>
      }
      materiali: {
        Row: Materiale
        Insert: Partial<Materiale> & { nome: string }
        Update: Partial<Materiale>
      }
      giacenze: {
        Row: Giacenza
        Insert: Partial<Giacenza> & { materiale_id: string; ubicazione_id: string }
        Update: Partial<Giacenza>
      }
      movimenti: {
        Row: Movimento
        Insert: Partial<Movimento> & {
          materiale_id: string
          ubicazione_id: string
          tipo: TipoMovimento
          quantita: number
          utente_id: string
        }
        Update: Partial<Movimento>
      }
    }
  }
}
