import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import type { Materiale } from '../lib/database.types'

interface GiacenzaConUbicazione {
  ubicazione_id: string
  quantita: number
  ubicazioni: { nome: string } | null
}

interface MovimentoConDettagli {
  id: string
  tipo: 'carico' | 'scarico'
  quantita: number
  note: string | null
  creato_il: string
  ubicazioni: { nome: string } | null
  profiles: { nome_completo: string | null } | null
}

export function MaterialeDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [materiale, setMateriale] = useState<Materiale | null>(null)
  const [giacenze, setGiacenze] = useState<GiacenzaConUbicazione[]>([])
  const [movimenti, setMovimenti] = useState<MovimentoConDettagli[]>([])
  const [loading, setLoading] = useState(true)
  const [errore, setErrore] = useState<string | null>(null)

  useEffect(() => {
    if (id) carica(id)
  }, [id])

  async function carica(materialeId: string) {
    setLoading(true)
    setErrore(null)

    const [materialeRes, giacenzeRes, movimentiRes] = await Promise.all([
      supabase.from('materiali').select('*').eq('id', materialeId).single(),
      supabase
        .from('giacenze')
        .select('ubicazione_id, quantita, ubicazioni(nome)')
        .eq('materiale_id', materialeId)
        .gt('quantita', 0),
      supabase
        .from('movimenti')
        .select('id, tipo, quantita, note, creato_il, ubicazioni(nome), profiles(nome_completo)')
        .eq('materiale_id', materialeId)
        .order('creato_il', { ascending: false })
        .limit(20),
    ])

    if (materialeRes.error) {
      setErrore(materialeRes.error.message)
      setLoading(false)
      return
    }

    setMateriale(materialeRes.data)
    setGiacenze((giacenzeRes.data as unknown as GiacenzaConUbicazione[]) ?? [])
    setMovimenti((movimentiRes.data as unknown as MovimentoConDettagli[]) ?? [])
    setLoading(false)
  }

  async function elimina() {
    if (!id || !confirm('Eliminare definitivamente questo materiale e tutto il suo storico?')) return
    const { error } = await supabase.from('materiali').delete().eq('id', id)
    if (error) {
      alert(`Errore: ${error.message}`)
      return
    }
    navigate('/')
  }

  if (loading) return <p className="px-4 py-4 text-sm text-slate-500">Caricamento...</p>
  if (errore) return <p className="px-4 py-4 text-sm text-red-600">Errore: {errore}</p>
  if (!materiale) return <p className="px-4 py-4 text-sm text-slate-500">Materiale non trovato.</p>

  const quantitaTotale = giacenze.reduce((tot, g) => tot + Number(g.quantita), 0)
  const sottoScorta = quantitaTotale <= materiale.quantita_minima

  return (
    <div className="px-4 py-4">
      <div className="mb-4 rounded-2xl bg-white p-4 shadow-sm">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">{materiale.nome}</h2>
            <p className="text-xs text-slate-500">
              {materiale.codice ? `#${materiale.codice}` : 'senza codice'}
              {materiale.categoria ? ` · ${materiale.categoria}` : ''}
            </p>
          </div>
          <div className="text-right">
            <p className={`text-2xl font-bold ${sottoScorta ? 'text-red-600' : 'text-slate-900'}`}>
              {quantitaTotale}
            </p>
            <p className="text-xs text-slate-400">{materiale.unita_misura}</p>
          </div>
        </div>
        {sottoScorta && (
          <p className="mt-2 rounded-lg bg-red-50 px-3 py-1.5 text-xs font-medium text-red-700">
            ⚠️ Sotto la scorta minima ({materiale.quantita_minima} {materiale.unita_misura})
          </p>
        )}
        {materiale.note && <p className="mt-2 text-sm text-slate-600">{materiale.note}</p>}

        <div className="mt-4 grid grid-cols-2 gap-2">
          <Link
            to={`/movimento?materialeId=${materiale.id}&tipo=carico`}
            className="rounded-lg bg-emerald-600 py-2.5 text-center text-sm font-semibold text-white"
          >
            + Carico
          </Link>
          <Link
            to={`/movimento?materialeId=${materiale.id}&tipo=scarico`}
            className="rounded-lg bg-orange-600 py-2.5 text-center text-sm font-semibold text-white"
          >
            − Scarico
          </Link>
        </div>
        <div className="mt-2 grid grid-cols-2 gap-2">
          <Link
            to={`/materiali/${materiale.id}/modifica`}
            className="rounded-lg border border-slate-300 py-2 text-center text-sm font-medium text-slate-700"
          >
            Modifica
          </Link>
          <button
            onClick={elimina}
            className="rounded-lg border border-red-200 py-2 text-center text-sm font-medium text-red-600"
          >
            Elimina
          </button>
        </div>
      </div>

      <h3 className="mb-2 text-sm font-semibold text-slate-700">Giacenze per ubicazione</h3>
      {giacenze.length === 0 ? (
        <p className="mb-4 text-sm text-slate-500">Nessuna giacenza registrata.</p>
      ) : (
        <ul className="mb-4 space-y-2">
          {giacenze.map((g) => (
            <li
              key={g.ubicazione_id}
              className="flex items-center justify-between rounded-xl bg-white px-4 py-3 shadow-sm"
            >
              <span className="text-sm text-slate-700">{g.ubicazioni?.nome ?? 'Ubicazione'}</span>
              <span className="font-semibold text-slate-900">
                {g.quantita} {materiale.unita_misura}
              </span>
            </li>
          ))}
        </ul>
      )}

      <h3 className="mb-2 text-sm font-semibold text-slate-700">Ultimi movimenti</h3>
      {movimenti.length === 0 ? (
        <p className="text-sm text-slate-500">Nessun movimento registrato.</p>
      ) : (
        <ul className="space-y-2">
          {movimenti.map((mv) => (
            <li key={mv.id} className="rounded-xl bg-white px-4 py-3 shadow-sm">
              <div className="flex items-center justify-between">
                <span
                  className={`text-sm font-semibold ${
                    mv.tipo === 'carico' ? 'text-emerald-600' : 'text-orange-600'
                  }`}
                >
                  {mv.tipo === 'carico' ? '+' : '−'}
                  {mv.quantita} {materiale.unita_misura}
                </span>
                <span className="text-xs text-slate-400">
                  {new Date(mv.creato_il).toLocaleString('it-IT')}
                </span>
              </div>
              <p className="mt-0.5 text-xs text-slate-500">
                {mv.ubicazioni?.nome ?? 'Ubicazione'} · {mv.profiles?.nome_completo ?? 'Utente'}
              </p>
              {mv.note && <p className="mt-1 text-xs text-slate-600">{mv.note}</p>}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
