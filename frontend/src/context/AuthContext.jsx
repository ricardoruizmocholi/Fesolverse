import { createContext, useContext, useEffect, useState } from 'react'
import api from '../api/axios'

// Contexto de autenticación.
// Por qué existe: guarda en un único lugar el usuario logueado, el token
// Sanctum y las funciones para iniciar/cerrar sesión, de forma que
// cualquier componente de la app pueda acceder a ellos con useAuth().
const AuthContext = createContext(null)

// AuthProvider
// Qué hace: envuelve toda la aplicación y mantiene el estado de
// autenticación (usuario, token y si todavía se está comprobando la
// sesión). Al cargar la app, si ya hay un token guardado en localStorage,
// llama a /me para comprobar que sigue siendo válido y recuperar el
// usuario asociado.
// Por qué existe: evita repetir en cada componente la lectura/escritura
// de localStorage y las llamadas a /login, /register y /logout.
// Recibe: children (los componentes que tendrán acceso al contexto).
// Devuelve: <AuthContext.Provider> con { user, token, loading, login,
// register, logout }.
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [token, setToken] = useState(() => localStorage.getItem('token'))
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!token) {
      setLoading(false)
      return
    }

    api.get('/me')
      .then((response) => setUser(response.data.data.user))
      .catch(() => {
        // El token guardado ya no es válido: limpiamos la sesión.
        localStorage.removeItem('token')
        setToken(null)
        setUser(null)
      })
      .finally(() => setLoading(false))
  }, [token])

  // login
  // Qué hace: envía email y contraseña a POST /login. Si las credenciales
  // son correctas, guarda el token Sanctum recibido en localStorage y en
  // el estado, junto con los datos del usuario.
  // Recibe: email (string) y password (string).
  // Devuelve: una promesa con el JSON de la API. Si las credenciales son
  // incorrectas o la IP está bloqueada, la promesa se rechaza (Axios lanza
  // un error) para que el formulario muestre el mensaje correspondiente.
  const login = async (email, password) => {
    const response = await api.post('/login', { email, password })
    const { user: usuario, token: nuevoToken } = response.data.data

    localStorage.setItem('token', nuevoToken)
    setToken(nuevoToken)
    setUser(usuario)

    return response.data
  }

  // register
  // Qué hace: envía los datos de registro a POST /register. Si el registro
  // es correcto, el backend devuelve un token Sanctum, que se guarda igual
  // que en login para dejar al usuario autenticado automáticamente.
  // Recibe: nombre, email, password y passwordConfirmation (strings).
  // Devuelve: una promesa con el JSON de la API. Si la validación falla,
  // la promesa se rechaza para que el formulario muestre los errores.
  const register = async (nombre, email, password, passwordConfirmation) => {
    const response = await api.post('/register', {
      name: nombre,
      email,
      password,
      password_confirmation: passwordConfirmation,
    })
    const { user: usuario, token: nuevoToken } = response.data.data

    localStorage.setItem('token', nuevoToken)
    setToken(nuevoToken)
    setUser(usuario)

    return response.data
  }

  // logout
  // Qué hace: pide al backend que revoque el token actual (POST /logout)
  // y, tanto si la petición tiene éxito como si falla, limpia el token y
  // el usuario del estado y de localStorage.
  // Recibe: nada.
  // Devuelve: una promesa que se resuelve cuando la sesión se ha cerrado
  // en el frontend.
  const logout = async () => {
    try {
      await api.post('/logout')
    } finally {
      localStorage.removeItem('token')
      setToken(null)
      setUser(null)
    }
  }

  // actualizarUsuario
  // Qué hace: combina los datos recibidos con el usuario actual en el
  // estado (por ejemplo, { plan: 'pro' } tras un pago completado).
  // Por qué existe: permite a otros componentes (como UpgradePlan, tras la
  // Fase 7) reflejar cambios del usuario sin tener que recargar la página
  // ni volver a llamar a /me.
  // Recibe: datos (objeto con los campos del usuario a actualizar).
  // Devuelve: nada (su efecto es actualizar el estado "user").
  const actualizarUsuario = (datos) => {
    setUser((actual) => (actual ? { ...actual, ...datos } : actual))
  }

  const value = { user, token, loading, login, register, logout, actualizarUsuario }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

// useAuth
// Qué hace: hook de acceso al AuthContext.
// Por qué existe: evita importar useContext y AuthContext en cada
// componente que necesite saber si hay sesión o usar login/register/logout.
// Recibe: nada.
// Devuelve: el valor del AuthContext ({ user, token, loading, login,
// register, logout, actualizarUsuario }).
export function useAuth() {
  return useContext(AuthContext)
}
