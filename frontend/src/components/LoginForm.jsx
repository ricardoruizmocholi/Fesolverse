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
    <div className="auth-page">
      <div className="auth-page__visual">
        <div className="auth-orbits" aria-hidden="true">
          <div className="auth-orbits__ring auth-orbits__ring--1"></div>
          <div className="auth-orbits__ring auth-orbits__ring--2"></div>
          <div className="auth-orbits__ring auth-orbits__ring--3"></div>
        </div>

        <p className="auth-page__visual-text">
          Tu universo profesional te espera.
          <span>Genera tu ruta hacia cualquier meta con IA.</span>
        </p>
      </div>

      <div className="auth-page__form">
        <form className="auth-card" onSubmit={handleSubmit}>
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

          <button type="submit" className="btn-primary auth-card__submit" disabled={enviando}>
            {enviando ? 'Entrando...' : 'Entrar'}
          </button>

          <p className="auth-card__switch">
            ¿No tienes cuenta? <Link to="/register">Regístrate</Link>
          </p>
        </form>
      </div>
    </div>
  )
}

export default LoginForm
