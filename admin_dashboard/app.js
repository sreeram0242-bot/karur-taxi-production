/* ==========================================================================
   Karur Taxi (கரூர் டாக்ஸி) — Admin Dashboard Application Logic
   Phase 4: God's Eye Map, Manual Dispatch, Tariff Engine, Driver KYC
   ========================================================================== */

'use strict';

// --- LIVE CLOCK ---
function startClock() {
  const clockEl = document.getElementById('live-clock');
  const dateEl = document.getElementById('live-date');
  function tick() {
    const now = new Date();
    const h = now.getHours();
    const m = now.getMinutes().toString().padStart(2, '0');
    const s = now.getSeconds().toString().padStart(2, '0');
    const ampm = h >= 12 ? 'PM' : 'AM';
    const h12 = ((h % 12) || 12).toString().padStart(2, '0');
    clockEl.textContent = `${h12}:${m}:${s} ${ampm}`;
    dateEl.textContent = `Karur, TN 47 · ${now.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}`;
  }
  tick();
  setInterval(tick, 1000);
}

// --- TOAST NOTIFICATION (replaces all browser alert/confirm) ---
let toastTimer = null;
window.showToast = function(msg, duration = 3000) {
  if (toastTimer) clearTimeout(toastTimer);
  const t = document.getElementById('admin-toast');
  t.textContent = msg;
  t.classList.remove('hidden');
  toastTimer = setTimeout(() => t.classList.add('hidden'), duration);
};

// --- TAB NAVIGATION ---
function initTabs() {
  const navBtns = document.querySelectorAll('.nav-btn');
  const tabPanes = document.querySelectorAll('.tab-pane');
  const titleEl = document.getElementById('tab-title');
  const subtitleEl = document.getElementById('tab-subtitle');

  const META = {
    'gods-eye': {
      title: "God's Eye Fleet Map",
      subtitle: 'Real-time driver locations and trip states across Karur District'
    },
    'manual-dispatch': {
      title: 'Manual Dispatch Desk',
      subtitle: 'Call-center telephone booking intake with automatic nearest driver lock via PostGIS'
    },
    'tariff-engine': {
      title: 'Tariff & Geozone Engine',
      subtitle: 'Dynamic polygon boundaries, night surcharge, and Tamil Nadu round-trip tariff rules'
    },
    'kyc-approval': {
      title: 'Driver KYC Approval Queue',
      subtitle: 'Review Driving License, RC Book, FC Certificate, and Aadhaar documents'
    }
  };

  navBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const tab = btn.dataset.tab;
      navBtns.forEach(b => b.classList.remove('active'));
      tabPanes.forEach(p => { p.classList.remove('active'); p.style.display = 'none'; });

      btn.classList.add('active');
      const pane = document.getElementById(`tab-${tab}`);
      if (pane) {
        pane.classList.add('active');
        pane.style.display = '';
      }

      if (META[tab]) {
        titleEl.textContent = META[tab].title;
        subtitleEl.textContent = META[tab].subtitle;
      }

      // Invalidate map when switching back to God's Eye
      if (tab === 'gods-eye' && window._karurMap) {
        setTimeout(() => window._karurMap.invalidateSize(), 200);
      }
    });
  });

  // Initialize pane visibility
  tabPanes.forEach((p, i) => {
    if (i !== 0) p.style.display = 'none';
  });
}

