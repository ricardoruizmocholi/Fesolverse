import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

// LoginForm
// Qué hace: formulario de inicio de sesión con los campos email y
// contraseña.
// Por qué existe: permite a un usuario ya registrado autenticarse y
// obtener un token Sanctum para acceder a las rutas protegidas (Dashboard).
// Recibe: nada (usa el contexto de autenticación para iniciar sesión).
// Devuelve: el formulario de login, mostrando un mensaje de error si el
// login falla (credenciales incorrectas o IP bloqueada por rate limiting).
function LoginForm() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [enviando, setEnviando] = useState(false)

  const { login } = useAuth()
  const navigate = useNavigate()

  // handleSubmit
  // Qué hace: evita el envío normal del formulario, llama a login() del
  // contexto con el email y la contraseña introducidos. Si tiene éxito,
  // redirige al Dashboard; si falla, muestra el mensaje de error que
  // devuelve la API (credenciales incorrectas, validación o bloqueo de IP).
  // Recibe: event (el evento "submit" del formulario).
  // Devuelve: nada (sus efectos son la navegación o el mensaje de error).
  const handleSubmit = async (event) => {
    event.preventDefault()
    setError('')
    setEnviando(true)

    try {
      await login(email, password)
      navigate('/dashboard')
    } catch (err) {
      const mensaje = err.response?.data?.message || 'No se ha podido iniciar sesión.'
      setError(mensaje)
    } finally {
      setEnviando(false)
    }
  }

  return (
    <div className="login-split">
      {/* Mitad izquierda: solo decorativa, oculta en móvil (ver
          .login-split en App.css). Los 3 círculos concéntricos son
          puramente visuales. */}
      <div className="login-split__visual">
        <div className="login-split__circles" aria-hidden="true">
          <div className="login-split__circle login-split__circle--1"></div>
          <div className="login-split__circle login-split__circle--2"></div>
          <div className="login-split__circle login-split__circle--3"></div>
        </div>

        <div className="login-split__text">
          <h2 className="login-split__title">Bienvenido de vuelta.</h2>
          <p className="login-split__subtitle">Tu universo te espera.</p>
        </div>
      </div>

      {/* Mitad derecha: card de login centrada vertical y horizontalmente. */}
      <div className="login-split__panel">
        <form className="login-card" onSubmit={handleSubmit}>
          <p className="login-card__logo">Fesolverse <span className="navbar__dot">✦</span></p>

          <h2>Iniciar sesión</h2>

          {error && <p role="alert" className="form-error">{error}</p>}

          <div className="field">
            <label className="field__label" htmlFor="login-email">Email</label>
            <input
              className="field__input"
              id="login-email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
            />
          </div>

          <div className="field">
            <label className="field__label" htmlFor="login-password">Contraseña</label>
            <input
              className="field__input"
              id="login-password"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
            />
          </div>

          <button type="submit" className="btn-primary login-card__submit" disabled={enviando}>
            {enviando ? 'Entrando...' : 'Entrar'}
          </button>

          <p className="login-card__switch">
            ¿No tienes cuenta? <Link to="/register">Regístrate</Link>
          </p>
        </form>
      </div>
    </div>
  )
}

export default LoginForm
