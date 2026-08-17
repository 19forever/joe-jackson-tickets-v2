let allTickets = [];
let filteredTickets = [];
let currentLayout = 'grid';
let currentPage = 1;
let pageSize = 50;
let currentCategory = 'Tickets';

let activeViewerInstance = null;
let quickViewerInstance = null;

// Spotify API Configuration
const SPOTIFY_CLIENT_ID = '3a9cd34bb7754d6c8259d154a0f805f5';

// Missing ticket placeholder (SVG)
const MISSING_TICKET_SVG = `data:image/svg+xml;utf8,${encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" width="600" height="400" viewBox="0 0 600 400">
  <defs>
    <style>
      .ticket-bg { fill: #161e2e; stroke: #2a364f; stroke-width: 2; }
      .stub-line { stroke: #2a364f; stroke-width: 2; stroke-dasharray: 6 6; }
      .ticket-header { font-family: -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif; font-size: 14px; fill: #6b7280; font-weight: 600; letter-spacing: 2px; text-anchor: middle; }
      .wanted-text { font-family: Impact, Arial Black, sans-serif; font-size: 38px; fill: #d97706; text-anchor: middle; letter-spacing: 3px; }
      .sub-text { font-family: -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif; font-size: 15px; fill: #9ca3af; text-anchor: middle; font-weight: 500; }
      .cta-text { font-family: -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif; font-size: 12px; fill: #4b5563; text-anchor: middle; }
      .notch { fill: #0a0f1c; }
    </style>
  </defs>
  <rect width="600" height="400" fill="#0a0f1c"/>
  <rect x="50" y="40" width="500" height="320" rx="10" class="ticket-bg"/>
  <circle cx="50" cy="200" r="16" class="notch"/>
  <circle cx="550" cy="200" r="16" class="notch"/>
  <line x1="430" y1="40" x2="430" y2="360" class="stub-line"/>
  <text x="240" y="110" class="ticket-header">CONCERT MEMORABILIA</text>
  <text x="240" y="170" class="wanted-text">MISSING ITEM</text>
  <text x="240" y="215" class="sub-text">No scan available for this show yet</text>
  <text x="240" y="290" class="cta-text">Have a ticket, pass or poster? Click to contribute!</text>
  <text x="490" y="140" font-family="-apple-system, sans-serif" font-size="11" fill="#4b5563" text-anchor="middle" font-weight="bold" letter-spacing="1">ADMIT ONE</text>
  <text x="490" y="200" font-family="Courier New, monospace" font-size="22" fill="#374151" text-anchor="middle" font-weight="bold">#0000</text>
  <text x="490" y="260" font-family="-apple-system, sans-serif" font-size="11" fill="#4b5563" text-anchor="middle">WANTED</text>
</svg>
`)}`;

// Safe Storage helpers for sandboxed / private browsing environments
function safeGetStorage(key) {
  try {
    return localStorage.getItem(key);
  } catch (e) {
    return null;
  }
}

function safeSetStorage(key, val) {
  try {
    localStorage.setItem(key, val);
  } catch (e) {}
}

function safeRemoveStorage(key) {
  try {
    localStorage.removeItem(key);
  } catch (e) {}
}

function safeGetSession(key) {
  try {
    return sessionStorage.getItem(key);
  } catch (e) {
    return null;
  }
}

function safeSetSession(key, val) {
  try {
    sessionStorage.setItem(key, val);
  } catch (e) {}
}

function safeRemoveSession(key) {
  try {
    sessionStorage.removeItem(key);
  } catch (e) {}
}

// Helper to check if user is in Admin mode
function checkIsAdmin() {
  const urlParams = new URLSearchParams(window.location.search);
  const storedPat = safeGetStorage('jj_github_pat');
  const adminParam = urlParams.get('admin') === '1';
  const adminFlag = safeGetStorage('jj_admin_mode') === 'true';
  const hasPat = !!(storedPat && storedPat.trim().length > 0);
  return adminParam || adminFlag || hasPat;
}

// Spotify Redirect URI & PKCE Helpers
let isSpotifyCallbackProcessing = false;

function getSpotifyRedirectUri() {
  return window.location.hostname.includes('github.io')
    ? 'https://19forever.github.io/joe-jackson-tickets-v2/'
    : (window.location.hostname.includes('joejackson.band')
      ? 'https://joejackson.band/'
      : 'https://19forever.github.io/joe-jackson-tickets-v2/');
}

function generateRandomString(length = 128) {
  const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~';
  const values = crypto.getRandomValues(new Uint8Array(length));
  return values.reduce((acc, x) => acc + possible[x % possible.length], "");
}

async function generateCodeChallenge(codeVerifier) {
  const encoder = new TextEncoder();
  const data = encoder.encode(codeVerifier);
  const digest = await window.crypto.subtle.digest('SHA-256', data);
  return btoa(String.fromCharCode(...new Uint8Array(digest)))
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
}

// Check and handle Spotify popup callback immediately (PKCE authorization code flow)
async function handleSpotifyPopupCallback() {
  if (isSpotifyCallbackProcessing) return false;
  isSpotifyCallbackProcessing = true;

  const searchParams = new URLSearchParams(window.location.search);
  const code = searchParams.get('code');
  const error = searchParams.get('error');

  if (error) {
    console.error('Spotify Auth Error:', error);
    if (window.opener || window.name === 'spotify_auth') {
      window.close();
      return true;
    }
  }

  if (code) {
    const codeVerifier = safeGetStorage('spotify_code_verifier');
    const redirectUri = getSpotifyRedirectUri();

    try {
      const res = await fetch('https://accounts.spotify.com/api/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          grant_type: 'authorization_code',
          client_id: SPOTIFY_CLIENT_ID,
          code: code,
          redirect_uri: redirectUri,
          code_verifier: codeVerifier || '',
        }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.access_token) {
          safeSetStorage('spotify_access_token', data.access_token);
          const expiresIn = data.expires_in || 3600;
          safeSetStorage('spotify_token_expiry', (Date.now() + parseInt(expiresIn, 10) * 1000).toString());
          if (data.refresh_token) {
            safeSetStorage('spotify_refresh_token', data.refresh_token);
          }
        }
      } else {
        const errText = await res.text();
        console.error('Spotify token exchange failed:', errText);
        safeRemoveStorage('spotify_code_verifier');
        if (window.opener || window.name === 'spotify_auth') {
          window.close();
          return true;
        }
      }
    } catch (err) {
      console.error('Error exchanging Spotify code:', err);
    } finally {
      safeRemoveStorage('spotify_code_verifier');
      if (window.opener || window.name === 'spotify_auth') {
        window.close();
        return true;
      } else {
        searchParams.delete('code');
        searchParams.delete('state');
        const newSearch = searchParams.toString() ? '?' + searchParams.toString() : '';
        history.replaceState(null, '', window.location.pathname + newSearch);
      }
    }
  }

  return false;
}

// Run popup callback check immediately upon script load
handleSpotifyPopupCallback();

// Global Lock Admin helper to clear PAT & admin flags and return to public user mode
window.lockAdminSession = function() {
  safeRemoveStorage('jj_github_pat');
  safeRemoveStorage('jj_admin_mode');
  safeRemoveSession('jj_admin_mode');
  
  const url = new URL(window.location.href);
  if (url.searchParams.has('admin')) {
    url.searchParams.delete('admin');
    window.location.href = url.pathname;
  } else {
    window.location.href = 'index.html';
  }
};

const isAdmin = checkIsAdmin();

// Initialization
window.addEventListener('DOMContentLoaded', () => {
  setupEventListeners();

  // Show/Hide Admin links in Header
  const adminEditorLink = document.getElementById('adminEditorLink');
  const adminLoginLink = document.getElementById('adminLoginLink');
  const adminLockBtn = document.getElementById('adminLockBtn');

  if (checkIsAdmin()) {
    if (adminEditorLink) adminEditorLink.style.display = 'inline-flex';
    if (adminLockBtn) adminLockBtn.style.display = 'inline-flex';
    if (adminLoginLink) adminLoginLink.style.display = 'none';
  } else {
    if (adminEditorLink) adminEditorLink.style.display = 'none';
    if (adminLockBtn) adminLockBtn.style.display = 'none';
    if (adminLoginLink) adminLoginLink.style.display = 'inline-flex';
  }

  Papa.parse('joe_jackson_tickets_cleaned.csv', {
    download: true,
    header: true,
    skipEmptyLines: true,
    complete: function(results) {
      if (!results.data || results.data.length === 0) {
        console.error("CSV file is empty or could not be loaded.");
        return;
      }
      
      allTickets = shuffleArray(results.data);
      updateYearBadge();
      populateFilters();

      const savedSearch = safeGetSession('jj_museum_search');
      const searchInput = document.getElementById('searchInput');
      if (savedSearch && searchInput) {
        searchInput.value = savedSearch;
        const clearBtn = document.getElementById('searchClearBtn');
        if (clearBtn) clearBtn.style.display = 'block';
      }

      filterData();
      checkOnThisDayAnniversary();
    },
    error: function(err) {
      console.error("Error loading CSV file:", err);
    }
  });
});

function setupEventListeners() {
  const searchInput = document.getElementById('searchInput');
  if (searchInput) {
    searchInput.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') clearSearchInput();
    });
    searchInput.addEventListener('input', handleSearchInput);
  }

  document.getElementById('searchClearBtn')?.addEventListener('click', clearSearchInput);
  document.getElementById('reshuffleBtn')?.addEventListener('click', reshuffleAndRender);
  document.getElementById('surpriseBtn')?.addEventListener('click', openSurpriseTicket);
  document.getElementById('yearFilter')?.addEventListener('change', filterData);
  document.getElementById('cityFilter')?.addEventListener('change', filterData);
  document.getElementById('sortFilter')?.addEventListener('change', filterData);
  document.getElementById('pageSizeFilter')?.addEventListener('change', changePageSize);
  
  document.getElementById('btnGrid')?.addEventListener('click', () => setLayout('grid'));
  document.getElementById('btnList')?.addEventListener('click', () => setLayout('list'));

  // Global event delegation for ticket/poster icon badges, data-scan elements & Spotify buttons
  document.addEventListener('click', (e) => {
    const spotifyBtn = e.target.closest('.spotify-setlist-btn');
    if (spotifyBtn) {
      e.stopPropagation();
      e.preventDefault();
      const idx = parseInt(spotifyBtn.getAttribute('data-index'), 10);
      const record = filteredTickets[idx];
      if (record) handleSpotifyPlaylistAction(record, spotifyBtn);
      return;
    }

    const scanBadge = e.target.closest('.ticket-badge, [data-scan]');
    if (scanBadge) {
      e.stopPropagation();
      e.preventDefault();
      const scan = scanBadge.getAttribute('data-scan') || '';
      let ticketObj = null;
      if (scanBadge.dataset.ticket) {
        try {
          ticketObj = JSON.parse(decodeURIComponent(scanBadge.dataset.ticket));
        } catch (err) {}
      }
      openQuickImageModal(scan, ticketObj);
    }
  });

  const videoModal = document.getElementById('videoModal');
  document.getElementById('videoModalCloseBtn')?.addEventListener('click', closeVideoModal);
  if (videoModal) {
    videoModal.addEventListener('click', (e) => {
      if (e.target === videoModal) closeVideoModal();
    });
  }
}

function shuffleArray(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

function reshuffleAndRender() {
  shuffleArray(allTickets);
  const sortSelect = document.getElementById('sortFilter');
  if (sortSelect) sortSelect.value = 'random';
  filterData();
}

function isValidValue(val) {
  if (!val) return false;
  const clean = String(val).trim().toLowerCase();
  return clean !== '' && clean !== 'není k dispozici' && clean !== 'n/a' && clean !== 'undefined' && clean !== 'null' && clean !== 'missing';
}

const MONTH_NAMES_MAP = {
  jan: 1, january: 1, led: 1, leden: 1,
  feb: 2, february: 2, úno: 2, únor: 2,
  mar: 3, march: 3, bře: 3, březen: 3,
  apr: 4, april: 4, dub: 4, duben: 4,
  may: 5, kvě: 5, květen: 5,
  jun: 6, june: 6, čer: 6, červen: 6,
  jul: 7, july: 7, čvc: 7, červenec: 7,
  aug: 8, august: 8, srp: 8, srpen: 8,
  sep: 9, sept: 9, september: 9, zář: 9, září: 9,
  oct: 10, october: 10, říj: 10, říjen: 10,
  nov: 11, november: 11, lis: 11, listopad: 11,
  dec: 12, december: 12, pro: 12, prosinec: 12
};

function parseDateCandidates(rawQuery) {
  if (!rawQuery || typeof rawQuery !== 'string') return [];
  let q = rawQuery.trim().toLowerCase();
  if (!q) return [];

  q = q.replace(/\b(\d{1,2})(st|nd|rd|th)\b/gi, '$1');
  q = q.replace(/,/g, ' ').replace(/\s+/g, ' ').trim();

  const candidates = [];

  function addCandidate(c) {
    if (!c) return;
    if (c.day !== undefined && (c.day < 1 || c.day > 31)) return;
    if (c.month !== undefined && (c.month < 1 || c.month > 12)) return;
    if (c.year !== undefined && (c.year < 1900 || c.year > 2100)) return;
    const exists = candidates.some(existing =>
      existing.day === c.day && existing.month === c.month && existing.year === c.year
    );
    if (!exists) candidates.push(c);
  }

  let match = q.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})$/);
  if (match) {
    addCandidate({ year: parseInt(match[1], 10), month: parseInt(match[2], 10), day: parseInt(match[3], 10) });
    return candidates;
  }

  match = q.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})$/);
  if (match) {
    const n1 = parseInt(match[1], 10);
    const n2 = parseInt(match[2], 10);
    const yr = parseInt(match[3], 10);
    if (n2 <= 12) addCandidate({ day: n1, month: n2, year: yr });
    if (n1 <= 12) addCandidate({ month: n1, day: n2, year: yr });
    return candidates;
  }

  match = q.match(/^(\d{4})[-/.](\d{1,2})\.?$/);
  if (match) {
    const yr = parseInt(match[1], 10);
    const m = parseInt(match[2], 10);
    if (m >= 1 && m <= 12) {
      addCandidate({ year: yr, month: m });
      return candidates;
    }
  }

  const words = q.split(' ');
  if (words.length === 3) {
    const d1 = parseInt(words[0], 10);
    const m1 = MONTH_NAMES_MAP[words[1]];
    const y1 = parseInt(words[2], 10);
    if (!isNaN(d1) && m1 && !isNaN(y1)) addCandidate({ day: d1, month: m1, year: y1 });

    const m2 = MONTH_NAMES_MAP[words[0]];
    const d2 = parseInt(words[1], 10);
    const y2 = parseInt(words[2], 10);
    if (m2 && !isNaN(d2) && !isNaN(y2)) addCandidate({ month: m2, day: d2, year: y2 });

    const y3 = parseInt(words[0], 10);
    const m3 = MONTH_NAMES_MAP[words[1]];
    const d3 = parseInt(words[2], 10);
    if (!isNaN(y3) && y3 > 1900 && m3 && !isNaN(d3)) addCandidate({ year: y3, month: m3, day: d3 });

    if (candidates.length > 0) return candidates;
  }

  if (words.length === 2) {
    const m1 = MONTH_NAMES_MAP[words[0]];
    const y1 = parseInt(words[1], 10);
    if (m1 && !isNaN(y1) && y1 > 1900) addCandidate({ month: m1, year: y1 });

    const y2 = parseInt(words[0], 10);
    const m2 = MONTH_NAMES_MAP[words[1]];
    if (!isNaN(y2) && y2 > 1900 && m2) addCandidate({ year: y2, month: m2 });

    const d3 = parseInt(words[0], 10);
    const m3 = MONTH_NAMES_MAP[words[1]];
    if (!isNaN(d3) && m3) addCandidate({ day: d3, month: m3 });

    const m4 = MONTH_NAMES_MAP[words[0]];
    const d4 = parseInt(words[1], 10);
    if (m4 && !isNaN(d4)) addCandidate({ month: m4, day: d4 });

    if (candidates.length > 0) return candidates;
  }

  match = q.match(/^(\d{1,2})\s*[-/.]\s*(\d{1,2})\.?$/);
  if (match) {
    const n1 = parseInt(match[1], 10);
    const n2 = parseInt(match[2], 10);

    if (n1 <= 31 && n2 >= 1 && n2 <= 12) addCandidate({ day: n1, month: n2 });
    if (n1 >= 1 && n1 <= 12 && n2 <= 31) addCandidate({ month: n1, day: n2 });
    return candidates;
  }

  return candidates;
}

function matchDateAgainstCandidates(dateStr, candidates) {
  if (!dateStr || !candidates || candidates.length === 0) return false;
  const parts = dateStr.trim().split('-');
  if (parts.length !== 3) return false;

  const y = parseInt(parts[0], 10);
  const m = parseInt(parts[1], 10);
  const d = parseInt(parts[2], 10);

  if (isNaN(y) || isNaN(m) || isNaN(d)) return false;

  return candidates.some(c => {
    if (c.year !== undefined && c.year !== y) return false;
    if (c.month !== undefined && c.month !== m) return false;
    if (c.day !== undefined && c.day !== d) return false;
    return true;
  });
}

function formatDisplayDate(dateStr) {
  if (!dateStr || typeof dateStr !== 'string') return '';
  const parts = dateStr.trim().split('-');
  if (parts.length !== 3) return dateStr;

  const year = parts[0];
  const monthIdx = parseInt(parts[1], 10) - 1;
  const day = parseInt(parts[2], 10);

  const months = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  if (isNaN(day) || monthIdx < 0 || monthIdx > 11) return dateStr;

  let suffix = "th";
  if (day % 10 === 1 && day !== 11) suffix = "st";
  else if (day % 10 === 2 && day !== 12) suffix = "nd";
  else if (day % 10 === 3 && day !== 13) suffix = "rd";

  return `${day}${suffix} ${months[monthIdx]} ${year}`;
}

function getYouTubeEmbedUrl(url) {
  if (!url || typeof url !== 'string') return null;
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
  const match = url.match(regExp);
  return (match && match[2].length === 11) ? `https://www.youtube.com/embed/${match[2]}?autoplay=1` : null;
}

