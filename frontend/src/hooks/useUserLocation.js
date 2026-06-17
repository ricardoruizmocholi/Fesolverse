import { useEffect, useState } from 'react'

// Coordenadas de Valencia, usadas como último recurso si tanto la
// geolocalización del navegador como la geolocalización por IP fallan.
const UBICACION_POR_DEFECTO = {
  lat: 39.4699,
  lon: -0.3763,
  city: 'Valencia',
  country: 'España',
}

// Clave de sessionStorage donde se cachea la ubicación detectada, para no
// repetir la petición de geolocalización/IP en cada renderizado o recarga
// dentro de la misma pestaña.
const CACHE_KEY = 'fesolverse_user_location'

// Tiempo máximo de espera para la geolocalización por IP (ipapi.co). Si se
// supera, se cancela la petición con AbortController y se usa Valencia como
// ubicación por defecto (ver el catch del paso 3 más abajo).
const TIMEOUT_IPAPI_MS = 3000

// useUserLocation
// Qué hace: obtiene la ubicación aproximada del usuario para usarla como
// punto de origen en el mapa de viaje. Primero intenta la geolocalización
// del navegador (pide permiso al usuario); si el usuario la deniega o
// falla, recurre a geolocalización por IP (ipapi.co); si esto también
// falla, usa Valencia como ubicación por defecto. El resultado se guarda en
// sessionStorage para no repetir la detección durante la sesión.
// Recibe: nada.
// Devuelve: { lat, lon, city, country, loading, error }
function useUserLocation() {
  const [ubicacion, setUbicacion] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    let activo = true

    const detectarUbicacion = async () => {
      // 1. Si ya tenemos una ubicación cacheada en esta sesión, la usamos
      // directamente y no volvemos a pedir permisos ni hacer peticiones.
      const cacheada = sessionStorage.getItem(CACHE_KEY)

      if (cacheada) {
        try {
          const datos = JSON.parse(cacheada)

          if (activo) {
            setUbicacion(datos)
            setLoading(false)
          }

          return
        } catch {
          sessionStorage.removeItem(CACHE_KEY)
        }
      }

      // 2. Intentar la geolocalización del navegador (pide permiso al
      // usuario). Se envuelve en una promesa para poder usar await.
      const ubicacionNavegador = await new Promise((resolve) => {
        if (!navigator.geolocation) {
          resolve(null)
          return
        }

        navigator.geolocation.getCurrentPosition(
          (posicion) => {
            resolve({
              lat: posicion.coords.latitude,
              lon: posicion.coords.longitude,
              city: null,
              country: null,
            })
          },
          // Si el usuario deniega el permiso o falla por cualquier motivo,
          // resolvemos con null para pasar al siguiente método.
          () => resolve(null),
          { timeout: 8000 }
        )
      })

      if (ubicacionNavegador) {
        if (activo) {
          setUbicacion(ubicacionNavegador)
          setLoading(false)
        }

        sessionStorage.setItem(CACHE_KEY, JSON.stringify(ubicacionNavegador))
        return
      }

      // 3. Si la geolocalización del navegador no está disponible o se
      // deniega, recurrimos a la geolocalización por IP (ipapi.co), que no
      // requiere permiso del usuario. Se limita a TIMEOUT_IPAPI_MS (3s) con
      // AbortController: si ipapi.co no responde a tiempo, se cancela la
      // petición y se cae al catch de abajo, que usa Valencia de inmediato.
      try {
        const controlador = new AbortController()
        const idTimeout = setTimeout(() => controlador.abort(), TIMEOUT_IPAPI_MS)

        const respuesta = await fetch('https://ipapi.co/json/', { signal: controlador.signal })
        clearTimeout(idTimeout)
        const datos = await respuesta.json()

        const ubicacionIp = {
          lat: datos.latitude,
          lon: datos.longitude,
          city: datos.city || null,
          country: datos.country_name || null,
        }

        if (activo) {
          setUbicacion(ubicacionIp)
          setLoading(false)
        }

        sessionStorage.setItem(CACHE_KEY, JSON.stringify(ubicacionIp))
      } catch {
        // 4. Si también falla la geolocalización por IP (incluido el
        // timeout de arriba), usamos Valencia por defecto de forma
        // silenciosa (sin mostrar error al usuario).
        if (activo) {
          setUbicacion(UBICACION_POR_DEFECTO)
          setLoading(false)
        }

        sessionStorage.setItem(CACHE_KEY, JSON.stringify(UBICACION_POR_DEFECTO))
      }
    }

    detectarUbicacion().catch(() => {
      if (activo) {
        setUbicacion(UBICACION_POR_DEFECTO)
        setError('No se ha podido detectar tu ubicación.')
        setLoading(false)
      }
    })

    return () => { activo = false }
  }, [])

  const ubicacionFinal = ubicacion || UBICACION_POR_DEFECTO

  return {
    lat: ubicacionFinal.lat,
    lon: ubicacionFinal.lon,
    city: ubicacionFinal.city,
    country: ubicacionFinal.country,
    loading,
    error,
  }
}

export default useUserLocation
