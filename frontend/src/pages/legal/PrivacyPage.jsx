import { Link } from 'react-router-dom'

// PrivacyPage
// Qué hace: página de Política de Privacidad de Fesolverse conforme al RGPD.
// Detalla los datos recogidos, la base legal, los terceros que acceden a
// datos, los derechos del usuario y cómo ejercerlos.
// Por qué existe: obligación del RGPD (art. 13 y 14) de informar al usuario
// sobre el tratamiento de sus datos personales.
// Recibe: nada.
// Devuelve: la página de privacidad con breadcrumb y secciones legales.
function PrivacyPage() {
  return (
    <div className="legal-page">
      <nav className="legal-breadcrumb">
        <Link to="/">Inicio</Link> <span className="legal-breadcrumb__sep">→</span> <span>Política de privacidad</span>
      </nav>

      <h1 className="legal-page__titulo">Política de Privacidad</h1>
      <p className="legal-page__actualizacion">Última actualización: junio de 2026</p>

      <section className="legal-section">
        <h2>1. Responsable del tratamiento</h2>
        <p>
          El responsable del tratamiento de los datos personales recogidos a través de
          la plataforma es <strong>Fesolverse</strong>, accesible en
          fesolverse.ricardorm.es.
        </p>
        <p>Email de contacto: <strong>contacto@fesolverse.ricardorm.es</strong></p>
      </section>

      <section className="legal-section">
        <h2>2. Datos que recogemos</h2>

        <h3>Datos de registro</h3>
        <ul>
          <li><strong>Nombre</strong> — proporcionado por el usuario al registrarse.</li>
          <li><strong>Dirección de email</strong> — utilizada como identificador de la cuenta y para comunicaciones del servicio.</li>
          <li><strong>Contraseña</strong> — almacenada de forma cifrada (bcrypt); nunca se almacena en texto plano.</li>
          <li><strong>Dirección IP de registro</strong> — registrada en el momento del alta para fines de seguridad y prevención de abusos.</li>
        </ul>

        <h3>Datos de uso</h3>
        <ul>
          <li>Rutas de aprendizaje generadas, pasos (steps) y tareas (tasks).</li>
          <li>Estado de progreso de las tareas y notas del usuario.</li>
          <li>Fechas límite asignadas y modificaciones en el calendario.</li>
        </ul>

        <h3>Datos de pago</h3>
        <p>
          Los pagos son procesados íntegramente por <strong>Stripe</strong>. Fesolverse
          <strong> no almacena</strong> números de tarjeta de crédito, códigos CVV ni datos
          bancarios. Únicamente conservamos el identificador de la transacción (PaymentIntent
          ID), el importe, la moneda y el estado del pago.
        </p>

        <h3>Datos técnicos</h3>
        <ul>
          <li>Dirección IP de acceso en cada conexión.</li>
          <li>Fecha y hora de las conexiones.</li>
        </ul>

        <h3>Geolocalización aproximada</h3>
        <p>
          Para la vista de mapa de carretera, Fesolverse obtiene una ubicación geográfica
          aproximada (ciudad/región) a partir de la dirección IP del usuario mediante el
          servicio externo <strong>ipapi.co</strong>. Esta ubicación no se almacena en
          nuestros servidores; se utiliza únicamente en tiempo real para centrar el mapa
          en la sesión activa.
        </p>
      </section>

      <section className="legal-section">
        <h2>3. Base legal del tratamiento</h2>
        <ul>
          <li><strong>Ejecución del contrato</strong> (art. 6.1.b RGPD): el tratamiento de los datos de registro y de uso es necesario para prestar el servicio contratado por el usuario al crear su cuenta.</li>
          <li><strong>Interés legítimo</strong> (art. 6.1.f RGPD): la recogida de la IP de registro y de acceso responde al interés legítimo de Fesolverse en la seguridad de la plataforma y la prevención de abusos.</li>
          <li><strong>Consentimiento</strong> (art. 6.1.a RGPD): el usuario consiente el tratamiento de sus datos al registrarse y aceptar los Términos y Condiciones de Uso.</li>
        </ul>
      </section>

      <section className="legal-section">
        <h2>4. Finalidad del tratamiento</h2>
        <ul>
          <li>Prestar el servicio de generación de rutas de aprendizaje personalizadas.</li>
          <li>Gestionar la cuenta del usuario (autenticación, verificación de email, recuperación de contraseña).</li>
          <li>Procesar pagos para la actualización al plan Pro.</li>
          <li>Garantizar la seguridad de la plataforma y prevenir usos abusivos.</li>
          <li>Enviar comunicaciones relacionadas con el servicio (verificación de email, restablecimiento de contraseña).</li>
        </ul>
      </section>

      <section className="legal-section">
        <h2>5. Terceros que reciben datos</h2>
        <table className="legal-tabla">
          <thead>
            <tr>
              <th>Tercero</th>
              <th>Datos compartidos</th>
              <th>Finalidad</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td><strong>Google</strong> (Gemini API)</td>
              <td>Texto del destino y punto de partida introducidos por el usuario</td>
              <td>Generar la ruta de aprendizaje con IA</td>
            </tr>
            <tr>
              <td><strong>Stripe</strong></td>
              <td>Datos de pago (gestionados directamente por Stripe)</td>
              <td>Procesar el pago del plan Pro</td>
            </tr>
            <tr>
              <td><strong>ipapi.co</strong></td>
              <td>Dirección IP del usuario (petición desde el navegador)</td>
              <td>Obtener geolocalización aproximada para la vista de mapa</td>
            </tr>
          </tbody>
        </table>
      </section>

      <section className="legal-section">
        <h2>6. Transferencias internacionales de datos</h2>
        <p>
          Google (Gemini API) y Stripe tienen su sede en Estados Unidos. Las transferencias
          de datos a EE. UU. se realizan al amparo de las garantías adecuadas previstas en
          el RGPD, incluyendo las Cláusulas Contractuales Tipo de la Comisión Europea y,
          en su caso, el Marco de Privacidad de Datos UE-EE. UU. (Data Privacy Framework).
        </p>
        <p>
          ipapi.co procesa la dirección IP directamente desde el navegador del usuario
          (petición client-side), sin pasar por los servidores de Fesolverse.
        </p>
      </section>

      <section className="legal-section">
        <h2>7. Plazo de conservación</h2>
        <ul>
          <li><strong>Datos de cuenta y uso:</strong> mientras la cuenta del usuario permanezca activa. Si el usuario solicita la eliminación de su cuenta, los datos se eliminan en un plazo máximo de 30 días.</li>
          <li><strong>Datos fiscales (pagos):</strong> se conservan durante un mínimo de 5 años conforme a la normativa tributaria española.</li>
          <li><strong>Rutas archivadas:</strong> las rutas archivadas que no se restauren se eliminan automáticamente transcurridos 15 días.</li>
        </ul>
      </section>

      <section className="legal-section">
        <h2>8. Derechos del usuario</h2>
        <p>De acuerdo con el RGPD, tienes derecho a:</p>
        <ul>
          <li><strong>Acceso:</strong> conocer qué datos personales tratamos sobre ti.</li>
          <li><strong>Rectificación:</strong> corregir datos inexactos o incompletos.</li>
          <li><strong>Supresión:</strong> solicitar la eliminación de tus datos ("derecho al olvido").</li>
          <li><strong>Portabilidad:</strong> recibir tus datos en un formato estructurado y de uso común.</li>
          <li><strong>Oposición:</strong> oponerte al tratamiento de tus datos en determinados supuestos.</li>
          <li><strong>Limitación del tratamiento:</strong> solicitar la restricción del tratamiento en determinados supuestos.</li>
        </ul>
      </section>

      <section className="legal-section">
        <h2>9. Cómo ejercer tus derechos</h2>
        <p>
          Para ejercer cualquiera de los derechos anteriores, envía un email a
          <strong> contacto@fesolverse.ricardorm.es</strong> indicando tu nombre, dirección
          de email asociada a tu cuenta y el derecho que deseas ejercer. Responderemos en
          un plazo máximo de 30 días.
        </p>
      </section>

      <section className="legal-section">
        <h2>10. Reclamaciones ante la AEPD</h2>
        <p>
          Si consideras que el tratamiento de tus datos personales infringe la normativa
          vigente, tienes derecho a presentar una reclamación ante la Agencia Española de
          Protección de Datos (AEPD): <strong>www.aepd.es</strong>.
        </p>
      </section>
    </div>
  )
}

export default PrivacyPage
