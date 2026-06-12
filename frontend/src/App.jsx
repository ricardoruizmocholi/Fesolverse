import Header from './components/Header'
import Card from './components/Card'

function App() {
  return (
    <div>
      <Header />
      <Card title="React" description="Frontend del universo" />
      <Card title="Laravel" description="Backend del universo" />
      <Card title="Docker" description="Contenedor del universo" />
    </div>
  )
}

export default App