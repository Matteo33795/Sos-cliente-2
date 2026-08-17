import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'

interface MaterialeConGiacenza {
  id: string
  codice: string | null
  nome: string
  categoria: string | null
  unita_misura: string
  quantita_minima: number
  quantita_totale: number
}

export function MaterialiListPage() {
  const [materiali, setMateriali] = useState<MaterialeConGiacenza[]>([])
  const [loading, setLoading] = useState(true)
  const [errore, setErrore] = useState<string | null>(null)
  const [ricerca, setRicerca] = useState('')

  useEffect(() => {
    caricaMateriali()
  }, [])

  async function caricaMateriali() {
    setLoading(true)
    setErrore(null)
    const { data, error } = await supabase
      .from('materiali')
      .select('id, codice, nome, categoria, unita_misura, quantita_minima, giacenze(quantita)')
      .order('nome', { ascending: true })

    if (error) {
      setErrore(error.message)
      setLoading(false)
      return
    }

    const risultato: MaterialeConGiacenza[] = (data ?? []).map((m) => {
      const giacenze = (m as unknown as { giacenze: { quantita: number }[] }).giacenze ?? []
      return {
        id: m.id,
        codice: m.codice,
        nome: m.nome,
        categoria: m.categoria,
        unita_misura: m.unita_misura,
        quantita_minima: m.quantita_minima,
        quantita_totale: giacenze.reduce((tot, g) => tot + Number(g.quantita), 0),
      }
    })

    setMateriali(risultato)
    setLoading(false)
  }

  const materialiFiltrati = useMemo(() => {
    const q = ricerca.trim().toLowerCase()
    if (!q) return materiali
    return materiali.filter(
      (m) =>
        m.nome.toLowerCase().includes(q) ||
        m.codice?.toLowerCase().includes(q) ||
        m.categoria?.toLowerCase().includes(q),
    )
  }, [materiali, ricerca])

  return (
    <div className="px-4 py-4">
      <div className="mb-4 flex items-center gap-2">
        <input
          value={ricerca}
          onChange={(e) => setRicerca(e.target.value)}
          placeholder="Cerca per nome, codice o categoria..."
          className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
        />
        <Link
          to="/materiali/nuovo"
          className="flex-shrink-0 rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white"
        >
          + Nuovo
        </Link>
      </div>

      {loading && <p className="text-sm text-slate-500">Caricamento materiali...</p>}
      {errore && <p className="text-sm text-red-600">Errore: {errore}</p>}

      {!loading && !errore && materialiFiltrati.length === 0 && (
        <div className="mt-10 text-center text-sm text-slate-500">
          {materiali.length === 0
            ? 'Nessun materiale registrato. Aggiungi il primo con "+ Nuovo".'
            : 'Nessun risultato per la ricerca.'}
        </div>
      )}

      <ul className="space-y-2">
        {materialiFiltrati.map((m) => {
          const sottoScorta = m.quantita_totale <= m.quantita_minima
          return (
            <li key={m.id}>
              <Link
                to={`/materiali/${m.id}`}
                className="flex items-center justify-between rounded-xl bg-white p-4 shadow-sm active:bg-slate-50"
              >
                <div className="min-w-0">
                  <p className="truncate font-medium text-slate-900">{m.nome}</p>
                  <p className="truncate text-xs text-slate-500">
                    {m.codice ? `#${m.codice}` : 'senza codice'}
                    {m.categoria ? ` · ${m.categoria}` : ''}
                  </p>
                </div>
                <div className="ml-3 flex-shrink-0 text-right">
                  <p className={`text-lg font-bold ${sottoScorta ? 'text-red-600' : 'text-slate-900'}`}>
                    {m.quantita_totale}
                  </p>
                  <p className="text-xs text-slate-400">{m.unita_misura}</p>
                </div>
              </Link>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
