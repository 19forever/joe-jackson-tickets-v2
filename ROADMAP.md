# Joe Jackson Ticket Museum - Roadmap & Project Plan

## Overview
An interactive digital museum and archive dedicated to Joe Jackson's live concert tour history (1978–2026), ticket stubs, venue metadata, setlists, and memorabilia.

## Completed Features

### Core Web Application & UI (`index.html`, `styles.css`, `app.js`)
- [x] **Interactive Museum Interface**
  - Multi-criteria filtering by Tour, Category, Country, Year, City, Venue, and Contributor
  - Comprehensive metadata search across all historical records
  - Audio player preview integration and CSV data export
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

### Analytics & Mapping (`stats.html`)
- [x] **Interactive World Tour Map**
  - Geographical concert mapping powered by Leaflet.js with tour route visualizations
- [x] **Museum Analytics**
  - Interactive charts via Chart.js (Timeline, Categories, Top Cities, Venues, Songs, Donors)

### Admin Editor & API Integration (`edit_ticket_new.html`)
- [x] **Admin Authentication Gate**
  - Secured session access via GitHub Personal Access Token (PAT)
- [x] **Direct GitHub v2 Publishing**
  - 1-click live commit/publishing targeting `19forever/joe-jackson-tickets-v2` via GitHub REST API
  - Safe UTF-8 Base64 encoding pipeline preventing character corruption on setlist saves
  - Embedded console debug logging and target repository status toasts
- [x] **Strict Multi-Criteria Duplicate Detection**
  - Real-time duplicate prevention validating combination of Date (`DATUM`), City (`MESTO`), AND Category (`KATEGORIE`)
  - Dynamic re-evaluation on category selection change
- [x] **Setlist.fm API Integration**
  - Custom dedicated Cloudflare Worker proxy (`jj-setlist-proxy`) bypassing browser CORS preflight restrictions
- [x] **High-Definition Inspection**
  - Full-resolution zoomable image modal powered by Viewer.js

### Public Contribution & Media Pipeline (`ticket_form.html`, `watermark.js`)
- [x] **Public Contribution Portal**
  - Pre-filled missing scan submissions routed via FormSubmit
- [x] **Canvas Watermarking Utility**
  - Aspect-ratio-preserving canvas watermarker with semi-transparent overlay ("JJ Memorabilia Museum")

### Codebase Health & Architecture
- [x] **Robust CSV Data Engine & UTF-8 BOM Handling**
  - Automatic removal of UTF-8 Byte Order Mark (`\ufeff`) via PapaParse `transformHeader`
  - Dynamic case-insensitive and alias-aware field resolution (`getFieldValue`) preventing `N/A` data parsing errors
- [x] **Refactored Codebase & Storage Safety**
  - Isolated `localStorage`/`sessionStorage` wrappers with try-catch fallbacks for private browsing compatibility
  - Cleaned up obsolete CSS selectors, dead code, and duplicated utility functions
- [x] **Normalized Dataset (`joe_jackson_tickets_cleaned.csv`)**
  - Standardized concert metadata spanning 1978–2026

---

## Pending Client Approval & Pre-Launch Tasks
- [ ] **Client Final Review & Sign-Off**
  - Local environment testing and final client demonstration
- [ ] **Custom Domain Deployment (`joejackson.band`)**
  - Configure A records and CNAME in DNS for GitHub Pages after client approval
- [ ] **SEO & Metadata Finalization**
  - Deploy Open Graph tags, `sitemap.xml`, and `robots.txt`

---

## Post-Launch Enhancements & Community Features
- [ ] **Community & Fan Interactivity Engine (Supabase / Cloudflare D1 Backend)**
  - **Setlist.fm Import:** Sync user attendance via Setlist.fm public API (`/user/{userId}/attended`) to automatically display attendance badges.
  - **Personal Concert Statuses:** User interactive badges per show (*"I Was There"*, *"I Own Ticket"*, *"Ticket Lost/Traded"*, *"I Have Audio Recording"*).
  - **Concert Memories & Stories:** Micro-forum section allowing registered fans to share personal concert anecdotes per date.
  - **Data Correction & Bootleg Submissions:** Quick-action reporting tool for missing setlists or rare audio recording details.
  - **Personal Concert Passport:** Generatable summary card displaying personal attendance stats across tours, countries, and venues.
- [ ] **Data Model Expansion for Tour-Wide Memorabilia**
  - Dedicated UI separation for general tour items (posters, t-shirts, pins without specific concert dates)
- [ ] **Fan Submission Portal with Cloud Storage**
  - Direct image upload pipeline using S3 / Cloudflare R2
- [ ] **Streaming Platform Integration**
  - Direct Spotify / Apple Music setlist playback links