function formatLocationText(t) {
  let locationParts = [];
  if (isValidValue(t.MESTO)) locationParts.push(t.MESTO);
  if (isValidValue(t.STAT)) locationParts.push(t.STAT);
  
  let locStr = locationParts.join(', ');
  if (isValidValue(t.VENUE)) {
    locStr += locStr ? ` - ${t.VENUE}` : t.VENUE;
  }
  return locStr;
}

// Video Modal Management
function openVideoModal(ticketIndex) {
  let t = (typeof ticketIndex === 'number') ? filteredTickets[ticketIndex] : null;
  let rawUrl = t ? t.YOUTUBE_URL : ticketIndex;

  const embedUrl = getYouTubeEmbedUrl(rawUrl);
  if (!embedUrl) {
    if (rawUrl) window.open(rawUrl, '_blank');
    return;
  }

  const modal = document.getElementById('videoModal');
  const iframe = document.getElementById('videoIframe');
  const lineupCol = document.getElementById('videoLineupCol');
  const setlistCol = document.getElementById('videoSetlistCol');

  if (!modal || !iframe || !lineupCol || !setlistCol) return;

  let lineupHTML = `<h4 style="color: var(--accent-blue);">👥 Band Line-up</h4>`;
  if (t && isValidValue(t.LINEUP)) {
    const members = t.LINEUP.split(/[;/]/).map(m => m.trim()).filter(Boolean);
    lineupHTML += `<ul style="padding-left: 18px; color: var(--text-main); font-size: 0.85rem; line-height: 1.6;">${members.map(m => `<li>${m}</li>`).join('')}</ul>`;
  } else {
    lineupHTML += `<p style="color: var(--text-muted); font-size: 0.85rem;">No line-up details available for this show.</p>`;
  }
  lineupCol.innerHTML = lineupHTML;

  let setlistHTML = `<h4 style="color: var(--accent-yellow);">🎵 Setlist</h4>`;
  if (t && isValidValue(t.SETLIST)) {
    const rawItems = t.SETLIST.split(',').map(s => s.trim()).filter(Boolean);
    let songCount = 0;
    let listItemsHTML = '';
    
    rawItems.forEach(item => {
      if (item.startsWith('[Encore') || item.startsWith('[Set')) {
        const title = item.replace(/^\[|\]$/g, '');
        listItemsHTML += `<li style="list-style-type: none; font-weight: 700; color: var(--accent-blue); margin-top: 10px; margin-left: -18px;">${title}</li>`;
      } else {
        songCount++;
        listItemsHTML += `<li value="${songCount}">${item}</li>`;
      }
    });

    setlistHTML = `<h4 style="color: var(--accent-yellow);">🎵 Setlist (${songCount} songs)</h4>
                   <ol style="padding-left: 20px; color: var(--text-main); font-size: 0.85rem; line-height: 1.6;">
                     ${listItemsHTML}
                   </ol>`;
  } else {
    setlistHTML += `<p style="color: var(--text-muted); font-size: 0.85rem;">No setlist details available for this show.</p>`;
  }
  setlistCol.innerHTML = setlistHTML;

  iframe.src = embedUrl;
  modal.classList.add('active');
}

