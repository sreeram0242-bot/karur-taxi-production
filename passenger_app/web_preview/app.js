// ==========================================================================
// KARUR TAXI (கரூர் டாக்ஸி) - EXECUTIVE PASSENGER APP CONTROLLER (v2.5)
// ==========================================================================

document.addEventListener('DOMContentLoaded', () => {
  initMap();
  initScreenNavigation();
  initVehicleSelection();
  initViewModeSwitcher();
  initModals();
  initLocationHelpers();
  initChatSystem();
});

// Global state
const AppState = {
  currentScreen: 'booking',
  selectedCategory: 'sedan',
  selectedFare: '₹135',
  pickup: 'Karur Central Bus Stand',
  drop: 'Textile Park, Karur',
  map: null,
  carMarker: null,
  routePolyline: null,
  animationInterval: null,
  telemetryInterval: null,
  etaSeconds: 180, // 3 minutes
  distanceMeters: 850,
};

// 1. Initialize Leaflet Map (Karur Bus Stand & Karur Region)
function initMap() {
  const map = L.map('main-map', {
    zoomControl: false,
    attributionControl: false,
  }).setView([10.9601, 78.0766], 14);
  AppState.map = map;

  // OpenStreetMap clean raster tiles (Zero watermarks)
  L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; OpenStreetMap contributors',
  }).addTo(map);

  // Position Leaflet Zoom Control at Bottom Right
  L.control.zoom({ position: 'bottomright' }).addTo(map);

  // Add 4 simulated available cabs around Karur Bus Stand
  const nearbyCabs = [
    { id: 1, lat: 10.9625, lng: 78.0790, heading: 45 },
    { id: 2, lat: 10.9575, lng: 78.0735, heading: 120 },
    { id: 3, lat: 10.9650, lng: 78.0710, heading: 280 },
    { id: 4, lat: 10.9540, lng: 78.0810, heading: 90 },
  ];

  nearbyCabs.forEach(cab => {
    const cabIcon = L.divIcon({
      html: `
        <div style="background:#090D16; color:#FFFFFF; width:26px; height:26px; border-radius:50%; display:flex; align-items:center; justify-content:center; box-shadow:0 2px 8px rgba(0,0,0,0.3); border:1.5px solid #FFFFFF;">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M14 16H9m10 0h3v-3.5a2 2 0 0 0-.6-1.4L18 8h-4.5L11 11H3a1 1 0 0 0-1 1v4h3"/><circle cx="7" cy="16" r="2"/><circle cx="17" cy="16" r="2"/></svg>
        </div>
      `,
      iconSize: [26, 26],
      iconAnchor: [13, 13],
      className: 'taxi-marker-icon'
    });
    L.marker([cab.lat, cab.lng], { icon: cabIcon }).addTo(map);
  });
}

// 2. Navigation Stepper & Screen Transition
function initScreenNavigation() {
  const tabs = document.querySelectorAll('.step-tab');
  const screens = {
    booking: document.getElementById('screen-booking'),
    dispatch: document.getElementById('screen-dispatch'),
    tracking: document.getElementById('screen-tracking'),
  };

  window.switchScreen = function(target) {
    AppState.currentScreen = target;

    tabs.forEach(tab => {
      tab.classList.toggle('active', tab.getAttribute('data-screen') === target);
    });

    Object.keys(screens).forEach(key => {
      if (screens[key]) {
        screens[key].classList.toggle('active', key === target);
      }
    });

    if (target === 'tracking') {
      setupTrackingRoute();
      startLiveTelemetrySimulation();
    } else {
      clearTrackingRoute();
      stopLiveTelemetrySimulation();
    }

    if (AppState.map) {
      setTimeout(() => AppState.map.invalidateSize(), 200);
    }
  };

  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      const target = tab.getAttribute('data-screen');
      switchScreen(target);
    });
  });

  // Action buttons trigger screen progression
  const btnRequestRide = document.getElementById('btn-request-ride');
  if (btnRequestRide) {
    btnRequestRide.addEventListener('click', () => {
      switchScreen('dispatch');
      showToast('Finding nearest verified driver in Karur...', '🛰️');
    });
  }

  const btnForceAssign = document.getElementById('btn-force-assign');
  if (btnForceAssign) {
    btnForceAssign.addEventListener('click', () => {
      switchScreen('tracking');
      showToast('Senthil Kumar (TN 47 AJ 4920) accepted your ride!', '🚗');
    });
  }

  const btnCancelDispatch = document.getElementById('btn-cancel-dispatch');
  if (btnCancelDispatch) {
    btnCancelDispatch.addEventListener('click', () => {
      switchScreen('booking');
      showToast('Request cancelled.', 'ℹ️');
    });
  }
}

