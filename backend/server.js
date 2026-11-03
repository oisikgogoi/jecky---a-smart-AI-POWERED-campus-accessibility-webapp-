const crypto = require('node:crypto')
const fs = require('node:fs')
const path = require('node:path')
const express = require('express')
const multer = require('multer')
const nodemailer = require('nodemailer')

const app = express()
const PORT = Number(process.env.PORT) || 3001
const DATA_FILE = process.env.DATA_FILE || path.join(__dirname, 'data.json')
const UPLOAD_DIRECTORY = path.join(__dirname, 'uploads')
const NOTE_UPLOAD_DIRECTORY = path.join(UPLOAD_DIRECTORY, 'notes')
const TOKEN_SECRET = process.env.TOKEN_SECRET || 'development-only-change-this-secret'
const TOKEN_TTL_SECONDS = 8 * 60 * 60
const timetableSections = {
  first: ['A', 'B', 'C', 'D', 'E'],
  second: ['A', 'B', 'C'],
}
const timetablePeriodCount = 4
const contactTopics = [
  'Principal’s Office',
  'Academic & Examination Office',
  'Department Offices',
  'Training & Placement Cell',
  'Student Affairs',
  'General Enquiry',
]
const contactSubmissionWindowMs = 15 * 60 * 1000
const contactSubmissionLimit = 5
const contactSubmissions = new Map()

if (process.env.NODE_ENV === 'production' && (!process.env.TOKEN_SECRET || !process.env.INITIAL_ADMIN_PASSWORD)) {
  throw new Error('Production requires TOKEN_SECRET and INITIAL_ADMIN_PASSWORD environment variables.')
}

const clubSeeds = [
  { id: 'tech-club', name: 'Tech Club', description: 'Innovate, build, and grow through technology.', category: 'Technology', members: 120, icon: 'code', color: 'club-blue', contactEmail: 'tech@clubs.jecky.edu' },
  { id: 'art-culture', name: 'Art & Culture', description: 'Create, express, and inspire the campus community.', category: 'Arts & culture', members: 85, icon: 'palette', color: 'club-violet', contactEmail: 'culture@clubs.jecky.edu' },
  { id: 'eco-club', name: 'Eco Club', description: 'Go green and make a lasting difference.', category: 'Environment', members: 72, icon: 'leaf', color: 'club-green', contactEmail: 'eco@clubs.jecky.edu' },
  { id: 'sports-club', name: 'Sports Club', description: 'Play, compete, and win together.', category: 'Sports', members: 90, icon: 'sports', color: 'club-indigo', contactEmail: 'sports@clubs.jecky.edu' },
]

const imageTypes = new Map([
  ['image/jpeg', '.jpg'],
  ['image/png', '.png'],
  ['image/webp', '.webp'],
])
const noteTypes = new Map([['application/pdf', '.pdf']])
const sampleNotes = [
  {
    id: 'sample-engineering-mathematics',
    title: 'Engineering Mathematics I — Revision Notes',
    subject: 'Engineering Mathematics I',
    classId: 'first',
    section: 'all',
    description: 'Sample revision notes covering limits, derivatives, and introductory calculus.',
    fileName: 'engineering-mathematics-review.txt',
    fileUrl: '/sample-notes/engineering-mathematics-review.txt',
    createdAt: '2026-10-30T09:00:00.000Z',
    createdBy: 'Sample administrator',
    isSample: true,
  },
  {
    id: 'sample-programming-fundamentals',
    title: 'Programming Fundamentals — Quick Reference',
    subject: 'Programming Fundamentals',
    classId: 'first',
    section: 'all',
    description: 'Sample reference sheet for variables, conditionals, loops, and functions.',
    fileName: 'programming-fundamentals.txt',
    fileUrl: '/sample-notes/programming-fundamentals.txt',
    createdAt: '2026-10-29T09:00:00.000Z',
    createdBy: 'Sample administrator',
    isSample: true,
  },
  {
    id: 'sample-engineering-physics',
    title: 'Engineering Physics — Wave Optics Summary',
    subject: 'Engineering Physics',
    classId: 'second',
    section: 'all',
    description: 'Sample summary notes introducing interference and diffraction.',
    fileName: 'engineering-physics-wave-optics.txt',
    fileUrl: '/sample-notes/engineering-physics-wave-optics.txt',
    createdAt: '2026-10-28T09:00:00.000Z',
    createdBy: 'Sample administrator',
    isSample: true,
  },
]

