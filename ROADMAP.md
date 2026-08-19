# 🗺️ Joe Jackson Ticket Museum — Roadmap & Project Plan

### 🚀 Completed Changes (August 19, 2026)

* **Admin Authentication & Session Stability (`index.html` / `app.js` / `github-service.js`):**
  * **Direct Prompt Login & Header Controls:** Restored direct prompt-based GitHub PAT login flow in `index.html` (`handleAdminLogin`). Added dedicated `#adminEditorLink` (`✏️ Editor`) alongside `#adminLoginLink` (`🔒 Admin`) and `#adminLockBtn` (`🔒 Lock Admin`) for clear UI state toggling.
  * **Session Lock & Cleanup:** Enhanced `lockAdminSession()` to purge local credentials (`gh_token`, `jj_github_pat`, `jj_admin_mode`) and cleanly reset URL query parameters without triggering full browser reloads.
  * **Infinite Loop Mitigation:** Removed destructive `location.reload()` calls from error handling scripts and `lockAdminSession` to eliminate page lockup loops on authentication failure.
  * **Graceful GitHub API 401 Handling (`github-service.js`):** Implemented automatic PAT purging on HTTP `401 Unauthorized` responses to prevent stale credentials from breaking public browsing sessions.

* **Record Editor (`edit_ticket_new.html`):**
  * **Tour Name Field Update:** Converted `edit_TOUR_NAME` from a datalist-based input to a full `<select>` element to display all available tours continuously without requiring text truncation or clearing.
  * **Contributor / Donor Field:** Linked `edit_CONTRIBUTOR` to a dynamic `<datalist>` (`contributorsList`) populated from existing CSV records to allow auto-suggestions while supporting multi-name text entries.
  * **Record Deletion:** Restored the `Delete` button (`btn-del`) in the navigation bar with confirmation popups and instant memory/state cleanup.

* **Main Public Museum (`index.html` / `app.js` / `styles.css`):**
  * **Card Layout & Action Toolbar:** Completely redesigned and restructured the 7-slot action grid on the record cards for better responsiveness, clearer icon layout, and unified action badges.
  * **Category Badge Logic & Singular Form Fix:** Resolved singular label formatting for `Passes` (`Pass` instead of `Passe`) in `app.js`.
  * **UI & Layout:** Adjustments in `styles.css` for `.category-badge` (`white-space: nowrap`, `overflow: visible`) to prevent badge text overflow and truncation.

---

## Overview
An interactive digital museum and archive dedicated to Joe Jackson's live concert tour history (1978–2026), ticket stubs, venue metadata, setlists, and memorabilia.

---

## 💡 Active Feature Backlog & New Ideas (Up Next)

### 1. Legal Disclaimer & Copyright Notice Footer
- [x] **Copyright & Fair Use Notice (`index.html` / `stats.html`)**:
  - Add a subtle, professional footer disclaimer to all public pages stating:
    - *Non-commercial, educational & fan-archival nature of the museum.*
    - *All trademarks, logos, and artist names belong to Joe Jackson and their respective copyright holders.*
    - *Scans & digital representations contributed by private donors (`CONTRIBUTOR`).*
    - *Direct DMCA / Takedown contact email for copyright owners.*

### 2. Rescheduled & COVID-19 Cancelled Show Handling
- [x] **Rescheduled Show Metadata (`ORIGINAL_DATE` / `RESCHEDULED_NOTE`)**:
  - Keep `DATUM` strictly mapped to the actual performed show date (maintaining timeline and map accuracy).
  - Add optional `ORIGINAL_DATE` or `RESCHEDULED_NOTE` attribute to preserve historical ticket print dates (e.g. ticket printed for Oct 20, 2020, but concert took place May 14, 2022).
  - Display a visual badge on concert cards: `🔄 Rescheduled (Ticket printed for Oct 20, 2020)`.
- [x] **Cancelled Show Tracking (`CANCELLED`)**:
  - Support cancelled shows (e.g., COVID-19 cancellations) with dedicated status badges: `❌ Cancelled Show`.

### 3. Multi-Scan Count Badge on Concert Cards
- [ ] **Multi-Scan Indicator**:
  - Automatically evaluate `SOUBOR_SKEN` string length. If multiple scans exist (`comma-separated > 1`), display a subtle thumbnail badge (e.g. `📷 2` or `🖼️ 3`) to inform visitors that front/back sides or additional program pages are available inside the detail viewer.

