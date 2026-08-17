import { FormEvent, Suspense, lazy, useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'

const BarcodeScanner = lazy(() =>
  import('../components/BarcodeScanner').then((m) => ({ default: m.BarcodeScanner })),
)

export function MaterialeFormPage() {
  const { id } = useParams()
  const isEdit = Boolean(id)
  const navigate = useNavigate()
  const { user } = useAuth()

  const [nome, setNome] = useState('')
  const [codice, setCodice] = useState('')
  const [categoria, setCategoria] = useState('')
  const [unitaMisura, setUnitaMisura] = useState('pz')
  const [quantitaMinima, setQuantitaMinima] = useState('0')
  const [note, setNote] = useState('')
  const [scannerAperto, setScannerAperto] = useState(false)
  const [caricamento, setCaricamento] = useState(isEdit)
  const [salvataggio, setSalvataggio] = useState(false)
  const [errore, setErrore] = useState<string | null>(null)

  useEffect(() => {
    if (!isEdit) return
    supabase
      .from('materiali')
      .select('*')
      .eq('id', id)
      .single()
      .then(({ data, error }) => {
        if (error) {
          setErrore(error.message)
        } else if (data) {
          setNome(data.nome)
          setCodice(data.codice ?? '')
          setCategoria(data.categoria ?? '')
          setUnitaMisura(data.unita_misura)
          setQuantitaMinima(String(data.quantita_minima))
          setNote(data.note ?? '')
        }
        setCaricamento(false)
      })
  }, [id, isEdit])

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setErrore(null)
    setSalvataggio(true)

    const payload = {
      nome: nome.trim(),
      codice: codice.trim() || null,
      categoria: categoria.trim() || null,
      unita_misura: unitaMisura.trim() || 'pz',
      quantita_minima: Number(quantitaMinima) || 0,
      note: note.trim() || null,
    }

    const result = isEdit
      ? await supabase.from('materiali').update(payload).eq('id', id)
      : await supabase.from('materiali').insert({ ...payload, created_by: user?.id ?? null })

    setSalvataggio(false)

    if (result.error) {
      setErrore(result.error.message)
      return
    }

    navigate(isEdit ? `/materiali/${id}` : '/')
  }

  if (caricamento) {
    return <p className="px-4 py-4 text-sm text-slate-500">Caricamento...</p>
  }

  return (
    <div className="px-4 py-4">
      <h2 className="mb-4 text-lg font-semibold text-slate-900">
        {isEdit ? 'Modifica materiale' : 'Nuovo materiale'}
      </h2>

      <form onSubmit={handleSubmit} className="space-y-4 rounded-2xl bg-white p-4 shadow-sm">
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">Nome *</label>
          <input
            required
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
            placeholder="Es. Viti M6x20"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">Codice / Barcode</label>
          <div className="flex gap-2">
            <input
              value={codice}
              onChange={(e) => setCodice(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
              placeholder="Scansiona o digita"
            />
            <button
              type="button"
              onClick={() => setScannerAperto(true)}
              className="flex-shrink-0 rounded-lg bg-slate-800 px-3 py-2 text-sm text-white"
            >
              📷
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Categoria</label>
            <input
              value={categoria}
              onChange={(e) => setCategoria(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
              placeholder="Es. Ferramenta"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Unità di misura</label>
            <input
              value={unitaMisura}
              onChange={(e) => setUnitaMisura(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
              placeholder="pz, kg, mt..."
            />
          </div>
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">Scorta minima</label>
          <input
            type="number"
            min="0"
            step="any"
            value={quantitaMinima}
            onChange={(e) => setQuantitaMinima(e.target.value)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
          />
          <p className="mt-1 text-xs text-slate-500">
            Sotto questa quantità il materiale viene evidenziato come scorta bassa.
          </p>
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">Note</label>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={3}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
          />
        </div>

        {errore && <p className="text-sm text-red-600">{errore}</p>}

        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="flex-1 rounded-lg border border-slate-300 py-2.5 text-sm font-semibold text-slate-700"
          >
            Annulla
          </button>
          <button
            type="submit"
            disabled={salvataggio}
            className="flex-1 rounded-lg bg-brand-600 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
          >
            {salvataggio ? 'Salvataggio...' : 'Salva'}
          </button>
        </div>
      </form>

      {scannerAperto && (
        <Suspense fallback={null}>
          <BarcodeScanner
            onResult={(text) => {
              setCodice(text)
              setScannerAperto(false)
            }}
            onClose={() => setScannerAperto(false)}
          />
        </Suspense>
      )}
    </div>
  )
}