function hashPassword(password, salt = crypto.randomBytes(16).toString('hex')) {
  return {
    salt,
    hash: crypto.scryptSync(password, salt, 64).toString('hex'),
  }
}

function writeData(data) {
  const temporaryFile = `${DATA_FILE}.tmp`
  fs.writeFileSync(temporaryFile, JSON.stringify(data, null, 2))
  fs.renameSync(temporaryFile, DATA_FILE)
}

function initializeData() {
  if (!fs.existsSync(DATA_FILE)) {
    const initialPassword = process.env.INITIAL_ADMIN_PASSWORD || 'ClubAdmin2026!'
    const starterEvents = [
      { id: 'freshers-meet-2026', title: "Freshers' Meet", description: 'Meet fellow students and welcome the new academic year with an evening of music and conversation.', date: '2026-11-15', time: '17:00', venue: 'College Auditorium', clubId: 'art-culture', photoUrl: '/events/freshers-meet.jpg' },
      { id: 'technova-2026', title: 'TechNova Hackathon', description: 'Build a project with your team and explore creative solutions to real-world problems.', date: '2026-11-20', time: '09:00', venue: 'Seminar Hall', clubId: 'tech-club', photoUrl: '/events/technova-hackathon.jpg' },
      { id: 'sports-fest-2026', title: 'Inter-College Sports Fest', description: 'Cheer on campus teams as they compete across a full day of sports.', date: '2026-11-25', time: '08:00', venue: 'Main Ground', clubId: 'sports-club', photoUrl: '/events/sports-fest.jpg' },
    ]
    const admins = [
      { email: 'tech@clubs.jecky.edu', clubId: 'tech-club' },
      { email: 'culture@clubs.jecky.edu', clubId: 'art-culture' },
      { email: 'eco@clubs.jecky.edu', clubId: 'eco-club' },
      { email: 'sports@clubs.jecky.edu', clubId: 'sports-club' },
    ].map((admin) => ({ ...admin, ...hashPassword(initialPassword) }))

    writeData({ clubs: clubSeeds, events: starterEvents, admins })
  }

  const data = readData()
  if (!Array.isArray(data.administrators)) {
    const initialPassword = process.env.INITIAL_ADMIN_PASSWORD || 'ClubAdmin2026!'
    data.administrators = [{
      email: 'admin@jecky.edu',
      name: 'College Administrator',
      ...hashPassword(initialPassword),
    }]
    writeData(data)
  }

  if (!Array.isArray(data.timetableOverrides)) {
    data.timetableOverrides = []
    writeData(data)
  }

  if (!Array.isArray(data.notices) || data.notices.length === 0) {
    const now = Date.now()
    data.notices = [
      {
        id: 'sample-academic-schedule',
        category: 'Sample · Academic',
        text: 'Sample notice: Check with your department for the latest class schedule.',
        tone: 'blue',
        icon: 'cap',
        createdAt: new Date(now - 3 * 24 * 60 * 60 * 1000).toISOString(),
      },
      {
        id: 'sample-library-hours',
        category: 'Sample · Library',
        text: 'Sample notice: Confirm current library opening hours at the library desk.',
        tone: 'red',
        icon: 'book',
        createdAt: new Date(now - 2 * 24 * 60 * 60 * 1000).toISOString(),
      },
      {
        id: 'sample-campus-life',
        category: 'Sample · Campus life',
        text: 'Sample notice: Student club activities and registrations will be posted here.',
        tone: 'purple',
        icon: 'sparkle',
        createdAt: new Date(now - 24 * 60 * 60 * 1000).toISOString(),
      },
    ]
    writeData(data)
  }

  if (!Array.isArray(data.notes) || data.notes.length === 0) {
    data.notes = sampleNotes
    writeData(data)
  }

  const sampleClassAssignments = {
    'sample-engineering-mathematics': 'first',
    'sample-programming-fundamentals': 'first',
    'sample-engineering-physics': 'second',
  }
  let notesNeedUpgrade = false
  for (const note of data.notes) {
    if (!note.classId) {
      note.classId = sampleClassAssignments[note.id] || 'all'
      notesNeedUpgrade = true
    }
    if (!note.section) {
      note.section = 'all'
      notesNeedUpgrade = true
    }
  }
  if (notesNeedUpgrade) writeData(data)
}

