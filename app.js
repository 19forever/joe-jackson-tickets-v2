let allTickets = [];
let filteredTickets = [];
let currentLayout = 'grid';
let currentPage = 1;
let pageSize = 50;
let currentCategory = 'Tickets';

let activeViewerInstance = null;
let quickViewerInstance = null;

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

// Safe Storage helpers leveraging StorageService with fallbacks
function safeGetStorage(key, defaultVal = null) {
  if (typeof StorageService !== 'undefined') {
    return StorageService.get(key, defaultVal);
  }
  try {
    const val = localStorage.getItem(key);
    return val !== null ? val : defaultVal;
  } catch (e) {
    return defaultVal;
  }
}

function safeSetStorage(key, val) {
  if (typeof StorageService !== 'undefined') {
    StorageService.set(key, val);
    return;
  }
  try {
    localStorage.setItem(key, val);
  } catch (e) {}
}

function safeRemoveStorage(key) {
  if (typeof StorageService !== 'undefined') {
    StorageService.remove(key);
    return;
  }
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
  const storedPat = safeGetStorage('gh_token') || safeGetStorage('jj_github_pat');
  const adminParam = urlParams.get('admin') === '1';
  const adminFlag = safeGetStorage('jj_admin_mode') === 'true';
  const hasPat = !!(storedPat && storedPat.trim().length > 0);
  return adminParam || adminFlag || hasPat;
}

