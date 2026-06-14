import { useState } from 'react'
import { loadStripe } from '@stripe/stripe-js'
import { Elements, CardElement, useStripe, useElements } from '@stripe/react-stripe-js'
import api from '../api/axios'
import { useAuth } from '../context/AuthContext'

// Estilo del CardElement de Stripe, para que combine con el tema oscuro de
// Fesolverse (no se puede aplicar CSS normal porque Stripe renderiza el
// formulario de tarjeta dentro de un iframe).
const ESTILO_CARD_ELEMENT = {
  style: {
    base: {
      color: '#e0f2fe',
      fontSize: '16px',
      '::placeholder': {
        color: '#93c5fd',
      },
    },
    invalid: {
      color: '#fca5a5',
    },
  },
}

// FormularioPago
// Qué hace: muestra el formulario de tarjeta de Stripe (CardElement) y, al
// enviarlo, confirma el PaymentIntent con stripe.confirmCardPayment(). Si
// Stripe confirma el pago ("succeeded"), avisa al backend con POST
// /payments/confirm para que verifique el pago y actualice el plan del
// usuario, y finalmente llama a onExito().
// Por qué existe: separa la lógica que necesita los hooks useStripe() y
// useElements() (que solo funcionan dentro de <Elements>) del resto de
// UpgradePlan.
// Recibe: clientSecret (string, del PaymentIntent creado por el backend) y
// onExito (función a llamar cuando el pago se ha completado y confirmado).
// Devuelve: el formulario de pago, con su botón de envío y los mensajes de
// error de Stripe o del backend.
function FormularioPago({ clientSecret, onExito }) {
  const stripe = useStripe()
  const elements = useElements()
  const [procesando, setProcesando] = useState(false)
  const [error, setError] = useState('')

  // handleSubmit
  // Qué hace: evita el envío normal del formulario, confirma el pago con
  // Stripe usando los datos de tarjeta introducidos en el CardElement y, si
  // Stripe lo confirma, llama a POST /payments/confirm para que el backend
  // verifique el pago contra Stripe y actualice el plan del usuario a "pro".
  // Recibe: event (el evento "submit" del formulario).
  // Devuelve: nada (sus efectos son mostrar un error o llamar a onExito()).
  const handleSubmit = async (event) => {
    event.preventDefault()

    if (!stripe || !elements) {
      return
    }

    setError('')
    setProcesando(true)

    const resultado = await stripe.confirmCardPayment(clientSecret, {
      payment_method: {
        card: elements.getElement(CardElement),
      },
    })

    if (resultado.error) {
      // Tarjeta rechazada, fondos insuficientes, datos incorrectos, etc.
      setError(resultado.error.message)
      setProcesando(false)
      return
    }

    if (resultado.paymentIntent.status !== 'succeeded') {
      setError('El pago no se ha podido completar. Inténtalo de nuevo.')
      setProcesando(false)
      return
    }

    try {
      await api.post('/payments/confirm', {
        payment_intent_id: resultado.paymentIntent.id,
      })

      onExito()
    } catch (err) {
      setError(err.response?.data?.message || 'No se ha podido confirmar el pago.')
    } finally {
      setProcesando(false)
    }
  }

  return (
    <form className="upgrade-plan__formulario" onSubmit={handleSubmit}>
      <div className="upgrade-plan__card-element">
        <CardElement options={ESTILO_CARD_ELEMENT} />
      </div>

      {error && <p role="alert" className="upgrade-plan__error">{error}</p>}

      <button type="submit" disabled={!stripe || procesando}>
        {procesando ? 'Procesando pago...' : 'Pagar 9,99 €'}
      </button>
    </form>
  )
}

