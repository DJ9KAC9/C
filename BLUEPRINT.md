# Ora — Phase 1 blueprint

Working name: **Ora** (Latin *ora*: edge, shore; also "now" in several languages; two syllables in Arabic and English, no translation needed).
Tagline: **Care, considered.** Alternatives: *Precision you can trust. Calm you can feel.* / *Quietly exact.* / *The better kind of careful.*

Other name directions, if Ora is taken: Aster · Meridian House · Halcyon · Nawa (نواة, "the core") · Lumen · Verra · Sereine.

## Positioning
Not a dental clinic with a skin add-on. A single standard of care that happens to cover teeth, smile, skin and screen. The competitor set is premium wellness and top-tier private practice, not the clinic down the road.

**Audience.** Primary: 28–55, Amman and the Gulf, pays for expertise and hates wasting time; frequently books for family too. Secondary: international patients (dental tourism, diaspora) who need online triage before a flight. Tertiary: the emergency patient, who needs zero friction at 7pm.

**Personality.** Reassuring, precise, warm, plain-spoken, unhurried. Never salesy, never cute.

**Voice rules.** Sentence case. Short sentences. Say the fee. Say what happens next. No "we are committed to excellence". Say "we'll say no when no is the right answer" and mean it. Errors explain what went wrong and how to fix it; empty states invite an action.

**Brand story (short).** Ora began with a question patients kept asking after their teeth were finished: "who do I trust with the rest of my face?" The answer became a room down the hall, with the same doctors' standards, the same records, the same calm. Everything else — the booking that takes a minute, the doctor on your screen, the fast track when you're in pain — follows from one belief: the best care is quiet, exact, and entirely about you.

## Visual identity
Palette (psychology in brackets):
- Warm charcoal `#1E1D1B` — night surface, headline text (authority without coldness)
- Ivory `#F3EFE8`, Mist `#E9E4DC` — day surfaces (clean, not clinical white)
- Stone `#D6CEC2`, `#B9AE9F` — lines, muted text (material, tactile)
- Sage `#93A296` — the Lounge, secondary accent (skin, calm, botanical)
- Emerald `#1F4A3E` / `#2A5F50` — primary interactive (trust that isn't hospital blue)
- Brass `#A98A5E` — one warm metallic, used at hairline scale only (precision instruments, not gold-plated luxury)
- Success `#2F6B4F` · Warning `#B7853A` · Error `#A63D3D`

Type: **Fraunces** (variable serif, optical sizes, light weight) for display; **Instrument Sans** for interface. Serif carries the emotion; sans carries the work.

Art direction: editorial healthcare × luxury wellness × cinematic technology. Light is the hero, not the smile. Real skin, real hands, real instruments; no stock grins, no cartoon molars. The design spends its boldness in two places: the hero type and the calendar. Everything else is disciplined.

## Where I'd challenge the brief
1. **Mobile app, day one: no.** Ship the web app as a PWA first (installable, push notifications, offline booking summary). A native app costs 3–4× and most patients book twice a year. Build native only when retention data says so.
2. **Five booking steps is one too many for returning patients.** Returning patients get "Book again with Dr. Haddad" from the first screen: three taps.
3. **"Select pain severity" should route, not just record.** Severe → fast track automatically. It's built that way.
4. **Don't build your own video.** Daily.co or Twilio Video rooms with a one-tap link. Building WebRTC in-house is a year of pain for zero brand value.
5. **Online consultation fee ≠ zero.** Charge for it and credit it toward treatment; free consultations attract no-shows.
6. **Testimonials and stats need verification** before they go live. The current ones are layout samples and are labelled as such.

## Recommended platform architecture
| Layer | Choice | Why |
|---|---|---|
| Web + patient app | Next.js (App Router) on Vercel, PWA | One codebase, SSR for SEO, edge caching, previews per branch |
| Design system | Tailwind + tokens from `css/style.css`, Radix primitives | Same tokens ship to web, PWA, admin |
| Backend | Next.js Route Handlers + Supabase (Postgres, Auth, Storage, RLS) | Row-level security is the cleanest way to keep patient data locked per user |
| Scheduling | Postgres with exclusion constraints on `(doctor_id, tstzrange)` | Double booking becomes impossible at the database, not the UI |
| Payments | Stripe (cards, Apple Pay) + a local PSP for CliQ/JOD | Deposit on booking, credit on treatment |
| Video | Daily.co rooms created at confirmation, tokens expire after the slot | Secure links, audio fallback built in |
| Notifications | Resend (email) + WhatsApp Business API + web push | Reminders at −24h and −2h; WhatsApp is the channel Amman actually reads |
| Uploads | Supabase Storage, private buckets, signed URLs, EXIF stripped | Photos never public, deletable on request |
| Admin | Same Next.js app under `/admin`, role-gated | Doctors, schedules, fees, requests, payments, analytics |
| Analytics | PostHog (self-hostable) | No ad pixels on a health site |
| Compliance | Data at rest in EU region, audit log table, consent records | Jordan PDPL alignment, GDPR-ready for diaspora patients |

Data model (core): `patients`, `doctors`, `services`, `schedules`, `availability_exceptions`, `appointments` (with `status`, `channel: clinic|online`, `payment_id`, `video_room`), `intake_notes` (description, severity, onset, images), `payments`, `reminders`, `audit_log`.

## What this preview is
A static, deployable design prototype: brand, homepage, Lounge, online consultation, and a working five-step booking flow with a fast track, live-looking availability per doctor, duration and fee logic, timezone handling and a confirmation screen. Availability and payment are simulated client-side. Next: port to Next.js + Supabase and connect the calendar to real schedules.

## Higgsfield prompts
See `higgsfield-prompts.md`.

## Phase 1.1 — real assets + the partner portal

**Real assets integrated.** The clinic's own photos (both operatories, reception, waiting area), the reception walkthrough video (hero of the gallery, compressed to 3.5 MB, muted loop), and the gold AH monogram (favicon, footer lockup, Dr. Halasa's card). Location corrected to Madaba; clinic phone 079 222 2427. Dr. Awen Halasa now appears with real credentials (DDS UoJ, MFD RCSI & RCSE, PGDip Aesthetic Dentistry Leeds) on the homepage and in the booking flow; the other three doctors remain labelled placeholders. The second video was an Instagram screen-recording with UI overlays, so it wasn't used — export the raw clip and it can go in.

