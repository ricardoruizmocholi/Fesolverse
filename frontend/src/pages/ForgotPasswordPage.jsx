import { useState } from 'react'
import { Link } from 'react-router-dom'
import api from '../api/axios'

// ForgotPasswordPage
// Qué hace: formulario de recuperación de contraseña. El usuario introduce
// su email y se envía un enlace de reset (POST /forgot-password). Tras
// enviar se muestra siempre el mismo mensaje de éxito (por seguridad, no
// revelamos si el email existe o no).
// En desarrollo (MAIL_MAILER=log) el email con el token se escribe en
// storage/logs/laravel.log del backend.
// Por qué existe: permite a los usuarios recuperar su contraseña sin
// contactar a un administrador.
// Recibe: nada.
// Devuelve: el formulario de recuperación con estilo split (mismo que login).
function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [enviado, setEnviado] = useState(false)
  const [error, setError] = useState('')

  // handleSubmit
  // Qué hace: envía el email a POST /forgot-password. Independientemente de
  // si el email existe, muestra el mensaje de confirmación.
  const handleSubmit = async (event) => {
    event.preventDefault()
    setError('')
    setEnviando(true)

    try {
      await api.post('/forgot-password', { email })
      setEnviado(true)
    } catch (err) {
      setError(err.response?.data?.message || 'No se ha podido enviar el enlace.')
    } finally {
      setEnviando(false)
    }
  }

  return (
    <div className="login-split">
      <div className="login-split__visual">
        <div className="login-split__circles" aria-hidden="true">
          <div className="login-split__circle login-split__circle--1"></div>
          <div className="login-split__circle login-split__circle--2"></div>
          <div className="login-split__circle login-split__circle--3"></div>
        </div>

        <div className="login-split__text">
          <h2 className="login-split__title">No te preocupes.</h2>
          <p className="login-split__subtitle">Recuperaremos tu acceso.</p>
        </div>
      </div>

      <div className="login-split__panel">
        <div className="login-card">
          <p className="login-card__logo">Fesolverse <span className="navbar__dot">✦</span></p>

          <h2>Recuperar contraseña</h2>

          {enviado ? (
            <div className="profile-card__exito" style={{ marginBottom: '1rem' }}>
              <p>Si ese email está registrado, recibirás un enlace en breve.</p>
              <p style={{ marginTop: '0.5rem', fontSize: '0.85rem', opacity: 0.7 }}>
                Revisa tu bandeja de entrada y la carpeta de spam.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit}>
              {error && <p role="alert" className="form-error">{error}</p>}

              <div className="field">
                <label className="field__label" htmlFor="forgot-email">Email de tu cuenta</label>
                <input
                  className="field__input"
                  id="forgot-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>

              <button type="submit" className="btn-primary login-card__submit" disabled={enviando}>
                {enviando ? 'Enviando…' : 'Enviar enlace de recuperación'}
              </button>
            </form>
          )}

          <p className="login-card__switch">
            <Link to="/login">← Volver al login</Link>
          </p>
        </div>
      </div>
    </div>
  )
}

export default ForgotPasswordPage
