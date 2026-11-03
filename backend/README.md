# Campus Connect API

## Run locally

```sh
npm install
npm run dev
```

The API listens on `http://localhost:3001`. Club and event data are initialized
in `data.json` on first start, and uploaded event images are saved under
`uploads/`. Administrator note PDFs are saved under `uploads/notes/`. Keep
these files backed up to retain the data.
Three clearly labeled sample notices are added when the notice list is empty;
new event announcements and timetable updates appear alongside them.
Three sample study notes are seeded when the notes list is empty.

## Club admin demo accounts

All four seeded club admins use the initial development password
`ClubAdmin2026!`:

| Club | Email |
| --- | --- |
| Tech Club | `tech@clubs.jecky.edu` |
| Art & Culture | `culture@clubs.jecky.edu` |
| Eco Club | `eco@clubs.jecky.edu` |
| Sports Club | `sports@clubs.jecky.edu` |

Set `INITIAL_ADMIN_PASSWORD` before the first run to choose a different
password. Admin passwords are stored as scrypt hashes. Do not use the
development password in a deployed environment.

## College administrator demo account

The seeded teacher/college administrator account is `admin@jecky.edu`, using
the initial development password `ClubAdmin2026!`. Set
`INITIAL_ADMIN_PASSWORD` before starting the backend to choose a different
initial password. Existing data files are upgraded on startup to add this
account without replacing club accounts or event data.

## Production settings

Set `TOKEN_SECRET` and `INITIAL_ADMIN_PASSWORD` to strong, private values before
starting with `NODE_ENV=production`. Set `FRONTEND_ORIGIN` to the exact public
frontend origin. `DATA_FILE` can be set to choose a persistent data file path.

## Contact email setup

The public contact form sends plain-text enquiries to one fixed college inbox;
the visitor cannot choose an arbitrary recipient. Configure these backend
environment variables to enable delivery:

- `SMTP_HOST` — SMTP server hostname
- `SMTP_PORT` — SMTP port (defaults to `587`)
- `SMTP_SECURE` — set to `true` when the SMTP server requires implicit TLS
- `SMTP_USER` and `SMTP_PASSWORD` — SMTP credentials
- `SMTP_FROM` — optional sender address (defaults to `SMTP_USER`)
- `CONTACT_TO_EMAIL` — the official college inbox that receives enquiries

Keep SMTP credentials private and configure them in the backend's runtime
environment, not in frontend code. Until these values are configured, the form
returns a clear message that email delivery is unavailable. Requests are
validated and limited to five per IP address per 15 minutes.

## Endpoints

- `GET /api/health` — service status
- `POST /api/contact` — send a validated enquiry to the configured college
  contact inbox
- `GET /api/clubs` — public club directory
- `GET /api/events` — public event list
- `GET /api/notices` — latest notices for new events and timetable updates
- `GET /api/notes` — public list of study notes
- `POST /api/auth/login` — role-specific login. Include `role` as `club_admin`
  or `college_admin`; returns a time-limited bearer token.
- `GET /api/admin/events` — list campus events (college administrator bearer
  token required)
- `POST /api/admin/notes` — add a study note (college administrator bearer
  token required; `multipart/form-data` fields `title`, `subject`, `classId`
  (`first` or `second`), `section` (A–E for first year, A–C for second year,
  or `all`), optional `description`, and a PDF `file`)
- `GET /api/timetable/today?date=YYYY-MM-DD&yearId=first&section=A` — read a
  same-day timetable override for a valid year and section
- `PUT /api/admin/timetable/today` — save today's subjects and selected
  `cancelledPeriods` indexes (0–3), or reset all overrides for that section
  (college administrator bearer token required). The legacy `cancelled: true`
  field remains accepted and marks all four periods cancelled.
- `POST /api/events` — create an event (bearer token and `multipart/form-data`
  fields `title`, `description`, `date`, `time`, `venue`, and `photo`)
- `GET /uploads/<filename>` — uploaded event photo

Event photos must be JPG, PNG, or WebP and no larger than 5 MB.
Notes must be PDF files no larger than 15 MB. Uploaded note files are available
at `/notes-files/<filename>`.
