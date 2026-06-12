import { useState, useEffect } from 'react'
import axios from 'axios'
import Header from './components/Header'
import Card from './components/Card'

function App() {
  const [projects, setProjects] = useState([])

  useEffect(() => {
    axios.get('http://localhost:8000/api/projects')
      .then(response => setProjects(response.data))
      .catch(error => console.error(error))
  }, [])

  return (
    <div>
      <Header />
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

export default App