function readData() {
  return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'))
}

function getCollegeDate() {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date())
}

function isValidDate(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const parsed = new Date(`${value}T00:00:00.000Z`)
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value
}

function isValidTimetableClass(yearId, section) {
  return typeof yearId === 'string' &&
    Array.isArray(timetableSections[yearId]) &&
    timetableSections[yearId].includes(section)
}

function publicTimetableOverride(override) {
  if (!override) return null
  return {
    date: override.date,
    yearId: override.yearId,
    section: override.section,
    cancelled: override.cancelled === true,
    cancelledPeriods: Array.isArray(override.cancelledPeriods)
      ? override.cancelledPeriods
      : override.cancelled === true
        ? Array.from({ length: timetablePeriodCount }, (_value, index) => index)
        : [],
    subjects: override.subjects,
    updatedAt: override.updatedAt,
  }
}

function addNotice(data, notice) {
  data.notices = data.notices.filter((item) => item.id !== notice.id)
  data.notices.push({ ...notice, createdAt: new Date().toISOString() })
}

function publicNotice(notice) {
  return {
    id: notice.id,
    category: notice.category,
    text: notice.text,
    tone: notice.tone,
    icon: notice.icon,
    createdAt: notice.createdAt,
  }
}

function publicClub(club) {
  return {
    id: club.id,
    name: club.name,
    description: club.description,
    category: club.category,
    members: club.members,
    icon: club.icon,
    color: club.color,
    contactEmail: club.contactEmail,
  }
}

function publicEvent(event, clubs) {
  const club = clubs.find((item) => item.id === event.clubId)
  return { ...event, clubName: club?.name || 'Campus club' }
}

function createToken(admin, role) {
  const payload = Buffer.from(JSON.stringify({
    sub: admin.email,
    role,
    ...(role === 'club_admin' ? { clubId: admin.clubId } : {}),
    exp: Math.floor(Date.now() / 1000) + TOKEN_TTL_SECONDS,
  })).toString('base64url')
  const signature = crypto.createHmac('sha256', TOKEN_SECRET).update(payload).digest('base64url')
  return `${payload}.${signature}`
}

function verifyToken(token) {
  const [payload, signature] = token.split('.')
  if (!payload || !signature) return null

  const expected = crypto.createHmac('sha256', TOKEN_SECRET).update(payload).digest()
  let actual
  try {
    actual = Buffer.from(signature, 'base64url')
  } catch {
    return null
  }
  if (actual.length !== expected.length || !crypto.timingSafeEqual(actual, expected)) return null

  try {
    const claims = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'))
    const role = claims.role || (claims.clubId ? 'club_admin' : null)
    if (typeof claims.sub !== 'string' || !['club_admin', 'college_admin'].includes(role) || claims.exp <= Date.now() / 1000) return null
    if (role === 'club_admin' && typeof claims.clubId !== 'string') return null
    return { ...claims, role }
  } catch {
    return null
  }
}

function getTokenClaims(request) {
  const authorization = request.get('authorization') || ''
  const match = authorization.match(/^Bearer (.+)$/i)
  return match ? verifyToken(match[1]) : null
}

function requireClubAdmin(request, response, next) {
  const claims = getTokenClaims(request)
  const data = claims?.role === 'club_admin' ? readData() : null
  const admin = data?.admins.find((item) => item.email === claims.sub && item.clubId === claims.clubId)

  if (!admin) return response.status(401).json({ error: 'Please sign in with a valid club admin account.' })
  request.admin = admin
  next()
}

