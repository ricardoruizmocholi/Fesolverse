import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import api from '../api/axios'

// ResetPasswordPage
// Qué hace: formulario para restablecer la contraseña usando el token
// recibido por email. Lee token y email de los query params de la URL
// (?token=...&email=...). Al enviar llama a POST /reset-password; si
// tiene éxito redirige al login.
// Por qué existe: es la página a la que apunta el enlace del email de
// recuperación generado por sendPasswordResetNotification.
// Recibe: nada (usa useSearchParams para leer los query params).
// Devuelve: el formulario de reset con estilo split (mismo que login).
function ResetPasswordPage() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()

  const token = searchParams.get('token') || ''
  const email = searchParams.get('email') || ''

  const [password, setPassword] = useState('')
  const [confirmacion, setConfirmacion] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [error, setError] = useState('')

  // handleSubmit
  // Qué hace: envía token, email, password y password_confirmation a
  // POST /reset-password. Si éxito, redirige al login.
  const handleSubmit = async (event) => {
    event.preventDefault()
    setError('')
    setEnviando(true)

    try {
      await api.post('/reset-password', {
        token,
        email,
        password,
        password_confirmation: confirmacion,
      })
      navigate('/login', { state: { mensaje: 'Contraseña actualizada correctamente. Ya puedes iniciar sesión.' } })
    } catch (err) {
      setError(err.response?.data?.message || 'El enlace no es válido o ha expirado.')
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
          <h2 className="login-split__title">Casi listo.</h2>
          <p className="login-split__subtitle">Elige una nueva contraseña.</p>
        </div>
      </div>

      <div className="login-split__panel">
        <form className="login-card" onSubmit={handleSubmit}>
          <p className="login-card__logo">Fesolverse <span className="navbar__dot">✦</span></p>

          <h2>Nueva contraseña</h2>

          {(!token || !email) && (
            <p role="alert" className="form-error">
              Enlace incompleto. Solicita un nuevo enlace de recuperación.
            </p>
          )}

          {error && <p role="alert" className="form-error">{error}</p>}

          <div className="field">
            <label className="field__label" htmlFor="reset-password">Nueva contraseña</label>
            <input
              className="field__input"
              id="reset-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={8}
            />
          </div>

          <div className="field">
            <label className="field__label" htmlFor="reset-confirm">Confirmar contraseña</label>
            <input
              className="field__input"
              id="reset-confirm"
              type="password"
              value={confirmacion}
              onChange={(e) => setConfirmacion(e.target.value)}
              required
              minLength={8}
            />
          </div>

          <button
            type="submit"
            className="btn-primary login-card__submit"
            disabled={enviando || !token || !email}
          >
            {enviando ? 'Restableciendo…' : 'Restablecer contraseña'}
          </button>

          <p className="login-card__switch">
            <Link to="/login">← Volver al login</Link>
          </p>
        </form>
      </div>
    </div>
  )
}

export default ResetPasswordPage
