import { FormEvent, Suspense, lazy, useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import type { Materiale, TipoMovimento, Ubicazione } from '../lib/database.types'

const BarcodeScanner = lazy(() =>
  import('../components/BarcodeScanner').then((m) => ({ default: m.BarcodeScanner })),
)

export function MovimentoFormPage() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const { user } = useAuth()

  const [materiali, setMateriali] = useState<Materiale[]>([])
  const [ubicazioni, setUbicazioni] = useState<Ubicazione[]>([])
  const [materialeId, setMaterialeId] = useState(searchParams.get('materialeId') ?? '')
  const [ubicazioneId, setUbicazioneId] = useState('')
  const [tipo, setTipo] = useState<TipoMovimento>(
    searchParams.get('tipo') === 'scarico' ? 'scarico' : 'carico',
  )
  const [quantita, setQuantita] = useState('')
  const [note, setNote] = useState('')
  const [ricercaMateriale, setRicercaMateriale] = useState('')
  const [scannerAperto, setScannerAperto] = useState(false)
  const [giacenzaAttuale, setGiacenzaAttuale] = useState<number | null>(null)
  const [errore, setErrore] = useState<string | null>(null)
  const [successo, setSuccesso] = useState<string | null>(null)
  const [salvataggio, setSalvataggio] = useState(false)

  useEffect(() => {
    Promise.all([
      supabase.from('materiali').select('*').order('nome'),
      supabase.from('ubicazioni').select('*').order('nome'),
    ]).then(([m, u]) => {
      setMateriali(m.data ?? [])
      setUbicazioni(u.data ?? [])
    })
  }, [])

  useEffect(() => {
    if (!materialeId || !ubicazioneId) {
      setGiacenzaAttuale(null)
      return
    }
    supabase
      .from('giacenze')
      .select('quantita')
      .eq('materiale_id', materialeId)
      .eq('ubicazione_id', ubicazioneId)
      .maybeSingle()
      .then(({ data }) => setGiacenzaAttuale(data ? Number(data.quantita) : 0))
  }, [materialeId, ubicazioneId])

  const materialeSelezionato = useMemo(
    () => materiali.find((m) => m.id === materialeId) ?? null,
    [materiali, materialeId],
  )

  const materialiFiltrati = useMemo(() => {
    const q = ricercaMateriale.trim().toLowerCase()
    if (!q) return materiali
    return materiali.filter(
      (m) => m.nome.toLowerCase().includes(q) || m.codice?.toLowerCase().includes(q),
    )
  }, [materiali, ricercaMateriale])

  function gestisciScansione(testo: string) {
    setScannerAperto(false)
    const trovato = materiali.find((m) => m.codice === testo)
    if (trovato) {
      setMaterialeId(trovato.id)
      setErrore(null)
    } else {
      setErrore(`Nessun materiale trovato con il codice "${testo}".`)
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setErrore(null)
    setSuccesso(null)

    if (!materialeId || !ubicazioneId || !user) return
    const q = Number(quantita)
    if (!q || q <= 0) {
      setErrore('Inserisci una quantità valida.')
      return
    }

    setSalvataggio(true)
    const { error } = await supabase.from('movimenti').insert({
      materiale_id: materialeId,
      ubicazione_id: ubicazioneId,
      tipo,
      quantita: q,
      note: note.trim() || null,
      utente_id: user.id,
    })
    setSalvataggio(false)

    if (error) {
      setErrore(error.message)
      return
    }

    setSuccesso(`${tipo === 'carico' ? 'Carico' : 'Scarico'} registrato con successo.`)
    setQuantita('')
    setNote('')
    setGiacenzaAttuale((prev) => (prev !== null ? prev + (tipo === 'carico' ? q : -q) : null))
  }

  return (
    <div className="px-4 py-4">
      <h2 className="mb-4 text-lg font-semibold text-slate-900">Carico / Scarico</h2>

      <div className="mb-4 grid grid-cols-2 gap-2 rounded-2xl bg-white p-1.5 shadow-sm">
        <button
          type="button"
          onClick={() => setTipo('carico')}
          className={`rounded-xl py-2.5 text-sm font-semibold ${
            tipo === 'carico' ? 'bg-emerald-600 text-white' : 'text-slate-500'
          }`}
        >
          + Carico
        </button>
        <button
          type="button"
          onClick={() => setTipo('scarico')}
          className={`rounded-xl py-2.5 text-sm font-semibold ${
            tipo === 'scarico' ? 'bg-orange-600 text-white' : 'text-slate-500'
          }`}
        >
          − Scarico
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4 rounded-2xl bg-white p-4 shadow-sm">
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">Materiale *</label>
          {materialeSelezionato ? (
            <div className="flex items-center justify-between rounded-lg border border-brand-200 bg-brand-50 px-3 py-2">
              <span className="text-sm font-medium text-slate-900">{materialeSelezionato.nome}</span>
              <button
                type="button"
                onClick={() => setMaterialeId('')}
                className="text-xs font-medium text-brand-700"
              >
                Cambia
              </button>
            </div>
          ) : (
            <>
              <div className="flex gap-2">
                <input
                  value={ricercaMateriale}
                  onChange={(e) => setRicercaMateriale(e.target.value)}
                  placeholder="Cerca materiale per nome o codice"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                />
                <button
                  type="button"
                  onClick={() => setScannerAperto(true)}
                  className="flex-shrink-0 rounded-lg bg-slate-800 px-3 py-2 text-sm text-white"
                >
                  📷
                </button>
              </div>
              {ricercaMateriale && (
                <ul className="mt-2 max-h-48 divide-y divide-slate-100 overflow-y-auto rounded-lg border border-slate-200">
                  {materialiFiltrati.slice(0, 20).map((m) => (
                    <li key={m.id}>
                      <button
                        type="button"
                        onClick={() => {
                          setMaterialeId(m.id)
                          setRicercaMateriale('')
                        }}
                        className="block w-full px-3 py-2 text-left text-sm hover:bg-slate-50"
                      >
                        {m.nome} {m.codice ? `· #${m.codice}` : ''}
                      </button>
                    </li>
                  ))}
                  {materialiFiltrati.length === 0 && (
                    <li className="px-3 py-2 text-sm text-slate-500">Nessun risultato.</li>
                  )}
                </ul>
              )}
            </>
          )}
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">Ubicazione *</label>
          <select
            required
            value={ubicazioneId}
            onChange={(e) => setUbicazioneId(e.target.value)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
          >
            <option value="">Seleziona...</option>
            {ubicazioni.map((u) => (
              <option key={u.id} value={u.id}>
                {u.nome}
              </option>
            ))}
          </select>
          {giacenzaAttuale !== null && (
            <p className="mt-1 text-xs text-slate-500">
              Giacenza attuale in questa ubicazione: <strong>{giacenzaAttuale}</strong>{' '}
              {materialeSelezionato?.unita_misura}
            </p>
          )}
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">Quantità *</label>
          <input
            type="number"
            required
            min="0"
            step="any"
            value={quantita}
            onChange={(e) => setQuantita(e.target.value)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">Note</label>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={2}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
          />
        </div>

        {errore && <p className="text-sm text-red-600">{errore}</p>}
        {successo && <p className="text-sm text-emerald-600">{successo}</p>}

        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => navigate('/')}
            className="flex-1 rounded-lg border border-slate-300 py-2.5 text-sm font-semibold text-slate-700"
          >
            Torna ai materiali
          </button>
          <button
            type="submit"
            disabled={salvataggio || !materialeId || !ubicazioneId}
            className={`flex-1 rounded-lg py-2.5 text-sm font-semibold text-white disabled:opacity-60 ${
              tipo === 'carico' ? 'bg-emerald-600' : 'bg-orange-600'
            }`}
          >
            {salvataggio ? 'Salvataggio...' : `Registra ${tipo}`}
          </button>
        </div>
      </form>

      {scannerAperto && (
        <Suspense fallback={null}>
          <BarcodeScanner onResult={gestisciScansione} onClose={() => setScannerAperto(false)} />
        </Suspense>
      )}
    </div>
  )
}