// 3. Vehicle Selection Logic
function initVehicleSelection() {
  const cards = document.querySelectorAll('.vehicle-card');
  const ctaText = document.getElementById('cta-button-text');

  cards.forEach(card => {
    card.addEventListener('click', () => {
      cards.forEach(c => c.classList.remove('selected'));
      card.classList.add('selected');

      const cat = card.getAttribute('data-cat');
      const fare = card.getAttribute('data-fare');
      const name = card.querySelector('.veh-name').textContent;

      AppState.selectedCategory = cat;
      AppState.selectedFare = fare;

      if (ctaText) {
        ctaText.textContent = `Book ${name} • ${fare}`;
      }

      // Update fare breakdown total dynamically
      const receiptTotal = document.getElementById('receipt-total');
      if (receiptTotal) {
        receiptTotal.textContent = fare + '.00';
      }
    });
  });
}

// 4. View Mode Switcher (Web View vs Mobile App iPhone Frame)
function initViewModeSwitcher() {
  const btnDesktop = document.getElementById('view-mode-desktop');
  const btnMobile = document.getElementById('view-mode-mobile');

  if (btnDesktop && btnMobile) {
    btnDesktop.addEventListener('click', () => {
      btnDesktop.classList.add('active');
      btnMobile.classList.remove('active');
      document.body.classList.remove('mode-mobile');
      document.body.classList.add('mode-desktop');
      if (AppState.map) {
        setTimeout(() => AppState.map.invalidateSize(), 200);
      }
      showToast('Switched to Full Web Dashboard view');
    });

    btnMobile.addEventListener('click', () => {
      btnMobile.classList.add('active');
      btnDesktop.classList.remove('active');
      document.body.classList.remove('mode-desktop');
      document.body.classList.add('mode-mobile');
      if (AppState.map) {
        setTimeout(() => AppState.map.invalidateSize(), 200);
      }
      showToast('Switched to Mobile App view');
    });
  }
}