// --- GOD'S EYE LIVE FLEET MAP ---
function initGodsEyeMap() {
  const KARUR_CENTER = [10.9601, 78.0766];

  const map = L.map('gods-eye-map', {
    zoomControl: false,
    attributionControl: false
  }).setView(KARUR_CENTER, 13);

  window._karurMap = map;

  // Watermark-free OpenStreetMap raster tiles
  L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19
  }).addTo(map);

  L.control.zoom({ position: 'bottomright' }).addTo(map);

  // Fleet of simulated Karur District vehicles
  const fleet = [
    { id: 'SK', name: 'Senthil Kumar', plate: 'TN 47 AJ 4920', lat: 10.9601, lng: 78.0766, state: 'idle',    cat: 'sedan' },
    { id: 'MR', name: 'Murugan R',     plate: 'TN 47 B 8811',  lat: 10.9650, lng: 78.0820, state: 'intrip',  cat: 'auto'  },
    { id: 'KS', name: 'Karthikeyan S', plate: 'TN 47 C 1204',  lat: 10.9520, lng: 78.0690, state: 'enroute', cat: 'mini'  },
    { id: 'RT', name: 'Ravi Teja',     plate: 'TN 47 XY 9901', lat: 10.9700, lng: 78.0890, state: 'idle',    cat: 'suv'   },
    { id: 'PM', name: 'Prakash M',     plate: 'TN 47 D 5520',  lat: 10.9555, lng: 78.0720, state: 'idle',    cat: 'sedan' },
    { id: 'AR', name: 'Anand R',       plate: 'TN 47 E 3311',  lat: 10.9470, lng: 78.0640, state: 'enroute', cat: 'mini'  },
  ];

  const STATE_COLOR = {
    idle:    '#22C55E',
    enroute: '#2563EB',
    intrip:  '#F59E0B'
  };

  const STATE_LABEL = {
    idle:    'Online / Idle',
    enroute: 'En-Route to Pickup',
    intrip:  'In-Trip with Passenger'
  };

  fleet.forEach(veh => {
    const color = STATE_COLOR[veh.state];
    const label = STATE_LABEL[veh.state];

    const iconHtml = `
      <div style="
        width: 34px; height: 34px;
        background: ${veh.state === 'intrip' ? '#F59E0B' : '#090D16'};
        border: 2.5px solid ${color};
        border-radius: 50%;
        display: flex; align-items: center; justify-content: center;
        box-shadow: 0 0 12px ${color}66, 0 4px 10px rgba(0,0,0,0.5);
        font-size: 15px;
      ">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="${veh.state === 'intrip' ? '#090D16' : color}" stroke-width="2.5">
          <path d="M14 16H9m10 0h3v-3.5a2 2 0 0 0-.6-1.4L18 8h-4.5L11 11H3a1 1 0 0 0-1 1v4h3"/>
          <circle cx="7" cy="16" r="2"/><circle cx="17" cy="16" r="2"/>
        </svg>
      </div>
    `;

    const icon = L.divIcon({
      html: iconHtml,
      className: '',
      iconSize: [34, 34],
      iconAnchor: [17, 17]
    });

    const marker = L.marker([veh.lat, veh.lng], { icon }).addTo(map);

    // Popup with monochrome white-and-black plate badge (no alert!)
    marker.bindPopup(`
      <div style="font-family: 'Plus Jakarta Sans', system-ui, sans-serif; min-width: 190px; padding: 4px 0;">
        <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom: 8px;">
          <strong style="font-size:13px; font-weight:800; color:#090D16;">${veh.name}</strong>
          <span style="font-family:monospace; font-size:10.5px; font-weight:900; background:#090D16; color:#FFFFFF; padding:2px 7px; border-radius:4px; border:1px solid #334155;">${veh.plate}</span>
        </div>
        <div style="font-size:11px; color:#64748B; margin-bottom:4px;">Vehicle: ${veh.cat.toUpperCase()} · Karur District</div>
        <div style="display:inline-flex; align-items:center; gap:5px; padding:2px 8px; border-radius:12px; background:${color}22; border:1px solid ${color}55; font-size:11px; font-weight:700; color:${color};">
          <span style="width:6px;height:6px;border-radius:50%;background:${color};flex-shrink:0;"></span>
          ${label}
        </div>
      </div>
    `, { maxWidth: 250 });
  });

  // Simulate live movement (subtle position drift every 4 seconds)
  const markers = [];
  fleet.forEach((veh, idx) => {
    const color = STATE_COLOR[veh.state];
    const icon = L.divIcon({
      html: `<div style="width:34px;height:34px;background:#090D16;border:2.5px solid ${color};border-radius:50%;display:flex;align-items:center;justify-content:center;box-shadow:0 0 12px ${color}66;"></div>`,
      className: '',
      iconSize: [34, 34],
      iconAnchor: [17, 17]
    });
    markers.push({ lat: veh.lat, lng: veh.lng, state: veh.state });
  });

  // City/District Fly-to Selector
  const CITY_COORDS = {
    karur:           [10.9601, 78.0766],
    thanthonimalai:  [10.9320, 78.0850],
    kulithalai:      [10.9333, 78.4167],
    coimbatore:      [11.0168, 76.9558],
    trichy:          [10.7905, 78.7047],
    erode:           [11.3410, 77.7172],
    salem:           [11.6643, 78.1460]
  };

  document.getElementById('city-select').addEventListener('change', (e) => {
    const c = CITY_COORDS[e.target.value];
    if (c) map.flyTo(c, 13, { duration: 1.5 });
  });
}

