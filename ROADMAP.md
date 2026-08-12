# 🗺️ Joe Jackson Memorabilia Museum – Development Roadmap

Archive of Joe Jackson concert tickets, posters, programs, and memorabilia hosted at **`joejackson.band`**.

---

## 📌 PLANNED TASKS (TO-DO LIST)

### 🚨 1. High Priority Tasks (Next Steps)

* [ ] **Transition from `index_short.html` to production `index.html`**
  * Final refactoring and code cleanup after completing testing phase.
  * Setting `index.html` as the default entry page of the project.

* [ ] **Access Level Control (Public vs. Admin Level)**
  * *Public Section (`joejackson.band`):* Read-only mode, search, filters, video player, and contribution form (`ticket_form.html`). Hidden edit buttons (✏️ Edit) for standard visitors.
  * *Admin Section:* Access security for `edit_ticket_new.html`.
    1. Access via private URL with saved GitHub PAT token in administrator's browser.
    2. Integrated simple password wall or deployment via Netlify/Vercel Password Protection.

* [ ] **Custom Domain Setup (`joejackson.band`)**
  * Create `CNAME` file in the repository.
  * Configure DNS records (A / CNAME) at the domain registrar to point to GitHub Pages.

### 📸 2. Media Management

* [x] **Automatic Watermarking (`watermark.js` & `watermark_scans.py`):** Client-side and CLI engine that stamps a discrete visible watermark badge *"JJ Memorabilia Museum"* onto ticket and poster scans before publication.

### 📱 3. PWA (Progressive Web App)

* [ ] **Installability and Offline Mode**
  * Add `manifest.json` and Service Worker to enable web app installation on mobile/desktop home screens.

---

## ✅ COMPLETED FEATURES

* [x] **Public Contribution Form (`ticket_form.html`):** Upload scans via FormSubmit.co directly to the admin email without exposing database access.
* [x] **Automatic Image Compression:** Resizing large attachments client-side in browser to max 1600px before uploading.
* [x] **Show Pairing via `SHOW_ID`:** Linking tickets, posters, programs, and videos to the exact same concert.
* [x] **Interactivity & UX:** *Surprise Me!*, *Reshuffle* buttons and automatic *On This Day In History* banner.
* [x] **Three-Column Video Player:** Playing videos with band lineup display and structured setlists including `[Encore]` sections.
* [x] **Analytics and Map (`stats.html`):** Geographical mapping of concert locations on an interactive world map with graphs.
* [x] **GitHub PAT Editor (`edit_ticket_new.html`):** Two-column administration tool allowing direct commits to master CSV in repository.

---

## 🧩 COMPONENT OVERVIEW

* **`index.html` (Public Museum):** Primary interface for visitors. Includes header with contribute link, anniversary banner, filters, search, category tabs, and card grid.
* **`app.js` (Core Logic):** Handles CSV parsing via PapaParse, filtering, sorting, card generation, scan viewing via Viewer.js, and opening 3-column video modal.
* **`styles.css` (Design System):** Dark Mode theme, CSS Grid/Flexbox layouts, responsive design, and status badge styling.
* **`edit_ticket_new.html` (Admin Editor):** Two-column admin panel with live image preview. Allows viewing, editing, adding, duplicating, and committing changes to GitHub repository.
* **`ticket_form.html` (Public Submission Form):** Form for fans to submit memorabilia. Compresses images and sends attachments via FormSubmit.co.
* **`stats.html` (Analytics & Map):** Geographic visualization of played shows and collection items on interactive map with charts.
* **`joe_jackson_tickets_cleaned.csv` (Master Database):** Single Source of Truth (SSOT) with all structured concert and memorabilia data.

---

## 💡 FUTURE DEVELOPMENT IDEAS

1. **Contributor Hall of Fame:** Dedicated page/modal listing all fan contributors (automatically compiled from `CONTRIBUTOR` field).
2. **One-Click Spotify Playlist Generator:** Button for concerts with setlists to generate direct links for opening matching playlists in Spotify.
3. **"Missing Items" Wishlist:** Section highlighting known shows missing scans in the museum to encourage fan contributions.
4. **Export Concert Card as Image:** Ability to generate a downloadable summary card (Date + City + Scan + Setlist) as a PNG image for social media sharing.