// 5. Custom Modals (ZERO Native Browser Alerts!)
function initModals() {
  const modalCancel = document.getElementById('modal-cancel-ride');
  const modalFare = document.getElementById('modal-fare-breakdown');
  const modalMasked = document.getElementById('modal-masked-call');
  const modalSos = document.getElementById('modal-sos');

  // Cancel ride button triggers sleek custom in-app modal
  const btnCancelTrip = document.getElementById('btn-cancel-trip');
  if (btnCancelTrip && modalCancel) {
    btnCancelTrip.addEventListener('click', () => {
      modalCancel.classList.add('active');
    });
  }

  const btnKeepRide = document.getElementById('btn-keep-ride');
  if (btnKeepRide && modalCancel) {
    btnKeepRide.addEventListener('click', () => {
      modalCancel.classList.remove('active');
      showToast('Ride retained! Driver is arriving.', '🚕');
    });
  }

  const btnConfirmCancelRide = document.getElementById('btn-confirm-cancel-ride');
  if (btnConfirmCancelRide && modalCancel) {
    btnConfirmCancelRide.addEventListener('click', () => {
      modalCancel.classList.remove('active');
      switchScreen('booking');
      showToast('Ride cancelled. 100% free within 3 minutes.', '✅');
    });
  }

  // Cancel Reason Chips toggle
  const reasonChips = document.querySelectorAll('.reason-chip');
  reasonChips.forEach(chip => {
    chip.addEventListener('click', () => {
      reasonChips.forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
    });
  });

  // Fare breakdown modal
  const btnFareBreakdown = document.getElementById('btn-fare-breakdown');
  const btnViewPromo = document.getElementById('btn-view-promo');
  const btnCloseFareModal = document.getElementById('btn-close-fare-modal');

  [btnFareBreakdown, btnViewPromo].forEach(btn => {
    if (btn && modalFare) {
      btn.addEventListener('click', () => modalFare.classList.add('active'));
    }
  });

  if (btnCloseFareModal && modalFare) {
    btnCloseFareModal.addEventListener('click', () => modalFare.classList.remove('active'));
  }

  // Masked call modal
  const btnMaskedCall = document.getElementById('btn-masked-call');
  const btnCloseCallModal = document.getElementById('btn-close-call-modal');

  if (btnMaskedCall && modalMasked) {
    btnMaskedCall.addEventListener('click', () => modalMasked.classList.add('active'));
  }
  if (btnCloseCallModal && modalMasked) {
    btnCloseCallModal.addEventListener('click', () => modalMasked.classList.remove('active'));
  }

  // SOS modal
  const btnSosFloating = document.getElementById('btn-sos-floating');
  const btnCloseSos = document.getElementById('btn-close-sos');
  const btnConfirmSos = document.getElementById('btn-confirm-sos');

  if (btnSosFloating && modalSos) {
    btnSosFloating.addEventListener('click', () => modalSos.classList.add('active'));
  }
  if (btnCloseSos && modalSos) {
    btnCloseSos.addEventListener('click', () => modalSos.classList.remove('active'));
  }
  if (btnConfirmSos && modalSos) {
    btnConfirmSos.addEventListener('click', () => {
      modalSos.classList.remove('active');
      showToast('🚨 SOS broadcasted to Karur Police (112) & Family!', '🚨');
    });
  }

  // Copy OTP feedback
  const btnCopyOtp = document.getElementById('btn-copy-otp');
  if (btnCopyOtp) {
    btnCopyOtp.addEventListener('click', () => {
      if (navigator.clipboard) {
        navigator.clipboard.writeText('4821');
      }
      showToast('Start PIN 4821 copied to clipboard!', '📋');
    });
  }

  // Schedule trip
  const btnScheduleTrip = document.getElementById('btn-schedule-trip');
  if (btnScheduleTrip) {
    btnScheduleTrip.addEventListener('click', () => {
      showToast('📅 Advance Booking reserved for tomorrow at 08:30 AM', '📅');
    });
  }

  // Recenter map
  const btnRecenter = document.getElementById('btn-recenter');
  if (btnRecenter && AppState.map) {
    btnRecenter.addEventListener('click', () => {
      AppState.map.setView([10.9601, 78.0766], 15);
      showToast('Map centered to Karur Central Bus Stand');
    });
  }

  // Close modals on backdrop click
  [modalCancel, modalFare, modalMasked, modalSos].forEach(modal => {
    if (modal) {
      modal.addEventListener('click', (e) => {
        if (e.target === modal) {
          modal.classList.remove('active');
        }
      });
    }
  });
}

