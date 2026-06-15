// DESTINOS
// Por qué existe: define la tabla de destinos simbólicos del mapa de viaje.
// Cada entrada asocia un conjunto de palabras clave (buscadas en minúsculas
// dentro del título y el destino espacial de la ruta) con una ciudad real y
// sus coordenadas, que representan "en la Tierra" el destino espacial de la
// ruta generada.
const DESTINOS = [
  {
    palabrasClave: ['google', 'apple', 'silicon valley', 'tech usa'],
    destino: { ciudad: 'Mountain View, California', lat: 37.3861, lon: -122.0839 },
  },
  {
    palabrasClave: ['europa', 'remoto', 'freelance'],
    destino: { ciudad: 'Berlín, Alemania', lat: 52.5200, lon: 13.4050 },
  },
  {
    palabrasClave: ['montaña', 'escalada', 'kilimanjaro'],
    destino: { ciudad: 'Arusha, Tanzania', lat: -3.3869, lon: 36.6830 },
  },
  {
    palabrasClave: ['japón', 'japon', 'japonés', 'japones', 'anime'],
    destino: { ciudad: 'Tokio, Japón', lat: 35.6762, lon: 139.6503 },
  },
  {
    palabrasClave: ['música', 'musica', 'arte', 'creatividad'],
    destino: { ciudad: 'Viena, Austria', lat: 48.2082, lon: 16.3738 },
  },
  {
    palabrasClave: ['cocina', 'gastronomía', 'gastronomia', 'chef'],
    destino: { ciudad: 'París, Francia', lat: 48.8566, lon: 2.3522 },
  },
  {
    palabrasClave: ['finanzas', 'bolsa', 'trading'],
    destino: { ciudad: 'Nueva York, EEUU', lat: 40.7128, lon: -74.0060 },
  },
]

// Caso especial: si el destino espacial de la ruta es la Luna, el destino
// simbólico es Cabo Cañaveral, punto de partida de las misiones lunares.
const DESTINO_LUNA = { ciudad: 'Cabo Cañaveral, Florida', lat: 28.3922, lon: -80.6077 }

// Destino simbólico por defecto, cuando ninguna palabra clave coincide.
const DESTINO_DEFECTO = { ciudad: 'Madrid, España', lat: 40.4168, lon: -3.7038 }

// getDestinoCiudad
// Qué hace: a partir de la ruta generada, busca palabras clave en su título
// y en su destino espacial (en minúsculas, con includes()) y devuelve la
// ciudad simbólica y sus coordenadas asociadas. Si el destino espacial es
// "La Luna", devuelve Cabo Cañaveral. Si no coincide ninguna palabra clave,
// devuelve Madrid como destino por defecto.
// Recibe: route (objeto de la ruta generada, con "titulo" y
// "destino_espacial").
// Devuelve: { ciudad, lat, lon }
export function getDestinoCiudad(route) {
  const titulo = (route?.titulo || '').toLowerCase()
  const destinoEspacial = (route?.destino_espacial || '').toLowerCase()

  if (destinoEspacial === 'la luna') {
    return DESTINO_LUNA
  }

  const texto = `${titulo} ${destinoEspacial}`

  const coincidencia = DESTINOS.find(({ palabrasClave }) => (
    palabrasClave.some((palabra) => texto.includes(palabra))
  ))

  return coincidencia ? coincidencia.destino : DESTINO_DEFECTO
}

export default getDestinoCiudad
