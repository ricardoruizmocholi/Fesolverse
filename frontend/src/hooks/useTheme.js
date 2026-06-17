import { useEffect, useState } from 'react'

// Clave de localStorage donde se guarda el tema elegido por el usuario.
const STORAGE_KEY = 'fesolverse_theme'

// useTheme
// Qué hace: gestiona el tema visual de la app ("dark" o "light"). Lee el
// tema guardado en localStorage (por defecto "dark") y, cada vez que
// cambia, añade o quita la clase "theme-light" en <html> (donde index.css
// define las variables del tema claro "nebulosa") y lo guarda de nuevo en
// localStorage para que persista entre sesiones.
// Recibe: nada.
// Devuelve: { theme, toggleTheme }.
function useTheme() {
  const [theme, setTheme] = useState(() => localStorage.getItem(STORAGE_KEY) || 'dark')

  useEffect(() => {
    document.documentElement.classList.toggle('theme-light', theme === 'light')
    localStorage.setItem(STORAGE_KEY, theme)
  }, [theme])

  const toggleTheme = () => {
    setTheme((actual) => (actual === 'dark' ? 'light' : 'dark'))
  }

  return { theme, toggleTheme }
}

export default useTheme