function closeVideoModal() {
  const modal = document.getElementById('videoModal');
  const iframe = document.getElementById('videoIframe');
  if (modal) modal.classList.remove('active');
  if (iframe) iframe.src = '';
}

function getTicketCategory(t) {
  if (t.KATEGORIE && t.KATEGORIE.trim()) {
    const cat = t.KATEGORIE.trim().toLowerCase();
    if (cat.includes('pass')) return 'Passes';
    if (cat.includes('program')) return 'Programs';
    if (cat.includes('poster')) return 'Posters';
    if (cat.includes('shirt') || cat.includes('t-shirt') || cat.includes('tričko')) return 'T-shirts';
    if (cat.includes('memo')) return 'Memorabilia';
    if (cat.includes('ticket')) return 'Tickets';
  }
  return 'Tickets';
}

function handleSearchInput() {
  const input = document.getElementById('searchInput');
  const clearBtn = document.getElementById('searchClearBtn');
  const val = input.value;
  
  safeSetSession('jj_museum_search', val);
  if (clearBtn) clearBtn.style.display = val.trim().length > 0 ? 'block' : 'none';
  filterData();
}

function clearSearchInput() {
  const input = document.getElementById('searchInput');
  const clearBtn = document.getElementById('searchClearBtn');
  if (input) input.value = '';
  safeRemoveSession('jj_museum_search');
  if (clearBtn) clearBtn.style.display = 'none';
  filterData();
}

