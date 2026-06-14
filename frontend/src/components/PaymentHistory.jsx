import { useEffect, useState } from 'react'
import api from '../api/axios'

// Etiquetas en español para cada estado de pago, usadas en la tabla.
const ETIQUETAS_ESTADO = {
  pending: 'Pendiente',
  completed: 'Completado',
  failed: 'Fallido',
}

// PaymentHistory
// Qué hace: carga el historial de pagos del usuario autenticado (GET
// /payments/history) y lo muestra en una tabla con la fecha, el importe (en
// euros), el estado y el ID de transacción (PaymentIntent de Stripe) de
// cada pago.
// Por qué existe: permite a un usuario con plan "pro" consultar sus pagos
// anteriores (Fase 7), mostrado en el Dashboard.
// Recibe: nada.
// Devuelve: la tabla de pagos, o un mensaje de carga/error/vacío.
function PaymentHistory() {
  const [pagos, setPagos] = useState([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')

  // Carga el historial de pagos al montar el componente.
  useEffect(() => {
    let activo = true

    const cargarHistorial = async () => {
      setCargando(true)
      setError('')

      try {
        const response = await api.get('/payments/history')

        if (activo) {
          setPagos(response.data.data.payments)
        }
      } catch {
        if (activo) {
          setError('No se ha podido cargar el historial de pagos.')
        }
      } finally {
        if (activo) {
          setCargando(false)
        }
      }
    }

    cargarHistorial()

    return () => { activo = false }
  }, [])

  if (cargando) {
    return <p>Cargando historial de pagos...</p>
  }

  if (error) {
    return <p role="alert" className="payment-history__error">{error}</p>
  }

  if (pagos.length === 0) {
    return <p>Todavía no tienes pagos registrados.</p>
  }

  return (
    <table className="payment-history__tabla">
      <thead>
        <tr>
          <th>Fecha</th>
          <th>Importe</th>
          <th>Estado</th>
          <th>ID de transacción</th>
        </tr>
      </thead>
      <tbody>
        {pagos.map((pago) => (
          <tr key={pago.id}>
            <td>{new Date(pago.created_at).toLocaleDateString()}</td>
            <td>{(pago.amount / 100).toFixed(2)} {pago.currency.toUpperCase()}</td>
            <td>{ETIQUETAS_ESTADO[pago.estado] || pago.estado}</td>
            <td>{pago.stripe_payment_intent_id}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

export default PaymentHistory
