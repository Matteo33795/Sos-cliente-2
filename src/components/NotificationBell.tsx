import { useEffect, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { attivaNotifiche, disattivaNotifiche, pushConfigurato, pushSupportato, statoIscrizione } from '../lib/push'

export function NotificationBell() {
  const { user } = useAuth()
  const [iscritto, setIscritto] = useState(false)
  const [caricamento, setCaricamento] = useState(false)

  useEffect(() => {
    if (pushSupportato) statoIscrizione().then(setIscritto)
  }, [])

  if (!pushSupportato || !pushConfigurato || !user) return null

  async function handleClick() {
    if (!user) return
    setCaricamento(true)
    const risultato = iscritto ? await disattivaNotifiche() : await attivaNotifiche(user.id)
    setCaricamento(false)

    if (risultato.error) {
      alert(risultato.error)
      return
    }
    setIscritto(!iscritto)
  }

  return (
    <button
      onClick={handleClick}
      disabled={caricamento}
      title={iscritto ? 'Disattiva notifiche scorta bassa' : 'Attiva notifiche scorta bassa'}
      className="flex-shrink-0 rounded-lg p-2 text-lg disabled:opacity-50"
    >
      {iscritto ? '🔔' : '🔕'}
    </button>
  )
}
