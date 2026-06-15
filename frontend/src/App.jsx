import { useState, useEffect } from 'react'
import { Link, Routes, Route } from 'react-router-dom'
import './App.css'
import api from './api/axios'
import Header from './components/Header'
import Card from './components/Card'
import LoginForm from './components/LoginForm'
import RegisterForm from './components/RegisterForm'
import Dashboard from './components/Dashboard'
import ProtectedRoute from './components/ProtectedRoute'
import AdminPanel from './pages/AdminPanel'
import { useAuth } from './context/AuthContext'

// Home
// Qué hace: página de inicio. Carga y muestra la lista de proyectos desde
// GET /api/projects.
// Por qué existe: es la página original de la app (ya funcionaba antes de
// la Fase 2); se mantiene igual, solo se traslada aquí para poder convivir
// con las nuevas rutas de autenticación.
// Recibe: nada.
// Devuelve: la lista de proyectos, cada uno dentro de un componente Card.
function Home() {
  const [projects, setProjects] = useState([])

  useEffect(() => {
    api.get('/projects')
      .then(response => setProjects(response.data))
      .catch(error => console.error(error))
  }, [])

  return (
    <div className="home">
      {projects.map(project => (
        <Card
          key={project.id}
          title={project.title}
          description={project.description}
        />
      ))}
    </div>
  )
}

// App
// Qué hace: componente raíz de la aplicación. Muestra la cabecera, un menú
// de navegación (que cambia según haya o no sesión iniciada, y según el rol
// del usuario) y define las rutas de la app: inicio, login, registro,
// dashboard (protegido) y panel de administración (protegido, solo admin).
// Por qué existe: punto de entrada de la SPA y lugar donde se conectan las
// páginas existentes (inicio) con las nuevas de autenticación y de
// administración.
// Recibe: nada (usa el contexto de autenticación para el menú).
// Devuelve: la cabecera, la navegación y el contenido de la ruta activa.
function App() {
  const { user, logout } = useAuth()

  return (
    <div className="app-shell">
      <div className="stars" aria-hidden="true">
        <div className="stars__layer stars__layer--sm"></div>
        <div className="stars__layer stars__layer--md"></div>
        <div className="stars__layer stars__layer--lg"></div>
      </div>

      <div className="navbar">
        <Header />

        <nav className="navbar__links">
          <Link className="navbar__link" to="/">Inicio</Link>
          {' | '}
          {user ? (
            <>
              <Link className="navbar__link" to="/dashboard">Dashboard</Link>
              {' | '}
              {user.role === 'admin' && (
                <>
                  <Link className="navbar__link" to="/admin">Admin</Link>
                  {' | '}
                </>
              )}
              <button className="navbar__logout" onClick={logout}>Cerrar sesión</button>
            </>
          ) : (
            <>
              <Link className="navbar__link" to="/login">Iniciar sesión</Link>
              {' | '}
              <Link className="navbar__link" to="/register">Registrarse</Link>
            </>
          )}
        </nav>
      </div>

      <main className="app-shell__main">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<LoginForm />} />
          <Route path="/register" element={<RegisterForm />} />
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin"
            element={
              <ProtectedRoute>
                <AdminPanel />
              </ProtectedRoute>
            }
          />
        </Routes>
      </main>
    </div>
  )
}

export default App