// --- MANUAL DISPATCH CALCULATOR ---
const RATES = {
  auto:  { baseFare: 40,  baseKm: 1.8, perKm: 14 },
  mini:  { baseFare: 60,  baseKm: 2.0, perKm: 16 },
  sedan: { baseFare: 80,  baseKm: 2.0, perKm: 18 },
  suv:   { baseFare: 120, baseKm: 3.0, perKm: 24 }
};

const CANDIDATE_DRIVERS = [
  { rank: 1, initials: 'SK', name: 'Senthil Kumar', plate: 'TN 47 AJ 4920', meta: 'Sedan · 0.8 km · ★ 4.94', state: 'idle' },
  { rank: 2, initials: 'PM', name: 'Prakash M',     plate: 'TN 47 D 5520',  meta: 'Sedan · 1.2 km · ★ 4.87', state: 'idle' },
  { rank: 3, initials: 'KS', name: 'Karthikeyan S', plate: 'TN 47 C 1204',  meta: 'Mini  · 1.6 km · ★ 4.91', state: 'enroute' },
];

function renderCandidateDrivers() {
  const list = document.getElementById('candidate-drivers-list');
  if (!list) return;

  list.innerHTML = CANDIDATE_DRIVERS.map(d => `
    <div class="candidate-card">
      <span class="cand-rank">#${d.rank}</span>
      <span class="cand-status-dot ${d.state === 'idle' ? 'green' : 'blue'}"></span>
      <div class="cand-info">
        <span class="cand-name">${d.name}</span>
        <span class="cand-meta">${d.meta}</span>
      </div>
      <span class="cand-plate">${d.plate}</span>
      <button class="btn-force-assign" onclick="forceAssignDriver('${d.name}', '${d.plate}')">Force Assign</button>
    </div>
  `).join('');
}

function forceAssignDriver(name, plate) {
  document.getElementById('modal-dispatch-text').textContent = `${name} has been assigned and will receive a 15-second dispatch flash.`;
  document.getElementById('mdc-plate').textContent = plate;

  const parts = name.split(' ');
  const initials = parts.map(p => p[0]).join('').slice(0, 2);
  document.querySelector('.mdc-initials').textContent = initials;
  document.querySelector('.mdc-name').textContent = name;

  document.getElementById('modal-dispatch-confirm').classList.remove('hidden');
}