function openSurpriseTicket() {
  if (!filteredTickets || filteredTickets.length === 0) {
    alert("No items available to pick from!");
    return;
  }
  const randomIndex = Math.floor(Math.random() * filteredTickets.length);
  openDirectImagePreview(randomIndex);
}

function getRelatedItems(currentRecord) {
  if (!isValidValue(currentRecord.SHOW_ID)) return [];
  return allTickets.filter(item => {
    if (item.ID_MEMORABILIA === currentRecord.ID_MEMORABILIA) return false;
    return item.SHOW_ID === currentRecord.SHOW_ID;
  });
}

function checkOnThisDayAnniversary() {
  const today = new Date();
  const currentDay = today.getDate();
  const currentMonth = today.getMonth();

  const anniversaries = allTickets.filter(t => {
    if (!isValidValue(t.DATUM)) return false;
    const parts = t.DATUM.split('-');
    if (parts.length !== 3) return false;
    const m = parseInt(parts[1], 10) - 1;
    const d = parseInt(parts[2], 10);
    return d === currentDay && m === currentMonth;
  });

  if (anniversaries.length > 0) {
    const selected = anniversaries[0];
    const concertYear = parseInt(selected.DATUM.split('-')[0], 10);
    const yearsAgo = today.getFullYear() - concertYear;

    const banner = document.getElementById('otdBanner');
    const titleEl = document.getElementById('otdTitle');
    const btn = document.getElementById('otdBtn');

    if (!banner || !titleEl || !btn) return;

    let locationText = formatLocationText(selected);
    let text = `<strong>${yearsAgo} years ago</strong> (${formatDisplayDate(selected.DATUM)}): Joe Jackson played in ${locationText}`;
    if (anniversaries.length > 1) {
      text += ` <em>(+${anniversaries.length - 1} more show today)</em>`;
    }

    titleEl.innerHTML = text;
    banner.classList.add('active');

    btn.onclick = () => {
      const targetIndex = filteredTickets.indexOf(selected);
      if (targetIndex !== -1) {
        openDirectImagePreview(targetIndex);
      } else {
        clearSearchInput();
        document.getElementById('yearFilter').value = '';
        document.getElementById('cityFilter').value = '';
        currentCategory = 'ALL';
        filterData();
        setTimeout(() => {
          openDirectImagePreview(filteredTickets.indexOf(selected));
        }, 100);
      }
    };
  }
}

function getContributeUrlForTicket(t) {
  if (!t) return 'ticket_form.html';
  const params = new URLSearchParams();
  const cat = t.KATEGORIE || t.CATEGORIE || t.Category;
  if (cat) params.set('category', cat);
  if (t.DATUM) params.set('date', t.DATUM);
  if (t.MESTO) params.set('city', t.MESTO);
  if (t.STAT) params.set('country', t.STAT);
  if (t.MISTO_KONANI) params.set('venue', t.MISTO_KONANI);
  if (t.UCINKUJICI || t.LINEUP) params.set('lineup', t.UCINKUJICI || t.LINEUP);
  const id = t.ID_MEMORABILIA || t.ID_LISTKU;
  if (id) params.set('id', id);
  return `ticket_form.html?${params.toString()}`;
}

function openDirectImagePreview(ticketIndex) {
  const t = filteredTickets[ticketIndex];
  if (!t) return;

  const rawSken = (t.SOUBOR_SKEN && isValidValue(t.SOUBOR_SKEN)) ? t.SOUBOR_SKEN : '';
  const skenFiles = rawSken.split(',').map(s => s.trim()).filter(Boolean);
  const contributeUrl = getContributeUrlForTicket(t);

  if (activeViewerInstance) {
    activeViewerInstance.destroy();
    activeViewerInstance = null;
  }

  const container = document.createElement('div');
  container.style.display = 'none';

  if (skenFiles.length === 0) {
    const img = document.createElement('img');
    img.src = MISSING_TICKET_SVG;
    img.alt = `Missing scan for ${formatDisplayDate(t.DATUM)}`;
    img.dataset.isMissing = 'true';
    container.appendChild(img);
  } else {
    skenFiles.forEach((file) => {
      const img = document.createElement('img');
      img.src = `./scans/${file}`;
      img.alt = `${formatDisplayDate(t.DATUM)} - ${formatLocationText(t)}`;
      img.onerror = function() {
        this.onerror = null;
        this.src = MISSING_TICKET_SVG;
        this.dataset.isMissing = 'true';
      };
      container.appendChild(img);
    });
  }

  document.body.appendChild(container);

  activeViewerInstance = new Viewer(container, {
    backdrop: 'static',
    hidden: function() {
      activeViewerInstance.destroy();
      activeViewerInstance = null;
      if (container.parentNode) document.body.removeChild(container);
    },
    title: function() {
      return `${formatDisplayDate(t.DATUM)} | ${formatLocationText(t)} (${t.KATEGORIE || 'Ticket'})`;
    },
    viewed: function() {
      setTimeout(() => {
        const canvasImg = document.querySelector('.viewer-canvas img');
        if (canvasImg && (canvasImg.src.includes('data:image/svg+xml') || canvasImg.dataset.isMissing === 'true')) {
          canvasImg.style.cursor = 'pointer';
          canvasImg.title = 'Click to contribute item/photo for this show';
          canvasImg.onclick = (e) => {
            e.stopPropagation();
            window.location.href = contributeUrl;
          };
        }
      }, 50);
    },
    toolbar: {
      zoomIn: 1, zoomOut: 1, oneToOne: 1, reset: 1,
      prev: skenFiles.length > 1 ? 1 : 0,
      next: skenFiles.length > 1 ? 1 : 0,
      rotateLeft: 1, rotateRight: 1,
    }
  });

  activeViewerInstance.show();
}