function requireCollegeAdmin(request, response, next) {
  const claims = getTokenClaims(request)
  const data = claims?.role === 'college_admin' ? readData() : null
  const admin = data?.administrators.find((item) => item.email === claims.sub)

  if (!admin) return response.status(401).json({ error: 'Please sign in with a valid college administrator account.' })
  request.admin = admin
  next()
}

const upload = multer({
  storage: multer.diskStorage({
    destination: (_request, _file, callback) => callback(null, UPLOAD_DIRECTORY),
    filename: (_request, file, callback) => callback(null, `${crypto.randomUUID()}${imageTypes.get(file.mimetype)}`),
  }),
  limits: { fileSize: 5 * 1024 * 1024, files: 1 },
  fileFilter: (_request, file, callback) => {
    if (!imageTypes.has(file.mimetype)) return callback(new Error('Choose a JPG, PNG, or WebP image.'))
    callback(null, true)
  },
})

const noteUpload = multer({
  storage: multer.diskStorage({
    destination: (_request, _file, callback) => callback(null, NOTE_UPLOAD_DIRECTORY),
    filename: (_request, _file, callback) => callback(null, `${crypto.randomUUID()}.pdf`),
  }),
  limits: { fileSize: 15 * 1024 * 1024, files: 1 },
  fileFilter: (_request, file, callback) => {
    if (!noteTypes.has(file.mimetype) || path.extname(file.originalname).toLowerCase() !== '.pdf') {
      return callback(new Error('Choose a PDF file for the notes.'))
    }
    callback(null, true)
  },
})

fs.mkdirSync(UPLOAD_DIRECTORY, { recursive: true })
fs.mkdirSync(NOTE_UPLOAD_DIRECTORY, { recursive: true })
initializeData()
app.use((request, response, next) => {
  const allowedOrigins = new Set([
    'http://localhost:5173',
    'http://127.0.0.1:5173',
    process.env.FRONTEND_ORIGIN,
  ].filter(Boolean))
  const origin = request.get('origin')
  if (origin && allowedOrigins.has(origin)) {
    response.set('Access-Control-Allow-Origin', origin)
    response.set('Vary', 'Origin')
  }
  response.set('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  response.set('Access-Control-Allow-Methods', 'GET, POST, PUT, OPTIONS')
  if (request.method === 'OPTIONS') return response.sendStatus(204)
  next()
})
app.use(express.json({ limit: '100kb' }))
app.use('/uploads', express.static(UPLOAD_DIRECTORY, { fallthrough: false, maxAge: '1d' }))
app.use('/notes-files', express.static(NOTE_UPLOAD_DIRECTORY, { fallthrough: false, maxAge: '1d' }))

app.get('/api/health', (_request, response) => response.json({ status: 'ok' }))

app.post('/api/contact', async (request, response) => {
  const { name, email, topic, message, website } = request.body || {}
  const validEmail = typeof email === 'string' &&
    email.length <= 254 &&
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
  const fieldsAreValid = [name, topic, message, website].every((value) => typeof value === 'string') &&
    name.trim().length > 0 && name.trim().length <= 100 &&
    validEmail &&
    contactTopics.includes(topic) &&
    message.trim().length >= 10 && message.trim().length <= 4000 &&
    website.length === 0

  if (!fieldsAreValid) {
    return response.status(400).json({ error: 'Enter your name, a valid email address, an office, and a message of 10–4,000 characters.' })
  }

  const now = Date.now()
  for (const [ip, submittedAt] of contactSubmissions) {
    if (now - submittedAt.windowStart >= contactSubmissionWindowMs) contactSubmissions.delete(ip)
  }
  const clientIp = request.ip
  const submissionWindow = contactSubmissions.get(clientIp)
  if (submissionWindow && now - submissionWindow.windowStart < contactSubmissionWindowMs &&
    submissionWindow.count >= contactSubmissionLimit) {
    response.set('Retry-After', String(Math.ceil((contactSubmissionWindowMs - (now - submissionWindow.windowStart)) / 1000)))
    return response.status(429).json({ error: 'Too many messages were sent. Please try again in a few minutes.' })
  }

  const { SMTP_HOST, SMTP_PORT = '587', SMTP_SECURE = 'false', SMTP_USER, SMTP_PASSWORD, SMTP_FROM, CONTACT_TO_EMAIL } = process.env
  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASSWORD || !CONTACT_TO_EMAIL) {
    return response.status(503).json({ error: 'Email sending is not configured yet. Please contact the college office directly.' })
  }

  const port = Number(SMTP_PORT)
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    console.error('Contact email is not configured: SMTP_PORT must be a valid port.')
    return response.status(503).json({ error: 'Email sending is temporarily unavailable. Please try again later.' })
  }

  const activeWindow = submissionWindow && now - submissionWindow.windowStart < contactSubmissionWindowMs
  contactSubmissions.set(clientIp, {
    windowStart: activeWindow ? submissionWindow.windowStart : now,
    count: activeWindow ? submissionWindow.count + 1 : 1,
  })

  try {
    const transporter = nodemailer.createTransport({
      host: SMTP_HOST,
      port,
      secure: SMTP_SECURE.toLowerCase() === 'true',
      auth: { user: SMTP_USER, pass: SMTP_PASSWORD },
    })
    await transporter.sendMail({
      from: SMTP_FROM || SMTP_USER,
      to: CONTACT_TO_EMAIL,
      replyTo: { name: name.trim(), address: email.trim() },
      subject: `Campus enquiry: ${topic}`,
      text: [
        `From: ${name.trim()}`,
        `Reply email: ${email.trim()}`,
        `Office: ${topic}`,
        '',
        message.trim(),
      ].join('\n'),
    })
    response.status(202).json({ message: 'Your message has been sent to the college contact inbox.' })
  } catch (error) {
    console.error('Contact email delivery failed:', error.code || error.message)
    response.status(502).json({ error: 'We could not send your message right now. Please try again later.' })
  }
})