**Practice at Ora (`/pro`).** Ora has two operatories and one resident dentist, so idle chair-hours are inventory. The portal lets licensed dentists without a clinic book a room, hours, and a case, with a live cost estimate:

- **Clinic 1** (Dr. Halasa's flagship room): partners book 19:00–24:00 Sat–Thu, and all day Friday (his weekly holiday) — his own schedule is never touched.
- **Clinic 2**: bookable daily 9:00–24:00 around Ora's own simulated schedule; two dentists can run in parallel.

**Two payment models, chosen per booking:**

| | All-inclusive share | Hourly chair |
|---|---|---|
| Price | **35% of case fees to Ora** (dentist keeps 65%), min 25 JOD/booking | **20 JOD/h** daytime Clinic 2 · **25 JOD/h** evenings & Fridays (Clinic 1 always 25) |
| Includes | Room, machinery, X-ray, standard materials & consumables, sterilization, reception, card payments | Room, machinery, sterilization, reception — dentist brings own materials |
| Extras | Lab work at cost | Assistant +8 JOD/h · X-ray 3 JOD/exposure · intraoral scan 15 JOD/case · 2-hour minimum |

*Why these numbers.* Associate splits in Jordanian clinics run 40–60% to the clinic — but there the clinic supplies the patients. Here the partner brings their own patients, so the clinic's share should sit below that band: 35% covers chair time, consumables and staff with margin, while leaving the dentist clearly better off than an associateship. The hourly rate is anchored to what a chair-hour costs Ora (rent, utilities, sterilization, reception share ≈ 8–12 JOD/h in Madaba) plus margin; 20/25 JOD undercuts renting even a modest private room while staying profitable from hour one. The evening/Friday premium prices the flagship room and unsocial staff hours. Review both quarterly against uptake: >60% chair utilization → raise; <20% → introduce 10-hour bundles at −15%.

**Guardrails built into the flow:** JDA license number required, one-time in-person verification, house-rules agreement (sterilization protocol, materials logging, 24h cancellation), and an explicit promise that partners' patients and records remain theirs — Ora never markets to them. Requests are confirmed by WhatsApp within two hours rather than auto-booked, so the clinic keeps a human veto while volume is low.

**Next for the portal:** partner accounts with saved details and booking history, real-time chair calendar shared with the patient-side scheduler (same Postgres exclusion constraints — a chair can't be double-booked across the two flows), monthly statements, and a materials-log screen for check-out.


## Phase 1.2 — shipped in this update
- **Brand**: "ORA" lockup — the O is a drawn tooth with a small smile (assets/brand/ora-mark.svg); matching SVG favicon. Dr. Halasa's gold AH monogram sits on the hero's right, feathered into the dark.
- **Languages**: EN/AR toggle in every nav, full RTL, Amiri + IBM Plex Sans Arabic. The homepage and shared nav/footer are translated; the interactive booking/partner flows remain English this phase and get full AR in the Supabase build.
- **Clinic portal** (/admin.html): staff gate (Awe.halasa71@gmail.com + hello@ora.clinic), Today per-room lists, day calendar with block/book on click, partner-request approve/decline that places sessions on the calendar. Data is a browser-local prototype; the real build replaces it with Supabase auth + Postgres so all devices see one calendar.

### Phase 1.3
- Brand reverted to the plain "Ora." wordmark by request; tooth mark and gold monogram placements removed. Favicon: emerald "O." tile.
- i18n v2: dictionary-based full-page translation (~330 strings) with a DOM observer, so all five pages AND the interactive booking/partner flows render in Arabic, with ar-JO dates. Switching back restores exact English.

### Phase 1.4 — real clinic details + dashboard
- Real details everywhere: Al-Gharbi St. 181 Madaba, tel +962 7 9222 2427 (tap-to-call), hours Sat–Thu 9:00–22:00.
- Full official service list on the homepage ("Everything we treat"): 13 dental lines, facial aesthetics (Botox, fillers, Profhilo, mesotherapy, boosters), Skin Lounge (HydroFacial etc.), plus a "Digital precision" note (intraoral scanning, premium materials). All bookable in the flow with fees/durations.
- Doctors: Dr. Awen Halasa (عون الهلسة — Arabic corrected) + Dr. Rana Odeh (MSc Orthodontics, UoJ; د. رنا عودة). Placeholder doctors removed everywhere incl. booking logic.
- Rooms named Clinic 1 / Clinic 2 in English and كلينيك 1 / كلينيك 2 in Arabic.
- Online consultation repriced 20% below in-clinic: 15 min 16 JOD, 30 min 28 JOD.
- Clinic portal is now a dashboard: Today, Calendar, Bookings (search/cancel), Partner requests (approve→calendar+settlement), Money (collected today/7-days, owed to partners, transaction ledger with mark-paid / mark-transferred). Site bookings and partner requests on the same browser feed straight into it.
- Still browser-local by design. The real backend (Supabase Postgres + auth + HyperPay/PayTabs for actual money movement) is the next build; this dashboard is its exact spec.
