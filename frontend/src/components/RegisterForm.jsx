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
    <form onSubmit={handleSubmit}>
      <h2>Crear cuenta</h2>

      {error && <p role="alert">{error}</p>}

      <div>
        <label htmlFor="register-name">Nombre</label>
        <input
          id="register-name"
          type="text"
          value={nombre}
          onChange={(event) => setNombre(event.target.value)}
          required
        />
      </div>

      <div>
        <label htmlFor="register-email">Email</label>
        <input
          id="register-email"
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          required
        />
      </div>

      <div>
        <label htmlFor="register-password">Contraseña</label>
        <input
          id="register-password"
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          required
          minLength={8}
        />
      </div>

      <div>
        <label htmlFor="register-confirm-password">Confirmar contraseña</label>
        <input
          id="register-confirm-password"
          type="password"
          value={confirmarPassword}
          onChange={(event) => setConfirmarPassword(event.target.value)}
          required
          minLength={8}
        />
      </div>

      <button type="submit" disabled={enviando}>
        {enviando ? 'Creando cuenta...' : 'Registrarme'}
      </button>

      <p>
        ¿Ya tienes cuenta? <Link to="/login">Inicia sesión</Link>
      </p>
    </form>
  )
}

export default RegisterForm