app.get('/api/clubs', (_request, response) => {
  response.json({ clubs: readData().clubs.map(publicClub) })
})

app.get('/api/events', (_request, response) => {
  const data = readData()
  const events = data.events
    .map((event) => publicEvent(event, data.clubs))
    .sort((left, right) => `${left.date}T${left.time}`.localeCompare(`${right.date}T${right.time}`))
  response.json({ events })
})

app.get('/api/notices', (_request, response) => {
  const notices = readData().notices
    .slice()
    .sort((left, right) => right.createdAt.localeCompare(left.createdAt))
    .slice(0, 10)
    .map(publicNotice)
  response.json({ notices })
})

app.get('/api/notes', (_request, response) => {
  const notes = readData().notes
    .slice()
    .sort((left, right) => right.createdAt.localeCompare(left.createdAt))
    .map(({ id, title, subject, description, classId, section, fileName, fileUrl, createdAt, isSample }) => ({
      id,
      title,
      subject,
      description,
      classId: classId || 'all',
      section: section || 'all',
      fileName,
      fileUrl,
      createdAt,
      isSample: isSample === true,
    }))
  response.json({ notes })
})

app.get('/api/timetable/today', (request, response) => {
  const { date, yearId, section } = request.query
  if (!isValidDate(date) || !isValidTimetableClass(yearId, section)) {
    return response.status(400).json({ error: 'Choose a valid date, year, and section.' })
  }

  const data = readData()
  const override = data.timetableOverrides.find((item) =>
    item.date === date && item.yearId === yearId && item.section === section)
  response.json({ override: publicTimetableOverride(override) })
})