### 4. Setlist.fm Cross-Reference & Date Verification Badges
- [ ] **Verification Badges in Museum View (`index.html`)**:
  - 🟢 **Setlist Confirmed**: Record has `SETLIST_URL` and `POCET_SKLADEB > 0`.
  - 🟡 **Date Confirmed**: Record has a valid `SETLIST_URL` but `POCET_SKLADEB = 0` (serves as an external cross-reference confirming the show date/venue).
  - ⚪ **Unverified Date**: Record lacks a `SETLIST_URL` link.
- [ ] **Passive Community Nudge**:
  - Display a subtle link on item detail cards with 0 songs: *"Know this setlist? Add it on Setlist.fm or contribute a program scan."*
- [ ] **Verification Filter**:
  - Add quick filter checkboxes in Museum View and Admin Editor to easily isolate unverified shows or shows with missing setlist songs.

### 5. Theme Switcher (Light / Dark / Auto Mode)
- [ ] **Světlý a tmavý režim (`index.html` / `styles.css`)**:
  - Přidání přepínače motivu vedle přepínače fontů v hlavičce.
  - Vytvoření světlé varianty CSS proměnných (`:root` / `.theme-light`) pro čtení na přímém slunci.
  - Detekce systémového nastavení uživatele (`prefers-color-scheme: dark`).
  - Ukládání preferovaného režimu do `localStorage` (`jj_selected_theme`).

---

## ⏳ Pending Client Approval & Pre-Launch Tasks

### Launch & SEO Essentials
- [x] **Legal & Copyright Footer Integration**
  - Implement non-commercial archival disclaimer and DMCA takedown contact in website footer.
- [ ] **Search Engine Indexing & Bot Directives**
  - Create `robots.txt` (blocking `/edit_ticket_new.html` from search crawlers).
  - Generate `sitemap.xml` covering main pages (`/`, `/stats.html`, `/ticket_form.html`).
- [ ] **Social Media Sharing & Asset Audit**
  - Verify physical existence of `favicon.svg` and `favicon.ico` in repo root.
  - Create high-resolution `og-image.jpg` (1200×630px) for rich previews on social networks (Facebook, WhatsApp, X).
- [ ] **Custom Domain Deployment (`joejackson.band`)**
  - Add `CNAME` file to GitHub Pages repository.
  - Configure A/CNAME DNS records with domain registrar.
- [ ] **Broken Asset Fallback**
  - Verify graceful UI image placeholder display when `SOUBOR_SKEN` paths fail to load.

---

## 🔮 Post-Launch Enhancements & Future Upgrades
- [ ] **Concurrent Editing Conflict Guard (`edit_ticket_new.html`)**
  - Implement pre-commit fetch & row-level merge ("Fetch Before Commit") to prevent two admins from overwriting each other's changes when saving CSV records simultaneously via GitHub API (`409 Conflict` mitigation).
- [ ] **Codebase Refactoring & Architecture Cleanup**
  - **Unified `localStorage` Manager:** Centralize all application state (GitHub token, repository settings, active layout views, sorting orders, and category filters) into a single key-value wrapper to eliminate legacy key fallbacks (`jj_github_pat` vs. `gh_token`).
  - **Isolated GitHub API Service (`github-service.js`):** Extract GitHub REST API operations (SHA retrieval, UTF-8 Base64 encoding, commits, and error handling for 401/403/404 HTTP codes) out of `edit_ticket_new.html` into a dedicated, reusable module.
  - **Shared Tour Slug & Form Helpers:** Consolidate tour selector datalists, auto-slug generation (`TOUR_ID`), and date parsing logic shared between `app.js`, `edit_ticket_new.html`, and `ticket_form.html`.
- [ ] **Context-Aware Admin Editor Form Fields (`edit_ticket_new.html`)**
  - Dynamically show/hide non-relevant input fields based on selected `KATEGORIE` (e.g., hide concert setlist, date, and venue inputs when editing tour-wide items like Passes or Tour Books).
- [ ] **Community & Fan Interactivity Engine (Supabase / Cloudflare D1 Backend)**
  - **Setlist.fm Import:** Sync user attendance via Setlist.fm public API (`/user/{userId}/attended`) to automatically display attendance badges.
  - **Personal Concert Statuses:** User interactive badges per show (*"I Was There"*, *"I Own Ticket"*, *"Ticket Lost/Traded"*, *"I Have Audio Recording"*).
  - **Concert Memories & Stories:** Micro-forum section allowing registered fans to share personal concert anecdotes per date.
  - **Data Correction & Bootleg Submissions:** Quick-action reporting tool for missing setlists or rare audio recording details.
  - **Personal Concert Passport:** Generatable summary card displaying personal attendance stats across tours, countries, and venues.
