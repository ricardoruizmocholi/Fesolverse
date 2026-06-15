import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

// RegisterForm
// Qué hace: formulario de registro con los campos nombre, email,
// contraseña y confirmar contraseña.
// Por qué existe: permite a un visitante crear una cuenta nueva. Si el
// registro tiene éxito, el backend devuelve un token Sanctum y el usuario
// queda autenticado automáticamente.
// Recibe: nada (usa el contexto de autenticación para registrarse).
// Devuelve: el formulario de registro, mostrando un mensaje de error si el
// registro falla (contraseñas distintas o errores de validación del backend).
function RegisterForm() {
  const [nombre, setNombre] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmarPassword, setConfirmarPassword] = useState('')
  const [error, setError] = useState('')
  const [enviando, setEnviando] = useState(false)

  const { register } = useAuth()
  const navigate = useNavigate()

  // handleSubmit
  // Qué hace: evita el envío normal del formulario, comprueba en el
  // cliente que las dos contraseñas coinciden y llama a register() del
  // contexto. Si tiene éxito, redirige al Dashboard; si falla, muestra los
  // errores de validación que devuelve el backend (o las contraseñas no
  // coinciden).
  // Recibe: event (el evento "submit" del formulario).
  // Devuelve: nada (sus efectos son la navegación o el mensaje de error).
  const handleSubmit = async (event) => {
    event.preventDefault()
    setError('')

    if (password !== confirmarPassword) {
      setError('Las contraseñas no coinciden.')
      return
    }

    setEnviando(true)

    try {
      await register(nombre, email, password, confirmarPassword)
      navigate('/dashboard')
    } catch (err) {
      const erroresValidacion = err.response?.data?.data

      const mensaje = erroresValidacion && typeof erroresValidacion === 'object'
        ? Object.values(erroresValidacion).flat().join(' ')
        : err.response?.data?.message || 'No se ha podido completar el registro.'

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
          <h2>Crear cuenta</h2>

          {error && <p role="alert" className="form-error">{error}</p>}

          <div className="field">
            <label className="field__label" htmlFor="register-name">Nombre</label>
            <input
              className="field__input"
              id="register-name"
              type="text"
              value={nombre}
              onChange={(event) => setNombre(event.target.value)}
              required
            />
          </div>

          <div className="field">
            <label className="field__label" htmlFor="register-email">Email</label>
            <input
              className="field__input"
              id="register-email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
            />
          </div>

          <div className="field">
            <label className="field__label" htmlFor="register-password">Contraseña</label>
            <input
              className="field__input"
              id="register-password"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
              minLength={8}
            />
          </div>

          <div className="field">
            <label className="field__label" htmlFor="register-confirm-password">Confirmar contraseña</label>
            <input
              className="field__input"
              id="register-confirm-password"
              type="password"
              value={confirmarPassword}
              onChange={(event) => setConfirmarPassword(event.target.value)}
              required
              minLength={8}
            />
          </div>

          <button type="submit" className="btn-primary auth-card__submit" disabled={enviando}>
            {enviando ? 'Creando cuenta...' : 'Registrarme'}
          </button>

          <p className="auth-card__switch">
            ¿Ya tienes cuenta? <Link to="/login">Inicia sesión</Link>
          </p>
        </form>
      </div>
    </div>
  )
}

export default RegisterForm