// Global Lock Admin helper to clear PAT & admin flags and return to public user mode
window.lockAdminSession = function() {
  if (typeof StorageService !== 'undefined') {
    StorageService.setGitHubConfig({ token: '' });
    StorageService.remove('jj_admin_mode');
  } else {
    safeRemoveStorage('jj_github_pat');
    safeRemoveStorage('gh_token');
    safeRemoveStorage('jj_admin_mode');
  }
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

function resolveCategoryFromUrl(catParam) {
  if (!catParam) return null;
  const c = catParam.trim().toLowerCase();
  if (c === 'tickets' || c === 'ticket' || c === 'lístek' || c === 'listek') return 'Tickets';
  if (c === 'passes' || c === 'pass' || c === 'backstage') return 'Passes';
  if (c === 'programs' || c === 'program' || c === 'programme' || c === 'programmes') return 'Programs';
  if (c === 'posters' || c === 'poster' || c === 'plakát' || c === 'plakat') return 'Posters';
  if (c === 't-shirts' || c === 't-shirt' || c === 'tshirt' || c === 'tshirts' || c === 'shirts' || c === 'tričko' || c === 'tricko') return 'T-shirts';
  if (c === 'tour items' || c === 'tour_items' || c === 'tour' || c === 'touritems') return 'Tour Items';
  if (c === 'memorabilia' || c === 'memo' || c === 'memorabilie') return 'Memorabilia';
  if (c === 'videos' || c === 'video' || c === 'youtube') return 'Videos';
  if (c === 'all' || c === 'vše' || c === 'vse') return 'ALL';
  return null;
}

function normalizeSortParam(sortVal) {
  if (!sortVal) return null;
  const s = sortVal.trim().toLowerCase();
  if (s === 'oldest' || s === 'date-asc' || s === 'date_asc' || s === 'asc' || s === 'date-oldest') return 'oldest';
  if (s === 'newest' || s === 'date-desc' || s === 'date_desc' || s === 'desc' || s === 'date-newest') return 'newest';
  if (s === 'random' || s === 'shuffle' || s === 'shuffled') return 'random';
  if (s === 'missing_first' || s === 'missing-first') return 'missing_first';
  if (s === 'missing_only' || s === 'missing-only') return 'missing_only';
  if (s === 'missing_setlists_only' || s === 'missing-setlists-only' || s === 'missing_setlists' || s === 'unverified') return 'missing_setlists_only';
  if (s === 'scans_only' || s === 'scans-only') return 'scans_only';
  return s;
}

function updateUrlParams() {
  if (typeof window === 'undefined' || !window.history || !window.history.replaceState) return;

  const params = new URLSearchParams(window.location.search);
  const hadAdmin = params.has('admin');

  // Search
  const searchVal = document.getElementById('searchInput')?.value?.trim();
  if (searchVal) {
    params.set('search', searchVal);
    params.delete('q');
  } else {
    params.delete('search');
    params.delete('q');
  }

  // Category
  if (currentCategory && currentCategory !== 'ALL') {
    params.set('category', currentCategory);
    params.delete('cat');
  } else {
    params.delete('category');
    params.delete('cat');
  }

  // View layout
  if (currentLayout) {
    params.set('view', currentLayout);
    params.delete('layout');
  }

  // Sort
  const sortVal = document.getElementById('sortFilter')?.value;
  if (sortVal) {
    params.set('sort', sortVal);
  } else {
    params.delete('sort');
  }

  if (hadAdmin && !params.has('admin')) {
    params.set('admin', '1');
  }

  const newQuery = params.toString();
  const newUrl = newQuery ? `${window.location.pathname}?${newQuery}` : window.location.pathname;
  window.history.replaceState(null, '', newUrl);

  const adminEditorLink = document.getElementById('adminEditorLink');
  if (adminEditorLink) {
    const editQuery = getEditUrlParams();
    adminEditorLink.href = editQuery ? `edit_ticket_new.html?${editQuery}` : 'edit_ticket_new.html';
  }
}

function getEditUrlParams(itemId) {
  const params = new URLSearchParams();
  if (itemId) params.set('id', itemId);
  const curSearch = document.getElementById('searchInput')?.value?.trim();
  if (curSearch) params.set('search', curSearch);
  if (currentCategory && currentCategory !== 'ALL') params.set('category', currentCategory);
  if (currentLayout) params.set('view', currentLayout);
  const curSort = document.getElementById('sortFilter')?.value;
  if (curSort) params.set('sort', curSort);
  return params.toString();
}

function initializeStateFromUrlAndStorage() {
  const urlParams = new URLSearchParams(window.location.search);
  const urlCategory = urlParams.get('category') || urlParams.get('cat');
  const urlSearch = urlParams.get('search') || urlParams.get('q');
  const urlSort = urlParams.get('sort');
  const urlView = urlParams.get('view') || urlParams.get('layout');

  // Category
  const resolvedCategory = resolveCategoryFromUrl(urlCategory);
  if (resolvedCategory) {
    currentCategory = resolvedCategory;
  }

  // View layout preference (fallback to StorageService)
  const savedView = safeGetStorage('jj_museum_view');
  const resolvedView = (urlView === 'list' || urlView === 'grid') 
    ? urlView 
    : (savedView === 'list' || savedView === 'grid' ? savedView : 'grid');
  setLayout(resolvedView, false);

  // Sort order preference (fallback to StorageService)
  const sortSelect = document.getElementById('sortFilter');
  const savedSort = safeGetStorage('jj_museum_sort');
  const resolvedSort = normalizeSortParam(urlSort) || normalizeSortParam(savedSort) || 'random';
  if (sortSelect) {
    sortSelect.value = resolvedSort;
    safeSetStorage('jj_museum_sort', resolvedSort);
  }

  // Search
  const searchInput = document.getElementById('searchInput');
  if (urlSearch && searchInput) {
    searchInput.value = urlSearch;
    safeSetSession('jj_museum_search', urlSearch);
    const clearBtn = document.getElementById('searchClearBtn');
    if (clearBtn) clearBtn.style.display = 'block';
  } else {
    const savedSearch = safeGetSession('jj_museum_search');
    if (savedSearch && searchInput) {
      searchInput.value = savedSearch;
      const clearBtn = document.getElementById('searchClearBtn');
      if (clearBtn) clearBtn.style.display = 'block';
    }
  }

  updateUrlParams();
}

function applyFontTheme(theme) {
  const allowed = ['font-default', 'font-condensed', 'font-light'];
  const validTheme = allowed.includes(theme) ? theme : 'font-default';

  document.documentElement.classList.remove('font-default', 'font-condensed', 'font-light');
  document.body.classList.remove('font-default', 'font-condensed', 'font-light');

  document.documentElement.classList.add(validTheme);
  document.body.classList.add(validTheme);

  safeSetStorage('jj_selected_font', validTheme);

  const switcher = document.getElementById('fontSwitcher');
  if (switcher && switcher.value !== validTheme) {
    switcher.value = validTheme;
  }
}

function initFontSwitcher() {
  const savedFont = safeGetStorage('jj_selected_font', 'font-default');
  applyFontTheme(savedFont);

  const switcher = document.getElementById('fontSwitcher');
  if (switcher) {
    switcher.value = savedFont || 'font-default';
    switcher.addEventListener('change', (e) => {
      applyFontTheme(e.target.value);
    });
  }
}

// Initialization
window.addEventListener('DOMContentLoaded', () => {
  initFontSwitcher();
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

// Načítání optimalizovaného JSON souboru namísto CSV
  import('./joe_jackson_tickets_cleaned.json')
    .then(module => {
      const data = module.default;
      if (!data || !Array.isArray(data) || data.length === 0) {
        throw new Error("JSON file is empty or missing valid data.");
      }

      allTickets = shuffleArray(data);
      updateYearBadge();
      populateFilters();

      initializeStateFromUrlAndStorage();

      filterData();
      checkOnThisDayAnniversary();
    })
    .catch(err => {
      console.error("Error importing JSON file, trying fetch fallback:", err);
      fetch('./joe_jackson_tickets_cleaned.json')
        .then(response => {
          if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
          }
          return response.json();
        })
        .then(data => {
          if (!data || !Array.isArray(data) || data.length === 0) {
            console.error("JSON file is empty or missing valid data.");
            return;
          }

          allTickets = shuffleArray(data);
          updateYearBadge();
          populateFilters();

          initializeStateFromUrlAndStorage();

          filterData();
          checkOnThisDayAnniversary();
        })
        .catch(fetchErr => {
          console.error("Error loading JSON file, trying CSV fallback:", fetchErr);
          // Fallback na CSV (PapaParse) v případě, že JSON ještě neexistuje
          if (typeof Papa !== 'undefined') {
            Papa.parse('./joe_jackson_tickets_cleaned.csv', {
              download: true,
              header: true,
              skipEmptyLines: true,
              complete: function(results) {
                if (results.data && results.data.length > 0) {
                  allTickets = shuffleArray(results.data);
                  updateYearBadge();
                  populateFilters();
                  initializeStateFromUrlAndStorage();
                  filterData();
                  checkOnThisDayAnniversary();
                }
              }
            });
          }
        });
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
  (document.getElementById('reshuffleBtn') || document.getElementById('btnReshuffle'))?.addEventListener('click', reshuffleAndRender);
  (document.getElementById('surpriseBtn') || document.getElementById('btnSurprise'))?.addEventListener('click', openSurpriseTicket);
  document.getElementById('cityFilter')?.addEventListener('change', filterData);
  
  const sortSelect = document.getElementById('sortFilter');
  if (sortSelect) {
    sortSelect.addEventListener('change', () => {
      safeSetStorage('jj_museum_sort', sortSelect.value);
      updateUrlParams();
      filterData();
    });
  }

  document.getElementById('pageSizeFilter')?.addEventListener('change', changePageSize);
  
  document.getElementById('btnGrid')?.addEventListener('click', () => setLayout('grid'));
  document.getElementById('btnList')?.addEventListener('click', () => setLayout('list'));

  // Global event delegation for ticket/poster icon badges & data-scan elements
  document.addEventListener('click', (e) => {
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

  const noteModal = document.getElementById('noteModal');
  if (noteModal) {
    noteModal.addEventListener('click', (e) => {
      if (e.target === noteModal) closeNoteModal();
    });
  }

  const setlistExitModal = document.getElementById('setlistExitModal');
  if (setlistExitModal) {
    setlistExitModal.addEventListener('click', (e) => {
      if (e.target === setlistExitModal) closeSetlistExitModal();
    });
  }

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closeNoteModal();
      closeVideoModal();
      closeSetlistExitModal();
    }
  });
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
  if (sortSelect) {
    sortSelect.value = 'random';
    safeSetStorage('jj_museum_sort', 'random');
  }
  updateUrlParams();
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

function getMediaEmbedInfo(url) {
  if (!url || typeof url !== 'string') return null;
  const cleanUrl = url.trim();
  if (!cleanUrl) return null;

  // 1. YouTube
  const ytRegex = /^.*(youtu\.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/i;
  const ytMatch = cleanUrl.match(ytRegex);
  if (ytMatch && ytMatch[2].length === 11) {
    return {
      type: 'youtube',
      src: `https://www.youtube.com/embed/${ytMatch[2]}?autoplay=1`
    };
  }

  // 2. Archive.org (details -> embed)
  const archiveRegex = /^(?:https?:\/\/)?(?:www\.)?archive\.org\/(?:details|embed)\/([^/?#]+)/i;
  const archiveMatch = cleanUrl.match(archiveRegex);
  if (archiveMatch && archiveMatch[1]) {
    const itemId = archiveMatch[1];
    return {
      type: 'archive',
      src: `https://archive.org/embed/${itemId}`
    };
  }

  // 3. Direct Audio (.mp3, .ogg, .wav)
  const audioRegex = /\.(mp3|ogg|wav)(\?.*)?$/i;
  if (audioRegex.test(cleanUrl)) {
    return {
      type: 'audio',
      src: cleanUrl
    };
  }

  return null;
}

function getYouTubeEmbedUrl(url) {
  const info = getMediaEmbedInfo(url);
  return (info && (info.type === 'youtube' || info.type === 'archive')) ? info.src : null;
}

function formatLocationText(t) {
  let locationParts = [];
  if (isValidValue(t.MESTO)) locationParts.push(t.MESTO);
  if (isValidValue(t.STAT)) locationParts.push(t.STAT);
  
  let locStr = locationParts.join(', ');
  if (isValidValue(t.VENUE)) {
    locStr += locStr ? ` - ${t.VENUE}` : t.VENUE;
  }
  if (!locStr && isValidValue(t.TOUR_NAME)) {
    locStr = t.TOUR_NAME;
  }
  return locStr;
}

// Video / Media Modal Management
function openVideoModal(ticketIndex) {
  let t = (typeof ticketIndex === 'number') ? filteredTickets[ticketIndex] : null;
  let rawUrl = t ? t.YOUTUBE_URL : ticketIndex;

  const mediaInfo = getMediaEmbedInfo(rawUrl);
  if (!mediaInfo) {
    if (rawUrl && typeof rawUrl === 'string') window.open(rawUrl, '_blank');
    return;
  }

  const modal = document.getElementById('videoModal');
  const videoCenter = document.querySelector('.jj-video-center');
  const frameWrapper = document.querySelector('.jj-video-frame-wrapper');
  const lineupCol = document.getElementById('videoLineupCol');
  const setlistCol = document.getElementById('videoSetlistCol');

  if (!modal || !frameWrapper || !lineupCol || !setlistCol) return;

  // Format concert header (Date — City, Country - Venue) without TOUR_NAME
  const formattedDate = (t && isValidValue(t.DATUM)) ? formatDisplayDate(t.DATUM) : '';
  let locationParts = [];
  if (t && isValidValue(t.MESTO)) locationParts.push(t.MESTO);
  if (t && isValidValue(t.STAT)) locationParts.push(t.STAT);
  let locStr = locationParts.join(', ');
  const venue = (t && isValidValue(t.VENUE)) ? t.VENUE : ((t && isValidValue(t.MISTO_KONANI)) ? t.MISTO_KONANI : '');
  if (venue) {
    locStr += locStr ? ` - ${venue}` : venue;
  }

  let headerContent = '';
  if (formattedDate && locStr) {
    headerContent = `${formattedDate} — ${locStr}`;
  } else {
    headerContent = formattedDate || locStr || 'Live Performance';
  }

  if (videoCenter) {
    let headerElem = videoCenter.querySelector('.jj-modal-concert-header');
    if (!headerElem) {
      headerElem = document.createElement('div');
      headerElem.className = 'jj-modal-concert-header';
      videoCenter.insertBefore(headerElem, frameWrapper);
    }
    headerElem.innerHTML = `<h4>${headerContent}</h4>`;
  }

  // Determine scan image from ticket
  const rawSken = (t && t.SOUBOR_SKEN && isValidValue(t.SOUBOR_SKEN)) ? t.SOUBOR_SKEN : '';
  const skenFiles = rawSken.split(',').map(s => s.trim()).filter(Boolean);
  const firstImgFile = skenFiles[0] || '';
  const imgSrc = isValidValue(firstImgFile) ? `./scans/${firstImgFile}` : MISSING_TICKET_SVG;

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

  if (mediaInfo.type === 'audio') {
    frameWrapper.innerHTML = `
      <div class="jj-audio-player-wrapper">
        <img src="${imgSrc}" class="jj-audio-ticket-preview" alt="Ticket scan" onerror="this.onerror=null; this.src='${MISSING_TICKET_SVG}';">
        <audio controls autoplay src="${mediaInfo.src}" style="width: 100%; max-width: 500px; display: block;"></audio>
      </div>
    `;
  } else if (mediaInfo.type === 'archive') {
    frameWrapper.innerHTML = `
      <div class="jj-audio-player-wrapper">
        <img src="${imgSrc}" class="jj-audio-ticket-preview" alt="Ticket scan" onerror="this.onerror=null; this.src='${MISSING_TICKET_SVG}';">
        <iframe id="videoIframe" src="${mediaInfo.src}" style="width: 100%; max-width: 500px; height: 60px; border: none; border-radius: 4px;" allow="autoplay"></iframe>
      </div>
    `;
  } else {
    frameWrapper.innerHTML = `<iframe id="videoIframe" src="${mediaInfo.src}" allow="autoplay; encrypted-media" allowfullscreen></iframe>`;
  }

  modal.classList.add('active');
}

function closeVideoModal() {
  const modal = document.getElementById('videoModal');
  const frameWrapper = document.querySelector('.jj-video-frame-wrapper');
  const headerElem = document.querySelector('.jj-modal-concert-header');
  if (modal) modal.classList.remove('active');
  if (frameWrapper) {
    frameWrapper.innerHTML = '<iframe id="videoIframe" src="" allow="autoplay; encrypted-media" allowfullscreen></iframe>';
  }
  if (headerElem) {
    headerElem.innerHTML = '';
  }
}

function openSetlistExitModal(url) {
  const modal = document.getElementById('setlistExitModal');
  const confirmBtn = document.getElementById('setlistExitConfirmBtn');
  if (!modal || !confirmBtn) {
    if (url) window.open(url, '_blank');
    return;
  }
  confirmBtn.href = url || '#';
  modal.classList.add('active');
}

function closeSetlistExitModal() {
  const modal = document.getElementById('setlistExitModal');
  if (modal) modal.classList.remove('active');
}

function openNoteModal(ticketIndex) {
  const t = filteredTickets[ticketIndex];
  if (!t || !isValidValue(t.NOTE)) return;

  const modal = document.getElementById('noteModal');
  const headerEl = document.getElementById('noteModalHeader');
  const metaEl = document.getElementById('noteModalMeta');
  const bodyEl = document.getElementById('noteModalBody');

  if (!modal || !headerEl || !metaEl || !bodyEl) return;

  // Format header
  headerEl.textContent = 'Concert Trivia & Notes';

  // Format metadata (Date, Venue, City, Tour Name)
  const displayDate = t.DATUM ? formatDisplayDate(t.DATUM) : '';
  const venue = t.VENUE || t.MISTO_KONANI || '';
  const city = t.MESTO || '';
  const country = t.STAT || '';
  const tourName = t.TOUR_NAME || '';

  let locationText = '';
  let locParts = [];
  if (isValidValue(city)) locParts.push(city);
  if (isValidValue(country)) locParts.push(country);
  locationText = locParts.join(', ');
  if (isValidValue(venue)) {
    locationText += locationText ? ` - ${venue}` : venue;
  }

  let metaHTML = '';
  if (displayDate) {
    metaHTML += `<strong>Date:</strong> ${displayDate}<br/>`;
  }
  if (locationText) {
    metaHTML += `<strong>Location:</strong> ${locationText}<br/>`;
  }
  if (isValidValue(tourName)) {
    metaHTML += `<strong>Tour:</strong> ${tourName}`;
  }

  metaEl.innerHTML = metaHTML;

  // Set body with note, ensuring raw HTML tags are safely rendered as HTML markup
  // while converting standard newlines to <br> to preserve line breaks.
  let rawNote = String(t.NOTE || '');
  // Decode escaped brackets if any
  rawNote = rawNote.replace(/&lt;/g, '<').replace(/&gt;/g, '>');
  // Convert newlines to <br> tags
  const formattedNote = rawNote.replace(/\\n/g, '<br>').replace(/\r?\n/g, '<br>');
  bodyEl.innerHTML = formattedNote;

  modal.classList.add('active');
}

function closeNoteModal() {
  const modal = document.getElementById('noteModal');
  if (modal) {
    modal.classList.remove('active');
  }
}

window.openSetlistExitModal = openSetlistExitModal;
window.closeSetlistExitModal = closeSetlistExitModal;
window.openNoteModal = openNoteModal;
window.closeNoteModal = closeNoteModal;

function getTicketCategory(t) {
  if (t.KATEGORIE && t.KATEGORIE.trim()) {
    const cat = t.KATEGORIE.trim().toLowerCase();
    if (cat.includes('pass')) return 'Passes';
    if (cat.includes('program')) return 'Programs';
    if (cat.includes('poster')) return 'Posters';
    if (cat.includes('shirt') || cat.includes('t-shirt') || cat.includes('tričko')) return 'T-shirts';
    if (cat.includes('tour')) return 'Tour Items';
    if (cat.includes('memo')) return 'Memorabilia';
    if (cat.includes('ticket')) return 'Tickets';
  }
  if (isValidValue(t.TOUR_ID) && !isValidValue(t.DATUM)) {
    return 'Tour Items';
  }
  return 'Tickets';
}

function handleSearchInput() {
  const input = document.getElementById('searchInput');
  const clearBtn = document.getElementById('searchClearBtn');
  const val = input.value;
  
  safeSetSession('jj_museum_search', val);
  if (clearBtn) clearBtn.style.display = val.trim().length > 0 ? 'block' : 'none';
  updateUrlParams();
  filterData();
}

function clearSearchInput() {
  const input = document.getElementById('searchInput');
  const clearBtn = document.getElementById('searchClearBtn');
  if (input) input.value = '';
  safeRemoveSession('jj_museum_search');
  if (clearBtn) clearBtn.style.display = 'none';
  updateUrlParams();
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
  if (!currentRecord) return [];

  const currId = currentRecord.ID_MEMORABILIA || currentRecord.ID_LISTKU;
  const currShowId = isValidValue(currentRecord.SHOW_ID) ? String(currentRecord.SHOW_ID).trim() : null;
  const currTourId = isValidValue(currentRecord.TOUR_ID) ? String(currentRecord.TOUR_ID).trim().toLowerCase() : null;
  const currTourName = isValidValue(currentRecord.TOUR_NAME) ? String(currentRecord.TOUR_NAME).trim().toLowerCase() : 
                        (isValidValue(currentRecord.TOUR) ? String(currentRecord.TOUR).trim().toLowerCase() : null);

  const hasCurrDate = isValidValue(currentRecord.DATUM);
  const currDate = hasCurrDate ? currentRecord.DATUM.trim() : null;

  return allTickets.filter(item => {
    const itemId = item.ID_MEMORABILIA || item.ID_LISTKU;
    if (currId && itemId && itemId === currId) return false;
    if (item === currentRecord) return false;

    const itemShowId = isValidValue(item.SHOW_ID) ? String(item.SHOW_ID).trim() : null;
    const itemTourId = isValidValue(item.TOUR_ID) ? String(item.TOUR_ID).trim().toLowerCase() : null;
    const itemTourName = isValidValue(item.TOUR_NAME) ? String(item.TOUR_NAME).trim().toLowerCase() : 
                          (isValidValue(item.TOUR) ? String(item.TOUR).trim().toLowerCase() : null);

    // 1. Přímá shoda na konkrétní koncert (SHOW_ID)
    const matchShow = !!(currShowId && itemShowId && currShowId === itemShowId);
    if (matchShow) return true;

    // 2. Shoda na turné (zkontroluje TOUR_ID i název TOUR_NAME / TOUR)
    const matchTour = !!(
      (currTourId && itemTourId && currTourId === itemTourId) ||
      (currTourName && itemTourName && currTourName === itemTourName)
    );

    if (!matchTour) return false;

    // Pokud položka NEMA datum, jde o všeobecný merch/program/plakát k celému turné -> zobrazí se u všech koncertů daného turné
    const hasItemDate = isValidValue(item.DATUM);
    if (!hasItemDate) {
      const rawCat = (item.KATEGORIE || '').trim().toLowerCase();
      const isTicket = rawCat === 'ticket' || rawCat === 'tickets' || rawCat === 'lístek' || rawCat === 'listek';
      return !isTicket; // Zobrazí vše kromě samotných lístků bez data
    }

    // Pokud položka datum MÁ, zobrazí se jen u koncertu se stejným datem
    return hasCurrDate && item.DATUM.trim() === currDate;
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
        const cityFilter = document.getElementById('cityFilter');
        if (cityFilter) cityFilter.value = '';
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
  if (t.VENUE || t.MISTO_KONANI) params.set('venue', t.VENUE || t.MISTO_KONANI);
  if (t.TOUR_ID) params.set('tour_id', t.TOUR_ID);
  if (t.TOUR_NAME) params.set('tour_name', t.TOUR_NAME);
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
      const headerStr = t.DATUM ? formatDisplayDate(t.DATUM) : (t.TOUR_NAME || 'Archive Item');
      const locStr = formatLocationText(t);
      return `${headerStr}${locStr ? ` | ${locStr}` : ''} (${getTicketCategory(t)})`;
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
      if (!ticketObj) return 'Scan Preview';
      const headerStr = ticketObj.DATUM ? formatDisplayDate(ticketObj.DATUM) : (ticketObj.TOUR_NAME || 'Archive Item');
      const locStr = formatLocationText(ticketObj);
      return `${headerStr}${locStr ? ` | ${locStr}` : ''} (${getTicketCategory(ticketObj)})`;
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
    'T-shirts': 0, 'Tour Items': 0, 'Memorabilia': 0, 'Videos': 0, 'ALL': matchesBeforeCategoryFilter.length 
  };

  matchesBeforeCategoryFilter.forEach(t => {
    const cat = getTicketCategory(t);
    if (counts[cat] !== undefined) counts[cat]++;
    if (isValidValue(t.YOUTUBE_URL)) counts['Videos']++;
  });

  const categoryOrder = ['Tickets', 'Passes', 'Programs', 'Posters', 'T-shirts', 'Tour Items', 'Memorabilia', 'Videos', 'ALL'];
  const categoryLabels = { 
    'Tickets': '🎫 Tickets', 'Passes': '🪪 Passes', 'Programs': '📖 Programs', 
    'Posters': '🖼️ Posters', 'T-shirts': '🎽 T-shirts', 'Tour Items': '🎸 Tour Items',
    'Memorabilia': '⭐ Memorabilia', 'Videos': '🎬 Videos', 'ALL': '✨ All Records' 
  };

  categoryOrder.forEach(catKey => {
    const count = counts[catKey];
    if (count > 0 || catKey === 'ALL' || catKey === 'Tickets') {
      const btn = document.createElement('button');
      btn.className = `tab-btn ${currentCategory === catKey ? 'active' : ''}`;
      btn.innerHTML = `${categoryLabels[catKey]} <span style="opacity: 0.75; font-size: 0.8em;">(${count})</span>`;
      btn.onclick = () => { 
        currentCategory = catKey; 
        updateUrlParams();
        filterData(); 
      };
      tabsContainer.appendChild(btn);
    }
  });
}

function setLayout(layout, updateUrl = true) {
  if (layout !== 'grid' && layout !== 'list') layout = 'grid';
  currentLayout = layout;
  safeSetStorage('jj_museum_view', layout);
  
  const btnGrid = document.getElementById('btnGrid');
  const btnList = document.getElementById('btnList');
  const ticketsContainer = document.getElementById('ticketsContainer');
  
  if (btnGrid) btnGrid.className = `toggle-btn ${layout === 'grid' ? 'active' : ''}`;
  if (btnList) btnList.className = `toggle-btn ${layout === 'list' ? 'active' : ''}`;
  if (ticketsContainer) ticketsContainer.className = `tickets-container ${layout}-view`;
  
  if (updateUrl) {
    updateUrlParams();
  }
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
  const selectedCity = document.getElementById('cityFilter')?.value || '';
  const sort = document.getElementById('sortFilter')?.value || 'random';

  const dateCandidates = parseDateCandidates(rawQuery);

  const matchesBase = allTickets.filter(t => {
    const locationText = formatLocationText(t).toLowerCase();
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
    const tourName = (t.TOUR_NAME || '').toLowerCase();
    const tourId = (t.TOUR_ID || '').toLowerCase();

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
      setlist.includes(query) ||
      tourName.includes(query) ||
      tourId.includes(query);

    const qMatch = !query || dateMatch || textMatch;
    const cMatch = !selectedCity || city === selectedCity.toLowerCase();
    return qMatch && cMatch;
  });

  renderCategoryTabs(matchesBase);

  filteredTickets = matchesBase.filter(t => {
    const unverifiedOnly = document.getElementById('unverifiedFilter')?.checked || false;
    if (unverifiedOnly) {
      const songCount = parseInt(t.POCET_SKLADEB, 10) || 0;
      const hasFullSetlist = isValidValue(t.SETLIST) && songCount > 0;
      if (hasFullSetlist) return false;
    }
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
  } else if (sort === 'missing_setlists_only' || sort === 'missing_setlists') {
    filteredTickets = filteredTickets.filter(t => {
      const setlistUrl = isValidValue(t.SETLIST_URL) ? t.SETLIST_URL.trim() : (isValidValue(t.SETLIST_FM_URL) ? t.SETLIST_FM_URL.trim() : '');
      const songCount = parseInt(t.POCET_SKLADEB, 10) || 0;
      const hasSongs = isValidValue(t.SETLIST) && songCount > 0;
      return !hasSongs || !setlistUrl;
    });
  } else if (sort === 'scans_only') {
    filteredTickets = filteredTickets.filter(t => isValidValue(t.SOUBOR_SKEN));
  }

  currentPage = 1;
  renderPaginated();

  const adminEditorLink = document.getElementById('adminEditorLink');
  if (adminEditorLink) {
    const editQuery = getEditUrlParams();
    adminEditorLink.href = editQuery ? `edit_ticket_new.html?${editQuery}` : 'edit_ticket_new.html';
  }
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
    
    // Zapojení třídy pro zrušené/přeložené akce na úroveň karty
    const statusVal = isValidValue(t.STATUS) ? t.STATUS.trim().toUpperCase() : '';
    let cardStatusClass = '';
    if (statusVal === 'CANCELLED') cardStatusClass = ' card-cancelled';
    if (statusVal === 'RESCHEDULED') cardStatusClass = ' card-rescheduled';
    card.className = `ticket-card${cardStatusClass}`;

    const itemId = t.ID_MEMORABILIA || t.ID_LISTKU;
    const songCount = parseInt(t.POCET_SKLADEB, 10) || 0;
    const hasSetlist = isValidValue(t.SETLIST) && songCount > 0;
    const setlistUrl = isValidValue(t.SETLIST_URL) ? t.SETLIST_URL.trim() : (isValidValue(t.SETLIST_FM_URL) ? t.SETLIST_FM_URL.trim() : '');
    const hasLineup = isValidValue(t.LINEUP);

    const skenFiles = (t.SOUBOR_SKEN || '').split(',').map(s => s.trim()).filter(Boolean);
    const isMissingScan = skenFiles.length === 0;
    const firstImgFile = skenFiles[0] || '';
    const imgSrc = isValidValue(firstImgFile) ? `./scans/${firstImgFile}` : MISSING_TICKET_SVG;
    const locationText = formatLocationText(t);

    card.onclick = (e) => {
      if (e.target.closest('.icon-btn, .ticket-badge, [data-scan]')) return;
      openDirectImagePreview(globalIndex);
    };

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
                           <ol style="padding-left: 20px; padding-bottom: 8px;">${listItemsHTML}</ol>
                         </div>`;
    }
    if (hasLineup) {
      const members = t.LINEUP.split(/[;/]/).map(m => m.trim()).filter(Boolean);
      collapsibleHTML += `<div class="collapsible-content" id="lineup-${globalIndex}"><ul>${members.map(m => `<li>${m}</li>`).join('')}</ul></div>`;
    }

    const catName = getTicketCategory(t);
    const categoryIconMap = {
      'Tickets': '🎫',
      'Passes': '🪪',
      'Programs': '📖',
      'Posters': '🖼️',
      'T-shirts': '🎽',
      'Tour Items': '🎸',
      'Memorabilia': '⭐',
      'Videos': '🎬'
    };
    const catIcon = categoryIconMap[catName] || '🎫';
    // NOVÝ KÓD
let singleCat = catName;
if (catName === 'Passes') {
  singleCat = 'Pass';
} else if (catName === 'Tickets') {
  singleCat = 'Ticket';
} else if (catName === 'Posters') {
  singleCat = 'Poster';
} else if (catName === 'Programs') {
  singleCat = 'Program';
} else if (catName.endsWith('s') && !catName.endsWith('ss')) {
  singleCat = catName.slice(0, -1);
}
    const displayDate = t.DATUM ? formatDisplayDate(t.DATUM) : (isValidValue(t.TOUR_NAME) ? t.TOUR_NAME : '');

    // Status odznak na 1. řádku
    let statusBadgeHTML = '';
    if (statusVal === 'CANCELLED') {
      statusBadgeHTML = ` <span class="badge-status-cancelled">❌ Cancelled</span>`;
    } else if (statusVal === 'RESCHEDULED') {
      const origText = isValidValue(t.ORIGINAL_DATE) ? ` (Originally: ${formatDisplayDate(t.ORIGINAL_DATE)})` : '';
      statusBadgeHTML = ` <span class="badge-status-rescheduled" title="Rescheduled show${origText}">🔄 Rescheduled</span>`;
    }

    // Line 1: Date on the left, Category & Status badges on the right
    const line1HTML = `
     <div class="card-meta-line1">
       <span class="card-date">${displayDate}</span>
        <div class="card-meta-right">
        <span class="category-badge">${catIcon} ${singleCat}</span>
      ${statusBadgeHTML}
        </div>
      </div>
    `;

    // Line 2: Lokace a pripadna poznámka/trivia (NOTE) - Ensure raw HTML tags are safely rendered and any newlines are preserved as breaks
    let rawCardNote = isValidValue(t.NOTE) ? String(t.NOTE).replace(/&lt;/g, '<').replace(/&gt;/g, '>') : '';
    const formattedNote = rawCardNote.replace(/\\n/g, '<br>').replace(/\r?\n/g, '<br>');
    const noteHTML = formattedNote ? `<div class="card-note-line" onclick="event.stopPropagation(); openNoteModal(${globalIndex});">💡 ${formattedNote}</div>` : '';
    const line2HTML = `
      <div class="card-location-line2">${locationText || (isValidValue(t.TOUR_NAME) ? t.TOUR_NAME : '')}</div>
      ${noteHTML}
    `;

    // 7-Slot Action Grid Construction
    const relatedItems = getRelatedItems(t);

    // Slot 1: Edit button (Admin only)
    let slot1HTML = '<div class="grid-slot-empty"></div>';
    if (isAdmin && isValidValue(itemId)) {
      const editQuery = getEditUrlParams(itemId);
      slot1HTML = `
        <button class="icon-btn btn-action-edit" title="Edit Record in Editor" onclick="event.stopPropagation(); window.location.href='edit_ticket_new.html?${editQuery}';">
          ✏️
        </button>`;
    }

    // Slot 2: Video / Audio badge
    let slot2HTML = '<div class="grid-slot-empty"></div>';
    if (isValidValue(t.YOUTUBE_URL)) {
      slot2HTML = `
        <button class="icon-btn btn-action-video" title="YouTube video" onclick="event.stopPropagation(); openVideoModal(${globalIndex});">
          🎬
        </button>`;
    }

    // Helper for related items slots
    const buildRelatedSlotBadge = (items, defaultIcon, defaultTitle) => {
      if (!items || items.length === 0) return '<div class="grid-slot-empty"></div>';
      const count = items.length;
      const allScansList = [];
      items.forEach(item => {
        if (isValidValue(item.SOUBOR_SKEN)) {
          allScansList.push(...item.SOUBOR_SKEN.split(',').map(s => s.trim()).filter(isValidValue));
        }
      });
      const rawRelScan = allScansList.join(',');
      const hasRelScan = allScansList.length > 0;
      const primaryItem = items[0];
      const relTicketJson = encodeURIComponent(JSON.stringify(primaryItem));
      const countLabel = count > 1 ? ` ${count}` : '';
      const title = count > 1 ? `${count} ${defaultTitle}` : defaultTitle.replace(/s$/, '');

      return `
        <button class="icon-btn btn-action-related btn-action-category ticket-badge" data-scan="${rawRelScan}" data-ticket="${relTicketJson}" title="${title}${hasRelScan ? '' : ' (Missing scan)'}" onclick="event.stopPropagation(); handleRelatedBadgeClick(this);">
          ${defaultIcon}${countLabel}
        </button>`;
    };

    // Slot 3: Poster badge
    const posterItems = relatedItems.filter(r => getTicketCategory(r) === 'Posters');
    const slot3HTML = buildRelatedSlotBadge(posterItems, '🖼️', 'Related Posters');

    // Slot 4: Pass badge
    const passItems = relatedItems.filter(r => getTicketCategory(r) === 'Passes');
    const slot4HTML = buildRelatedSlotBadge(passItems, '🪪', 'Related Passes');

    // Slot 5: Merch / Memorabilia badge
    const merchItems = relatedItems.filter(r => {
      const c = getTicketCategory(r);
      return c !== 'Posters' && c !== 'Passes' && c !== 'Tickets';
    });
    const merchCat = merchItems.length > 0 ? getTicketCategory(merchItems[0]) : '';
    const merchIcon = merchCat === 'T-shirts' ? '👕' : (merchCat === 'Programs' ? '📖' : (merchCat === 'Tour Items' ? '🎸' : '⭐'));
    const slot5HTML = buildRelatedSlotBadge(merchItems, merchIcon, 'Related Memorabilia');

    // Slot 6: Lineup badge
    let slot6HTML = '<div class="grid-slot-empty"></div>';
    if (hasLineup) {
      slot6HTML = `
        <button class="icon-btn btn-action-lineup" title="Band Line-up" onclick="event.stopPropagation(); toggleCollapsible('lineup-${globalIndex}');">
          👥
        </button>`;
    }

    // Slot 7: Setlist badge
    let slot7HTML = '';
    if (hasSetlist) {
      slot7HTML = `
        <button class="icon-btn badge-setlist btn-action-setlist" title="Setlist (${songCount} songs)" onclick="event.stopPropagation(); toggleCollapsible('setlist-${globalIndex}');">
          🎵 ${songCount}
        </button>`;
    } else if (setlistUrl) {
      slot7HTML = `
        <button class="icon-btn badge-setlist-empty" title="Setlist empty — click to edit on Setlist.fm" onclick="event.stopPropagation(); openSetlistExitModal('${setlistUrl}');">
          ✏️
        </button>`;
    } else {
      const formParams = new URLSearchParams();
      if (isValidValue(t.DATUM)) formParams.set('date', t.DATUM.trim());
      if (isValidValue(t.MESTO)) formParams.set('city', t.MESTO.trim());
      if (isValidValue(t.STAT)) formParams.set('country', t.STAT.trim());
      if (isValidValue(t.MISTO_KONANI)) formParams.set('venue', t.MISTO_KONANI.trim());
      if (isValidValue(t.TOUR_NAME)) formParams.set('tour_name', t.TOUR_NAME.trim());
      if (isValidValue(t.TOUR_ID)) formParams.set('tour_id', t.TOUR_ID.trim());
      if (isValidValue(t.LINEUP)) formParams.set('lineup', t.LINEUP.trim());
      const itemIdVal = t.ID_MEMORABILIA || t.ID_LISTKU;
      if (isValidValue(itemIdVal)) formParams.set('id', String(itemIdVal).trim());
      formParams.set('notes', 'Setlist contribution / missing setlist link report');
      const formUrl = `ticket_form.html?${formParams.toString()}`;

      slot7HTML = `
        <button class="icon-btn badge-setlist-sl" title="When you create or find the setlist link, send us a note" onclick="event.stopPropagation(); window.location.href='${formUrl}';">
          SL
        </button>`;
    }

    card.innerHTML = `
      <div class="card-img-wrapper" title="${isMissingScan ? 'Missing scan - Click to preview' : 'Click to view scan'}">
        <img src="${imgSrc}"loading="lazy" alt="Joe Jackson Concert ${t.DATUM ? formatDisplayDate(t.DATUM) : (t.TOUR_NAME || 'Archive Item')} - ${locationText || 'Live Performance'} (${catName})" onerror="this.onerror=null; this.src='${MISSING_TICKET_SVG}';">
      </div>
      <div class="card-content">
        ${line1HTML}
        ${line2HTML}
        <div class="card-actions-grid card-actions">
          ${slot1HTML}
          ${slot2HTML}
          ${slot3HTML}
          ${slot4HTML}
          ${slot5HTML}
          ${slot6HTML}
          ${slot7HTML}
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