// -------------------------------------------------------------
// Official Spotify Web API Integration (Popup PKCE Flow)
// -------------------------------------------------------------

async function handleSpotifyPlaylistAction(record, btnElement) {
  let token = safeGetStorage('spotify_access_token');
  const tokenExpiry = safeGetStorage('spotify_token_expiry');

  // 1. Authenticate with Spotify via Popup (PKCE) if token missing or expired
  if (!token || !tokenExpiry || Date.now() > parseInt(tokenExpiry, 10)) {
    safeRemoveStorage('spotify_access_token');
    safeRemoveStorage('spotify_token_expiry');
    safeRemoveStorage('spotify_refresh_token');

    const codeVerifier = generateRandomString(128);
    const codeChallenge = await generateCodeChallenge(codeVerifier);
    safeSetStorage('spotify_code_verifier', codeVerifier);
    if (record) {
      safeSetStorage('spotify_pending_record', JSON.stringify(record));
    }

    const redirectUri = getSpotifyRedirectUri();
    const scopes = 'user-read-private user-read-email playlist-modify-public playlist-modify-private playlist-read-private';
    const authUrl = `https://accounts.spotify.com/authorize?client_id=${SPOTIFY_CLIENT_ID}&response_type=code&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${encodeURIComponent(scopes)}&code_challenge_method=S256&code_challenge=${encodeURIComponent(codeChallenge)}`;

    const origContent = btnElement ? btnElement.innerHTML : '';
    if (btnElement) btnElement.innerHTML = '🔑 Logging in...';

    const popup = window.open(authUrl, 'spotify_auth', 'width=500,height=700');

    if (!popup || popup.closed || typeof popup.closed === 'undefined') {
      alert('Popup was blocked by your browser. Please allow popups for this site to log in to Spotify.');
      if (btnElement) btnElement.innerHTML = origContent;
      return;
    }

    const timer = setInterval(() => {
      if (popup.closed) {
        clearInterval(timer);
        setTimeout(() => {
          const newToken = safeGetStorage('spotify_access_token');
          const newExpiry = safeGetStorage('spotify_token_expiry');
          const pendingRecordStr = safeGetStorage('spotify_pending_record');
          safeRemoveStorage('spotify_pending_record');

          let targetRecord = record;
          if (pendingRecordStr) {
            try {
              targetRecord = JSON.parse(pendingRecordStr);
            } catch (e) {
              targetRecord = record;
            }
          }

          if (newToken && newExpiry && Date.now() < parseInt(newExpiry, 10)) {
            handleSpotifyPlaylistAction(targetRecord, btnElement);
          } else {
            if (btnElement) btnElement.innerHTML = origContent;
          }
        }, 300);
      }
    }, 500);

    return;
  }

  const origContent = btnElement ? btnElement.innerHTML : '';
  if (btnElement) btnElement.innerHTML = '⏳ Building Playlist...';

  try {
    // 2. Fetch Spotify User Profile (Validate Token)
    const userRes = await fetch('https://api.spotify.com/v1/me', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (userRes.status === 401 || !userRes.ok) {
      safeRemoveStorage('spotify_access_token');
      safeRemoveStorage('spotify_token_expiry');
      safeRemoveStorage('spotify_refresh_token');
      if (btnElement) btnElement.innerHTML = origContent;
      return;
    }
    const userData = await userRes.json();

    const playlistTitle = `Joe Jackson - ${record.MESTO || 'Concert'} (${record.DATUM || ''})`;

    // 3. Check for Existing Playlist Duplicate
    if (btnElement) btnElement.innerHTML = '🔍 Checking Duplicate...';
    const existingRes = await fetch('https://api.spotify.com/v1/me/playlists?limit=50', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (existingRes.ok) {
      const existingData = await existingRes.json();
      const match = existingData.items?.find(p => p.name === playlistTitle);
      if (match) {
        if (btnElement) btnElement.innerHTML = origContent;
        window.open(match.external_urls.spotify, '_blank');
        return;
      }
    }

    // 4. Parse and Clean Songs from Setlist
    if (btnElement) btnElement.innerHTML = '🔎 Searching Tracks...';
    const songsRaw = (record.SETLIST || '').split(/,|\n/);
    const trackUris = [];

    for (let song of songsRaw) {
      let cleanSong = song
        .replace(/^\[.*?\]/, '') // Remove [Encore], [Set 1]
        .replace(/^\d+\.\s*/, '') // Remove track numbers
        .replace(/\([^)]*\)/g, '') // Remove (cover of ...), (solo)
        .replace(/\[[^\]]*\]/g, '')
        .trim();

      if (!cleanSong || cleanSong.toLowerCase().startsWith('encore') || cleanSong.toLowerCase().startsWith('set')) {
        continue;
      }

      const searchRes = await fetch(`https://api.spotify.com/v1/search?q=${encodeURIComponent(`artist:Joe Jackson track:${cleanSong}`)}&type=track&limit=1`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (searchRes.ok) {
        const sData = await searchRes.json();
        const track = sData.tracks?.items?.[0];
        if (track) trackUris.push(track.uri);
      }
    }

    if (trackUris.length === 0) {
      alert('No matching Spotify tracks found for this setlist.');
      if (btnElement) btnElement.innerHTML = origContent;
      return;
    }

    // 5. Create Playlist
    if (btnElement) btnElement.innerHTML = '✨ Creating Playlist...';
    const createRes = await fetch(`https://api.spotify.com/v1/users/${userData.id}/playlists`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        name: playlistTitle,
        description: `Setlist from Joe Jackson concert in ${record.MESTO || ''} on ${record.DATUM || ''}. Generated via Joe Jackson Memorabilia Museum.`,
        public: true
      })
    });
    if (!createRes.ok) {
      throw new Error(`Failed to create playlist (${createRes.status})`);
    }
    const newPlaylist = await createRes.json();

    // 6. Add Tracks to Playlist
    const addRes = await fetch(`https://api.spotify.com/v1/playlists/${newPlaylist.id}/tracks`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ uris: trackUris })
    });
    if (!addRes.ok) {
      throw new Error(`Failed to add tracks (${addRes.status})`);
    }

    if (btnElement) btnElement.innerHTML = origContent;
    window.open(newPlaylist.external_urls.spotify, '_blank');

  } catch (err) {
    console.error('Spotify Playlist Error:', err);
    alert('Failed to generate Spotify playlist: ' + err.message);
    if (btnElement) btnElement.innerHTML = origContent;
  }
}

