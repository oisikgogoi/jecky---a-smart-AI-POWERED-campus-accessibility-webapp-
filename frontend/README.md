# Campus Connect

This React app includes an interactive campus map at `/map`. The map uses
`public/campusMap.png` as its Leaflet image overlay. Visitors can pan and zoom
the map, select a location pin, or search and filter campus places from the
sidebar. The map includes academic buildings, hostels, residences, sports
facilities, and other campus locations.

Club and event data is served by the Express API in `../backend`. Dedicated
pages are available at `/clubs` and `/events`; club administrators can sign in
at `/admin` to publish an event with a photo.
Select any club card on the homepage or `/clubs` directory to open its details,
contact information, and related events at `/clubs/:clubId`.
New event announcements and college administrator timetable changes appear in
the homepage's Latest Notices panel.

The `/notes` page lists searchable, paginated study notes with class and section
filters. The college administrator can tag uploaded PDFs by year and section
after signing in at `/admin/college`; uploads are limited to 15 MB. Three
clearly labeled sample notes are included.

The `/contact` page lists general college office enquiry categories and includes
a message form. Configure SMTP and the college inbox in the backend environment
before the form can deliver email; see `../backend/README.md`.

The `/timetable` page includes selectable sections for first-year sections A–E
and second-year sections A–C. The displayed time blocks are 8:00–9:00 AM,
9:00–10:00 AM, 10:30 AM–12:20 PM, and 2:00–4:00 PM. Subject names are
illustrative and should be replaced with department-confirmed schedules.
After signing in at `/admin/college`, college administrators can open
“Edit today’s timetable” to open the separate `/admin/timetable` page. Select a
period to change its subject, cancel that specific class, or restore its
original subject. Changes apply to the selected year and section for today;
the public `/timetable` page shows the updated schedule.

## Development

Start the backend in one terminal:

```sh
cd ../backend
npm install
npm run dev
```

Then start the frontend in another terminal:

```sh
cd ../frontend
npm install
npm run dev
```

The Vite development server proxies API, uploaded-image, and notes-file requests
to `http://localhost:3001`. See `../backend/README.md` for demo admin
credentials and production configuration.
