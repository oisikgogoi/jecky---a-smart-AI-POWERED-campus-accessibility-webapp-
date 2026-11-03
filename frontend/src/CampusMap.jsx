import { useEffect, useMemo, useRef, useState } from 'react'
import L from 'leaflet'
import {
  ImageOverlay,
  MapContainer,
  Marker,
  Popup,
  useMap,
  useMapEvents,
} from 'react-leaflet'
import { Link } from 'react-router-dom'
import 'leaflet/dist/leaflet.css'
import './CampusMap.css'

const imageWidth = 1413
const imageHeight = 945
const imageBounds = [
  [0, 0],
  [imageHeight, imageWidth],
]

export const places = [
  {
    id: 'library',
    name: 'Campus Library',
    category: 'Academic',
    description: 'The main library and study spaces.',
    x: 0.499,
    y:0.493,
  },
  {
    id: 'indoor stadium',
    name: 'Indoor stadium',
    category: 'Sports',
    description: 'Indoor sports for badmintor and table tennis ',
    x: 0.328,
    y: 0.510,
  },
  {
    id: 'gym',
    name: 'gymnesium',
    category: 'sports',
    description: 'gymnesium for both boys and girls for physical fitness ',
    x: 0.224,
    y: 0.510,
  },
  {
    id: 'canteen',
    name: 'canteen',
    category: 'Others',
    description: 'Canteen besides the research lab',
    x: 0.365,
    y: 0.682,
  },
  {
    id: 'nrl research',
    name: 'research Lab',
    category: 'Academic',
    description: 'research lab infront of the auditorium.',
    x: 0.388,
    y: 0.738,
  },
   

   {
    id: 'place-1',
    name: 'Place 1',
    category: 'Hostels',
    description: 'Campus location.',
    x: 0.456,
    y: 0.760,
  },
  {
    id: 'Main-field',
    name: 'Main field',
    category: 'sports',
    description: 'Main field for sports and other activities',
    x: 0.206,
    y: 0.418,
  },
  {
    id: 'hostel-2',
    name: 'Hostel 2',
    category: 'Hostels',
    description: 'Boys hostel for students',
    x: 0.395,
    y: 0.314,
  },
  {
    id: 'hostel-3',
    name: 'Hostel 3',
    category: 'Hostels',
    description: 'Boys hostel for students',
    x: 0.498,
    y: 0.361,
  },
  {
    id: 'hostel-4',
    name: 'Hostel 4',
    category: 'Hostels',
    description: 'Boys hostel for students',
    x: 0.606,
    y: 0.392,
  },
  {
    id: 'hostel-5',
    name: 'Hostel 5',
    category: 'Hostels',
    description: 'Boys hostel for students',
    x: 0.725,
    y: 0.449,
  },
  {
    id: 'hostel-11',
    name: 'Hostel 11',
    category: 'Hostels',
    description: 'Boys hostel for first year students',
    x: 0.847,
    y: 0.489,
  },
  {
    id: 'hostel-6',
    name: 'Hostel 6',
    category: 'Hostels',
    description: 'Boys hostel for students',
    x: 0.743,
    y: 0.346,
  },
  {
    id: 'hostel-7',
    name: 'Hostel 7',
    category: 'Hostels',
    description: 'Boys hostel for students',
    x: 0.449,
    y: 0.147,
  },
  {
    id: 'hostel 6 field',
    name: 'hostel 6 field',
    category: 'sports',
    description: 'field for hostel 6 students for sports and other activities',
    x: 0.725,
    y: 0.165,
  },
  {
    id: 'main-building',
    name: 'Old building',
    category: 'Academic',
    description: 'The main academic building.',
    x: 0.651,
    y: 0.656,
  },
  {
    id: 'new-building',
    name: 'New building',
    category: 'Academic',
    description: 'The new academic building.',
    x: 0.515,
    y: 0.588,
  },
  {
    id: 'enterance',
    name: 'Enterance gate',
    category: 'others',
    description: 'enterance gate of the campus',
    x: 0.718,
    y: 0.965,
  },
  {
    id: 'atm',
    name: 'SBI ATM',
    category: 'others',
    description: 'Automated Teller Machine located on campus',
    x: 0.715,
    y: 0.904,
  },
  {
  id: 'hostel-11',
  name: 'Hostel 11',
  category: 'Hostels',
  description: 'boys hostel for students',
  x: 0.275,
  y: 0.271,
},
  {
    id: 'HOSTEL-9',
    name: 'Hostel 9',
    category: 'Hostels',
    description: 'Girls hostel for students',
    x: 0.313,
    y: 0.624,
  },
  {
    id: 'HOSTEL-10',
    name: 'Hostel 10',
    category: 'Hostels',
    description: 'Girls hostel for students',
    x: 0.292,
    y: 0.696,
  },
  {
    id: 'residency',
    name: 'residency area',
    category: 'residency',
    description: 'residency area for village people and staff members',
    x: 0.647,
    y: 0.294,
  },
  {
    id: 'hostel-8',
    name: 'Hostel 8',
    category: 'Hostels',
    description: 'Boys hostel for students',
    x: 0.321,
    y: 0.112,
  },
]