window.handleSpotifyPlaylistAction = handleSpotifyPlaylistAction;

function openQuickImageModal(scanFileName, ticketObj) {
  if (!scanFileName && !ticketObj) return;

  const rawSken = (scanFileName && typeof scanFileName === 'string') ? scanFileName : (ticketObj ? (ticketObj.SOUBOR_SKEN || '') : '');
  const skenFiles = rawSken.split(',').map(s => s.trim()).filter(isValidValue);
  const contributeUrl = ticketObj ? getContributeUrlForTicket(ticketObj) : 'ticket_form.html';

  if (quickViewerInstance) {
    quickViewerInstance.destroy();
    quickViewerInstance = null;
  }

  const container = document.createElement('div');
  container.style.display = 'none';

  if (skenFiles.length === 0) {
    const quickImg = document.createElement('img');
    quickImg.src = MISSING_TICKET_SVG;
    quickImg.alt = ticketObj ? `Joe Jackson Concert ${formatDisplayDate(ticketObj.DATUM)} - ${formatLocationText(ticketObj)} (${ticketObj.KATEGORIE || 'Memorabilia'})` : 'Joe Jackson concert memorabilia scan preview';
    quickImg.dataset.isMissing = 'true';
    container.appendChild(quickImg);
  } else {
    skenFiles.forEach((file) => {
      const img = document.createElement('img');
      img.src = `./scans/${file}`;
      img.alt = ticketObj ? `${formatDisplayDate(ticketObj.DATUM)} | ${formatLocationText(ticketObj)} (${ticketObj.KATEGORIE || 'Memorabilia'})` : file;
      img.onerror = function() {
        this.onerror = null;
        this.src = MISSING_TICKET_SVG;
        this.dataset.isMissing = 'true';
      };
      container.appendChild(img);
    });
  }

  document.body.appendChild(container);

  quickViewerInstance = new Viewer(container, {
    backdrop: 'static',
    hidden: function() {
      if (quickViewerInstance) {
        quickViewerInstance.destroy();
        quickViewerInstance = null;
      }
      if (container.parentNode) document.body.removeChild(container);
    },
    title: function() {
      return ticketObj ? `${formatDisplayDate(ticketObj.DATUM)} | ${formatLocationText(ticketObj)} (${ticketObj.KATEGORIE || 'Memorabilia'})` : 'Scan Preview';
    },
    viewed: function() {
      setTimeout(() => {
        const canvasImg = document.querySelector('.viewer-canvas img');
        if (canvasImg && (canvasImg.src.includes('data:image/svg+xml') || canvasImg.dataset.isMissing === 'true')) {
          canvasImg.style.cursor = 'pointer';
          canvasImg.title = 'Click to contribute item/photo for this show';
          canvasImg.onclick = (e) => {
            e.stopPropagation();
            window.location.href = contributeUrl;
          };
        }
      }, 50);
    },
    toolbar: {
      zoomIn: 1, zoomOut: 1, oneToOne: 1, reset: 1,
      prev: skenFiles.length > 1 ? 1 : 0,
      next: skenFiles.length > 1 ? 1 : 0,
      rotateLeft: 1, rotateRight: 1,
    }
  });

  if (typeof quickViewerInstance.view === 'function') {
    quickViewerInstance.view(0);
  } else {
    quickViewerInstance.show();
  }
}

function handleRelatedBadgeClick(el) {
  if (!el) return;
  const scan = el.getAttribute('data-scan') || '';
  let ticketObj = null;
  if (el.dataset.ticket) {
    try {
      ticketObj = JSON.parse(decodeURIComponent(el.dataset.ticket));
    } catch (err) {
      console.error('Error parsing ticket data on badge:', err);
    }
  }
  openQuickImageModal(scan, ticketObj);
}

window.handleRelatedBadgeClick = handleRelatedBadgeClick;
window.openQuickImageModal = openQuickImageModal;

function updateYearBadge() {
  const years = allTickets
    .map(t => (t.DATUM && t.DATUM.length >= 4) ? parseInt(t.DATUM.substring(0, 4), 10) : 0)
    .filter(y => y > 1900);
  if (years.length > 0) {
    const minYear = Math.min(...years);
    const maxYear = Math.max(...years);
    const badge = document.getElementById('yearBadge');
    if (badge) badge.textContent = `${minYear} – ${maxYear}`;
  }
}

function populateFilters() {
  const yearSelect = document.getElementById('yearFilter');
  if (yearSelect) {
    const yearsSet = new Set();
    allTickets.forEach(t => {
      if (t.DATUM && t.DATUM.length >= 4) {
        const y = parseInt(t.DATUM.substring(0, 4), 10);
        if (y > 1900) yearsSet.add(y);
      }
    });
    [...yearsSet].sort((a, b) => b - a).forEach(year => {
      const opt = document.createElement('option');
      opt.value = year; opt.textContent = year;
      yearSelect.appendChild(opt);
    });
  }

  const citySelect = document.getElementById('cityFilter');
  if (citySelect) {
    const citySet = new Set();
    allTickets.forEach(t => {
      if (isValidValue(t.MESTO)) citySet.add(t.MESTO.trim());
    });
    [...citySet].sort((a, b) => a.localeCompare(b)).forEach(city => {
      const opt = document.createElement('option');
      opt.value = city; opt.textContent = city;
      citySelect.appendChild(opt);
    });
  }
}

function renderCategoryTabs(matchesBeforeCategoryFilter) {
  const tabsContainer = document.getElementById('categoryTabs');
  if (!tabsContainer) return;
  tabsContainer.innerHTML = '';

  const counts = { 
    'Tickets': 0, 'Passes': 0, 'Programs': 0, 'Posters': 0, 
    'T-shirts': 0, 'Memorabilia': 0, 'Videos': 0, 'ALL': matchesBeforeCategoryFilter.length 
  };

  matchesBeforeCategoryFilter.forEach(t => {
    const cat = getTicketCategory(t);
    if (counts[cat] !== undefined) counts[cat]++;
    if (isValidValue(t.YOUTUBE_URL)) counts['Videos']++;
  });

  const categoryOrder = ['Tickets', 'Passes', 'Programs', 'Posters', 'T-shirts', 'Memorabilia', 'Videos', 'ALL'];
  const categoryLabels = { 
    'Tickets': '🎫 Tickets', 'Passes': '🪪 Passes', 'Programs': '📖 Programs', 
    'Posters': '🖼️ Posters', 'T-shirts': '🎽 T-shirts', 'Memorabilia': '⭐ Memorabilia', 
    'Videos': '🎬 Videos', 'ALL': '✨ All Records' 
  };

  categoryOrder.forEach(catKey => {
    const count = counts[catKey];
    if (count > 0 || catKey === 'ALL' || catKey === 'Tickets') {
      const btn = document.createElement('button');
      btn.className = `tab-btn ${currentCategory === catKey ? 'active' : ''}`;
      btn.innerHTML = `${categoryLabels[catKey]} <span style="opacity: 0.75; font-size: 0.8em;">(${count})</span>`;
      btn.onclick = () => { currentCategory = catKey; filterData(); };
      tabsContainer.appendChild(btn);
    }
  });
}