- [ ] **Fan Submission Portal with Cloud Storage**
  - Direct image upload pipeline using S3 / Cloudflare R2
- [-] **Streaming Platform Integration**
  - Direct Spotify / Apple Music setlist playback links (tested, but failed to generate custom playlists)

---

## ✅ Completed Features Archive

### Core Web Application & UI (`index.html`, `styles.css`, `app.js`)
- [x] **Universal Media Player Modal & Concert Context Header**
  - Enhanced video/audio player modal with unified support for YouTube videos, Archive.org embeds, and direct MP3 audio files.
  - Added real-time ticket scan placeholder inside player window during audio playback.
  - Structured concert metadata header above media frame displaying formatted Date, Venue, and Location.
- [x] **Interactive Museum Interface**
  - Multi-criteria filtering by Tour, Category, Country, Year, City, Venue, and Contributor
  - Comprehensive metadata search across all historical records including `TOUR_NAME` and `TOUR_ID`
  - Audio player preview integration and CSV data export
- [x] **Admin Typography Switcher (Client Preview Engine)**
  - Live typography switcher integrated into Admin mode for real-time font comparison (Default Inter vs. Tall Condensed Barlow vs. Light Slim).
  - State persistence saved in `localStorage` (`jj_selected_font`) without affecting public visitor interface.
- [x] **Tour-Wide Memorabilia Engine & Strict Date-Matching**
  - Option A (Exact Date Match): Event-specific items (posters, tickets, articles) only link to concert cards sharing their exact `DATUM`.
  - Option B (Tour-Wide Memorabilia): Undated tour items (`DATUM` empty) automatically map across all shows matching their `TOUR_ID`.
  - Exclusion of Cross-Show Dates: Eliminates unrelated ticket badges from cluttering other show cards in the same tour.
  - Dedicated "Tour Items" (🎸) tab categorization for undated tour memorabilia with dynamic tour title card headers.
- [x] **Flexible Multi-Format Date Search**
  - Natural language & localized date query parser supporting formats like "13th March", "March 13th", "13-3", "13.3.", "13/3", "13.03.", "03/13", and ISO dates
  - Normalizes search input to match stored ISO dates (`YYYY-MM-DD`) by Day and Month across all tour years
- [x] **Interactive Card Badges & Viewer.js Integration**
  - Direct full-resolution scan inspection triggered from item card badges (tickets, posters, passes)
  - `pointer-events` optimization ensuring reliable event-delegation clicks
- [x] **High-Density Compact List View (`.list-view`)**
  - Ultra-compact single-row layout per concert record
  - Scaled thumbnail scans (32×24px) with preserved aspect ratio
  - Perfectly aligned action buttons with the Edit icon (✏️) locked to the far-right end
- [x] **Global Image Protection**
  - Disabled right-click context menu and image drag events across all dynamic scans
- [x] **Public vs. Admin Security Toggling**
  - Restricted administrative sorting options (`Missing Scans First`, `Incomplete Metadata`) and `Tour Filter` to authenticated admin sessions (`.admin-only-control`)
  - Automatic fallback to standard date sorting for non-authenticated visitors

### Analytics & Mapping (`stats.html`)
- [x] **Interactive World Tour Map & Dynamic Tour Routes**
  - Geographical concert mapping powered by Leaflet.js with tour route visualizations
  - **Dynamic Tour Extraction:** Automatically parses unique tour titles directly from CSV records (e.g., `2007 * Joe Jackson Trio Tour`) instead of static hardcoded date ranges.
  - **Exact Tour Polyline Routes:** Sequential Leaflet route polylines filtered strictly by exact `TOUR_NAME`.
- [x] **Museum Analytics & Clean Setlist Metrics**
  - Interactive charts via Chart.js (Timeline, Categories, Top Cities, Venues, Songs, Donors).
  - **Setlist Section Filter:** Automatic exclusion of non-song section headers (e.g. `[Encore 1]`, `[Set 1]`, `[Set 2]`) from song frequency rankings.

### Admin Editor & API Integration (`edit_ticket_new.html`)
- [x] **Official Setlist.fm REST API & Cloudflare Worker Integration**
  - Dedicated Cloudflare Worker proxy (`https://jj-setlist-proxy.marek-kraus.workers.dev`) bypassing browser CORS preflight/OPTIONS restrictions.
  - Direct REST JSON processing with official API key (`x-api-key`), extracting clean song lists across multi-set and encore structures.
- [x] **Dynamic Tour Manager & Auto-Slug Generation**
  - Live `<datalist>` selector populated with unique existing tours from dataset
  - "➕ New Tour" quick action for seamless addition of new tour titles
  - Real-time auto-generated read-only `TOUR_ID` slug creation (`tour-name-year`)
  - "🧹 Reset Custom Tours" utility clearing unpersisted temporary inputs and rebuilding lists exclusively from valid CSV records
