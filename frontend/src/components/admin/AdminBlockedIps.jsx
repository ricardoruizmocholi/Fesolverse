import { useEffect, useState } from 'react'
import api from '../../api/axios'

// AdminBlockedIps
// Qué hace: muestra la lista de IPs bloqueadas actualmente (GET
// /admin/blocked-ips), con su motivo y hasta cuándo están bloqueadas, y
// permite desbloquear cada una (DELETE /admin/blocked-ips/{id}).
// Por qué existe: es la sección "IPs Bloqueadas" del panel de
// administración (Fase 6).
// Recibe: nada.
// Devuelve: la tabla de IPs bloqueadas, o un mensaje de carga/error/vacío.
function AdminBlockedIps() {
  const [ips, setIps] = useState([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')
  // Id de la IP que se está desbloqueando, para desactivar su botón
  // mientras se espera la respuesta del backend.
  const [eliminando, setEliminando] = useState(null)

  // Carga la lista de IPs bloqueadas al montar la sección.
  useEffect(() => {
    let activo = true

    const cargarIps = async () => {
      setCargando(true)
      setError('')

      try {
        const response = await api.get('/admin/blocked-ips')

        if (activo) {
          setIps(response.data.data.blocked_ips)
        }
      } catch {
        if (activo) {
          setError('No se han podido cargar las IPs bloqueadas.')
        }
      } finally {
        if (activo) {
          setCargando(false)
        }
      }
    }

    cargarIps()

    return () => { activo = false }
  }, [])

  // desbloquear
  // Qué hace: elimina el bloqueo de una IP (DELETE
  // /admin/blocked-ips/{id}) y, si tiene éxito, la quita de la lista local.
  const desbloquear = async (blockedIp) => {
    setError('')
    setEliminando(blockedIp.id)

    try {
      await api.delete(`/admin/blocked-ips/${blockedIp.id}`)
      setIps((previas) => previas.filter((ip) => ip.id !== blockedIp.id))
    } catch (err) {
      setError(err.response?.data?.message || 'No se ha podido desbloquear la IP.')
    } finally {
      setEliminando(null)
    }
  }

  if (cargando) {
    return <p>Cargando IPs bloqueadas...</p>
  }

  return (
    <div className="admin-ips">
      {error && <p role="alert" className="admin-error">{error}</p>}

      {ips.length === 0 ? (
        <p>No hay ninguna IP bloqueada actualmente.</p>
      ) : (
        <table className="admin-tabla">
          <thead>
            <tr>
              <th>IP</th>
              <th>Motivo</th>
              <th>Bloqueada hasta</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {ips.map((ip) => (
              <tr key={ip.id}>
                <td>{ip.ip}</td>
                <td>{ip.motivo || '—'}</td>
                <td>{new Date(ip.bloqueada_hasta).toLocaleString()}</td>
                <td>
                  <button type="button" onClick={() => desbloquear(ip)} disabled={eliminando === ip.id}>
                    Desbloquear
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}

export default AdminBlockedIps