const categories = ['All places', 'Academic', 'Hostels', 'Residency', 'Sports', 'Others']

const categoryClass = (category) => category.toLowerCase()
const categoryInitial = (category) => ({
  academic: 'A',
  hostels: 'H',
  residency: 'R',
  sports: 'S',
  others: 'O',
})[categoryClass(category)]

const getCoordinates = ({ x, y }) => [imageHeight * (1 - y), imageWidth * x]

function createPlaceIcon(place, active) {
  const className = `campus-pin campus-pin--${categoryClass(place.category)}${active ? ' is-active' : ''}`
  return L.divIcon({
    className: 'campus-pin-container',
    html: `<span class="${className}" aria-hidden="true"></span>`,
    iconSize: [44, 44],
    iconAnchor: [22, 22],
  })
}

function FocusLocation({ place }) {
  const map = useMap()

  useEffect(() => {
    if (place) {
      map.flyTo(getCoordinates(place), Math.max(map.getZoom(), 0), {
        duration: 0.45,
      })
    }
  }, [map, place])

  return null
}

function MapClickLogger() {
  useMapEvents({
    click: ({ latlng }) => {
      console.log('Map location clicked (image-map coordinates, not GPS):', {
        longitude: Number(latlng.lng.toFixed(2)),
        latitude: Number(latlng.lat.toFixed(2)),
      })
    },
  })

  return null
}

