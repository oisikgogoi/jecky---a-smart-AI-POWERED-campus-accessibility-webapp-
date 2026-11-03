import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { Link, NavLink, Route, Routes, useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import CampusMap, { places as campusPlaces } from './CampusMap.jsx'
import { apiRequest, loadApiData } from './api.js'
import './App.css'
import './CommunityPages.css'

const shortcuts = [
  { icon: 'pin', label: 'Campus Map', href: '/map' },
  { icon: 'calendar', label: 'Class Timetable', href: '/timetable' },
  { icon: 'note', label: 'Notes', href: '/notes' },
  { icon: 'calendar', label: 'Events', href: '/events' },
  { icon: 'users', label: 'Clubs', href: '/clubs' },
  { icon: 'user', label: 'Faculty & HODs', href: '/contact' },
  { icon: 'building', label: 'Facilities', href: '/map' },
]

const featuredMapPlaceIds = new Set([
  'library',
  'indoor stadium',
  'gym',
  'canteen',
  'nrl research',
  'Main-field',
  'main-building',
  'new-building',
])

const chatSuggestions = [
  'What is JECKY?',
  'Will today’s class be held?',
  'Where is the computer lab?',
  'Where do I find notes?',
  'What events are coming up?',
  'How do I contact the HoD?',
]

const chatPlaces = [
  {
    name: 'Computer Lab',
    aliases: ['computer lab', 'cse lab', 'lab'],
    where: 'CSE Department, 1st floor',
    steps: ['Enter through the main gate', 'Walk straight to the CSE block', 'Take the stairs to the 1st floor', 'The lab is on your right'],
  },
  {
    name: 'Library',
    aliases: ['library', 'books'],
    where: 'Central Library, ground floor',
    steps: ['Enter through the main gate', 'Turn left at the first junction', 'The library is the building ahead'],
  },
  {
    name: 'Admin Office',
    aliases: ['admin office', 'office'],
    where: 'Administrative Building, ground floor',
    steps: ['Enter through the main gate', 'Walk straight for about two minutes', 'The office is the first building on your left'],
  },
]

const chatTopics = [
  {
    id: 'about',
    keywords: ['jecky', 'what is', 'about', 'platform', 'who are you'],
    text: 'JECKY is a campus platform for Jorhat Engineering College, bringing together campus information, the timetable, notes, events, clubs and this campus guide.',
  },
  {
    id: 'classes',
    keywords: ['class', 'held', 'cancel', 'timetable', 'schedule', 'lecture'],
    text: 'Check the timetable for today’s schedule and administrator updates. Select your year and section to see the latest information.',
    link: '/timetable',
    linkLabel: 'Open class timetable',
  },
  {
    id: 'roles',
    keywords: ['who can', 'permission', 'role', 'access', 'post'],
    text: 'Students can view campus information and ask this guide. College administrators can update or cancel today’s class timetable, and club administrators can publish club events.',
  },
  {
    id: 'notes',
    keywords: ['note', 'material', 'study', 'download'],
    text: 'Browse and download study notes shared by the college administrator.',
    link: '/notes',
    linkLabel: 'Browse study notes',
  },
  {
    id: 'events',
    keywords: ['event', 'fest', 'upcoming', 'notice', 'happening'],
    text: 'Explore campus events, including upcoming dates, venues and event details.',
    link: '/events',
    linkLabel: 'Browse campus events',
  },
  {
    id: 'clubs',
    keywords: ['club', 'join', 'society'],
    text: 'Explore the campus clubs, their activities and contact information to find a community that interests you.',
    link: '/clubs',
    linkLabel: 'Explore campus clubs',
  },
  {
    id: 'contact',
    keywords: ['hod', 'contact', 'faculty', 'professor', 'teacher', 'phone', 'head of'],
    text: 'Use the campus contact page to send an enquiry to the appropriate college office.',
    link: '/contact',
    linkLabel: 'Open campus contacts',
  },
]

const contactOffices = [
  {
    topic: 'Principal’s Office',
    description: 'General administration and official correspondence.',
    phone: '+91 00000 00001',
    email: 'principal.office@example.test',
  },
  {
    topic: 'Academic & Examination Office',
    description: 'Examinations, academic schedules, and student records.',
    phone: '+91 00000 00002',
    email: 'academic.office@example.test',
  },
  {
    topic: 'Department Offices',
    description: 'Course and faculty enquiries. Please mention your department.',
    phone: '+91 00000 00003',
    email: 'departments@example.test',
  },
  {
    topic: 'Training & Placement Cell',
    description: 'Placements, recruitment visits, and career enquiries.',
    phone: '+91 00000 00004',
    email: 'placements@example.test',
  },
  {
    topic: 'Student Affairs',
    description: 'Student activities, clubs, and campus support.',
    phone: '+91 00000 00005',
    email: 'student.affairs@example.test',
  },
]

function getChatAnswer(question) {
  const query = question.trim().toLowerCase()
  if (/^(hi|hello|hey)\b/.test(query)) {
    return { text: 'Hi! Ask me about classes, notes, events, clubs or where something is on campus.' }
  }

  const place = chatPlaces.find((item) => item.aliases.some((alias) => query.includes(alias)))
  if (place) return { text: `Here’s how to reach the ${place.name}:`, place }

  const topic = chatTopics
    .map((item) => ({ ...item, score: item.keywords.filter((keyword) => query.includes(keyword)).length }))
    .filter((item) => item.score > 0)
    .sort((left, right) => right.score - left.score)[0]
  if (topic) return { text: topic.text, link: topic.link, linkLabel: topic.linkLabel }

  return {
    text: 'I’m still learning that one. Try a suggested question, or ask about the timetable, notes, events, clubs, faculty contacts or a place on campus.',
  }
}

const timetablePeriods = [
  { time: '8:00–9:00 AM', label: 'Period 1' },
  { time: '9:00–10:00 AM', label: 'Period 2' },
  { time: '10:30 AM–12:20 PM', label: 'Period 3' },
  { time: '2:00–4:00 PM', label: 'Period 4' },
]

const timetableDays = [
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
]

const timetableYears = [
  {
    id: 'first',
    label: '1st Year',
    sections: ['A', 'B', 'C', 'D', 'E'],
    schedule: [
      ['Engineering Mathematics I', 'Engineering Physics', 'Basic Electrical Engineering', 'Programming Fundamentals'],
      ['Engineering Chemistry', 'Engineering Mathematics I', 'Workshop Practice', 'Programming Fundamentals'],
      ['Basic Electrical Engineering', 'Engineering Mechanics', 'Engineering Chemistry', 'Mathematics Tutorial'],
      ['Programming Fundamentals', 'Engineering Physics', 'Engineering Drawing', 'Basic Electrical Engineering'],
      ['Engineering Mathematics I', 'Communication Skills', 'Engineering Mechanics', 'Programming Fundamentals'],
      ['Physics Laboratory', 'Engineering Drawing', 'Mathematics Tutorial', 'Library / Self Study'],
    ],
  },
  {
    id: 'second',
    label: '2nd Year',
    sections: ['A', 'B', 'C'],
    schedule: [
      ['Engineering Mathematics III', 'Data Structures', 'Digital Logic Design', 'Object-Oriented Programming'],
      ['Database Management Systems', 'Engineering Mathematics III', 'Discrete Mathematics', 'Data Structures Lab'],
      ['Object-Oriented Programming', 'Digital Logic Design', 'Database Management Systems', 'Communication Skills'],
      ['Data Structures', 'Discrete Mathematics', 'Object-Oriented Programming Lab', 'Environmental Studies'],
      ['Engineering Mathematics III', 'Database Management Systems', 'Digital Logic Design', 'Data Structures'],
      ['Digital Logic Lab', 'Discrete Mathematics', 'Library / Self Study', 'Project Discussion'],
    ],
  },
]

const notesClasses = [
  { id: 'first', label: '1st Year', sections: ['A', 'B', 'C', 'D', 'E'] },
  { id: 'second', label: '2nd Year', sections: ['A', 'B', 'C'] },
]

function getNoteClassLabel(classId) {
  return notesClasses.find((item) => item.id === classId)?.label || 'All classes'
}

function Icon({ name, className = '' }) {
  const paths = {
    home: <><path d="m3 10 9-7 9 7" /><path d="M5 9v11h14V9M9 20v-6h6v6" /></>,
    cap: <><path d="m2 9 10-5 10 5-10 5L2 9Z" /><path d="M6 11v5c3 2 9 2 12 0v-5M22 9v6" /></>,
    pin: <><path d="M20 10c0 5-8 12-8 12S4 15 4 10a8 8 0 1 1 16 0Z" /><circle cx="12" cy="10" r="2.5" /></>,
    calendar: <><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M7 3v4m10-4v4M3 10h18" /></>,
    clock: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>,
    note: <><path d="M6 3h9l4 4v14H6z" /><path d="M14 3v5h5M9 13h7m-7 4h7" /></>,
    users: <><path d="M16 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="10" cy="7" r="4" /><path d="M20 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" /></>,
    user: <><circle cx="12" cy="8" r="4" /><path d="M4 21a8 8 0 0 1 16 0" /></>,
    building: <><rect x="4" y="3" width="16" height="18" rx="1" /><path d="M8 7h2m4 0h2M8 11h2m4 0h2M8 15h2m4 0h2M10 21v-3h4v3" /></>,
    briefcase: <><rect x="3" y="7" width="18" height="14" rx="2" /><path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m-13 5h18m-11 0v2h4v-2" /></>,
    star: <path d="m12 3 2.8 5.7 6.2.9-4.5 4.4 1.1 6.2-5.6-3-5.6 3 1.1-6.2L3 9.6l6.2-.9L12 3Z" />,
    phone: <path d="M5 3h3l2 5-2 2a16 16 0 0 0 6 6l2-2 5 2v3c0 1-1 2-2 2A16 16 0 0 1 3 5c0-1 1-2 2-2Z" />,
    search: <><circle cx="10.8" cy="10.8" r="6.8" /><path d="m16 16 4.5 4.5" /></>,
    shield: <><path d="M12 3 20 6v5c0 5-3 8-8 10-5-2-8-5-8-10V6l8-3Z" /><path d="m9 12 2 2 4-4" /></>,
    arrow: <><path d="M4 12h16m-7-7 7 7-7 7" /></>,
    code: <><path d="m8 8-4 4 4 4m8-8 4 4-4 4m-3-10-2 12" /></>,
    palette: <><path d="M12 3a9 9 0 1 0 0 18h1a2 2 0 0 0 1.6-3.2 1.5 1.5 0 0 1 1.2-2.4H18a3 3 0 0 0 3-3c0-5.2-4-9.4-9-9.4Z" /><path d="M7.5 11h.01M10 7.5h.01m5 .5h.01" /></>,
    leaf: <><path d="M20 4c-9 0-15 4-15 11a5 5 0 0 0 5 5c7 0 11-6 10-16Z" /><path d="M5 20c3-5 7-8 12-11" /></>,
    sports: <><path d="M3 10v4m4-7v10m10-10v10m4-7v4M7 12h10" /></>,
    book: <><path d="M4 5a2 2 0 0 1 2-2h13v17H6a2 2 0 0 1-2-2V5Z" /><path d="M4 17a2 2 0 0 1 2-2h13M8 7h7m-7 4h7" /></>,
    mail: <><rect x="3" y="5" width="18" height="14" rx="2" /><path d="m3 7 9 6 9-6" /></>,
    headset: <><path d="M3 13v-2a9 9 0 0 1 18 0v2" /><path d="M5 13h2v6H5a2 2 0 0 1-2-2v-2a2 2 0 0 1 2-2Zm14 0h-2v6h2a2 2 0 0 0 2-2v-2a2 2 0 0 0-2-2Zm-2 7a5 5 0 0 1-5 2" /></>,
    sparkle: <><path d="m12 3 1.5 5.5L19 10l-5.5 1.5L12 17l-1.5-5.5L5 10l5.5-1.5L12 3Z" /><path d="m19 15 .8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8L19 15Z" /></>,
  }

  return (
    <svg aria-hidden="true" className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      {paths[name]}
    </svg>
  )
}

function Brand({ compact = false }) {
  return (
    <Link className={`brand${compact ? ' brand-compact' : ''}`} to="/" aria-label="Jecky home">
      <img className="brand-logo" src="/logo%20jec.jpg" alt="Jorhat Engineering College logo" />
      <span className="brand-copy"><strong>Jecky</strong></span>
    </Link>
  )
}

function Header() {
  return (
    <header className="portal-header">
      <Brand />
      <nav className="portal-nav" aria-label="Main navigation">
        <NavLink to="/" end><Icon name="home" />Home</NavLink>
        <NavLink to="/timetable"><Icon name="cap" />Academics</NavLink>
        <NavLink to="/notes"><Icon name="note" />Notes</NavLink>
        <NavLink to="/clubs"><Icon name="star" />Clubs</NavLink>
        <NavLink to="/events"><Icon name="calendar" />Events</NavLink>
        <NavLink to="/contact"><Icon name="phone" />Contact</NavLink>
      </nav>
      <div className="header-actions">
        <Link to="/chat" className="search-button" aria-label="Open Jecky campus guide"><Icon name="search" /></Link>
        <Link to="/admin" className="login-button"><Icon name="shield" />Admin Login</Link>
      </div>
    </header>
  )
}

function Hero() {
  const [question, setQuestion] = useState('')
  const navigate = useNavigate()

  function askQuestion(event) {
    event.preventDefault()
    const text = question.trim()
    if (text) navigate(`/chat?question=${encodeURIComponent(text)}`)
  }

  return (
    <section className="portal-hero" id="home">
      <div className="hero-backdrop" />
      <div className="hero-content">
        <p className="hero-kicker">WELCOME TO</p>
        <h1>Jorhat Engineering<br /><span>College</span></h1>
        <p className="hero-intro">Your campus assistant for everything you need —<br className="desktop-break" /> from classes and campus locations to clubs, events, and resources.</p>
        <form className="assistant-form" onSubmit={askQuestion}>
          <Icon name="sparkle" />
          <label className="visually-hidden" htmlFor="campus-question">Ask about the Jecky campus</label>
          <input
            id="campus-question"
            value={question}
            onChange={(event) => setQuestion(event.target.value)}
            placeholder="Ask your college assistant..."
          />
          <button type="submit" aria-label="Ask question"><Icon name="arrow" /></button>
        </form>
        <div className="suggested-questions" aria-label="Popular questions">
          {['Where is the CSE lab?', 'Show me the college map', 'Is class cancelled today?', 'Find club details'].map((prompt) => (
            <button key={prompt} type="button" onClick={() => {
              setQuestion(prompt)
            }}>
              <Icon name={prompt.includes('map') ? 'pin' : prompt.includes('club') ? 'users' : prompt.includes('class') ? 'calendar' : 'search'} />
              {prompt}
            </button>
          ))}
        </div>
      </div>
      <div className="hero-bottom-line" />
    </section>
  )
}

function QuickLinks() {
  return (
    <nav className="quick-links" aria-label="Campus shortcuts">
      {shortcuts.map((shortcut) => {
        const content = <><Icon name={shortcut.icon} /><span>{shortcut.label}</span><b aria-hidden="true">›</b></>
        return shortcut.href.startsWith('/')
          ? <Link key={shortcut.label} to={shortcut.href}>{content}</Link>
          : <a key={shortcut.label} href={shortcut.href}>{content}</a>
      })}
    </nav>
  )
}

function SectionTitle({ icon, children, href }) {
  const ViewAll = href.startsWith('/') ? Link : 'a'
  const viewAllProps = href.startsWith('/') ? { to: href } : { href }

  return (
    <div className="panel-heading">
      <h2><Icon name={icon} />{children}</h2>
      <ViewAll {...viewAllProps}>View All <Icon name="arrow" /></ViewAll>
    </div>
  )
}

function EventsPanel({ events, loading, error }) {
  return (
    <section className="dashboard-panel events-panel">
      <SectionTitle icon="calendar" href="/events">Upcoming Events</SectionTitle>
      <p className="events-panel-subtitle">A few things to look forward to on campus.</p>
      <div className="event-list">
        {loading && Array.from({ length: 3 }, (_, index) => <div className="home-event-skeleton" aria-hidden="true" key={index} />)}
        {error && <p className="community-state community-error">{error}</p>}
        {!loading && !error && events.slice(0, 3).map((event) => (
          <article className="event-row" key={event.id}>
            {event.photoUrl
              ? <div className="event-art-wrap"><img className="event-art event-photo" src={event.photoUrl} alt={`${event.title} event`} /><EventDateBadge date={event.date} /></div>
              : <div className="event-art-wrap"><div className="event-art" aria-hidden="true"><Icon name="sparkle" /></div><EventDateBadge date={event.date} /></div>}
            <div className="event-info">
              <span className="event-club-name">{event.clubName}</span>
              <h3>{event.title}</h3>
              <div className="event-info-meta">
                <p><Icon name="calendar" />{formatEventDate(event.date)} <span>·</span> {formatEventTime(event.time)}</p>
                <p><Icon name="pin" />{event.venue}</p>
              </div>
            </div>
          </article>
        ))}
        {!loading && !error && events.length === 0 && (
          <div className="home-events-empty">
            <span><Icon name="calendar" /></span>
            <p>No events are scheduled yet. Check back soon!</p>
          </div>
        )}
      </div>
    </section>
  )
}

function ClubsPanel({ clubs, loading, error }) {
  return (
    <section className="dashboard-panel clubs-panel">
      <SectionTitle icon="star" href="/clubs">Our Clubs</SectionTitle>
      <div className="club-grid">
        {loading && <p className="community-state">Loading clubs…</p>}
        {error && <p className="community-state community-error">{error}</p>}
        {!loading && !error && clubs.slice(0, 4).map((club) => (
          <Link className={`club-card ${club.color || 'club-blue'}`} to={`/clubs/${club.id}`} key={club.id}>
            <span className="club-card-top">
              <span className={`club-icon ${club.color || 'club-blue'}`}><Icon name={club.icon || 'users'} /></span>
              <span className="club-card-category">{club.category}</span>
            </span>
            <h3>{club.name}</h3>
            <p>{club.description}</p>
            <span className="club-members"><Icon name="users" />{club.members} Members</span>
            <span className="club-card-details-link">View club <Icon name="arrow" /></span>
          </Link>
        ))}
        {!loading && !error && clubs.length === 0 && <p className="community-state">No clubs have been added yet.</p>}
      </div>
    </section>
  )
}

function formatEventDate(date) {
  return new Date(`${date}T00:00:00`).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

function formatEventTime(time) {
  const [hours, minutes] = time.split(':').map(Number)
  return new Date(2000, 0, 1, hours, minutes).toLocaleTimeString(undefined, {
    hour: 'numeric',
    minute: '2-digit',
  })
}

function EventDateBadge({ date, featured = false }) {
  const eventDate = new Date(`${date}T00:00:00`)

  return (
    <span className={`event-date-badge${featured ? ' event-date-badge-featured' : ''}`}>
      <strong>{eventDate.toLocaleDateString(undefined, { day: '2-digit' })}</strong>
      <span>{eventDate.toLocaleDateString(undefined, { month: 'short' })}</span>
    </span>
  )
}

function getLocalDateString(date = new Date()) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function MapPanel() {
  const featuredPlaces = campusPlaces.filter((place) => featuredMapPlaceIds.has(place.id))

  return (
    <section className="dashboard-panel mini-map-panel">
      <SectionTitle icon="pin" href="/map">Campus Map</SectionTitle>
      <Link to="/map" className="mini-map" aria-label="Explore the interactive map with campus locations">
        <img src="/campusMap.png" alt="Aerial view of the Jorhat Engineering College campus with mapped locations" />
        {featuredPlaces.map((place) => (
          <span
            className={`campus-location campus-location--${place.category.toLowerCase()}`}
            key={place.id}
            style={{ left: `${place.x * 100}%`, top: `${place.y * 100}%` }}
            title={place.name}
            aria-label={place.name}
          >
            <span className="campus-location-dot" />
          </span>
        ))}
        <span className="interactive-map-button"><Icon name="book" />View Interactive Map</span>
      </Link>
    </section>
  )
}

function NoticesPanel({ notices, loading, error }) {
  return (
    <section className="dashboard-panel notices-panel" id="notices">
      <SectionTitle icon="cap" href="#notices">Latest Notices</SectionTitle>
      <p className="notices-intro">Updates and announcements from around campus.</p>
      <ul className="notices-list">
        {loading && <li className="community-state">Loading latest notices…</li>}
        {error && <li className="community-state community-error" role="alert">{error}</li>}
        {!loading && !error && notices.length === 0 && (
          <li className="community-state">New event and timetable updates will appear here.</li>
        )}
        {!loading && !error && notices.map((notice) => (
          <li className={`notice-item notice-${notice.tone}`} key={notice.id}>
            <span className="notice-icon"><Icon name={notice.icon} /></span>
            <div className="notice-copy">
              <span className="notice-category">{notice.category}</span>
              <p>{notice.text}</p>
            </div>
            <time dateTime={notice.createdAt}>
              {new Date(notice.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
            </time>
          </li>
        ))}
      </ul>
    </section>
  )
}

function NotesPage() {
  const { data: notes, loading, error } = useApiData('/notes')
  const [query, setQuery] = useState('')
  const [selectedClass, setSelectedClass] = useState('all')
  const [selectedSection, setSelectedSection] = useState('all')
  const [currentPage, setCurrentPage] = useState(1)
  const pageSize = 10
  const availableSections = selectedClass === 'all'
    ? [...new Set(notesClasses.flatMap((item) => item.sections))]
    : notesClasses.find((item) => item.id === selectedClass)?.sections || []
  const normalizedQuery = query.trim().toLowerCase()
  const filteredNotes = notes.filter((note) => {
    const noteMatchesClass = note.classId === 'all' || selectedClass === 'all' || note.classId === selectedClass
    const noteMatchesSection = selectedSection === 'all' || note.section === 'all' || note.section === selectedSection
    const searchableText = [note.title, note.subject, note.description, note.fileName]
      .filter(Boolean)
      .join(' ')
      .toLowerCase()
    return noteMatchesClass && noteMatchesSection && (!normalizedQuery || searchableText.includes(normalizedQuery))
  })
  const pageCount = Math.ceil(filteredNotes.length / pageSize)
  const visibleNotes = filteredNotes.slice((currentPage - 1) * pageSize, currentPage * pageSize)

  return (
    <div className="portal community-portal">
      <Header />
      <main className="community-page notes-page">
        <div className="community-page-heading">
          <p>JORHAT ENGINEERING COLLEGE</p>
          <h1>Study notes</h1>
          <span>Find course notes by class, section, or subject.</span>
        </div>
        <section className="notes-toolbar" aria-label="Filter study notes">
          <label className="notes-search">
            <Icon name="search" />
            <span className="visually-hidden">Search notes</span>
            <input
              type="search"
              value={query}
              onChange={(event) => { setQuery(event.target.value); setCurrentPage(1) }}
              placeholder="Search title, subject, or topic"
            />
          </label>
          <label className="notes-filter">
            <span>Class</span>
            <select value={selectedClass} onChange={(event) => {
              setSelectedClass(event.target.value)
              setSelectedSection('all')
              setCurrentPage(1)
            }}>
              <option value="all">All classes</option>
              {notesClasses.map((item) => <option value={item.id} key={item.id}>{item.label}</option>)}
            </select>
          </label>
          <label className="notes-filter">
            <span>Section</span>
            <select value={selectedSection} onChange={(event) => {
              setSelectedSection(event.target.value)
              setCurrentPage(1)
            }}>
              <option value="all">All sections</option>
              {availableSections.map((section) => <option value={section} key={section}>Section {section}</option>)}
            </select>
          </label>
          <span className="notes-result-count">{filteredNotes.length} {filteredNotes.length === 1 ? 'note' : 'notes'}</span>
        </section>
        {loading && <p className="community-state" role="status">Loading study notes…</p>}
        {error && <p className="community-state community-error" role="alert">{error}</p>}
        {!loading && !error && notes.length === 0 && (
          <div className="notes-empty-state">
            <span><Icon name="book" /></span>
            <h2>No notes have been added yet</h2>
            <p>Check back later for course materials shared by the college administrator.</p>
          </div>
        )}
        {!loading && !error && notes.length > 0 && filteredNotes.length === 0 && (
          <div className="notes-empty-state notes-no-results">
            <span><Icon name="search" /></span>
            <h2>No matching notes</h2>
            <p>Try a different search or change the class and section filters.</p>
            <button type="button" onClick={() => {
              setQuery('')
              setSelectedClass('all')
              setSelectedSection('all')
              setCurrentPage(1)
            }}>Clear filters</button>
          </div>
        )}
        {!loading && !error && filteredNotes.length > 0 && (
          <div className="notes-grid">
            {visibleNotes.map((note) => (
              <article className="note-card" key={note.id}>
                <span className="note-card-icon"><Icon name="note" /></span>
                <div className="note-card-copy">
                  <div className="note-card-labels">
                    <span className="note-card-subject">{note.subject}</span>
                    <span className="note-card-class">{getNoteClassLabel(note.classId)} · {note.section === 'all' ? 'All sections' : `Section ${note.section || '—'}`}</span>
                  </div>
                  <h2>{note.title}</h2>
                  {note.description && <p>{note.description}</p>}
                </div>
                <div className="note-card-footer">
                  <span>{note.isSample ? 'Sample note' : new Date(note.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                  <a href={note.fileUrl} download={note.fileName}>
                    <Icon name="arrow" /> Download
                  </a>
                </div>
              </article>
            ))}
          </div>
        )}
        {!loading && !error && pageCount > 1 && (
          <nav className="notes-pagination" aria-label="Notes pages">
            <button type="button" disabled={currentPage === 1} onClick={() => setCurrentPage((page) => page - 1)}>Previous</button>
            <span>Page {currentPage} of {pageCount}</span>
            <button type="button" disabled={currentPage === pageCount} onClick={() => setCurrentPage((page) => page + 1)}>Next</button>
          </nav>
        )}
      </main>
      <Footer />
    </div>
  )
}

function PromoPanel() {
  return (
    <section className="promo-panel" id="academics">
      <div className="promo-overlay" />
      <Icon name="cap" className="promo-cap" />
      <div className="promo-copy">
        <h2>Empowering Minds,<br />Building a <span>Better Tomorrow</span></h2>
        <a href="#resources">Explore More <Icon name="arrow" /></a>
      </div>
      <div className="student-silhouettes" aria-hidden="true">
        <span /><span /><span /><span /><span />
      </div>
    </section>
  )
}

function HelpPanel() {
  return (
    <section className="dashboard-panel help-panel" id="help">
      <div className="help-copy">
        <h2><Icon name="headset" />Need Help?</h2>
        <p>Find the right college office or send an enquiry to the college contact inbox.</p>
        <Link to="/contact">View Contacts <Icon name="arrow" /></Link>
      </div>
      <span className="help-art"><Icon name="mail" /><Icon name="sparkle" /></span>
    </section>
  )
}

function Footer() {
  return (
    <footer className="portal-footer" id="resources">
      <Brand compact />
      <nav aria-label="Footer navigation">
        <a href="#academics">About</a><span />
        <a href="#resources">Privacy Policy</a><span />
        <a href="#resources">Terms of Use</a><span />
        <Link to="/contact">Contact</Link>
      </nav>
      <div className="social-links" aria-label="Social links">
        <a href="#resources" aria-label="YouTube">▶</a>
        <a href="#resources" aria-label="Instagram">◎</a>
        <a href="#resources" aria-label="LinkedIn">in</a>
        <a href="#resources" aria-label="X">𝕏</a>
      </div>
      <small>© 2025 Jorhat Engineering College. All rights reserved.</small>
    </footer>
  )
}

function ContactPage() {
  const [selectedTopic, setSelectedTopic] = useState('General Enquiry')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const formPanelRef = useRef(null)

  async function sendMessage(event) {
    event.preventDefault()
    const form = event.currentTarget
    setError('')
    setSuccess('')
    setSending(true)
    try {
      const { message } = await apiRequest('/contact', {
        method: 'POST',
        body: JSON.stringify({
          name: form.elements.name.value,
          email: form.elements.email.value,
          topic: selectedTopic,
          message: form.elements.message.value,
          website: form.elements.website.value,
        }),
      })
      form.reset()
      setSelectedTopic('General Enquiry')
      setSuccess(message)
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="portal community-portal">
      <Header />
      <main className="community-page contact-page">
        <div className="community-page-heading">
          <p>JORHAT ENGINEERING COLLEGE</p>
          <h1>Contact the college</h1>
          <span>Office contact details and a form for general enquiries.</span>
        </div>
        <section className="contact-office-section" aria-labelledby="contact-offices-heading">
          <div className="contact-section-heading">
            <div>
              <h2 id="contact-offices-heading">Office contacts</h2>
            </div>
            <p>Call or email an office, or send a message below.</p>
          </div>
          <div className="contact-office-list">
            {contactOffices.map((office) => (
              <article className="contact-office-card" key={office.topic}>
                <div>
                  <h3>{office.topic}</h3>
                  <p>{office.description}</p>
                </div>
                <div className="contact-office-details">
                  <a href={`tel:${office.phone.replace(/[^\d+]/g, '')}`}><Icon name="phone" />{office.phone}</a>
                  <a href={`mailto:${office.email}`}><Icon name="mail" />{office.email}</a>
                </div>
                <button type="button" onClick={() => {
                  setSelectedTopic(office.topic)
                  formPanelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
                }}>
                  Write to this office
                </button>
              </article>
            ))}
          </div>
          <p className="contact-routing-note">Sample phone numbers and email addresses are shown here. Please confirm official contacts with the college before using them.</p>
        </section>
        <section className="contact-form-panel" aria-labelledby="contact-form-heading" ref={formPanelRef}>
          <div className="contact-section-heading">
            <div>
              <h2 id="contact-form-heading">Send an enquiry</h2>
              <p>Your message will be sent to the college contact inbox.</p>
            </div>
          </div>
          <form className="contact-form" onSubmit={sendMessage}>
            <div className="contact-form-row">
              <label>
                Your name
                <input name="name" autoComplete="name" maxLength="100" required />
              </label>
              <label>
                Your email
                <input name="email" type="email" autoComplete="email" maxLength="254" required />
              </label>
            </div>
            <label>
              Contacting
              <select value={selectedTopic} onChange={(event) => setSelectedTopic(event.target.value)}>
                <option>General Enquiry</option>
                {contactOffices.map((office) => <option key={office.topic}>{office.topic}</option>)}
              </select>
            </label>
            <label>
              Message
              <textarea name="message" rows="5" minLength="10" maxLength="4000" placeholder="How can the college help you?" required />
            </label>
            <label className="contact-website-field" aria-hidden="true" tabIndex="-1">
              Website
              <input name="website" tabIndex="-1" autoComplete="off" />
            </label>
            {error && <p className="contact-form-error" role="alert">{error}</p>}
            {success && <p className="contact-form-success" role="status">{success}</p>}
            <div className="contact-form-submit">
              <p>The email address you enter will be included so the office can reply.</p>
              <button type="submit" disabled={sending}>
                <Icon name="mail" />{sending ? 'Sending…' : 'Send message'}
              </button>
            </div>
          </form>
        </section>
      </main>
      <Footer />
    </div>
  )
}

function HomePage() {
  const { data: events, loading: eventsLoading, error: eventsError } = useApiData('/events')
  const { data: clubs, loading: clubsLoading, error: clubsError } = useApiData('/clubs')
  const { data: notices, loading: noticesLoading, error: noticesError } = useApiData('/notices')

  return (
    <div className="portal">
      <Header />
      <main>
        <Hero />
        <div className="portal-dashboard">
          <QuickLinks />
          <div className="dashboard-grid">
            <EventsPanel events={events} loading={eventsLoading} error={eventsError} />
            <ClubsPanel clubs={clubs} loading={clubsLoading} error={clubsError} />
            <MapPanel />
            <NoticesPanel notices={notices} loading={noticesLoading} error={noticesError} />
            <PromoPanel />
            <HelpPanel />
          </div>
        </div>
      </main>
      <Footer />
    </div>
  )
}

function useApiData(resource) {
  const [state, setState] = useState({ resource, data: [], loading: true, error: '' })

  useEffect(() => {
    let active = true
    loadApiData(resource)
      .then((data) => {
        if (active) setState({ resource, data, loading: false, error: '' })
      })
      .catch((error) => {
        if (active) setState({ resource, data: [], loading: false, error: error.message })
      })
    return () => { active = false }
  }, [resource])

  return state.resource === resource
    ? state
    : { data: [], loading: true, error: '' }
}

function CommunityPage({ type }) {
  const isEvents = type === 'events'
  const { data, loading, error } = useApiData(`/${type}`)
  const title = isEvents ? 'Campus events' : 'Student clubs'
  const [eventFilter, setEventFilter] = useState('upcoming')
  const [eventQuery, setEventQuery] = useState('')
  const [clubCategory, setClubCategory] = useState('All clubs')
  const [clubQuery, setClubQuery] = useState('')
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const query = eventQuery.trim().toLowerCase()
  const clubSearch = clubQuery.trim().toLowerCase()
  const clubCategories = ['All clubs', ...new Set(data.map((club) => club.category).filter(Boolean))]
  const filteredClubs = data.filter((club) => {
    const matchesCategory = clubCategory === 'All clubs' || club.category === clubCategory
    const matchesSearch = !clubSearch ||
      `${club.name} ${club.category} ${club.description}`.toLowerCase().includes(clubSearch)
    return matchesCategory && matchesSearch
  })
  const filteredEvents = isEvents ? data.filter((event) => {
    const eventDate = new Date(`${event.date}T00:00:00`)
    const matchesDate = eventFilter === 'all' ||
      (eventFilter === 'upcoming' ? eventDate >= today : eventDate < today)
    const matchesQuery = !query ||
      `${event.title} ${event.description} ${event.venue} ${event.clubName}`.toLowerCase().includes(query)
    return matchesDate && matchesQuery
  }).sort((left, right) => eventFilter === 'past'
    ? right.date.localeCompare(left.date)
    : left.date.localeCompare(right.date)) : []
  const featuredEvent = eventFilter === 'upcoming' ? filteredEvents[0] : null
  const listedEvents = featuredEvent ? filteredEvents.slice(1) : filteredEvents

  return (
    <div className="portal community-portal">
      <Header />
      <main className="community-page">
        {isEvents ? (
          <div className="events-page-heading">
            <div className="community-page-heading">
              <p>JORHAT ENGINEERING COLLEGE</p>
              <h1>{title}</h1>
              <span>Find your next moment on campus. Explore what’s on and save the date.</span>
            </div>
            <Link className="events-admin-button" to="/admin/club"><Icon name="sparkle" />Host an event</Link>
          </div>
        ) : (
          <div className="community-page-heading">
            <p>JORHAT ENGINEERING COLLEGE</p>
            <h1>{title}</h1>
            <span>Find your community and the things you love to do.</span>
          </div>
        )}
        {loading && isEvents && (
          <div className="event-loading-state" role="status">
            <span>Loading campus events…</span>
            <div className="community-event-grid">
              {Array.from({ length: 3 }, (_, index) => <div className="community-event-skeleton" key={index} />)}
            </div>
          </div>
        )}
        {error && <p className="community-state community-error" role="alert">{error}</p>}
        {!loading && !error && !isEvents && data.length === 0 && <p className="community-state">Nothing to show yet.</p>}
        {!loading && !error && isEvents && (
          <>
            <div className="events-toolbar">
              <div className="event-filter-group" aria-label="Filter events">
                {[
                  ['upcoming', 'Upcoming'],
                  ['past', 'Past events'],
                  ['all', 'All events'],
                ].map(([value, label]) => (
                  <button
                    className={eventFilter === value ? 'event-filter-active' : ''}
                    type="button"
                    aria-pressed={eventFilter === value}
                    key={value}
                    onClick={() => setEventFilter(value)}
                  >{label}</button>
                ))}
              </div>
              <label className="event-search">
                <Icon name="search" />
                <span className="visually-hidden">Search events</span>
                <input value={eventQuery} onChange={(event) => setEventQuery(event.target.value)} placeholder="Search events" />
              </label>
            </div>
            <div className="events-results-heading">
              <h2>{eventFilter === 'past' ? 'Past events' : eventFilter === 'all' ? 'All campus events' : 'Coming up'}</h2>
              <span>{filteredEvents.length} {filteredEvents.length === 1 ? 'event' : 'events'}</span>
            </div>
            {filteredEvents.length === 0 ? (
              <div className="events-empty-state">
                <span><Icon name="calendar" /></span>
                <h3>{query ? 'No matching events' : eventFilter === 'past' ? 'No past events yet' : 'No upcoming events yet'}</h3>
                <p>{query ? 'Try another search or clear your search field.' : 'Check back soon for more campus events.'}</p>
                {query && <button type="button" onClick={() => setEventQuery('')}>Clear search</button>}
              </div>
            ) : (
              <>
                {featuredEvent && <FeaturedEventCard event={featuredEvent} />}
                {listedEvents.length > 0 && (
                  <div className="community-event-grid">
                    {listedEvents.map((event) => <EventCard event={event} key={event.id} />)}
                  </div>
                )}
              </>
            )}
          </>
        )}
        {loading && !isEvents && (
          <div className="community-club-grid community-club-grid-loading" role="status" aria-label="Loading clubs">
            {Array.from({ length: 4 }, (_, index) => (
              <div className="community-club-skeleton" aria-hidden="true" key={index}>
                <span className="skeleton-icon" />
                <span className="skeleton-line skeleton-category" />
                <span className="skeleton-line skeleton-title" />
                <span className="skeleton-line skeleton-description" />
                <span className="skeleton-line skeleton-members" />
                <span className="skeleton-link" />
              </div>
            ))}
          </div>
        )}
        {!loading && !error && !isEvents && (
          <>
            <div className="clubs-toolbar">
              <div className="club-category-filters" role="group" aria-label="Filter clubs by category">
                {clubCategories.map((category) => (
                  <button
                    className={clubCategory === category ? 'club-category-active' : ''}
                    type="button"
                    aria-pressed={clubCategory === category}
                    key={category}
                    onClick={() => setClubCategory(category)}
                  >{category}</button>
                ))}
              </div>
              <label className="club-search">
                <Icon name="search" />
                <span className="visually-hidden">Search clubs</span>
                <input value={clubQuery} onChange={(event) => setClubQuery(event.target.value)} placeholder="Search clubs" />
              </label>
            </div>
            <div className="clubs-results-heading">
              <h2>Find your community</h2>
              <span>{filteredClubs.length} {filteredClubs.length === 1 ? 'club' : 'clubs'}</span>
            </div>
            {filteredClubs.length === 0 ? (
              <div className="clubs-empty-state">
                <span><Icon name="users" /></span>
                <h3>No clubs match your search</h3>
                <p>Try another name or category to find a community.</p>
                <button type="button" onClick={() => {
                  setClubQuery('')
                  setClubCategory('All clubs')
                }}>Show all clubs</button>
              </div>
            ) : (
              <div className="community-club-grid">
                {filteredClubs.map((club) => (
                  <article className={`community-club-card ${club.color || 'club-blue'}`} key={club.id}>
                    <Link className="community-club-card-link" to={`/clubs/${club.id}`}>
                      <div className="community-club-card-top">
                        <span className={`club-icon ${club.color || 'club-blue'}`}><Icon name={club.icon || 'users'} /></span>
                        <span className="community-eyebrow">{club.category}</span>
                      </div>
                      <h2>{club.name}</h2>
                      <p>{club.description}</p>
                      <div className="community-card-meta"><Icon name="users" />{club.members} members</div>
                      <span className="community-club-view-link">View club details <Icon name="arrow" /></span>
                    </Link>
                  </article>
                ))}
              </div>
            )}
          </>
        )}
        {!isEvents && <Link className="community-admin-cta" to="/admin/club">Club admin? Organize an event <Icon name="arrow" /></Link>}
      </main>
      <Footer />
    </div>
  )
}

function ClubDetailPage() {
  const { clubId } = useParams()
  const { data: clubs, loading: clubsLoading, error: clubsError } = useApiData('/clubs')
  const { data: events, loading: eventsLoading, error: eventsError } = useApiData('/events')
  const club = clubs.find((item) => item.id === clubId)
  const clubEvents = events.filter((event) => event.clubId === clubId)

  return (
    <div className="portal community-portal">
      <Header />
      <main className="community-page club-detail-page">
        <Link className="club-detail-back" to="/clubs"><Icon name="arrow" /> All clubs</Link>
        {(clubsLoading || eventsLoading) && <p className="community-state" role="status">Loading club information…</p>}
        {(clubsError || eventsError) && (
          <p className="community-state community-error" role="alert">{clubsError || eventsError}</p>
        )}
        {!clubsLoading && !clubsError && !club && (
          <div className="clubs-empty-state">
            <span><Icon name="users" /></span>
            <h1>Club not found</h1>
            <p>This club may have been removed or its link may be incorrect.</p>
            <Link to="/clubs">Browse all clubs</Link>
          </div>
        )}
        {!clubsLoading && !clubsError && club && (
          <>
            <section className={`club-detail-hero ${club.color || 'club-blue'}`}>
              <span className={`club-icon ${club.color || 'club-blue'}`}><Icon name={club.icon || 'users'} /></span>
              <p className="community-eyebrow">{club.category}</p>
              <h1>{club.name}</h1>
              <p className="club-detail-description">{club.description}</p>
              <div className="club-detail-meta">
                <span><Icon name="users" />{club.members} members</span>
                <a href={`mailto:${club.contactEmail}`}><Icon name="mail" />Contact club</a>
              </div>
            </section>
            <section className="club-detail-events" aria-labelledby="club-events-heading">
              <div className="clubs-results-heading">
                <h2 id="club-events-heading">Events from {club.name}</h2>
                <span>{clubEvents.length} {clubEvents.length === 1 ? 'event' : 'events'}</span>
              </div>
              {clubEvents.length ? (
                <div className="community-event-grid">
                  {clubEvents.map((event) => <EventCard event={event} key={event.id} />)}
                </div>
              ) : (
                <p className="community-state">This club has no events listed yet. Check back for updates.</p>
              )}
            </section>
          </>
        )}
      </main>
      <Footer />
    </div>
  )
}

function TimetablePage() {
  const [selectedYearId, setSelectedYearId] = useState('first')
  const [selectedSection, setSelectedSection] = useState('A')
  const [overrideResult, setOverrideResult] = useState({ key: '', override: null, error: '' })
  const selectedYear = timetableYears.find((year) => year.id === selectedYearId)
  const today = new Date().toLocaleDateString('en-US', { weekday: 'long' })
  const todayDate = getLocalDateString()
  const overrideRequestKey = `${todayDate}:${selectedYearId}:${selectedSection}`
  const overrideLoading = overrideResult.key !== overrideRequestKey
  const overrideError = overrideLoading ? '' : overrideResult.error
  const todayOverride = overrideLoading ? null : overrideResult.override

  useEffect(() => {
    let active = true
    const query = new URLSearchParams({
      date: todayDate,
      yearId: selectedYearId,
      section: selectedSection,
    })

    apiRequest(`/timetable/today?${query}`)
      .then(({ override }) => {
        if (!active) return
        setOverrideResult({ key: overrideRequestKey, override, error: '' })
      })
      .catch((error) => {
        if (!active) return
        setOverrideResult({ key: overrideRequestKey, override: null, error: error.message })
      })

    return () => { active = false }
  }, [overrideRequestKey, selectedSection, selectedYearId, todayDate])

  const overrideAppliesToday = todayOverride?.date === todayDate &&
    todayOverride.yearId === selectedYearId &&
    todayOverride.section === selectedSection

  function selectYear(yearId) {
    setSelectedYearId(yearId)
    setSelectedSection('A')
  }

  function selectSection(section) {
    setSelectedSection(section)
  }

  return (
    <div className="portal community-portal">
      <Header />
      <main className="community-page timetable-page">
        <div className="timetable-page-heading">
          <div className="community-page-heading">
            <p>JORHAT ENGINEERING COLLEGE</p>
            <h1>Class timetable</h1>
            <span>Plan your week. Choose your year and section to view the class schedule.</span>
          </div>
          <button className="timetable-print-button" type="button" onClick={() => window.print()}>
            <Icon name="note" /> Print timetable
          </button>
        </div>

        <section className="timetable-selector" aria-label="Choose a class">
          <div className="timetable-selector-group" role="group" aria-label="Choose year">
            <span className="timetable-selector-label">Year</span>
            <div className="timetable-option-list">
              {timetableYears.map((year) => (
                <button
                  className={selectedYearId === year.id ? 'timetable-option timetable-option-active' : 'timetable-option'}
                  type="button"
                  aria-pressed={selectedYearId === year.id}
                  key={year.id}
                  onClick={() => selectYear(year.id)}
                >{year.label}</button>
              ))}
            </div>
          </div>
          <div className="timetable-selector-group" role="group" aria-label="Choose section">
            <span className="timetable-selector-label">Section</span>
            <div className="timetable-option-list">
              {selectedYear.sections.map((section) => (
                <button
                  className={selectedSection === section ? 'timetable-option timetable-option-active' : 'timetable-option'}
                  type="button"
                  aria-pressed={selectedSection === section}
                  key={section}
                  onClick={() => selectSection(section)}
                >{section}</button>
              ))}
            </div>
          </div>
          <div className="timetable-selected-class">
            <span>Viewing schedule for</span>
            <strong>{selectedYear.label} · Section {selectedSection}</strong>
          </div>
        </section>

        <section className="timetable-card" aria-label={`${selectedYear.label} section ${selectedSection} weekly timetable`}>
          <div className="timetable-card-heading">
            <div>
              <span className="timetable-card-kicker"><Icon name="calendar" /> WEEKLY SCHEDULE</span>
              <h2>{selectedYear.label} <span>·</span> Section {selectedSection}</h2>
            </div>
            <span className="timetable-period-count"><Icon name="clock" /> 4 periods per day</span>
          </div>
          <div className="timetable-table-scroll" tabIndex="0" aria-label="Scrollable weekly timetable">
            <table className="timetable-table">
              <caption className="visually-hidden">{selectedYear.label}, section {selectedSection}, weekly class timetable with example subjects pending official department schedules</caption>
              <thead>
                <tr>
                  <th scope="col" className="timetable-day-heading">Day</th>
                  {timetablePeriods.map((period) => (
                    <th scope="col" key={period.label}>
                      <span>{period.label}</span>
                      <time>{period.time}</time>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {timetableDays.map((day, dayIndex) => (
                  <tr className={day === today ? 'timetable-today' : ''} key={day}>
                    <th scope="row">
                      <span>{day.slice(0, 3)}</span>
                      {day === today && <small>Today</small>}
                    </th>
                    {(day === today && overrideAppliesToday ? todayOverride.subjects : selectedYear.schedule[dayIndex])
                      .map((subject, periodIndex) => {
                        const periodCancelled = day === today && overrideAppliesToday &&
                          (todayOverride.cancelledPeriods?.includes(periodIndex) || todayOverride.cancelled)
                        return (
                          <td key={`${day}-${periodIndex}`}>
                            <span className={`timetable-subject${subject.includes('Lab') ? ' timetable-subject-lab' : ''}${periodCancelled ? ' timetable-subject-cancelled' : ''}`}>
                              {periodCancelled ? 'Class cancelled' : subject}
                            </span>
                          </td>
                        )
                      })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="timetable-scroll-hint">Swipe or scroll horizontally to view all periods.</p>
        </section>
        {overrideError && <p className="community-error timetable-admin-status" role="alert">{overrideError}</p>}
      </main>
      <Footer />
    </div>
  )
}

function AdminTimetablePage() {
  const [adminSession] = useState(() => readAdminSession('college_admin'))
  const [selectedYearId, setSelectedYearId] = useState('first')
  const [selectedSection, setSelectedSection] = useState('A')
  const [selectedPeriodIndex, setSelectedPeriodIndex] = useState(null)
  const [actionMode, setActionMode] = useState('')
  const [overrideResult, setOverrideResult] = useState({ key: '', override: null, error: '' })
  const [editSubjects, setEditSubjects] = useState([])
  const [cancelledPeriods, setCancelledPeriods] = useState([])
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const selectedYear = timetableYears.find((year) => year.id === selectedYearId)
  const today = new Date().toLocaleDateString('en-US', { weekday: 'long' })
  const todayDate = getLocalDateString()
  const todayIndex = timetableDays.indexOf(today)
  const defaultTodaySubjects = selectedYear.schedule[Math.max(todayIndex, 0)]
  const requestKey = `${todayDate}:${selectedYearId}:${selectedSection}`
  const overrideLoading = overrideResult.key !== requestKey

  useEffect(() => {
    let active = true
    const query = new URLSearchParams({ date: todayDate, yearId: selectedYearId, section: selectedSection })

    apiRequest(`/timetable/today?${query}`)
      .then(({ override }) => {
        if (!active) return
        setOverrideResult({ key: requestKey, override, error: '' })
        setEditSubjects(override?.subjects || defaultTodaySubjects)
        setCancelledPeriods(override?.cancelledPeriods ||
          (override?.cancelled ? timetablePeriods.map((_period, index) => index) : []))
        setSelectedPeriodIndex(null)
        setActionMode('')
      })
      .catch((requestError) => {
        if (!active) return
        setOverrideResult({ key: requestKey, override: null, error: requestError.message })
      })

    return () => { active = false }
  }, [defaultTodaySubjects, requestKey, selectedSection, selectedYearId, todayDate])

  const loadError = overrideResult.key === requestKey ? overrideResult.error : ''

  function chooseYear(yearId) {
    setSelectedYearId(yearId)
    setSelectedSection('A')
    setSelectedPeriodIndex(null)
    setActionMode('')
    setMessage('')
    setError('')
  }

  function chooseSection(section) {
    setSelectedSection(section)
    setSelectedPeriodIndex(null)
    setActionMode('')
    setMessage('')
    setError('')
  }

  function selectPeriod(periodIndex) {
    setSelectedPeriodIndex(periodIndex)
    setActionMode('')
    setMessage('')
    setError('')
  }

  function cancelSelectedPeriod() {
    setCancelledPeriods((current) => current.includes(selectedPeriodIndex)
      ? current.filter((index) => index !== selectedPeriodIndex)
      : [...current, selectedPeriodIndex].sort((left, right) => left - right))
    setActionMode('')
  }

  function restoreSelectedPeriod() {
    setEditSubjects((current) => current.map((subject, index) =>
      index === selectedPeriodIndex ? defaultTodaySubjects[index] : subject))
    setCancelledPeriods((current) => current.filter((index) => index !== selectedPeriodIndex))
    setActionMode('')
  }

  async function saveTodayOverride() {
    setSaving(true)
    setMessage('')
    setError('')
    try {
      const { override } = await apiRequest('/admin/timetable/today', {
        method: 'PUT',
        token: adminSession.token,
        body: JSON.stringify({
          date: todayDate,
          yearId: selectedYearId,
          section: selectedSection,
          subjects: editSubjects,
          cancelledPeriods,
        }),
      })
      setOverrideResult({ key: requestKey, override, error: '' })
      setMessage(`Changes saved for ${selectedYear.label} · Section ${selectedSection} today.`)
    } catch (saveError) {
      setError(saveError.message)
    } finally {
      setSaving(false)
    }
  }

  if (!adminSession) {
    return (
      <div className="portal community-portal">
        <Header />
        <main className="community-page timetable-page">
          <div className="community-page-heading">
            <p>COLLEGE ADMINISTRATOR</p>
            <h1>Timetable editor</h1>
            <span>Sign in with a college administrator account to edit today’s classes.</span>
          </div>
          <div className="timetable-admin-login">
            <Icon name="shield" />
            <Link to="/admin/college">Sign in to manage timetable <Icon name="arrow" /></Link>
          </div>
        </main>
        <Footer />
      </div>
    )
  }

  return (
    <div className="portal community-portal">
      <Header />
      <main className="community-page timetable-page timetable-editor-page">
        <div className="timetable-page-heading">
          <div className="community-page-heading">
            <p>COLLEGE ADMINISTRATOR</p>
            <h1>Timetable editor</h1>
            <span>Select today’s class, then choose an option to change or cancel that period.</span>
          </div>
          <Link className="timetable-back-link" to="/admin/college"><Icon name="arrow" /> Admin dashboard</Link>
        </div>

        <section className="timetable-selector" aria-label="Choose a class">
          <div className="timetable-selector-group" role="group" aria-label="Choose year">
            <span className="timetable-selector-label">Year</span>
            <div className="timetable-option-list">
              {timetableYears.map((year) => (
                <button
                  className={selectedYearId === year.id ? 'timetable-option timetable-option-active' : 'timetable-option'}
                  type="button"
                  aria-pressed={selectedYearId === year.id}
                  key={year.id}
                  onClick={() => chooseYear(year.id)}
                >{year.label}</button>
              ))}
            </div>
          </div>
          <div className="timetable-selector-group" role="group" aria-label="Choose section">
            <span className="timetable-selector-label">Section</span>
            <div className="timetable-option-list">
              {selectedYear.sections.map((section) => (
                <button
                  className={selectedSection === section ? 'timetable-option timetable-option-active' : 'timetable-option'}
                  type="button"
                  aria-pressed={selectedSection === section}
                  key={section}
                  onClick={() => chooseSection(section)}
                >{section}</button>
              ))}
            </div>
          </div>
          <div className="timetable-selected-class">
            <span>Editing today</span>
            <strong>{today} · {selectedYear.label} · Section {selectedSection}</strong>
          </div>
        </section>

        <section className="timetable-card timetable-editor-card" aria-label={`${selectedYear.label} section ${selectedSection} classes for today`}>
          <div className="timetable-card-heading">
            <div>
              <span className="timetable-card-kicker"><Icon name="calendar" /> TODAY’S CLASSES · {todayDate}</span>
              <h2>{selectedYear.label} <span>·</span> Section {selectedSection}</h2>
            </div>
            <span className="timetable-period-count"><Icon name="clock" /> Select a class to edit</span>
          </div>
          {overrideLoading ? (
            <p className="timetable-admin-status" role="status">Loading today’s schedule…</p>
          ) : loadError ? (
            <p className="community-error timetable-admin-status" role="alert">{loadError}</p>
          ) : (
            <div className="timetable-period-picker" role="group" aria-label="Select a class period">
              {timetablePeriods.map((period, periodIndex) => {
                const isCancelled = cancelledPeriods.includes(periodIndex)
                const isSelected = selectedPeriodIndex === periodIndex
                return (
                  <button
                    className={`timetable-period-card${isSelected ? ' timetable-period-card-selected' : ''}${isCancelled ? ' timetable-period-card-cancelled' : ''}`}
                    type="button"
                    aria-pressed={isSelected}
                    key={period.label}
                    onClick={() => selectPeriod(periodIndex)}
                  >
                    <span className="timetable-period-card-top">
                      <strong>{period.label}</strong>
                      <small>{period.time}</small>
                    </span>
                    <span className="timetable-period-card-subject">
                      {isCancelled ? 'Class cancelled' : editSubjects[periodIndex]}
                    </span>
                    <span className="timetable-period-card-hint">{isSelected ? 'Selected' : 'Select class'}</span>
                  </button>
                )
              })}
            </div>
          )}
        </section>

        {!overrideLoading && !loadError && selectedPeriodIndex !== null && (
          <section className="timetable-period-options" aria-labelledby="selected-period-heading">
            <div className="timetable-period-options-heading">
              <div>
                <p className="community-eyebrow">SELECTED CLASS · {timetablePeriods[selectedPeriodIndex].time}</p>
                <h2 id="selected-period-heading">{timetablePeriods[selectedPeriodIndex].label}</h2>
                <span>{editSubjects[selectedPeriodIndex]}</span>
              </div>
              <button type="button" className="timetable-options-close" aria-label="Close class options" onClick={() => setSelectedPeriodIndex(null)}>×</button>
            </div>
            <div className="timetable-period-option-buttons" role="group" aria-label="Class options">
              <button type="button" className={actionMode === 'change' ? 'timetable-action-choice timetable-action-choice-active' : 'timetable-action-choice'} onClick={() => setActionMode(actionMode === 'change' ? '' : 'change')}>
                Change subject
              </button>
              <button type="button" className="timetable-action-choice timetable-action-cancel" onClick={cancelSelectedPeriod}>
                {cancelledPeriods.includes(selectedPeriodIndex) ? 'Restore cancelled class' : 'Cancel this class'}
              </button>
              {editSubjects[selectedPeriodIndex] !== defaultTodaySubjects[selectedPeriodIndex] && (
                <button type="button" className="timetable-action-choice" onClick={restoreSelectedPeriod}>
                  Restore original subject
                </button>
              )}
            </div>
            {actionMode === 'change' && (
              <label className="timetable-subject-editor">
                New subject for {timetablePeriods[selectedPeriodIndex].label}
                <input
                  maxLength="120"
                  value={editSubjects[selectedPeriodIndex]}
                  onChange={(event) => setEditSubjects((current) =>
                    current.map((subject, index) => index === selectedPeriodIndex ? event.target.value : subject))}
                />
              </label>
            )}
            <div className="timetable-period-options-footer">
              {error && <p className="community-error timetable-admin-status" role="alert">{error}</p>}
              {message && <p className="timetable-admin-success" role="status">{message}</p>}
              <button className="timetable-save-button" type="button" disabled={saving || !editSubjects.every((subject) => subject.trim())} onClick={saveTodayOverride}>
                {saving ? 'Saving…' : 'Save timetable changes'}
              </button>
            </div>
          </section>
        )}
        {!overrideLoading && !loadError && selectedPeriodIndex === null && (error || message) && (
          <div className="timetable-editor-feedback">
            {error && <p className="community-error" role="alert">{error}</p>}
            {message && <p className="timetable-admin-success" role="status">{message}</p>}
          </div>
        )}
      </main>
      <Footer />
    </div>
  )
}

function CampusGuidePage() {
  const [searchParams] = useSearchParams()
  const incomingQuestion = searchParams.get('question')?.trim() ?? ''
  const [messages, setMessages] = useState([
    {
      id: 1,
      role: 'bot',
      text: 'Hi! I’m the JECKY campus guide. Ask me something, or tap a question below.',
    },
    ...(incomingQuestion ? [{ id: 2, role: 'user', text: incomingQuestion }] : []),
  ])
  const [draft, setDraft] = useState('')
  const [thinking, setThinking] = useState(Boolean(incomingQuestion))
  const logRef = useRef(null)
  const nextMessageId = useRef(incomingQuestion ? 3 : 2)
  const responseTimeout = useRef(null)

  useEffect(() => {
    if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight
  }, [messages, thinking])

  useEffect(() => () => window.clearTimeout(responseTimeout.current), [])

  useEffect(() => {
    if (!incomingQuestion) return
    responseTimeout.current = window.setTimeout(() => {
      const answer = getChatAnswer(incomingQuestion)
      setMessages((current) => [...current, { id: nextMessageId.current++, role: 'bot', ...answer }])
      setThinking(false)
    }, 450)
    return () => window.clearTimeout(responseTimeout.current)
  }, [incomingQuestion])

  function ask(question) {
    const text = question.trim()
    if (!text || thinking) return

    const userMessage = { id: nextMessageId.current++, role: 'user', text }
    setMessages((current) => [...current, userMessage])
    setDraft('')
    setThinking(true)
    responseTimeout.current = window.setTimeout(() => {
      const answer = getChatAnswer(text)
      setMessages((current) => [...current, { id: nextMessageId.current++, role: 'bot', ...answer }])
      setThinking(false)
    }, 450)
  }

  function submitQuestion(event) {
    event.preventDefault()
    ask(draft)
  }

  return (
    <div className="portal community-portal">
      <Header />
      <main className="chat-page">
        <div className="chat-page-heading">
          <p>JORHAT ENGINEERING COLLEGE</p>
          <h1>JECKY Campus Guide</h1>
          <span>Ask about classes, notes, events and places.</span>
        </div>
        <section className="chat-window" aria-label="Chat with the campus guide">
          <div className="chat-window-header">
            <span className="chat-avatar">J</span>
            <div>
              <h2>Campus guide</h2>
              <p><span className="chat-online-dot" /> Ready to help</p>
            </div>
          </div>
          <div className="chat-log" ref={logRef} role="log" aria-live="polite" aria-relevant="additions">
            {messages.map((message) => (
              <article className={`chat-message ${message.role === 'user' ? 'chat-message-user' : 'chat-message-bot'}`} key={message.id}>
                <p>{message.text}</p>
                {message.place && (
                  <div className="chat-route-card">
                    <div className="chat-route-heading">
                      <strong>{message.place.name}</strong>
                      <span>{message.place.where}</span>
                    </div>
                    <ol>
                      {message.place.steps.map((step) => <li key={step}>{step}</li>)}
                    </ol>
                    <Link to="/map">Open campus map <Icon name="arrow" /></Link>
                    <small>Directions are examples; check campus signage for the latest route.</small>
                  </div>
                )}
                {message.link && (
                  <Link className="chat-answer-link" to={message.link}>
                    {message.linkLabel} <Icon name="arrow" />
                  </Link>
                )}
              </article>
            ))}
            {thinking && (
              <div className="chat-message chat-message-bot chat-typing" role="status" aria-label="Jecky is preparing a response">
                <span /><span /><span />
              </div>
            )}
          </div>
          <div className="chat-suggestions" aria-label="Suggested questions">
            {chatSuggestions.map((suggestion) => (
              <button type="button" key={suggestion} disabled={thinking} onClick={() => ask(suggestion)}>
                {suggestion}
              </button>
            ))}
          </div>
          <form className="chat-form" onSubmit={submitQuestion}>
            <label className="visually-hidden" htmlFor="campus-guide-question">Your question</label>
            <input
              id="campus-guide-question"
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              placeholder="Ask a question…"
              autoComplete="off"
            />
            <button type="submit" disabled={thinking || !draft.trim()}>Send</button>
          </form>
        </section>
      </main>
      <Footer />
    </div>
  )
}

function FeaturedEventCard({ event }) {
  return (
    <article className="featured-event-card">
      <div className="featured-event-art">
        {event.photoUrl
          ? <img src={event.photoUrl} alt={`${event.title} event`} />
          : <div className="featured-event-art-placeholder"><Icon name="sparkle" /></div>}
        <EventDateBadge date={event.date} featured />
        <span className="featured-event-label">UP NEXT</span>
      </div>
      <div className="featured-event-copy">
        <span className="community-eyebrow">{event.clubName} <span>·</span> Featured event</span>
        <h2>{event.title}</h2>
        <p>{event.description}</p>
        <div className="featured-event-details">
          <span><Icon name="calendar" />{formatEventDate(event.date)} · {formatEventTime(event.time)}</span>
          <span><Icon name="pin" />{event.venue}</span>
        </div>
      </div>
    </article>
  )
}

function EventCard({ event }) {
  return (
    <article className="community-event-card">
      <div className="community-event-art">
        {event.photoUrl
          ? <img src={event.photoUrl} alt={`${event.title} event`} />
          : <div className="community-event-placeholder"><Icon name="calendar" /></div>}
        <EventDateBadge date={event.date} />
      </div>
      <div className="community-card-copy">
        <span className="community-eyebrow">{event.clubName}</span>
        <h2>{event.title}</h2>
        <p>{event.description}</p>
        <div className="community-event-meta">
          <span><Icon name="calendar" />{formatEventTime(event.time)}</span>
          <span><Icon name="pin" />{event.venue}</span>
        </div>
      </div>
    </article>
  )
}

function readAdminSession(role) {
  try {
    const stored = JSON.parse(
      localStorage.getItem('campusAdminSession') ||
      localStorage.getItem('clubAdminSession') ||
      'null',
    )
    const sessionRole = stored?.role || (stored?.admin?.clubId ? 'club_admin' : null)
    return sessionRole === role ? { ...stored, role: sessionRole } : null
  } catch {
    return null
  }
}

function AdminRoute() {
  const { loginType } = useParams()
  return <AdminPage key={loginType || 'choices'} loginType={loginType} />
}

function AdminPage({ loginType }) {
  const loginRole = loginType === 'club' ? 'club_admin' : loginType === 'college' ? 'college_admin' : null
  const isClubAdmin = loginRole === 'club_admin'
  const [session, setSession] = useState(() => readAdminSession(loginRole))
  const [loginError, setLoginError] = useState('')
  const [notice, setNotice] = useState('')
  const [submitting, setSubmitting] = useState(false)

  async function login(event) {
    event.preventDefault()
    setLoginError('')
    setSubmitting(true)
    const formData = new FormData(event.currentTarget)
    try {
      const result = await apiRequest('/auth/login', {
        method: 'POST',
        body: JSON.stringify({
          email: formData.get('email'),
          password: formData.get('password'),
          role: loginRole,
        }),
      })
      const nextSession = { token: result.token, admin: result.admin, role: result.role }
      localStorage.setItem('campusAdminSession', JSON.stringify(nextSession))
      localStorage.removeItem('clubAdminSession')
      setSession(nextSession)
    } catch (error) {
      setLoginError(error.message)
    } finally {
      setSubmitting(false)
    }
  }

  function logout() {
    localStorage.removeItem('campusAdminSession')
    localStorage.removeItem('clubAdminSession')
    setSession(null)
    setNotice('')
  }

  async function createEvent(event) {
    event.preventDefault()
    const form = event.currentTarget
    setNotice('')
    setLoginError('')
    setSubmitting(true)
    const body = new FormData(form)
    try {
      await apiRequest('/events', { method: 'POST', body, token: session.token })
      form.reset()
      setNotice('Your event has been published.')
    } catch (error) {
      setLoginError(error.message)
    } finally {
      setSubmitting(false)
    }
  }

  if (!loginRole) {
    return (
      <div className="portal community-portal">
        <Header />
        <main className="admin-choice-page">
          <div className="admin-choice-intro">
            <span className="admin-choice-mark"><Icon name="shield" /></span>
            <p className="community-eyebrow">SECURE CAMPUS PORTAL</p>
            <h1>Welcome back</h1>
            <p>Choose your account type to continue to the right sign-in page.</p>
          </div>
          <div className="admin-choice-grid">
            <Link className="admin-choice-card admin-choice-college" to="/admin/college">
              <span className="admin-choice-icon"><Icon name="cap" /></span>
              <span className="admin-choice-tag">FACULTY & STAFF</span>
              <h2>College administrator</h2>
              <p>For teachers and college administrators to edit today’s classes and review campus events.</p>
              <span className="admin-choice-action">Continue to sign in <Icon name="arrow" /></span>
            </Link>
            <Link className="admin-choice-card admin-choice-club" to="/admin/club">
              <span className="admin-choice-icon"><Icon name="users" /></span>
              <span className="admin-choice-tag">CLUB LEADERS</span>
              <h2>Club administrator</h2>
              <p>For club admins to publish events and share them with the campus.</p>
              <span className="admin-choice-action">Continue to sign in <Icon name="arrow" /></span>
            </Link>
          </div>
          <Link className="admin-choice-home" to="/">Back to campus home</Link>
        </main>
        <Footer />
      </div>
    )
  }

  return (
    <div className="portal community-portal">
      <Header />
      <main className={`community-page admin-page${!session ? ' admin-login-page' : ''}`}>
        <div className="community-page-heading">
          <p>{isClubAdmin ? 'CLUB ADMIN PORTAL' : 'FACULTY & STAFF PORTAL'}</p>
          <h1>{session
            ? (isClubAdmin ? `Welcome, ${session.admin.clubName}` : `Welcome, ${session.admin.name}`)
            : (isClubAdmin ? 'Organize your next event' : 'College administrator sign in')}</h1>
          <span>{isClubAdmin
            ? 'Sign in with your club administrator account to publish campus events.'
            : 'Sign in with your college administrator account to edit today’s classes and review campus events.'}</span>
        </div>
        {!session ? (
          <form className="admin-form admin-login-form" onSubmit={login}>
            <label>{isClubAdmin ? 'Club admin email' : 'College email'}<input name="email" type="email" autoComplete="username" required /></label>
            <label>Password<input name="password" type="password" autoComplete="current-password" required /></label>
            {loginError && <p className="community-error" role="alert">{loginError}</p>}
            <button type="submit" disabled={submitting}>{submitting ? 'Signing in…' : 'Sign in'}</button>
            <p className="admin-hint">
              <Link to="/admin">Choose another account type</Link>
            </p>
          </form>
        ) : (
          isClubAdmin ? (
            <section className="admin-dashboard">
              <div className="admin-dashboard-top"><p>Posting as <strong>{session.admin.clubName}</strong></p><button type="button" onClick={logout}>Sign out</button></div>
              <form className="admin-form" onSubmit={createEvent}>
                <label>Event name<input name="title" maxLength="120" required /></label>
                <label>Description<textarea name="description" rows="4" maxLength="2000" required /></label>
                <div className="admin-form-row">
                  <label>Date<input name="date" type="date" required /></label>
                  <label>Start time<input name="time" type="time" required /></label>
                </div>
                <label>Venue<input name="venue" maxLength="160" required /></label>
                <label>Event photo<input name="photo" type="file" accept="image/jpeg,image/png,image/webp" required /></label>
                {loginError && <p className="community-error" role="alert">{loginError}</p>}
                {notice && <p className="admin-success" role="status">{notice}</p>}
                <button type="submit" disabled={submitting}>{submitting ? 'Publishing…' : 'Publish event'}</button>
              </form>
            </section>
          ) : (
            <CollegeAdminDashboard session={session} onLogout={logout} />
          )
        )}
      </main>
      <Footer />
    </div>
  )
}

function CollegeAdminDashboard({ session, onLogout }) {
  const [events, setEvents] = useState([])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true
    apiRequest('/admin/events', { token: session.token })
      .then((result) => {
        if (active) setEvents(result.events)
      })
      .catch((requestError) => {
        if (active) setError(requestError.message)
      })
      .finally(() => {
        if (active) setLoading(false)
      })

    return () => { active = false }
  }, [session.token])

  return (
    <section className="admin-dashboard college-admin-dashboard">
      <div className="admin-dashboard-top">
        <p>Signed in as <strong>{session.admin.email}</strong></p>
        <button type="button" onClick={onLogout}>Sign out</button>
      </div>
      <Link className="college-admin-timetable-action" to="/admin/timetable">
        <span className="college-admin-timetable-icon"><Icon name="calendar" /></span>
        <span>
          <strong>Edit today’s timetable</strong>
          <small>Select a class to change its subject or cancel that period.</small>
        </span>
        <Icon name="arrow" />
      </Link>
      <NotesAdminPanel session={session} />
      <div className="college-admin-section-heading">
        <div><p className="community-eyebrow">CAMPUS OVERVIEW</p><h2>Upcoming events</h2></div>
        <span>{events.length} {events.length === 1 ? 'event' : 'events'}</span>
      </div>
      {loading && <p className="community-state">Loading event listings…</p>}
      {error && <p className="community-state community-error" role="alert">{error}</p>}
      {!loading && !error && events.length === 0 && <p className="community-state">There are no events to display.</p>}
      {!loading && !error && (
        <div className="college-admin-event-list">
          {events.map((event) => (
            <article className="college-admin-event" key={event.id}>
              <div className="college-admin-event-date">
                <strong>{new Date(`${event.date}T00:00:00`).toLocaleDateString(undefined, { day: '2-digit' })}</strong>
                <span>{new Date(`${event.date}T00:00:00`).toLocaleDateString(undefined, { month: 'short' })}</span>
              </div>
              <div><h3>{event.title}</h3><p>{event.clubName} · {event.venue} · {event.time}</p></div>
            </article>
          ))}
        </div>
      )}
    </section>
  )
}

function NotesAdminPanel({ session }) {
  const [notes, setNotes] = useState([])
  const [noteClass, setNoteClass] = useState('first')
  const [noteSection, setNoteSection] = useState('A')
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  useEffect(() => {
    let active = true
    apiRequest('/notes')
      .then(({ notes: loadedNotes }) => {
        if (active) setNotes(loadedNotes)
      })
      .catch((requestError) => {
        if (active) setError(requestError.message)
      })
      .finally(() => {
        if (active) setLoading(false)
      })

    return () => { active = false }
  }, [])

  async function addNote(event) {
    event.preventDefault()
    const form = event.currentTarget
    setError('')
    setMessage('')
    setSubmitting(true)
    try {
      const { note } = await apiRequest('/admin/notes', {
        method: 'POST',
        body: new FormData(form),
        token: session.token,
      })
      setNotes((current) => [note, ...current])
      form.reset()
      setNoteClass('first')
      setNoteSection('A')
      setMessage('Study note added and published.')
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <section className="notes-admin-panel" aria-labelledby="admin-notes-heading">
      <div className="college-admin-section-heading">
        <div>
          <p className="community-eyebrow">ACADEMIC RESOURCES</p>
          <h2 id="admin-notes-heading">Study notes</h2>
        </div>
        <Link to="/notes">View notes page <Icon name="arrow" /></Link>
      </div>
      <form className="notes-admin-form" onSubmit={addNote}>
        <label>
          Class
          <select name="classId" value={noteClass} onChange={(event) => {
            const nextClass = event.target.value
            setNoteClass(nextClass)
            setNoteSection('A')
          }} required>
            {notesClasses.map((item) => <option value={item.id} key={item.id}>{item.label}</option>)}
          </select>
        </label>
        <label>
          Section
          <select name="section" value={noteSection} onChange={(event) => setNoteSection(event.target.value)} required>
            <option value="all">All sections</option>
            {notesClasses.find((item) => item.id === noteClass)?.sections.map((section) => (
              <option value={section} key={section}>Section {section}</option>
            ))}
          </select>
        </label>
        <label>
          Note title
          <input name="title" maxLength="160" placeholder="e.g. Engineering Mathematics — Unit 1" required />
        </label>
        <label>
          Subject or course
          <input name="subject" maxLength="120" placeholder="e.g. Engineering Mathematics I" required />
        </label>
        <label>
          Description <span className="notes-field-optional">(optional)</span>
          <textarea name="description" rows="2" maxLength="1000" placeholder="What topics does this note cover?" />
        </label>
        <label>
          Notes file (PDF, max 15 MB)
          <input name="file" type="file" accept="application/pdf,.pdf" required />
        </label>
        {error && <p className="community-error" role="alert">{error}</p>}
        {message && <p className="notes-admin-success" role="status">{message}</p>}
        <button type="submit" disabled={submitting}>{submitting ? 'Publishing…' : 'Add study note'}</button>
      </form>
      <div className="notes-admin-list" aria-label="Published notes">
        <h3>Published notes <span>{notes.length}</span></h3>
        {loading && <p className="community-state">Loading notes…</p>}
        {!loading && notes.map((note) => (
          <div className="notes-admin-item" key={note.id}>
            <span><strong>{note.title}</strong><small>{getNoteClassLabel(note.classId)} · {note.section === 'all' ? 'All sections' : `Section ${note.section || '—'}`} · {note.subject}{note.isSample ? ' · Sample' : ''}</small></span>
            <a href={note.fileUrl} download={note.fileName}>Open file <Icon name="arrow" /></a>
          </div>
        ))}
      </div>
    </section>
  )
}

function ScrollToTop() {
  const { pathname } = useLocation()

  useLayoutEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' })
  }, [pathname])

  return null
}

function App() {
  return (
    <>
      <ScrollToTop />
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/map" element={<CampusMap />} />
        <Route path="/timetable" element={<TimetablePage />} />
        <Route path="/admin/timetable" element={<AdminTimetablePage />} />
        <Route path="/clubs/:clubId" element={<ClubDetailPage />} />
        <Route path="/clubs" element={<CommunityPage type="clubs" />} />
        <Route path="/events" element={<CommunityPage type="events" />} />
        <Route path="/notes" element={<NotesPage />} />
        <Route path="/contact" element={<ContactPage />} />
        <Route path="/chat" element={<CampusGuidePage />} />
        <Route path="/admin" element={<AdminRoute />} />
        <Route path="/admin/:loginType" element={<AdminRoute />} />
      </Routes>
    </>
  )
}

export default App
