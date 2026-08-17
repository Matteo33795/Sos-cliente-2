import { FormEvent, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import type { Ubicazione } from '../lib/database.types'

export function UbicazioniPage() {
  const [ubicazioni, setUbicazioni] = useState<Ubicazione[]>([])
  const [nome, setNome] = useState('')
  const [descrizione, setDescrizione] = useState('')
  const [loading, setLoading] = useState(true)
  const [errore, setErrore] = useState<string | null>(null)
  const [salvataggio, setSalvataggio] = useState(false)

  useEffect(() => {
    carica()
  }, [])

  async function carica() {
    setLoading(true)
    const { data, error } = await supabase.from('ubicazioni').select('*').order('nome')
    if (error) setErrore(error.message)
    setUbicazioni(data ?? [])
    setLoading(false)
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!nome.trim()) return
    setSalvataggio(true)
    setErrore(null)
    const { error } = await supabase
      .from('ubicazioni')
      .insert({ nome: nome.trim(), descrizione: descrizione.trim() || null })
    setSalvataggio(false)
    if (error) {
      setErrore(error.message)
      return
    }
    setNome('')
    setDescrizione('')
    carica()
  }

  async function elimina(id: string) {
    if (!confirm('Eliminare questa ubicazione? Sarà possibile solo se non ha giacenze o movimenti associati.')) return
    const { error } = await supabase.from('ubicazioni').delete().eq('id', id)
    if (error) {
      alert(`Errore: ${error.message}`)
      return
    }
    carica()
  }

  return (
    <div className="px-4 py-4">
      <h2 className="mb-4 text-lg font-semibold text-slate-900">Ubicazioni</h2>

      <form onSubmit={handleSubmit} className="mb-4 space-y-3 rounded-2xl bg-white p-4 shadow-sm">
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">Nome *</label>
          <input
            required
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            placeholder="Es. Magazzino A - Scaffale 3"
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">Descrizione</label>
          <input
            value={descrizione}
            onChange={(e) => setDescrizione(e.target.value)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
          />
        </div>
        {errore && <p className="text-sm text-red-600">{errore}</p>}
        <button
          type="submit"
          disabled={salvataggio}
          className="w-full rounded-lg bg-brand-600 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
        >
          {salvataggio ? 'Salvataggio...' : '+ Aggiungi ubicazione'}
        </button>
      </form>

      {loading ? (
        <p className="text-sm text-slate-500">Caricamento...</p>
      ) : ubicazioni.length === 0 ? (
        <p className="text-sm text-slate-500">Nessuna ubicazione registrata.</p>
      ) : (
        <ul className="space-y-2">
          {ubicazioni.map((u) => (
            <li
              key={u.id}
              className="flex items-center justify-between rounded-xl bg-white px-4 py-3 shadow-sm"
            >
              <div>
                <p className="text-sm font-medium text-slate-900">{u.nome}</p>
                {u.descrizione && <p className="text-xs text-slate-500">{u.descrizione}</p>}
              </div>
              <button onClick={() => elimina(u.id)} className="text-xs font-medium text-red-600">
                Elimina
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
