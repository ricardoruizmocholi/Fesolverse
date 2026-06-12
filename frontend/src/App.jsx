import { useState, useEffect } from 'react'
import { Link, Routes, Route } from 'react-router-dom'
import api from './api/axios'
import Header from './components/Header'
import Card from './components/Card'
import LoginForm from './components/LoginForm'
import RegisterForm from './components/RegisterForm'
import Dashboard from './components/Dashboard'
import ProtectedRoute from './components/ProtectedRoute'
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
    <div>
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
// de navegación (que cambia según haya o no sesión iniciada) y define las
// rutas de la app: inicio, login, registro y dashboard (protegido).
// Por qué existe: punto de entrada de la SPA y lugar donde se conectan las
// páginas existentes (inicio) con las nuevas de autenticación.
// Recibe: nada (usa el contexto de autenticación para el menú).
// Devuelve: la cabecera, la navegación y el contenido de la ruta activa.
function App() {
  const { user, logout } = useAuth()

  return (
    <div>
      <Header />

      <nav>
        <Link to="/">Inicio</Link>
        {' | '}
        {user ? (
          <>
            <Link to="/dashboard">Dashboard</Link>
            {' | '}
            <button onClick={logout}>Cerrar sesión</button>
          </>
        ) : (
          <>
            <Link to="/login">Iniciar sesión</Link>
            {' | '}
            <Link to="/register">Registrarse</Link>
          </>
        )}
      </nav>

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
      </Routes>
    </div>
  )
}

export default App