function CampusMap() {
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('All places')
  const [selectedPlace, setSelectedPlace] = useState(null)
  const markerRefs = useRef(new Map())

  const filteredPlaces = useMemo(() => {
    const query = search.trim().toLowerCase()
    return places.filter((place) => {
      const matchesCategory =
        category === 'All places' || categoryClass(place.category) === categoryClass(category)
      const matchesSearch =
        !query ||
        `${place.name} ${place.category} ${place.description}`.toLowerCase().includes(query)
      return matchesCategory && matchesSearch
    })
  }, [category, search])

  const choosePlace = (place) => {
    const [latitude, longitude] = getCoordinates(place)
    console.log('Building selected (image-map coordinates, not GPS):', {
      building: place.name,
      longitude: Number(longitude.toFixed(2)),
      latitude: Number(latitude.toFixed(2)),
    })
    setSelectedPlace({ ...place })
  }

  useEffect(() => {
    if (selectedPlace) {
      markerRefs.current.get(selectedPlace.id)?.openPopup()
    }
  }, [selectedPlace])

  return (
    <main className="campus-map-page">
      <header className="map-header">
        <Link aria-label="Jecky home" className="map-brand" to="/">
          <img className="map-brand-logo" src="/logo%20jec.jpg" alt="Jorhat Engineering College logo" />
          <span>
            <strong>jecky.</strong>
            <small>Interactive campus map</small>
          </span>
        </Link>
        <div className="map-header-title">
          <span className="eyebrow">EXPLORE THE GROUNDS</span>
          <h1>Campus map</h1>
        </div>
        <div className="map-header-note">
          <span className="online-dot" aria-hidden="true" />
          Interactive map
        </div>
      </header>

      <div className="map-layout">
        <aside aria-label="Campus places" className="places-panel">
          <div className="places-heading">
            <div>
              <span className="eyebrow">YOUR CAMPUS</span>
              <h2>Places to explore</h2>
            </div>
            <span className="place-count">{filteredPlaces.length}</span>
          </div>

          <label className="map-search">
            <svg aria-hidden="true" viewBox="0 0 24 24">
              <circle cx="10.8" cy="10.8" r="6.8" />
              <path d="m16 16 4.5 4.5" />
            </svg>
            <input
              aria-label="Search campus places"
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search places..."
              type="search"
              value={search}
            />
            <kbd>/</kbd>
          </label>

          <div aria-label="Filter places by category" className="category-filters">
            {categories.map((item) => (
              <button
                aria-pressed={category === item}
                className={category === item ? 'filter-chip is-selected' : 'filter-chip'}
                key={item}
                onClick={() => setCategory(item)}
                type="button"
              >
                {item}
              </button>
            ))}
          </div>

          <div aria-live="polite" className="places-list">
            {filteredPlaces.length > 0 ? (
              filteredPlaces.map((place) => (
                <button
                  aria-pressed={selectedPlace?.id === place.id}
                  className={`place-card${selectedPlace?.id === place.id ? ' is-active' : ''}`}
                  key={place.id}
                  onClick={() => choosePlace(place)}
                  type="button"
                >
                  <span className={`place-icon place-icon--${categoryClass(place.category)}`}>
                    {categoryInitial(place.category)}
                  </span>
                  <span className="place-copy">
                    <strong>{place.name}</strong>
                    <span>{place.description}</span>
                  </span>
                  <span aria-hidden="true" className="place-arrow">↗</span>
                </button>
              ))
            ) : (
              <div className="empty-places">
                <span aria-hidden="true">⌕</span>
                <strong>No places found</strong>
                <p>Try a different search or category.</p>
              </div>
            )}
          </div>

          <div className="panel-tip">
            <span className="tip-icon" aria-hidden="true">✦</span>
            <p><strong>Explore at your pace</strong><br />Select a place or drag the map to look around.</p>
          </div>
        </aside>

        <section aria-label="Interactive campus map" className="map-stage">
          <div className="map-caption">
            <span className="map-caption-dot" aria-hidden="true" />
            <span>Campus grounds</span>
            <span className="caption-divider">/</span>
            <span className="caption-muted">Aerial view</span>
          </div>
          <MapContainer
            bounds={imageBounds}
            boundsOptions={{ padding: [28, 28] }}
            className="leaflet-campus-map"
            crs={L.CRS.Simple}
            maxBounds={imageBounds}
            maxBoundsViscosity={0.85}
            maxZoom={2}
            minZoom={-1.5}
            scrollWheelZoom
          >
            <ImageOverlay
              alt="Aerial illustration of the campus"
              bounds={imageBounds}
              url="/campusMap.png"
            />
            <MapClickLogger />
            <FocusLocation place={selectedPlace} />
            {filteredPlaces.map((place) => (
              <Marker
                eventHandlers={{ click: () => choosePlace(place) }}
                icon={createPlaceIcon(place, selectedPlace?.id === place.id)}
                key={place.id}
                position={getCoordinates(place)}
                ref={(marker) => {
                  if (marker) {
                    markerRefs.current.set(place.id, marker)
                  } else {
                    markerRefs.current.delete(place.id)
                  }
                }}
              >
                <Popup className="campus-popup">
                  <span className={`popup-category popup-category--${categoryClass(place.category)}`}>
                    {place.category}
                  </span>
                  <strong>{place.name}</strong>
                  <span>{place.description}</span>
                </Popup>
              </Marker>
            ))}
          </MapContainer>
          <div className="map-hint">
            <span aria-hidden="true">⌖</span>
            Scroll to zoom <i /> Drag to explore
          </div>
          <div className="map-legend" aria-label="Map categories">
            <span><i className="legend-dot legend-dot--academic" />Academic</span>
            <span><i className="legend-dot legend-dot--hostels" />Hostels</span>
            <span><i className="legend-dot legend-dot--residency" />Residency</span>
            <span><i className="legend-dot legend-dot--sports" />Sports</span>
            <span><i className="legend-dot legend-dot--others" />Others</span>
          </div>
        </section>
      </div>
    </main>
  )
}

export default CampusMap