// 6. In-App Live Chat System
function initChatSystem() {
  const modalChat = document.getElementById('modal-chat');
  const btnOpenChat = document.getElementById('btn-open-chat');
  const btnCloseChat = document.getElementById('btn-close-chat');
  const chatMessages = document.getElementById('chat-messages');
  const chatTextInput = document.getElementById('chat-text-input');
  const btnSendChat = document.getElementById('btn-send-chat');

  if (btnOpenChat && modalChat) {
    btnOpenChat.addEventListener('click', () => {
      modalChat.classList.add('active');
      // Clear unread badge
      const dot = btnOpenChat.querySelector('.chat-badge-dot');
      if (dot) dot.style.display = 'none';
    });
  }

  if (btnCloseChat && modalChat) {
    btnCloseChat.addEventListener('click', () => modalChat.classList.remove('active'));
  }

  function sendMessage(text) {
    if (!text || !text.trim() || !chatMessages) return;

    const userBubble = document.createElement('div');
    userBubble.className = 'chat-bubble user';
    const timeNow = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    userBubble.innerHTML = `<p>${escapeHTML(text)}</p><span class="bubble-time">${timeNow}</span>`;
    chatMessages.appendChild(userBubble);
    chatMessages.scrollTop = chatMessages.scrollHeight;

    if (chatTextInput) chatTextInput.value = '';

    // Simulated driver response after 1.5s
    setTimeout(() => {
      const driverReplies = [
        "சரிங்க, வந்துட்டேன்! (Noted, arriving in 2 mins!)",
        "AC is on. Waiting with hazard lights on near pillar 4.",
        "Yes, got your location. Please check vehicle plate TN 47 AJ 4920.",
      ];
      const reply = driverReplies[Math.floor(Math.random() * driverReplies.length)];
      const driverBubble = document.createElement('div');
      driverBubble.className = 'chat-bubble driver';
      driverBubble.innerHTML = `<p>${reply}</p><span class="bubble-time">${timeNow}</span>`;
      chatMessages.appendChild(driverBubble);
      chatMessages.scrollTop = chatMessages.scrollHeight;
    }, 1500);
  }

  if (btnSendChat && chatTextInput) {
    btnSendChat.addEventListener('click', () => sendMessage(chatTextInput.value));
    chatTextInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') sendMessage(chatTextInput.value);
    });
  }

  // Quick reply chips
  const quickChips = document.querySelectorAll('.quick-chip');
  quickChips.forEach(chip => {
    chip.addEventListener('click', () => {
      const msg = chip.getAttribute('data-msg');
      sendMessage(msg);
    });
  });
}

// 7. Location Helpers (Swap & Chips)
function initLocationHelpers() {
  const inputPickup = document.getElementById('input-pickup');
  const inputDrop = document.getElementById('input-drop');
  const btnSwap = document.getElementById('btn-swap');

  if (btnSwap && inputPickup && inputDrop) {
    btnSwap.addEventListener('click', () => {
      const temp = inputPickup.value;
      inputPickup.value = inputDrop.value;
      inputDrop.value = temp;
      showToast('Pickup & drop locations swapped');
    });
  }

  const chips = document.querySelectorAll('.chip');
  chips.forEach(chip => {
    chip.addEventListener('click', () => {
      const dest = chip.getAttribute('data-dest');
      if (inputDrop) {
        inputDrop.value = dest + ', Karur';
        showToast(`Destination set to ${dest}`);
      }
    });
  });
}

// 8. Live Tracking Route & Simulated Movement
function setupTrackingRoute() {
  if (!AppState.map) return;
  clearTrackingRoute();

  const routeCoordinates = [
    [10.9660, 78.0830],
    [10.9645, 78.0810],
    [10.9630, 78.0795],
    [10.9615, 78.0780],
    [10.9601, 78.0766], // Bus Stand Pickup
  ];

  // Draw clean, sleek indigo route line
  AppState.routePolyline = L.polyline(routeCoordinates, {
    color: '#2563EB',
    weight: 5,
    opacity: 0.85,
    lineCap: 'round',
    lineJoin: 'round',
  }).addTo(AppState.map);

  // Custom driver vehicle marker
  const driverIcon = L.divIcon({
    html: `
      <div style="background:#090D16; border:2px solid #FFFFFF; width:32px; height:32px; border-radius:50%; display:flex; align-items:center; justify-content:center; color:#FFFFFF; box-shadow:0 4px 12px rgba(0,0,0,0.35);">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M14 16H9m10 0h3v-3.5a2 2 0 0 0-.6-1.4L18 8h-4.5L11 11H3a1 1 0 0 0-1 1v4h3"/><circle cx="7" cy="16" r="2"/><circle cx="17" cy="16" r="2"/></svg>
      </div>
    `,
    iconSize: [32, 32],
    iconAnchor: [16, 16],
    className: 'active-driver-marker'
  });

  AppState.carMarker = L.marker(routeCoordinates[0], { icon: driverIcon }).addTo(AppState.map);

  // Smooth client-side interpolation
  let stepIndex = 0;
  AppState.animationInterval = setInterval(() => {
    if (!AppState.carMarker) return;
    stepIndex = (stepIndex + 1) % routeCoordinates.length;
    AppState.carMarker.setLatLng(routeCoordinates[stepIndex]);
  }, 2200);

  // Adjust view to frame route
  AppState.map.fitBounds(AppState.routePolyline.getBounds(), {
    padding: [60, 60],
  });
}

