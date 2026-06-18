import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import api from '../api/axios'
import UpgradePlan from '../components/UpgradePlan'

// ETIQUETAS_ESTADO
// Mapea el estado del pago a la etiqueta legible y al modificador CSS del badge.
const ETIQUETAS_ESTADO = {
  pending:   { label: 'Pendiente',  mod: 'amarillo' },
  completed: { label: 'Completado', mod: 'verde' },
  failed:    { label: 'Fallido',    mod: 'rojo' },
}

// ProfilePage
// Qué hace: página de perfil del usuario autenticado con 3 tabs:
//   1. "Mi perfil" — editar nombre y email, ver info de solo lectura.
//   2. "Seguridad" — cambiar contraseña.
//   3. "Historial de pagos" — tabla de pagos o CTA de upgrade si plan free.
// Por qué existe: centraliza la gestión de cuenta que antes estaba repartida
// entre el Dashboard (plan y pagos) y ningún sitio (perfil y contraseña).
// Recibe: nada (usa el contexto de autenticación).
// Devuelve: la página de perfil con sus tabs.
function ProfilePage() {
  const { user, actualizarUsuario } = useAuth()
  const [tabActiva, setTabActiva] = useState('perfil')

  // --- Estado Tab 1: Mi perfil ---
  const [nombre, setNombre] = useState(user?.name || '')
  const [email, setEmail] = useState(user?.email || '')
  const [guardandoPerfil, setGuardandoPerfil] = useState(false)
  const [mensajePerfil, setMensajePerfil] = useState('')
  const [errorPerfil, setErrorPerfil] = useState('')

  // --- Estado Tab 2: Seguridad ---
  const [passActual, setPassActual] = useState('')
  const [passNueva, setPassNueva] = useState('')
  const [passConfirmar, setPassConfirmar] = useState('')
  const [guardandoPass, setGuardandoPass] = useState(false)
  const [mensajePass, setMensajePass] = useState('')
  const [errorPass, setErrorPass] = useState('')

  // --- Estado Tab 3: Historial de pagos ---
  const [pagos, setPagos] = useState([])
  const [cargandoPagos, setCargandoPagos] = useState(true)
  const [errorPagos, setErrorPagos] = useState('')

  // Cargar pagos al montar.
  useEffect(() => {
    let activo = true

    const cargar = async () => {
      try {
        const response = await api.get('/payments/history')
        if (activo) setPagos(response.data.data.payments)
      } catch {
        if (activo) setErrorPagos('No se ha podido cargar el historial de pagos.')
      } finally {
        if (activo) setCargandoPagos(false)
      }
    }

    cargar()
    return () => { activo = false }
  }, [])

  // handleGuardarPerfil
  // Qué hace: envía PUT /profile con nombre y email. Actualiza el contexto
  // de autenticación con los nuevos datos. Si el email ha cambiado, avisa
  // de que hay que verificarlo.
  const handleGuardarPerfil = async (event) => {
    event.preventDefault()
    setErrorPerfil('')
    setMensajePerfil('')
    setGuardandoPerfil(true)

    try {
      const response = await api.put('/profile', { name: nombre, email })
      actualizarUsuario(response.data.data.user)
      setMensajePerfil(response.data.message)
    } catch (err) {
      setErrorPerfil(err.response?.data?.message || 'No se ha podido actualizar el perfil.')
    } finally {
      setGuardandoPerfil(false)
    }
  }

  // handleCambiarPassword
  // Qué hace: envía PUT /profile/password con la contraseña actual y la nueva.
  const handleCambiarPassword = async (event) => {
    event.preventDefault()
    setErrorPass('')
    setMensajePass('')
    setGuardandoPass(true)

    try {
      const response = await api.put('/profile/password', {
        current_password: passActual,
        new_password: passNueva,
        new_password_confirmation: passConfirmar,
      })
      setMensajePass(response.data.message)
      setPassActual('')
      setPassNueva('')
      setPassConfirmar('')
    } catch (err) {
      setErrorPass(err.response?.data?.message || 'No se ha podido cambiar la contraseña.')
    } finally {
      setGuardandoPass(false)
    }
  }

  if (!user) return null

  return (
    <div className="profile-page">
      <h1 className="profile-page__titulo">Mi cuenta</h1>

      {/* Tabs */}
      <div className="profile-tabs">
        {[
          { id: 'perfil',   label: 'Mi perfil' },
          { id: 'seguridad', label: 'Seguridad' },
          { id: 'pagos',    label: 'Historial de pagos' },
        ].map((tab) => (
          <button
            key={tab.id}
            type="button"
            className={`profile-tabs__btn${tabActiva === tab.id ? ' profile-tabs__btn--activo' : ''}`}
            onClick={() => setTabActiva(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* TAB 1: Mi perfil */}
      {tabActiva === 'perfil' && (
        <div className="profile-card">
          <form onSubmit={handleGuardarPerfil}>
            <h2 className="profile-card__titulo">Datos personales</h2>

            {errorPerfil && <p role="alert" className="form-error">{errorPerfil}</p>}
            {mensajePerfil && <p className="profile-card__exito">{mensajePerfil}</p>}

            <div className="field">
              <label className="field__label" htmlFor="profile-name">Nombre</label>
              <input
                className="field__input"
                id="profile-name"
                type="text"
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                required
              />
            </div>

            <div className="field">
              <label className="field__label" htmlFor="profile-email">Email</label>
              <input
                className="field__input"
                id="profile-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <button type="submit" className="btn-primary" disabled={guardandoPerfil}>
              {guardandoPerfil ? 'Guardando…' : 'Guardar cambios'}
            </button>
          </form>

          {/* Info de solo lectura */}
          <div className="profile-card__readonly">
            <div className="profile-card__dato">
              <span className="profile-card__dato-label">Plan</span>
              <span className={`plan-badge plan-badge--${user.plan}`}>{user.plan}</span>
            </div>
            <div className="profile-card__dato">
              <span className="profile-card__dato-label">Tokens usados</span>
              <span>{user.tokens_usados}</span>
            </div>
            <div className="profile-card__dato">
              <span className="profile-card__dato-label">Fecha de registro</span>
              <span>{new Date(user.created_at).toLocaleDateString()}</span>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: Seguridad */}
      {tabActiva === 'seguridad' && (
        <div className="profile-card">
          <form onSubmit={handleCambiarPassword}>
            <h2 className="profile-card__titulo">Cambiar contraseña</h2>

            {errorPass && <p role="alert" className="form-error">{errorPass}</p>}
            {mensajePass && <p className="profile-card__exito">{mensajePass}</p>}

            <div className="field">
              <label className="field__label" htmlFor="pass-actual">Contraseña actual</label>
              <input
                className="field__input"
                id="pass-actual"
                type="password"
                value={passActual}
                onChange={(e) => setPassActual(e.target.value)}
                required
              />
            </div>

            <div className="field">
              <label className="field__label" htmlFor="pass-nueva">Nueva contraseña</label>
              <input
                className="field__input"
                id="pass-nueva"
                type="password"
                value={passNueva}
                onChange={(e) => setPassNueva(e.target.value)}
                required
                minLength={8}
              />
            </div>

            <div className="field">
              <label className="field__label" htmlFor="pass-confirmar">Confirmar nueva contraseña</label>
              <input
                className="field__input"
                id="pass-confirmar"
                type="password"
                value={passConfirmar}
                onChange={(e) => setPassConfirmar(e.target.value)}
                required
                minLength={8}
              />
            </div>

            <button type="submit" className="btn-primary" disabled={guardandoPass}>
              {guardandoPass ? 'Cambiando…' : 'Cambiar contraseña'}
            </button>
          </form>
        </div>
      )}

      {/* TAB 3: Historial de pagos */}
      {tabActiva === 'pagos' && (
        <div className="profile-card">
          <h2 className="profile-card__titulo">Historial de pagos</h2>

          {errorPagos && <p role="alert" className="form-error">{errorPagos}</p>}

          {cargandoPagos ? (
            <p>Cargando pagos…</p>
          ) : pagos.length === 0 ? (
            <div className="profile-card__vacio">
              <p>No tienes pagos registrados.</p>
              {user.plan === 'free' && (
                <>
                  <p className="profile-card__cta-texto">
                    Actualiza a Pro para desbloquear rutas ilimitadas.
                  </p>
                  <UpgradePlan />
                </>
              )}
            </div>
          ) : (
            <table className="profile-pagos__tabla">
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>Importe</th>
                  <th>Estado</th>
                  <th>ID Transacción</th>
                </tr>
              </thead>
              <tbody>
                {pagos.map((pago) => {
                  const estado = ETIQUETAS_ESTADO[pago.estado] ?? { label: pago.estado, mod: 'amarillo' }
                  return (
                    <tr key={pago.id}>
                      <td>{new Date(pago.created_at).toLocaleDateString()}</td>
                      <td>{(pago.amount / 100).toFixed(2)} {pago.currency?.toUpperCase()}</td>
                      <td>
                        <span className={`admin-payments__badge admin-payments__badge--${estado.mod}`}>
                          {estado.label}
                        </span>
                      </td>
                      <td className="admin-payments__txid" title={pago.stripe_payment_intent_id}>
                        {pago.stripe_payment_intent_id?.slice(0, 20) ?? '—'}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  )
}

export default ProfilePage