function setLayout(layout) {
  currentLayout = layout;
  document.getElementById('btnGrid').className = `toggle-btn ${layout === 'grid' ? 'active' : ''}`;
  document.getElementById('btnList').className = `toggle-btn ${layout === 'list' ? 'active' : ''}`;
  document.getElementById('ticketsContainer').className = `tickets-container ${layout}-view`;
  renderPaginated();
}

function changePageSize() {
  const val = document.getElementById('pageSizeFilter').value;
  pageSize = val === 'ALL' ? 'ALL' : parseInt(val, 10);
  currentPage = 1;
  renderPaginated();
}

function filterData() {
  const rawQuery = document.getElementById('searchInput')?.value || '';
  const query = rawQuery.toLowerCase().trim();
  const selectedYear = document.getElementById('yearFilter')?.value || '';
  const selectedCity = document.getElementById('cityFilter')?.value || '';
  const sort = document.getElementById('sortFilter')?.value || 'random';

  const dateCandidates = parseDateCandidates(rawQuery);

  const matchesBase = allTickets.filter(t => {
    const locationText = formatLocationText(t).toLowerCase();
    const itemYear = (t.DATUM && t.DATUM.length >= 4) ? t.DATUM.substring(0, 4) : '';
    const rawDate = (t.DATUM || '').toLowerCase();
    const formattedDate = formatDisplayDate(t.DATUM).toLowerCase();
    const venue = (t.VENUE || t.MISTO_KONANI || '').toLowerCase();
    const city = (t.MESTO || '').toLowerCase();
    const country = (t.STAT || '').toLowerCase();
    const contributor = (t.PRISPEVATEL || t.CONTRIBUTOR || '').toLowerCase();
    const category = (t.KATEGORIE || '').toLowerCase();
    const supportingAct = (t.SUPPORTING_ACT || '').toLowerCase();
    const lineup = (t.LINEUP || '').toLowerCase();
    const setlist = (t.SETLIST || '').toLowerCase();

    const dateMatch = dateCandidates.length > 0 && matchDateAgainstCandidates(t.DATUM, dateCandidates);

    const textMatch = !query ||
      locationText.includes(query) ||
      venue.includes(query) ||
      city.includes(query) ||
      country.includes(query) ||
      contributor.includes(query) ||
      category.includes(query) ||
      rawDate.includes(query) ||
      formattedDate.includes(query) ||
      supportingAct.includes(query) ||
      lineup.includes(query) ||
      setlist.includes(query);

    const qMatch = !query || dateMatch || textMatch;
      
    const yMatch = !selectedYear || String(itemYear) === String(selectedYear);
    const cMatch = !selectedCity || city === selectedCity.toLowerCase();
    return qMatch && yMatch && cMatch;
  });

  renderCategoryTabs(matchesBase);

  filteredTickets = matchesBase.filter(t => {
    if (currentCategory === 'ALL') return true;
    if (currentCategory === 'Videos') return isValidValue(t.YOUTUBE_URL);
    return getTicketCategory(t).toLowerCase() === currentCategory.toLowerCase();
  });

  if (sort === 'oldest') {
    filteredTickets.sort((a, b) => (a.DATUM || '').localeCompare(b.DATUM || ''));
  } else if (sort === 'newest') {
    filteredTickets.sort((a, b) => (b.DATUM || '').localeCompare(a.DATUM || ''));
  } else if (sort === 'missing_first') {
    filteredTickets.sort((a, b) => {
      const aHas = isValidValue(a.SOUBOR_SKEN) ? 1 : 0;
      const bHas = isValidValue(b.SOUBOR_SKEN) ? 1 : 0;
      return aHas - bHas;
    });
  } else if (sort === 'missing_only') {
    filteredTickets = filteredTickets.filter(t => !isValidValue(t.SOUBOR_SKEN));
  } else if (sort === 'scans_only') {
    filteredTickets = filteredTickets.filter(t => isValidValue(t.SOUBOR_SKEN));
  }

  currentPage = 1;
  renderPaginated();
}

function renderPaginated() {
  let pageData = pageSize === 'ALL' ? filteredTickets : filteredTickets.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  renderTickets(pageData);
  renderPaginationControls();
}

