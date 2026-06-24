import { Link } from 'react-router-dom'

// TermsPage
// Qué hace: página de Términos y Condiciones de Uso de Fesolverse. Contiene
// el texto legal completo (identificación del titular, uso del servicio,
// planes, propiedad intelectual, responsabilidad, pagos, etc.) conforme a
// la legislación española (LSSI).
// Por qué existe: obligación legal para cualquier servicio web que opere en
// España, y requisito del RGPD para informar a los usuarios sobre las
// condiciones de uso del servicio.
// Recibe: nada.
// Devuelve: la página de términos con breadcrumb y secciones legales.
function TermsPage() {
  return (
    <div className="legal-page">
      <nav className="legal-breadcrumb">
        <Link to="/">Inicio</Link> <span className="legal-breadcrumb__sep">→</span> <span>Términos y condiciones</span>
      </nav>

      <h1 className="legal-page__titulo">Términos y Condiciones de Uso</h1>
      <p className="legal-page__actualizacion">Última actualización: junio de 2026</p>

      <section className="legal-section">
        <h2>1. Identificación del titular</h2>
        <p>
          El presente sitio web, accesible en <strong>fesolverse.ricardorm.es</strong>, es
          propiedad de <strong>Fesolverse</strong>, un proyecto de desarrollo web con fines
          educativos y demostrativos.
        </p>
        <p>Email de contacto: <strong>contacto@fesolverse.ricardorm.es</strong></p>
      </section>

      <section className="legal-section">
        <h2>2. Objeto y ámbito de aplicación</h2>
        <p>
          Estos términos regulan el acceso y uso de la plataforma Fesolverse, un servicio
          web que genera rutas de aprendizaje personalizadas mediante inteligencia artificial.
          Al registrarse y utilizar el servicio, el usuario acepta íntegramente estas condiciones.
        </p>
      </section>

      <section className="legal-section">
        <h2>3. Acceso y uso del servicio</h2>
        <p>Fesolverse ofrece dos modalidades de uso:</p>
        <ul>
          <li><strong>Plan Free:</strong> acceso gratuito con un límite de 2 rutas de aprendizaje generadas por IA.</li>
          <li><strong>Plan Pro:</strong> acceso ilimitado a la generación de rutas mediante un pago único de 9,99 € (IVA incluido).</li>
        </ul>
        <p>
          El servicio requiere conexión a internet y un navegador web moderno. Fesolverse se
          reserva el derecho de modificar las características de cada plan, comunicando los
          cambios con antelación razonable.
        </p>
      </section>

      <section className="legal-section">
        <h2>4. Registro de usuarios</h2>
        <p>
          Para utilizar el servicio es obligatorio crear una cuenta proporcionando un nombre,
          una dirección de email válida y una contraseña segura. Tras el registro se enviará
          un correo de verificación; el usuario deberá confirmar su dirección de email para
          activar completamente su cuenta.
        </p>
        <p>
          El usuario es responsable de mantener la confidencialidad de sus credenciales de
          acceso y de notificar cualquier uso no autorizado de su cuenta.
        </p>
      </section>

      <section className="legal-section">
        <h2>5. Obligaciones del usuario</h2>
        <p>El usuario se compromete a:</p>
        <ul>
          <li>Hacer un uso lícito y conforme a la ley del servicio.</li>
          <li>No compartir sus credenciales de acceso con terceros.</li>
          <li>No realizar un uso abusivo o automatizado del generador de rutas por IA.</li>
          <li>No intentar vulnerar la seguridad de la plataforma ni acceder a datos de otros usuarios.</li>
          <li>No utilizar el servicio para fines ilegales, ofensivos o que vulneren derechos de terceros.</li>
        </ul>
      </section>

      <section className="legal-section">
        <h2>6. Propiedad intelectual</h2>
        <p>
          Las rutas de aprendizaje generadas por la IA a partir de los datos proporcionados
          por el usuario pertenecen al usuario que las ha generado, quien podrá utilizarlas,
          compartirlas o exportarlas libremente.
        </p>
        <p>
          La plataforma Fesolverse (incluyendo su diseño, código fuente, logotipos, textos e
          interfaz de usuario) es propiedad de Fesolverse y está protegida por la legislación
          vigente en materia de propiedad intelectual e industrial. Queda prohibida su
          reproducción, distribución o modificación sin autorización expresa.
        </p>
      </section>

      <section className="legal-section">
        <h2>7. Limitación de responsabilidad</h2>
        <p>
          Las rutas de aprendizaje generadas por Fesolverse son orientativas y no constituyen
          asesoramiento profesional, académico ni laboral. Fesolverse no garantiza que
          seguir una ruta conduzca a la obtención de un empleo, certificación o habilidad
          específica.
        </p>
        <p>
          Fesolverse no se responsabiliza de interrupciones temporales del servicio, errores
          en las respuestas de la IA ni de decisiones tomadas por el usuario basándose en las
          rutas generadas.
        </p>
      </section>

      <section className="legal-section">
        <h2>8. Pagos y reembolsos</h2>
        <p>
          La actualización al plan Pro se realiza mediante un pago único de 9,99 € procesado
          de forma segura por <strong>Stripe</strong>. Fesolverse no almacena datos de tarjetas
          de crédito o débito en sus servidores.
        </p>
        <p>
          El pago no es reembolsable salvo en los siguientes casos: (a) defecto técnico que
          impida el acceso al plan Pro tras el pago, o (b) cobro duplicado demostrable. En
          estos casos el usuario podrá solicitar el reembolso contactando con
          contacto@fesolverse.ricardorm.es en un plazo máximo de 14 días desde el pago.
        </p>
      </section>

      <section className="legal-section">
        <h2>9. Suspensión y cancelación de cuentas</h2>
        <p>
          Fesolverse se reserva el derecho de suspender o cancelar la cuenta de cualquier
          usuario que incumpla estas condiciones, haga un uso abusivo del servicio o ponga
          en riesgo la seguridad de la plataforma o de otros usuarios.
        </p>
        <p>
          El usuario puede solicitar la eliminación de su cuenta y todos sus datos en
          cualquier momento contactando con contacto@fesolverse.ricardorm.es.
        </p>
      </section>

      <section className="legal-section">
        <h2>10. Modificaciones de los términos</h2>
        <p>
          Fesolverse puede modificar estos términos en cualquier momento. Las modificaciones
          se publicarán en esta página con la fecha de última actualización. El uso continuado
          del servicio tras la publicación de los cambios implica la aceptación de las nuevas
          condiciones.
        </p>
      </section>

      <section className="legal-section">
        <h2>11. Legislación aplicable</h2>
        <p>
          Estos términos se rigen por la legislación española, en particular por la Ley 34/2002,
          de 11 de julio, de Servicios de la Sociedad de la Información y de Comercio
          Electrónico (LSSI-CE), y el Reglamento General de Protección de Datos (UE) 2016/679
          (RGPD). Para cualquier controversia derivada del uso del servicio, las partes se
          someten a la jurisdicción de los juzgados y tribunales de España.
        </p>
      </section>
    </div>
  )
}

export default TermsPage
