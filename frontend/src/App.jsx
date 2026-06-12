import { useState, useEffect } from 'react'
import axios from 'axios'
import Header from './components/Header'
import Card from './components/Card'

function App() {
  const [status, setStatus] = useState(null)

  useEffect(() => {
    axios.get('http://localhost:8000/api/status')
      .then(response => setStatus(response.data))
      .catch(error => console.error(error))
  }, [])

  return (
    <div>
      <Header />
      {status ? (
        <Card title={status.project} description={status.message} />
      ) : (
        <p>Conectando con el universo...</p>
      )}
    </div>
  )
}

export default App