function renderTickets(tickets) {
  const container = document.getElementById('ticketsContainer');
  container.innerHTML = '';

  if (tickets.length === 0) {
    container.innerHTML = '<p style="color: var(--text-muted); grid-column: 1/-1; text-align: center; padding: 40px;">No items found matching your criteria.</p>';
    return;
  }

  const isAdmin = checkIsAdmin();

  tickets.forEach((t) => {
    const globalIndex = filteredTickets.indexOf(t);
    const card = document.createElement('div');
    card.className = 'ticket-card';

    const skenFiles = (t.SOUBOR_SKEN || '').split(',').map(s => s.trim()).filter(Boolean);
    const isMissingScan = skenFiles.length === 0;
    const firstImgFile = skenFiles[0] || '';
    const imgSrc = isValidValue(firstImgFile) ? `./scans/${firstImgFile}` : MISSING_TICKET_SVG;
    const locationText = formatLocationText(t);

    card.onclick = (e) => {
      if (e.target.closest('.icon-btn, .ticket-badge, [data-scan], .spotify-setlist-btn')) return;
      openDirectImagePreview(globalIndex);
    };

    let iconsHTML = '';

    const itemId = t.ID_MEMORABILIA || t.ID_LISTKU;
    if (isAdmin && isValidValue(itemId)) {
      iconsHTML += `
        <button class="icon-btn btn-action-edit" title="Edit Record in Editor" onclick="event.stopPropagation(); window.location.href='edit_ticket_new.html?id=${encodeURIComponent(itemId)}';">
          ✏️
        </button>`;
    }

    if (isValidValue(t.YOUTUBE_URL)) {
      iconsHTML += `
        <button class="icon-btn btn-action-video" title="YouTube video" onclick="event.stopPropagation(); openVideoModal(${globalIndex});">
          🎬
        </button>`;
    }

    const songCount = parseInt(t.POCET_SKLADEB, 10) || 0;
    const hasSetlist = isValidValue(t.SETLIST) && songCount > 0;
    if (hasSetlist) {
      iconsHTML += `
        <button class="icon-btn badge-setlist btn-action-setlist" title="Setlist (${songCount} songs)" onclick="event.stopPropagation(); toggleCollapsible('setlist-${globalIndex}');">
          🎵 ${songCount}
        </button>`;
    }

    const hasLineup = isValidValue(t.LINEUP);
    if (hasLineup) {
      iconsHTML += `
        <button class="icon-btn btn-action-lineup" title="Band Line-up" onclick="event.stopPropagation(); toggleCollapsible('lineup-${globalIndex}');">
          👥
        </button>`;
    }

    const relatedItems = getRelatedItems(t);
    relatedItems.forEach(rel => {
      const relCat = getTicketCategory(rel);
      let icon = '🖼️';
      let title = 'Related Poster';

      if (relCat === 'Tickets') { icon = '🎫'; title = 'Related Ticket'; }
      else if (relCat === 'Passes') { icon = '🪪'; title = 'Related Pass'; }
      else if (relCat === 'Programs') { icon = '📖'; title = 'Related Program'; }

      const rawRelScan = (rel.SOUBOR_SKEN || '').trim();
      const relFile = rawRelScan.split(',')[0].trim();
      const hasRelScan = isValidValue(relFile);
      const relTicketJson = encodeURIComponent(JSON.stringify(rel));

      iconsHTML += `
        <button class="icon-btn btn-action-related ticket-badge" data-scan="${rawRelScan}" data-ticket="${relTicketJson}" title="${title}${hasRelScan ? '' : ' (Missing scan)'}" onclick="event.stopPropagation(); handleRelatedBadgeClick(this);">
          ${icon}
        </button>`;
    });

    let collapsibleHTML = '';
    if (hasSetlist) {
      const rawItems = t.SETLIST.split(',').map(s => s.trim()).filter(Boolean);
      let cardSongCount = 0;
      let listItemsHTML = '';

      rawItems.forEach(item => {
        if (item.startsWith('[Encore') || item.startsWith('[Set')) {
          const title = item.replace(/^\[|\]$/g, '');
          listItemsHTML += `<li style="list-style-type: none; font-weight: 700; color: var(--accent-blue); margin-top: 8px; margin-left: -15px;">${title}</li>`;
        } else {
          cardSongCount++;
          listItemsHTML += `<li value="${cardSongCount}">${item}</li>`;
        }
      });

      collapsibleHTML += `<div class="collapsible-content" id="setlist-${globalIndex}">
                           <ol style="padding-left: 20px; padding-bottom: 24px;">${listItemsHTML}</ol>
                           <button class="spotify-setlist-btn" data-index="${globalIndex}" title="Generate/Open Spotify Playlist">
                             <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                               <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.485 17.306c-.215.352-.676.463-1.028.248-2.856-1.745-6.452-2.14-10.686-1.172-.403.092-.806-.157-.899-.56-.092-.402.158-.805.56-.898 4.637-1.06 8.604-.61 11.794 1.34.352.215.464.676.249 1.028zm1.464-3.256c-.27.44-.847.578-1.287.308-3.27-2.01-8.254-2.593-12.12-1.418-.496.15-1.022-.135-1.172-.63-.15-.497.135-1.023.63-1.173 4.417-1.341 9.907-.69 13.63 1.603.44.27.579.847.309 1.288zm.135-3.39c-3.921-2.328-10.384-2.543-14.133-1.405-.6.182-1.238-.16-1.42-.76-.182-.6.16-1.238.76-1.42 4.305-1.306 11.436-1.054 15.932 1.614.54.32.718 1.02.398 1.56-.32.54-1.02.718-1.56.398z"/>
                             </svg>
                             <span>Spotify</span>
                           </button>
                         </div>`;
    }
    if (hasLineup) {
      const members = t.LINEUP.split(/[;/]/).map(m => m.trim()).filter(Boolean);
      collapsibleHTML += `<div class="collapsible-content" id="lineup-${globalIndex}"><ul>${members.map(m => `<li>${m}</li>`).join('')}</ul></div>`;
    }

    const catName = getTicketCategory(t);

    card.innerHTML = `
      <div class="card-img-wrapper" title="${isMissingScan ? 'Missing scan - Click to preview' : 'Click to view scan'}">
        <img src="${imgSrc}" alt="Joe Jackson Concert ${t.DATUM ? formatDisplayDate(t.DATUM) : 'Archive Item'} - ${locationText || 'Live Performance'} (${catName})" onerror="this.onerror=null; this.src='${MISSING_TICKET_SVG}';">
      </div>
      <div class="card-content">
        <div class="card-main-row">
          <div class="card-info-left">
            ${t.DATUM ? `<div class="card-date">${formatDisplayDate(t.DATUM)}</div>` : ''}
            <span class="category-badge">${catName}</span>
            <div class="info-text">${locationText}</div>
          </div>
          ${iconsHTML ? `<div class="card-icon-col card-actions list-actions">${iconsHTML}</div>` : ''}
        </div>
        ${collapsibleHTML}
      </div>
    `;
    
    container.appendChild(card);
  });
}

function renderPaginationControls() {
  const container = document.getElementById('paginationContainer');
  if (!container) return;
  container.innerHTML = '';
  if (pageSize === 'ALL' || filteredTickets.length <= pageSize) return;

  const totalPages = Math.ceil(filteredTickets.length / pageSize);

  const prevBtn = document.createElement('button');
  prevBtn.className = 'page-btn'; 
  prevBtn.textContent = '◄ Prev';
  prevBtn.disabled = currentPage === 1;
  prevBtn.onclick = () => { currentPage--; renderPaginated(); window.scrollTo({ top: 0, behavior: 'smooth' }); };
  container.appendChild(prevBtn);

  for (let i = 1; i <= totalPages; i++) {
    if (totalPages > 10 && Math.abs(i - currentPage) > 3 && i !== 1 && i !== totalPages) {
      if (i === 2 || i === totalPages - 1) {
        const dots = document.createElement('span'); 
        dots.textContent = '...'; 
        dots.style.color = 'var(--text-muted)';
        container.appendChild(dots);
      }
      continue;
    }
    const pageBtn = document.createElement('button');
    pageBtn.className = `page-btn ${i === currentPage ? 'active' : ''}`; 
    pageBtn.textContent = i;
    pageBtn.onclick = () => { currentPage = i; renderPaginated(); window.scrollTo({ top: 0, behavior: 'smooth' }); };
    container.appendChild(pageBtn);
  }

  const nextBtn = document.createElement('button');
  nextBtn.className = 'page-btn'; 
  nextBtn.textContent = 'Next ►';
  nextBtn.disabled = currentPage === totalPages;
  nextBtn.onclick = () => { currentPage++; renderPaginated(); window.scrollTo({ top: 0, behavior: 'smooth' }); };
  container.appendChild(nextBtn);
}

function toggleCollapsible(id) {
  const el = document.getElementById(id);
  if (el) el.classList.toggle('open');
}

// Global image protection: suppress right-click context menu and drag operations on images
document.addEventListener('contextmenu', (e) => {
  if (e.target && e.target.closest('img')) {
    e.preventDefault();
  }
});

document.addEventListener('dragstart', (e) => {
  if (e.target && e.target.closest('img')) {
    e.preventDefault();
  }
});