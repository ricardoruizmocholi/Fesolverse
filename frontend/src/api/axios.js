import axios from 'axios'

// Instancia de Axios para hablar con la API de Laravel.
// Por qué existe: centraliza la URL base de la API y añade
// automáticamente el token Sanctum (guardado en localStorage) a cada
// petición, para no repetir esta configuración en cada componente.
const api = axios.create({
  baseURL: 'https://fesolverse.ricardorm.es/api',
  headers: {
    Accept: 'application/json',
  },
})

// Interceptor de petición.
// Qué hace: antes de enviar cada petición, lee el token Sanctum guardado
// en localStorage y, si existe, lo añade como cabecera "Authorization".
// Recibe: la configuración de la petición que Axios va a enviar.
// Devuelve: la misma configuración, con la cabecera Authorization añadida
// si hay un token disponible.
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')

  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }

  return config
})

export default api