function clearTrackingRoute() {
  if (AppState.animationInterval) {
    clearInterval(AppState.animationInterval);
    AppState.animationInterval = null;
  }
  if (AppState.routePolyline && AppState.map) {
    AppState.map.removeLayer(AppState.routePolyline);
    AppState.routePolyline = null;
  }
  if (AppState.carMarker && AppState.map) {
    AppState.map.removeLayer(AppState.carMarker);
    AppState.carMarker = null;
  }
}

// 9. Real-time Telemetry & Live Countdown Simulation
function startLiveTelemetrySimulation() {
  stopLiveTelemetrySimulation();
  AppState.etaSeconds = 180;
  AppState.distanceMeters = 850;

  const etaHighlight = document.querySelector('.eta-highlight');
  const etaDistance = document.querySelector('.eta-distance');
  const routeFill = document.querySelector('.route-progress-fill');
  const carIndicator = document.querySelector('.route-car-indicator');
  const speedBadge = document.querySelector('.telemetry-speed-badge');

  AppState.telemetryInterval = setInterval(() => {
    if (AppState.etaSeconds > 30) {
      AppState.etaSeconds -= 5;
      AppState.distanceMeters = Math.max(120, AppState.distanceMeters - 25);

      const mins = Math.floor(AppState.etaSeconds / 60);
      const secs = AppState.etaSeconds % 60;
      const etaStr = mins > 0 ? `${mins} MIN ${secs > 0 ? secs + 'S' : ''}` : `${secs}S`;

      if (etaHighlight) etaHighlight.textContent = etaStr;
      if (etaDistance) etaDistance.textContent = `${AppState.distanceMeters}m away`;

      // Progress bar fill calculation (from 75% to 95%)
      const progressPercent = Math.min(95, 75 + Math.floor((180 - AppState.etaSeconds) / 8));
      if (routeFill) routeFill.style.width = progressPercent + '%';
      if (carIndicator) carIndicator.style.left = progressPercent + '%';

      // Fluctuating speed
      const speed = 32 + Math.floor(Math.random() * 14);
      if (speedBadge) speedBadge.textContent = `⚡ ${speed} km/h`;
    }
  }, 2500);
}

function stopLiveTelemetrySimulation() {
  if (AppState.telemetryInterval) {
    clearInterval(AppState.telemetryInterval);
    AppState.telemetryInterval = null;
  }
}

// 10. Floating In-App Toast System
let toastTimeout = null;
function showToast(message, icon = '✨') {
  const toast = document.getElementById('app-toast');
  const msgEl = document.getElementById('toast-message');
  const iconEl = toast ? toast.querySelector('.toast-icon') : null;

  if (toast && msgEl) {
    msgEl.textContent = message;
    if (iconEl) iconEl.textContent = icon;

    toast.classList.add('active');
    if (toastTimeout) clearTimeout(toastTimeout);
    toastTimeout = setTimeout(() => {
      toast.classList.remove('active');
    }, 2800);
  }
}

// Security XSS helper
function escapeHTML(str) {
  return str.replace(/[&<>'"]/g, 
    tag => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[tag] || tag)
  );
}
