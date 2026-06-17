import useTheme from '../hooks/useTheme'

// Header
// Qué hace: cabecera de la app, con el logo/tagline de Fesolverse y un botón
// pequeño tipo "pill" para alternar entre el tema oscuro y el tema claro
// "nebulosa" (useTheme.js se encarga de aplicar la clase "theme-light" en
// <html> y de guardar la preferencia en localStorage).
// Recibe: nada.
// Devuelve: la cabecera con el logo, el tagline y el botón de tema.
function Header() {
  const { theme, toggleTheme } = useTheme()

  return (
    <header className="navbar__brand">
      <div className="navbar__brand-text">
        <h1 className="navbar__logo">
          Fesolverse <span className="navbar__dot">✦</span>
        </h1>
        <p className="navbar__tagline">Explora tu universo profesional</p>
      </div>

      
    </header>
  )
}

export default Header