- [x] **Dynamic Lineup Autocomplete & Pre-fill**
  - Automated `<datalist>` suggestions offering unique historical lineups associated with the selected `TOUR_NAME`.
- [x] **Compact & Context-Aware Navigation Bar**
  - Streamlined `[ ◄ ] Record X of Y [ ► ]` navigation layout without redundant "Previous/Next" button text
  - Full URL state persistence preserving active Category tabs (`category`), Tour filters (`tour`), Search queries (`search`), and Sorting order (`sort`) from `index.html`
  - Strict sub-indexing ensuring `◄` and `►` buttons cycle exclusively within the filtered subset (e.g. iterating strictly through the 19 items in `Posters`)
- [x] **Admin Authentication Gate**
  - Secured session access via GitHub Personal Access Token (PAT)
- [x] **Direct GitHub v2 Publishing**
  - 1-click live commit/publishing targeting `19forever/joe-jackson-tickets-v2` via GitHub REST API
  - Safe UTF-8 Base64 encoding pipeline preventing character corruption on setlist saves
  - Embedded console debug logging and target repository status toasts
- [x] **Multi-Tier Robust Data Engine**
  - Multi-tier fallback strategy (PapaParse direct download -> local fetch -> GitHub Raw URL fallback -> mock placeholder) guaranteeing dataset availability across all sandbox and deployment environments
- [x] **Unassigned Scans Inbox Tool**
  - Direct integration with GitHub REST API (`/scans/` contents endpoint)
  - Differential analysis detecting uploaded image files (`.jpg`, `.png`, `.webp`) unlinked to any CSV record
  - Interactive cards featuring hover-zoom thumbnail popovers, full filename displays (`word-break: break-word`), and 1-click "➕ Create Record" pre-filling
  - **Batch Memory Editing:** Capability to create multiple records locally in memory (`fullCsvData`) before sending a single bulk commit to GitHub.
- [x] **Strict Multi-Criteria Duplicate Detection**
  - Real-time duplicate prevention validating combination of Date (`DATUM`), City (`MESTO`), AND Category (`KATEGORIE`)
  - Dynamic re-evaluation on category selection change
- [x] **High-Definition Inspection**
  - Full-resolution zoomable image modal powered by Viewer.js

### Public Contribution & Media Pipeline (`ticket_form.html`, `watermark.js`)
- [x] **Synchronized Public Tour Submissions**
  - Replicated dynamic tour selector, "➕ New Tour" prompt, and auto-generated `TOUR_ID` slug logic in `ticket_form.html` guaranteeing data consistency across fan contributions
- [x] **Public Contribution Portal**
  - Pre-filled missing scan submissions routed via FormSubmit with query parameter pre-filling
- [x] **Canvas Watermarking Utility**
  - Aspect-ratio-preserving canvas watermarker with semi-transparent overlay ("JJ Memorabilia Museum")

### Codebase Health & Dataset Integrity
- [x] **Automated GitHub Actions CSV Validation Pipeline (`.github/workflows/validate-csv.yml`)**
  - CI/CD workflow executing automated CSV structure, column count, and data integrity checks on every repository push or commit.
  - Converts validated CSV dataset into an optimized, pre-parsed JSON file to enhance frontend load times and bypass client-side parsing bottlenecks.
- [x] **Full CSV Dataset Audit (`joe_jackson_tickets_cleaned.csv`)**
  - Cleaned and validated 664+ concert and memorabilia records.
  - Standardized date formatting across all entries (resolved non-standard dates like `1998-3-30` -> `1998-03-30`).
  - Confirmed 100% quotation balance and row column count integrity (18 columns).
- [x] **Data Model Expansion for Tour-Wide Memorabilia**
  - Standardized integration of `TOUR_ID` and `TOUR_NAME` attributes across dataset, app logic, admin editor, and contribution pipeline
- [x] **Robust CSV Data Engine & UTF-8 BOM Handling**
  - Automatic removal of UTF-8 Byte Order Mark (`\ufeff`) via PapaParse `transformHeader`
  - Dynamic case-insensitive and alias-aware field resolution (`getFieldValue`) preventing `N/A` data parsing errors
- [x] **Refactored Codebase & Storage Safety**
  - Isolated `localStorage`/`sessionStorage` wrappers with try-catch fallbacks for private browsing compatibility
  - Cleaned up obsolete CSS selectors, dead code, and duplicated utility functions
