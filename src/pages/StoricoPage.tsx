import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'

interface MovimentoStorico {
  id: string
  tipo: 'carico' | 'scarico'
  quantita: number
  note: string | null
  creato_il: string
  materiali: { id: string; nome: string; unita_misura: string } | null
  ubicazioni: { nome: string } | null
  profiles: { nome_completo: string | null } | null
}

export function StoricoPage() {
  const [movimenti, setMovimenti] = useState<MovimentoStorico[]>([])
  const [loading, setLoading] = useState(true)
  const [errore, setErrore] = useState<string | null>(null)

  useEffect(() => {
    supabase
      .from('movimenti')
      .select(
        'id, tipo, quantita, note, creato_il, materiali(id, nome, unita_misura), ubicazioni(nome), profiles(nome_completo)',
      )
      .order('creato_il', { ascending: false })
      .limit(100)
      .then(({ data, error }) => {
        if (error) setErrore(error.message)
        setMovimenti((data as unknown as MovimentoStorico[]) ?? [])
        setLoading(false)
      })
  }, [])

  return (
    <div className="px-4 py-4">
      <h2 className="mb-4 text-lg font-semibold text-slate-900">Storico movimenti</h2>

      {loading && <p className="text-sm text-slate-500">Caricamento...</p>}
      {errore && <p className="text-sm text-red-600">Errore: {errore}</p>}
      {!loading && movimenti.length === 0 && (
        <p className="text-sm text-slate-500">Nessun movimento registrato.</p>
      )}

      <ul className="space-y-2">
        {movimenti.map((mv) => (
          <li key={mv.id} className="rounded-xl bg-white px-4 py-3 shadow-sm">
            <div className="flex items-center justify-between">
              {mv.materiali ? (
                <Link to={`/materiali/${mv.materiali.id}`} className="text-sm font-medium text-slate-900">
                  {mv.materiali.nome}
                </Link>
              ) : (
                <span className="text-sm font-medium text-slate-400">Materiale eliminato</span>
              )}
              <span
                className={`text-sm font-semibold ${
                  mv.tipo === 'carico' ? 'text-emerald-600' : 'text-orange-600'
                }`}
              >
                {mv.tipo === 'carico' ? '+' : '−'}
                {mv.quantita} {mv.materiali?.unita_misura ?? ''}
              </span>
            </div>
            <p className="mt-0.5 text-xs text-slate-500">
              {mv.ubicazioni?.nome ?? 'Ubicazione'} · {mv.profiles?.nome_completo ?? 'Utente'} ·{' '}
              {new Date(mv.creato_il).toLocaleString('it-IT')}
            </p>
            {mv.note && <p className="mt-1 text-xs text-slate-600">{mv.note}</p>}
          </li>
        ))}
      </ul>
    </div>
  )
}