function initManualDispatch() {
  const kmInput = document.getElementById('dispatch-km');
  const catInput = document.getElementById('dispatch-category');
  const fareEl = document.getElementById('dispatch-calculated-fare');
  const ruleBadge = document.getElementById('dispatch-rule-badge');
  const breakdownEl = document.getElementById('fare-breakdown-text');

  function recalc() {
    const km = parseFloat(kmInput.value) || 0;
    const cat = catInput.value;
    const cfg = RATES[cat] || RATES.sedan;

    let billable = km;
    let isRoundTrip = km > 10;

    if (isRoundTrip) {
      billable = km * 2;
      ruleBadge.classList.remove('hidden');
    } else {
      ruleBadge.classList.add('hidden');
    }

    let fare = cfg.baseFare;
    if (billable > cfg.baseKm) fare += (billable - cfg.baseKm) * cfg.perKm;
    fareEl.textContent = `₹${Math.round(fare)}`;
    breakdownEl.textContent = isRoundTrip
      ? `${km} km × 2 (two-way) × ₹${cfg.perKm}/km`
      : `${km} km × ₹${cfg.perKm}/km`;
  }

  if (kmInput) kmInput.addEventListener('input', recalc);
  if (catInput) catInput.addEventListener('change', recalc);
  recalc();

  const form = document.getElementById('manual-booking-form');
  if (form) {
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const phone = document.getElementById('dispatch-phone').value.trim();
      const name = document.getElementById('dispatch-name').value.trim();
      if (!phone || phone.length < 10) {
        showToast('Please enter a valid 10-digit mobile number.');
        return;
      }
      if (!name) {
        showToast('Please enter the customer name.');
        return;
      }

      // Show dispatch confirmation modal (no alert()!)
      document.getElementById('modal-dispatch-text').textContent =
        `Dispatch sent! Senthil Kumar (TN 47 AJ 4920) will receive a 15-second flash for ${name}'s booking.`;
      document.getElementById('modal-dispatch-confirm').classList.remove('hidden');
    });
  }

  renderCandidateDrivers();

  // Dispatch modal OK button
  document.getElementById('btn-dispatch-modal-ok').addEventListener('click', () => {
    document.getElementById('modal-dispatch-confirm').classList.add('hidden');
    showToast('Dispatch confirmed and recorded in PostGIS ride table.');
  });

  window.forceAssignDriver = forceAssignDriver;
}

// --- KYC QUEUE ---
let kycPending = 2;

window.approveKyc = function(id) {
  const card = document.getElementById(`kyc-card-${id}`);
  if (!card) return;

  card.style.opacity = '0';
  card.style.transform = 'translateX(20px)';
  card.style.transition = 'all 0.3s ease';

  setTimeout(() => {
    card.remove();
    kycPending--;
    updateKycBadge();
    showToast('✓ Driver KYC approved. SMS notification sent: "Karur Taxi: Documents verified. You can start accepting rides."');
  }, 300);
};

window.rejectKyc = function(id) {
  const card = document.getElementById(`kyc-card-${id}`);
  if (!card) return;

  card.style.opacity = '0';
  card.style.transform = 'translateX(-20px)';
  card.style.transition = 'all 0.3s ease';

  setTimeout(() => {
    card.remove();
    kycPending--;
    updateKycBadge();
    showToast('✗ Driver KYC rejected. SMS sent: "Karur Taxi: Documents rejected. Please re-upload clear, legible copies."');
  }, 300);
};

function updateKycBadge() {
  const badge = document.getElementById('kyc-badge');
  const countBadge = document.getElementById('kyc-count-badge');
  const emptyState = document.getElementById('kyc-empty-state');
  const navBadge = document.getElementById('kyc-badge');

  if (badge) badge.textContent = kycPending;
  if (countBadge) countBadge.textContent = `${kycPending} Pending`;

  if (kycPending === 0) {
    if (emptyState) emptyState.classList.remove('hidden');
    if (badge) badge.textContent = '';
    if (badge) badge.style.display = 'none';
  }
}

// --- FLEET COUNTER ANIMATION (Sidebar Live Stats) ---
function animateCounters() {
  function randomFluctuate(elId, base, min, max) {
    setInterval(() => {
      const delta = Math.floor(Math.random() * 3) - 1;
      const current = parseInt(document.getElementById(elId).textContent) || base;
      const next = Math.max(min, Math.min(max, current + delta));
      document.getElementById(elId).textContent = next;
    }, 4000);
  }
  randomFluctuate('live-idle', 14, 8, 22);
  randomFluctuate('live-enroute', 8, 3, 14);
  randomFluctuate('live-intrip', 19, 12, 28);
}

// --- INIT ---
document.addEventListener('DOMContentLoaded', () => {
  startClock();
  initTabs();
  initGodsEyeMap();
  initManualDispatch();
  animateCounters();
});