app.post('/api/auth/login', (request, response) => {
  const email = typeof request.body?.email === 'string' ? request.body.email.trim().toLowerCase() : ''
  const password = typeof request.body?.password === 'string' ? request.body.password : ''
  const role = request.body?.role
  const data = readData()
  const admin = role === 'club_admin'
    ? data.admins.find((item) => item.email === email)
    : role === 'college_admin'
      ? data.administrators.find((item) => item.email === email)
      : null

  if (!admin || !password) return response.status(401).json({ error: 'Email or password is incorrect.' })
  const candidateHash = crypto.scryptSync(password, admin.salt, 64)
  const savedHash = Buffer.from(admin.hash, 'hex')
  if (candidateHash.length !== savedHash.length || !crypto.timingSafeEqual(candidateHash, savedHash)) {
    return response.status(401).json({ error: 'Email or password is incorrect.' })
  }

  const club = role === 'club_admin' ? data.clubs.find((item) => item.id === admin.clubId) : null
  response.json({
    token: createToken(admin, role),
    role,
    admin: role === 'club_admin'
      ? { email: admin.email, clubId: admin.clubId, clubName: club?.name || 'Club' }
      : { email: admin.email, name: admin.name },
  })
})

app.get('/api/admin/events', requireCollegeAdmin, (_request, response) => {
  const data = readData()
  const events = data.events
    .map((event) => publicEvent(event, data.clubs))
    .sort((left, right) => `${left.date}T${left.time}`.localeCompare(`${right.date}T${right.time}`))
  response.json({ events })
})

app.post('/api/admin/notes', requireCollegeAdmin, noteUpload.single('file'), (request, response) => {
  const { title, subject, description = '', classId, section } = request.body || {}
  const validClass = typeof classId === 'string' && Array.isArray(timetableSections[classId])
  const validSection = section === 'all' ||
    (validClass && timetableSections[classId].includes(section))
  const validFields = [title, subject, description, classId, section].every((value) => typeof value === 'string') &&
    title.trim().length > 0 && title.trim().length <= 160 &&
    subject.trim().length > 0 && subject.trim().length <= 120 &&
    description.trim().length <= 1000 &&
    validClass && validSection

  if (!validFields || !request.file) {
    if (request.file) fs.unlinkSync(request.file.path)
    return response.status(400).json({ error: 'Provide a valid class, section, title, subject, and PDF file. Description is optional.' })
  }

  const note = {
    id: crypto.randomUUID(),
    title: title.trim(),
    subject: subject.trim(),
    classId,
    section,
    description: description.trim(),
    fileName: path.basename(request.file.originalname),
    fileUrl: `/notes-files/${request.file.filename}`,
    createdAt: new Date().toISOString(),
    createdBy: request.admin.email,
  }
  const data = readData()
  data.notes.push(note)
  writeData(data)
  response.status(201).json({
    note: {
      id: note.id,
      title: note.title,
      subject: note.subject,
      classId: note.classId,
      section: note.section,
      description: note.description,
      fileName: note.fileName,
      fileUrl: note.fileUrl,
      createdAt: note.createdAt,
      isSample: false,
    },
  })
})

