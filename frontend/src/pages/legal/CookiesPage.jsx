import { Link } from 'react-router-dom'

// CookiesPage
// Qué hace: página de Política de Cookies de Fesolverse. Explica qué cookies
// y mecanismos de almacenamiento local usa la plataforma, el hecho de que no
// se usan cookies de publicidad, y cómo gestionarlas.
// Por qué existe: obligación de la LSSI (art. 22.2) y del RGPD de informar
// al usuario sobre el uso de cookies y tecnologías equivalentes.
// Recibe: nada.
// Devuelve: la página de cookies con breadcrumb y secciones.
function CookiesPage() {
  return (
    <div className="legal-page">
      <nav className="legal-breadcrumb">
        <Link to="/">Inicio</Link> <span className="legal-breadcrumb__sep">→</span> <span>Política de cookies</span>
      </nav>

      <h1 className="legal-page__titulo">Política de Cookies</h1>
      <p className="legal-page__actualizacion">Última actualización: junio de 2026</p>

      <section className="legal-section">
        <h2>1. ¿Qué son las cookies?</h2>
        <p>
          Las cookies son pequeños archivos de texto que los sitios web almacenan en el
          navegador del usuario. Se utilizan para recordar información sobre la visita
          (como el idioma, la sesión iniciada o las preferencias de configuración) y
          mejorar la experiencia de navegación.
        </p>
        <p>
          Además de las cookies tradicionales, las aplicaciones web modernas pueden utilizar
          otros mecanismos de almacenamiento local como <strong>localStorage</strong> y
          <strong> sessionStorage</strong>, que cumplen una función similar.
        </p>
      </section>

      <section className="legal-section">
        <h2>2. Cookies y almacenamiento que usa Fesolverse</h2>

        <h3>Cookies técnicas / esenciales</h3>
        <p>
          Son estrictamente necesarias para el funcionamiento del servicio. No requieren
          consentimiento según la normativa vigente.
        </p>
        <table className="legal-tabla">
          <thead>
            <tr>
              <th>Nombre / Mecanismo</th>
              <th>Tipo</th>
              <th>Finalidad</th>
              <th>Duración</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td><code>token</code> (localStorage)</td>
              <td>Esencial</td>
              <td>Almacena el token de sesión (Sanctum) para mantener la autenticación entre recargas de página.</td>
              <td>Hasta que el usuario cierra sesión o se revoca el token.</td>
            </tr>
            <tr>
              <td><code>fesolverse-theme</code> (localStorage)</td>
              <td>Preferencia</td>
              <td>Guarda la preferencia de tema visual del usuario (oscuro o claro).</td>
              <td>Indefinida (hasta que el usuario la cambie o borre los datos del navegador).</td>
            </tr>
          </tbody>
        </table>

        <h3>Cookies de terceros</h3>
        <p>
          <strong>Fesolverse no utiliza cookies de publicidad, de seguimiento ni de analítica
          de terceros.</strong> No instalamos Google Analytics, Facebook Pixel ni ningún otro
          sistema de tracking.
        </p>
        <p>
          Durante el proceso de pago, <strong>Stripe</strong> puede instalar cookies propias
          necesarias para la seguridad de la transacción (prevención de fraude, autenticación
          3D Secure). Estas cookies son gestionadas directamente por Stripe y están sujetas a
          su propia política de privacidad:
          <br />
          <a href="https://stripe.com/es/privacy" target="_blank" rel="noopener noreferrer">
            https://stripe.com/es/privacy
          </a>
        </p>
      </section>

      <section className="legal-section">
        <h2>3. Cómo gestionar las cookies</h2>
        <p>
          Puedes configurar tu navegador para bloquear o eliminar las cookies en cualquier
          momento. Ten en cuenta que, si bloqueas las cookies esenciales, es posible que el
          servicio no funcione correctamente (por ejemplo, no podrás mantener la sesión
          iniciada).
        </p>
        <p>A continuación te indicamos cómo gestionar las cookies en los navegadores más comunes:</p>
        <ul>
          <li><strong>Google Chrome:</strong> Configuración → Privacidad y seguridad → Cookies y otros datos de sitios.</li>
          <li><strong>Mozilla Firefox:</strong> Configuración → Privacidad y seguridad → Cookies y datos del sitio.</li>
          <li><strong>Safari:</strong> Preferencias → Privacidad → Gestionar datos del sitio web.</li>
          <li><strong>Microsoft Edge:</strong> Configuración → Cookies y permisos del sitio → Cookies y datos almacenados.</li>
        </ul>
        <p>
          Para borrar el almacenamiento local (localStorage), puedes utilizar las herramientas
          de desarrollo del navegador (pestaña "Application" o "Almacenamiento") o borrar todos
          los datos del sitio desde la configuración del navegador.
        </p>
      </section>

      <section className="legal-section">
        <h2>4. Actualizaciones de esta política</h2>
        <p>
          Fesolverse puede actualizar esta Política de Cookies para reflejar cambios en la
          tecnología utilizada o en la normativa aplicable. Cualquier modificación se publicará
          en esta página con la fecha de última actualización.
        </p>
        <p>
          Si tienes alguna duda sobre el uso de cookies en Fesolverse, puedes contactarnos en
          <strong> contacto@fesolverse.ricardorm.es</strong>.
        </p>
      </section>
    </div>
  )
}

export default CookiesPage