// UpgradePlan
// Qué hace: muestra la tarjeta del plan Pro (rutas ilimitadas, 9,99€ pago
// único). Al pulsar "Actualizar a Pro", crea una sesión de pago en el
// backend (POST /payments/checkout) y, con el "client_secret" recibido,
// muestra el formulario de tarjeta de Stripe (FormularioPago). Si el pago
// se completa y se confirma, actualiza el plan del usuario en AuthContext
// (sin recargar la página) y muestra un mensaje de bienvenida al plan Pro.
//
// Tarjeta de prueba de Stripe para probar el flujo completo:
//   Número: 4242 4242 4242 4242
//   Fecha de caducidad: cualquier fecha futura (p. ej. 12/34)
//   CVC: cualquiera de 3 dígitos (p. ej. 123)
//
// Por qué existe: es el punto de entrada del sistema de pagos (Fase 7),
// mostrado en el Dashboard a los usuarios con plan "free".
// Recibe: nada (usa el contexto de autenticación para actualizar el plan).
// Devuelve: la tarjeta del plan Pro, el formulario de pago (si ya se ha
// iniciado el pago) o el mensaje de bienvenida (si el pago se ha completado).
function UpgradePlan() {
  const { actualizarUsuario } = useAuth()
  const [clientSecret, setClientSecret] = useState(null)
  const [stripePromise, setStripePromise] = useState(null)
  const [iniciando, setIniciando] = useState(false)
  const [error, setError] = useState('')
  const [completado, setCompletado] = useState(false)

  // iniciarPago
  // Qué hace: pide al backend una nueva sesión de pago (POST
  // /payments/checkout). Con la respuesta, carga Stripe.js usando la
  // "publishable_key" (la única clave de Stripe segura para el frontend) y
  // guarda el "client_secret", lo que hace que se muestre el formulario de
  // tarjeta (FormularioPago) dentro de <Elements>.
  // Recibe: nada.
  // Devuelve: nada (sus efectos son mostrar el formulario de pago o un error).
  const iniciarPago = async () => {
    setError('')
    setIniciando(true)

    try {
      const response = await api.post('/payments/checkout')
      const { client_secret, publishable_key } = response.data.data

      setStripePromise(loadStripe(publishable_key))
      setClientSecret(client_secret)
    } catch (err) {
      setError(err.response?.data?.message || 'No se ha podido iniciar el pago.')
    } finally {
      setIniciando(false)
    }
  }

  // handlePagoCompletado
  // Qué hace: se ejecuta cuando FormularioPago avisa de que el pago se ha
  // completado y confirmado en el backend. Actualiza el plan del usuario en
  // AuthContext a "pro" (sin recargar la página) y muestra el mensaje de
  // bienvenida.
  // Recibe: nada.
  // Devuelve: nada (sus efectos son actualizar el estado "completado" y el
  // usuario del AuthContext).
  const handlePagoCompletado = () => {
    actualizarUsuario({ plan: 'pro' })
    setCompletado(true)
  }

  if (completado) {
    return (
      <div className="upgrade-plan upgrade-plan--exito">
        <h3>¡Bienvenido al plan Pro! 🚀</h3>
        <p>Ya tienes rutas ilimitadas. Gracias por tu apoyo a Fesolverse.</p>
      </div>
    )
  }

  return (
    <div className="upgrade-plan">
      <div className="upgrade-plan__tarjeta">
        <h3>Plan Pro</h3>
        <p className="upgrade-plan__precio">9,99 € <span>pago único</span></p>
        <p>Rutas ilimitadas para explorar todo tu universo profesional.</p>

        {!clientSecret && (
          <button type="button" onClick={iniciarPago} disabled={iniciando}>
            {iniciando ? 'Preparando pago...' : 'Actualizar a Pro'}
          </button>
        )}
      </div>

      {error && <p role="alert" className="upgrade-plan__error">{error}</p>}

      {clientSecret && stripePromise && (
        <Elements stripe={stripePromise} options={{ clientSecret }}>
          <FormularioPago clientSecret={clientSecret} onExito={handlePagoCompletado} />
        </Elements>
      )}
    </div>
  )
}

export default UpgradePlan