app.put('/api/admin/timetable/today', requireCollegeAdmin, (request, response) => {
  const body = request.body || {}
  const { date, yearId, section, cancelled, cancelledPeriods, subjects, reset } = body
  if (date !== getCollegeDate() || !isValidDate(date) || !isValidTimetableClass(yearId, section)) {
    return response.status(400).json({ error: 'Changes can only be made for today and a valid year and section.' })
  }

  if (reset === true) {
    const data = readData()
    data.timetableOverrides = data.timetableOverrides.filter((item) =>
      !(item.date === date && item.yearId === yearId && item.section === section))
    addNotice(data, {
      id: `timetable-${date}-${yearId}-${section}`,
      category: 'Academic',
      text: `The regular timetable was restored for ${yearId === 'first' ? '1st' : '2nd'} Year · Section ${section}.`,
      tone: 'blue',
      icon: 'cap',
    })
    writeData(data)
    return response.json({ override: null })
  }

  const subjectsAreValid = Array.isArray(subjects) &&
    subjects.length === timetablePeriodCount &&
    subjects.every((subject) => typeof subject === 'string' && subject.trim() && subject.trim().length <= 120)
  const hasCancelledPeriods = Object.hasOwn(body, 'cancelledPeriods')
  const periodsToCancel = hasCancelledPeriods
    ? cancelledPeriods
    : cancelled === true
      ? Array.from({ length: timetablePeriodCount }, (_value, index) => index)
      : []
  const cancelledPeriodsAreValid = hasCancelledPeriods
    ? Array.isArray(cancelledPeriods) &&
      cancelledPeriods.every((index) =>
        Number.isInteger(index) && index >= 0 && index < timetablePeriodCount) &&
      new Set(cancelledPeriods).size === cancelledPeriods.length
    : typeof cancelled === 'boolean'
  if (!subjectsAreValid || !cancelledPeriodsAreValid) {
    return response.status(400).json({ error: 'Provide four subjects (up to 120 characters each) and valid cancelled period indexes.' })
  }

  const data = readData()
  const override = {
    date,
    yearId,
    section,
    cancelled: false,
    cancelledPeriods: periodsToCancel,
    subjects: subjects.map((subject) => subject.trim()),
    updatedAt: new Date().toISOString(),
    updatedBy: request.admin.email,
  }
  const existingIndex = data.timetableOverrides.findIndex((item) =>
    item.date === date && item.yearId === yearId && item.section === section)
  if (existingIndex === -1) data.timetableOverrides.push(override)
  else data.timetableOverrides[existingIndex] = override
  const yearLabel = yearId === 'first' ? '1st Year' : '2nd Year'
  const cancelledNotice = periodsToCancel.length
    ? ` Cancelled: ${periodsToCancel.map((index) => `Period ${index + 1}`).join(', ')}.`
    : ''
  addNotice(data, {
    id: `timetable-${date}-${yearId}-${section}`,
    category: 'Academic',
    text: `Today's timetable was updated for ${yearLabel} · Section ${section}.${cancelledNotice}`,
    tone: periodsToCancel.length ? 'red' : 'blue',
    icon: 'cap',
  })
  writeData(data)
  response.json({ override: publicTimetableOverride(override) })
})

app.post('/api/events', requireClubAdmin, upload.single('photo'), (request, response) => {
  const { title, description, date, time, venue } = request.body
  const validDate = typeof date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(date) &&
    !Number.isNaN(Date.parse(`${date}T00:00:00`))
  const validTime = typeof time === 'string' && /^([01]\d|2[0-3]):[0-5]\d$/.test(time)
  const fieldsAreValid = [title, description, venue].every((value) => typeof value === 'string' && value.trim()) &&
    title.length <= 120 && description.length <= 2000 && venue.length <= 160 && validDate && validTime

  if (!fieldsAreValid || !request.file) {
    if (request.file) fs.unlinkSync(request.file.path)
    return response.status(400).json({ error: 'Provide an event name, description, date, time, venue, and photo.' })
  }

  const data = readData()
  const event = {
    id: crypto.randomUUID(),
    title: title.trim(),
    description: description.trim(),
    date,
    time,
    venue: venue.trim(),
    photoUrl: `/uploads/${request.file.filename}`,
    clubId: request.admin.clubId,
    createdAt: new Date().toISOString(),
  }
  data.events.push(event)
  const club = data.clubs.find((item) => item.id === event.clubId)
  addNotice(data, {
    id: `event-${event.id}`,
    category: 'Campus life',
    text: `${event.title} was announced by ${club?.name || 'a campus club'}.`,
    tone: 'purple',
    icon: 'sparkle',
  })
  writeData(data)
  response.status(201).json({ event: publicEvent(event, data.clubs) })
})

app.use((error, request, response, _next) => {
  if (error instanceof multer.MulterError) {
    const message = error.code === 'LIMIT_FILE_SIZE'
      ? request.path === '/api/admin/notes'
        ? 'The notes PDF must be 15 MB or smaller.'
        : 'The event photo must be 5 MB or smaller.'
      : 'Upload one file at a time.'
    return response.status(400).json({ error: message })
  }
  if (error.message === 'Choose a JPG, PNG, or WebP image.' || error.message === 'Choose a PDF file for the notes.') {
    return response.status(400).json({ error: error.message })
  }
  response.status(error.status || 500).json({ error: error.status ? error.message : 'An unexpected server error occurred.' })
})

app.listen(PORT, () => {
  console.log(`Campus Connect API listening on http://localhost:${PORT}`)
})
