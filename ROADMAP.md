# Joe Jackson Ticket Museum - Roadmap & Project Plan

## Overview
An interactive digital museum and archive dedicated to Joe Jackson's live concert tour history (1978–2026), ticket stubs, venue metadata, setlists, and memorabilia.

## Completed Features
- [x] **Interactive Museum Web App** (`index.html`, `styles.css`, `app.js`)
  - Filterable by Tour, Category, Country, Year, City, Venue, and Contributor
  - View stubs, setlists, lineup, pricing, and high-resolution ticket scans
  - Search engine across all tour metadata fields
  - Grid and Compact List display views
  - Global image protection (disabled right-click context menu and image dragging)
  - Audio player preview integration
  - Downloadable CSV data export
- [x] **Analytics & Interactive World Tour Map** (`stats.html`)
  - World map plotting concerts using Leaflet.js
  - Filter by tour era and view route lines
  - Charts powered by Chart.js (Timeline, Categories, Top Cities, Venues, Songs, Donors)
- [x] **Record Editor & Direct GitHub Publishing** (`edit_ticket_new.html`, `ticket_form.html`)
  - Admin authentication gate using GitHub Personal Access Token (PAT)
  - Direct 1-click publishing/commit to GitHub repository via GitHub REST API
  - Setlist.fm API integration powered by custom Cloudflare Worker proxy (`jj-setlist-proxy`)
  - High-definition zoomable image inspection modal powered by Viewer.js
  - Form validations, duplicate checks, and quick record creation/duplication
- [x] **Watermark & Media Utility** (`watermark.js`)
  - Canvas-based image watermarking ("JJ Memorabilia Museum") integrated into the admin editor
- [x] **Data Integrity & Standardized Dataset** (`joe_jackson_tickets_cleaned.csv`)
  - Cleaned and normalized CSV dataset covering 1978 to 2026 concerts

## In Progress & Pre-Launch Tasks
- [ ] **SEO Optimization & Pre-Launch Infrastructure**
  - Implement Open Graph metadata, canonical links, and sitemap.xml / robots.txt
- [ ] **Custom Domain Deployment (`joejackson.band`)**
  - Configure CNAME and A records in DNS for GitHub Pages hosting
- [ ] **Data Model Refinement for Tour-Level Memorabilia**
  - Separate/filter tour-wide memorabilia (posters, t-shirts, pins without specific dates) from individual concert ticket stubs in UI card views

## Future Enhancements
- [ ] Fan submission portal with image upload cloud storage
- [ ] Direct backend database API sync (Node / Express / SQLite)
- [ ] Spotify / Apple Music setlist playback integration
