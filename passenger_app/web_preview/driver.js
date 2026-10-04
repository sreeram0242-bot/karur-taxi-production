/* ==========================================================================
   Karur Taxi Driver (கரூர் டாக்ஸி ஓட்டுநர்) - Cockpit & Duty HUD Logic
   Features:
   - High-contrast OLED theme & tactile 96dp duty switcher
   - -₹300 wallet balance lockout safeguard + UPI recharge simulation
   - 15-second high-urgency dispatch flash with alarm chime & countdown
   - 4-digit customer START OTP pad (Zero-literacy intuitive)
   - Physical Swipe-to-Complete thumb drag slider
   - Pre-completion Toll & Parking calculation
   ========================================================================== */

(function () {
  'use strict';

  // --- AUDIO SYNTHESIS ENGINE (Web Audio API) ---
  let audioCtx = null;
  let isSoundEnabled = true;
  let alarmInterval = null;

  function getAudioContext() {
    if (!audioCtx) {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      audioCtx = new AudioContext();
    }
    if (audioCtx.state === 'suspended') {
      audioCtx.resume();
    }
    return audioCtx;
  }

  function playTone(freq, duration, type = 'sine', gainVal = 0.15) {
    if (!isSoundEnabled) return;
    try {
      const ctx = getAudioContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, ctx.currentTime);
      gain.gain.setValueAtTime(gainVal, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + duration);
    } catch (e) {
      console.warn('Audio play failed', e);
    }
  }

  function playDutyToggleChime(isOnline) {
    if (isOnline) {
      playTone(440, 0.08, 'triangle', 0.2);
      setTimeout(() => playTone(880, 0.15, 'triangle', 0.25), 90);
    } else {
      playTone(660, 0.08, 'triangle', 0.2);
      setTimeout(() => playTone(330, 0.18, 'triangle', 0.2), 90);
    }
  }

  function playSuccessChime() {
    playTone(523.25, 0.09, 'sine', 0.2); // C5
    setTimeout(() => playTone(659.25, 0.09, 'sine', 0.2), 100); // E5
    setTimeout(() => playTone(783.99, 0.2, 'sine', 0.25), 200); // G5
  }

  function playWarningBuzzer() {
    playTone(220, 0.12, 'sawtooth', 0.3);
    setTimeout(() => playTone(200, 0.18, 'sawtooth', 0.3), 130);
  }

  function startUrgentAlarm() {
    stopUrgentAlarm();
    if (!isSoundEnabled) return;
    let beeps = 0;
    alarmInterval = setInterval(() => {
      if (beeps % 2 === 0) {
        playTone(900, 0.08, 'square', 0.15);
      } else {
        playTone(1200, 0.08, 'square', 0.15);
      }
      beeps++;
    }, 280);
  }

  function stopUrgentAlarm() {
    if (alarmInterval) {
      clearInterval(alarmInterval);
      alarmInterval = null;
    }
  }

  // --- COORDINATES (Karur District Hub) ---
  const KARUR_BUS_STAND = [10.9601, 78.0766];
  const TEXTILE_PARK = [10.9320, 78.0340];
  const DRIVER_INITIAL_POS = [10.9565, 78.0720];

  // --- APP STATE ---
  const state = {
    isOnline: false,
    walletBalance: 450.0,
    activeTripState: 'none', // 'none' | 'enroute' | 'arrived' | 'intrip' | 'swipedone'
    enteredPin: '',
    correctPin: '4821', // Matches passenger start PIN
    baseFare: 135.0,
    tollCharge: 0.0,
    parkingCharge: 0.0,
    flashSecondsLeft: 15,
    flashTimerId: null
  };

  // --- DOM ELEMENTS ---
  const dom = {
    // Header & Telemetry
    telemetryChip: document.getElementById('telemetry-chip'),
    telemetryDot: document.getElementById('telemetry-dot'),
    telemetryLabel: document.getElementById('telemetry-label'),
    viewDesktopBtn: document.getElementById('view-mode-desktop'),
    viewMobileBtn: document.getElementById('view-mode-mobile'),
    deviceFrame: document.getElementById('device-frame'),
    soundToggle: document.getElementById('sound-toggle'),
    soundIconOn: document.getElementById('sound-icon-on'),
    soundIconOff: document.getElementById('sound-icon-off'),

    // Profile & Metrics
    driverStatusDot: document.getElementById('driver-status-dot'),
    walletCard: document.getElementById('wallet-card'),
    walletBalanceVal: document.getElementById('wallet-balance-val'),
    btnWalletNormal: document.getElementById('btn-wallet-normal'),
    btnWalletLocked: document.getElementById('btn-wallet-locked'),
    cardWalletLock: document.getElementById('card-wallet-lock'),
    btnRechargeUpi: document.getElementById('btn-recharge-upi'),

    // Duty Idle Section
    sectionDutyIdle: document.getElementById('section-duty-idle'),
    badgeDutyState: document.getElementById('badge-duty-state'),
    txtDutyTamil: document.getElementById('txt-duty-tamil'),
    btnSimulateDispatch: document.getElementById('btn-simulate-dispatch'),
    btnDutyToggle: document.getElementById('btn-duty-toggle'),
    dutyBtnEn: document.getElementById('duty-btn-en'),
    dutyBtnTa: document.getElementById('duty-btn-ta'),

    // Active Trip Cockpit Section
    sectionActiveTrip: document.getElementById('section-active-trip'),
    stepArrivedAction: document.getElementById('step-arrived-action'),
    btnDriverArrived: document.getElementById('btn-driver-arrived'),
    btnDriverCall: document.getElementById('btn-driver-call'),
    stepOtpPad: document.getElementById('step-otp-pad'),
    pinBoxes: [
      document.getElementById('pin-box-1'),
      document.getElementById('pin-box-2'),
      document.getElementById('pin-box-3'),
      document.getElementById('pin-box-4')
    ],
    btnPinClear: document.getElementById('btn-pin-clear'),
    btnPinVerify: document.getElementById('btn-pin-verify'),
    stepInTrip: document.getElementById('step-in-trip'),
    btnReachedDrop: document.getElementById('btn-reached-drop'),
    stepSwipeComplete: document.getElementById('step-swipe-complete'),
    tollSummaryPill: document.getElementById('toll-summary-pill'),
    lblTollAdded: document.getElementById('lbl-toll-added'),
    btnEditToll: document.getElementById('btn-edit-toll'),
    swipeContainer: document.getElementById('swipe-container'),
    swipeThumb: document.getElementById('swipe-thumb'),
    swipeFill: document.getElementById('swipe-fill'),
    swipeLabel: document.getElementById('swipe-label'),

    // Modals
    modalDispatchFlash: document.getElementById('modal-dispatch-flash'),
    flashTimerSec: document.getElementById('flash-timer-sec'),
    flashTimerBar: document.getElementById('flash-timer-bar'),
    btnFlashDecline: document.getElementById('btn-flash-decline'),
    btnFlashAccept: document.getElementById('btn-flash-accept'),

    modalTollParking: document.getElementById('modal-toll-parking'),
    inputToll: document.getElementById('input-toll'),
    inputParking: document.getElementById('input-parking'),
    lblCalcExtras: document.getElementById('lbl-calc-extras'),
    lblCalcTotal: document.getElementById('lbl-calc-total'),
    btnTollCancel: document.getElementById('btn-toll-cancel'),
    btnTollSave: document.getElementById('btn-toll-save'),

    modalCashReceipt: document.getElementById('modal-cash-receipt'),
    receiptCashTotal: document.getElementById('receipt-cash-total'),
    receiptTollVal: document.getElementById('receipt-toll-val'),
    btnReceiptDone: document.getElementById('btn-receipt-done'),

    modalUpiRecharge: document.getElementById('modal-upi-recharge'),
    btnUpiClose: document.getElementById('btn-upi-close'),
    btnUpiSimulateSuccess: document.getElementById('btn-upi-simulate-success'),

    toast: document.getElementById('driver-toast')
  };

  // --- LEAFLET MAP INITIALIZATION ---
  let map, driverMarker, pickupMarker, dropMarker, routePolyline;

  function initMap() {
    // Watermark-free OpenStreetMap raster tiles
    map = L.map('driver-map', {
      zoomControl: false,
      attributionControl: false
    }).setView(KARUR_BUS_STAND, 14);

    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19
    }).addTo(map);

    // Custom High-Contrast Driver Icon
    const driverIcon = L.divIcon({
      className: 'driver-map-marker',
      html: `
        <div style="width:36px; height:36px; background:#090D16; border:2px solid #FFFFFF; border-radius:50%; display:flex; align-items:center; justify-content:center; box-shadow:0 4px 12px rgba(0,0,0,0.6);">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" stroke-width="2.5"><polygon points="12 2 19 21 12 17 5 21 12 2"/></svg>
        </div>
      `,
      iconSize: [36, 36],
      iconAnchor: [18, 18]
    });

    driverMarker = L.marker(DRIVER_INITIAL_POS, { icon: driverIcon }).addTo(map);

    // Pickup & Drop Markers
    const pickupIcon = L.divIcon({
      className: 'pickup-map-marker',
      html: `<div style="width:14px; height:14px; background:#16A34A; border:2.5px solid #FFFFFF; border-radius:50%; box-shadow:0 0 10px #16A34A;"></div>`,
      iconSize: [14, 14],
      iconAnchor: [7, 7]
    });
    pickupMarker = L.marker(KARUR_BUS_STAND, { icon: pickupIcon }).addTo(map);

    const dropIcon = L.divIcon({
      className: 'drop-map-marker',
      html: `<div style="width:14px; height:14px; background:#EF4444; border:2.5px solid #FFFFFF; border-radius:50%; box-shadow:0 0 10px #EF4444;"></div>`,
      iconSize: [14, 14],
      iconAnchor: [7, 7]
    });
    dropMarker = L.marker(TEXTILE_PARK, { icon: dropIcon }).addTo(map);

    // Route Polyline
    const routeCoords = [
      DRIVER_INITIAL_POS,
      [10.9580, 78.0745],
      KARUR_BUS_STAND,
      [10.9550, 78.0690],
      [10.9480, 78.0580],
      [10.9410, 78.0460],
      TEXTILE_PARK
    ];

    routePolyline = L.polyline(routeCoords, {
      color: '#2563EB',
      weight: 5,
      opacity: 0.9,
      lineCap: 'round',
      lineJoin: 'round'
    }).addTo(map);
  }

  // --- TOAST NOTIFICATIONS ---
  let toastTimer = null;
  function showToast(msg) {
    if (toastTimer) clearTimeout(toastTimer);
    dom.toast.textContent = msg;
    dom.toast.classList.remove('hidden');
    toastTimer = setTimeout(() => {
      dom.toast.classList.add('hidden');
    }, 2800);
  }

  // --- WALLET CONTROLS & SAFEGUARDS ---
  function updateWalletUi() {
    dom.walletBalanceVal.textContent = (state.walletBalance >= 0 ? '₹' : '-₹') + Math.abs(state.walletBalance).toFixed(2);

    if (state.walletBalance < -300.0) {
      dom.walletCard.classList.add('locked');
      dom.walletCard.classList.remove('highlight');
      dom.cardWalletLock.classList.remove('hidden');
    } else {
      dom.walletCard.classList.remove('locked');
      dom.walletCard.classList.add('highlight');
      dom.cardWalletLock.classList.add('hidden');
    }
  }

  function setWalletBalance(amount) {
    state.walletBalance = amount;
    updateWalletUi();

    if (amount >= 0) {
      dom.btnWalletNormal.classList.add('active');
      dom.btnWalletLocked.classList.remove('active');
      showToast(`Wallet Balance: ₹${amount.toFixed(2)} (Normal Active State)`);
    } else {
      dom.btnWalletNormal.classList.remove('active');
      dom.btnWalletLocked.classList.add('active');
      showToast(`Wallet Balance: -₹${Math.abs(amount).toFixed(2)} (Locked: Below -₹300)`);
      if (state.isOnline) {
        toggleDuty(); // Auto-force offline if balance falls below -300
      }
    }
  }

  // --- DUTY TOGGLE (GO ONLINE / GO OFFLINE) ---
  function toggleDuty() {
    // Enforce -₹300 Wallet Lock Check
    if (!state.isOnline && state.walletBalance < -300.0) {
      playWarningBuzzer();
      dom.cardWalletLock.classList.remove('hidden');
      dom.modalUpiRecharge.classList.remove('hidden');
      showToast('⚠️ Wallet locked! Balance is below -₹300. Please recharge to go online.');
      return;
    }

    state.isOnline = !state.isOnline;
    playDutyToggleChime(state.isOnline);

    if (state.isOnline) {
      // Online State
      dom.telemetryDot.className = 'telemetry-dot online';
      dom.telemetryLabel.textContent = 'GPS Live • 4s Ping Synced';
      dom.driverStatusDot.className = 'online-indicator-dot online';
      dom.badgeDutyState.className = 'duty-state-badge online';
      dom.badgeDutyState.textContent = 'ONLINE (வேலையில்)';
      dom.txtDutyTamil.textContent = 'Ready to accept Karur rides (காத்திருக்கிறது)';

      dom.btnDutyToggle.className = 'btn-giant-duty go-offline';
      dom.dutyBtnEn.textContent = 'GO OFFLINE';
      dom.dutyBtnTa.textContent = 'ஆஃப்லைன் செல்';

      showToast('🟢 You are ONLINE! Receiving Karur Taxi dispatches.');
    } else {
      // Offline State
      dom.telemetryDot.className = 'telemetry-dot offline';
      dom.telemetryLabel.textContent = 'GPS Ready • Offline';
      dom.driverStatusDot.className = 'online-indicator-dot';
      dom.badgeDutyState.className = 'duty-state-badge offline';
      dom.badgeDutyState.textContent = 'OFFLINE';
      dom.txtDutyTamil.textContent = 'வேலையில் இல்லை (Go online to get rides)';

      dom.btnDutyToggle.className = 'btn-giant-duty go-online';
      dom.dutyBtnEn.textContent = 'GO ONLINE';
      dom.dutyBtnTa.textContent = 'ஆன்லைன் செல்';

      showToast('⚪ You are OFFLINE. No rides will be dispatched.');
    }
  }

  // --- 15-SECOND DISPATCH FLASH MODAL ---
  function triggerDispatchModal() {
    if (!state.isOnline) {
      showToast('Please go ONLINE first to receive ride dispatches!');
      return;
    }

    state.flashSecondsLeft = 15;
    dom.flashTimerSec.textContent = '15s';
    dom.flashTimerBar.style.width = '100%';
    dom.modalDispatchFlash.classList.remove('hidden');

    startUrgentAlarm();

    const startTime = Date.now();
    const duration = 15000;

    if (state.flashTimerId) clearInterval(state.flashTimerId);

    state.flashTimerId = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const remaining = Math.max(0, duration - elapsed);
      const pct = (remaining / duration) * 100;
      const secs = Math.ceil(remaining / 1000);

      dom.flashTimerBar.style.width = `${pct}%`;
      dom.flashTimerSec.textContent = `${secs}s`;

      if (remaining <= 0) {
        clearInterval(state.flashTimerId);
        state.flashTimerId = null;
        stopUrgentAlarm();
        dom.modalDispatchFlash.classList.add('hidden');
        showToast('Ride offer expired (15-second window lapsed)');
      }
    }, 100);
  }

  function declineDispatch() {
    stopUrgentAlarm();
    if (state.flashTimerId) clearInterval(state.flashTimerId);
    dom.modalDispatchFlash.classList.add('hidden');
    showToast('Ride offer declined.');
  }

  function acceptDispatch() {
    stopUrgentAlarm();
    if (state.flashTimerId) clearInterval(state.flashTimerId);
    dom.modalDispatchFlash.classList.add('hidden');
    playSuccessChime();

    // Transition to Active Trip HUD
    state.activeTripState = 'enroute';
    dom.sectionDutyIdle.classList.add('hidden');
    dom.sectionActiveTrip.classList.remove('hidden');

    dom.stepArrivedAction.classList.remove('hidden');
    dom.stepOtpPad.classList.add('hidden');
    dom.stepInTrip.classList.add('hidden');
    dom.stepSwipeComplete.classList.add('hidden');

    showToast('Ride Accepted! En-route to Karur Central Bus Stand.');
    map.flyTo(KARUR_BUS_STAND, 15);
  }

  // --- TRIP STAGE 1: ARRIVED AT PICKUP ---
  function onDriverArrived() {
    state.activeTripState = 'arrived';
    playSuccessChime();

    dom.stepArrivedAction.classList.add('hidden');
    dom.stepOtpPad.classList.remove('hidden');

    state.enteredPin = '';
    updatePinDisplay();
    showToast('Passenger notified: "Driver has arrived at Pickup"');
  }

  // --- TRIP STAGE 2: 4-DIGIT START OTP KEYPAD ---
  function updatePinDisplay() {
    for (let i = 0; i < 4; i++) {
      if (i < state.enteredPin.length) {
        dom.pinBoxes[i].textContent = state.enteredPin[i];
        dom.pinBoxes[i].classList.add('filled');
      } else {
        dom.pinBoxes[i].textContent = '•';
        dom.pinBoxes[i].classList.remove('filled');
      }
      dom.pinBoxes[i].classList.remove('success');
    }
  }

  function handleKeypadPress(key) {
    if (state.enteredPin.length < 4) {
      state.enteredPin += key;
      playTone(400 + state.enteredPin.length * 80, 0.05, 'sine', 0.15);
      updatePinDisplay();

      if (state.enteredPin.length === 4) {
        setTimeout(verifyEnteredPin, 150);
      }
    }
  }

  function clearPin() {
    state.enteredPin = '';
    playTone(300, 0.08, 'triangle', 0.15);
    updatePinDisplay();
  }

  function verifyEnteredPin() {
    if (state.enteredPin === state.correctPin) {
      // Success!
      dom.pinBoxes.forEach(box => box.classList.add('success'));
      playSuccessChime();
      showToast('START PIN Verified! Starting ride to Textile Park.');

      setTimeout(() => {
        state.activeTripState = 'intrip';
        dom.stepOtpPad.classList.add('hidden');
        dom.stepInTrip.classList.remove('hidden');
        map.flyTo(TEXTILE_PARK, 14);
      }, 700);
    } else {
      // Failed PIN
      playWarningBuzzer();
      showToast('Incorrect PIN! Please ask passenger for the 4-digit START PIN (Hint: 4821)');
      clearPin();
    }
  }

  // --- TRIP STAGE 3: REACHED DESTINATION & TOLL CALCULATION ---
  function openTollParkingModal() {
    dom.inputToll.value = state.tollCharge || '0';
    dom.inputParking.value = state.parkingCharge || '0';
    calculateExtras();
    dom.modalTollParking.classList.remove('hidden');
  }

  function calculateExtras() {
    const toll = parseFloat(dom.inputToll.value) || 0;
    const parking = parseFloat(dom.inputParking.value) || 0;
    const extras = toll + parking;
    const total = state.baseFare + extras;

    dom.lblCalcExtras.textContent = `₹${extras.toFixed(2)}`;
    dom.lblCalcTotal.textContent = `₹${total.toFixed(2)}`;
  }

  function saveTollAndProceed() {
    state.tollCharge = parseFloat(dom.inputToll.value) || 0;
    state.parkingCharge = parseFloat(dom.inputParking.value) || 0;
    const extras = state.tollCharge + state.parkingCharge;

    dom.lblTollAdded.textContent = `₹${extras.toFixed(0)}`;
    dom.modalTollParking.classList.add('hidden');

    // Show Swipe-to-Complete Slider
    dom.stepInTrip.classList.add('hidden');
    dom.stepSwipeComplete.classList.remove('hidden');
    resetSwipeSlider();
  }

  // --- TRIP STAGE 4: PHYSICAL SWIPE-TO-COMPLETE SLIDER ---
  let isDraggingSwipe = false;
  let swipeStartX = 0;
  let swipeMaxDist = 0;

  function initSwipeSlider() {
    const container = dom.swipeContainer;
    const thumb = dom.swipeThumb;
    const fill = dom.swipeFill;

    function getPointerX(e) {
      return e.touches ? e.touches[0].clientX : e.clientX;
    }

    function onStart(e) {
      isDraggingSwipe = true;
      swipeStartX = getPointerX(e);
      swipeMaxDist = container.offsetWidth - thumb.offsetWidth - 8;
    }

    function onMove(e) {
      if (!isDraggingSwipe) return;
      const currentX = getPointerX(e);
      let diff = currentX - swipeStartX;
      if (diff < 0) diff = 0;
      if (diff > swipeMaxDist) diff = swipeMaxDist;

      thumb.style.transform = `translateX(${diff}px)`;
      const pct = (diff / swipeMaxDist) * 100;
      fill.style.width = `${pct}%`;

      // Threshold check (> 85% deliberate motion)
      if (pct > 88) {
        onSwipeCompleted();
      }
    }

    function onEnd() {
      if (!isDraggingSwipe) return;
      isDraggingSwipe = false;
      resetSwipeSlider();
    }

    thumb.addEventListener('mousedown', onStart);
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onEnd);

    thumb.addEventListener('touchstart', onStart, { passive: true });
    window.addEventListener('touchmove', onMove, { passive: true });
    window.addEventListener('touchend', onEnd);
  }

  function resetSwipeSlider() {
    dom.swipeThumb.style.transform = 'translateX(0px)';
    dom.swipeFill.style.width = '0%';
  }

  function onSwipeCompleted() {
    isDraggingSwipe = false;
    resetSwipeSlider();
    playSuccessChime();

    // Show Cash Receipt
    const totalCash = state.baseFare + state.tollCharge + state.parkingCharge;
    dom.receiptCashTotal.textContent = `₹${totalCash.toFixed(0)}`;
    dom.receiptTollVal.textContent = `₹${(state.tollCharge + state.parkingCharge).toFixed(2)}`;

    // Deduct ₹15 platform commission from driver's wallet
    state.walletBalance -= 15.0;
    updateWalletUi();

    dom.modalCashReceipt.classList.remove('hidden');
    showToast('Trip Completed! Please collect cash from customer.');
  }

  function finishTripAndReset() {
    dom.modalCashReceipt.classList.add('hidden');
    state.activeTripState = 'none';
    state.tollCharge = 0;
    state.parkingCharge = 0;

    dom.sectionActiveTrip.classList.add('hidden');
    dom.sectionDutyIdle.classList.remove('hidden');

    showToast('Ready for your next Karur Taxi ride!');
    map.flyTo(DRIVER_INITIAL_POS, 14);
  }

  // --- UPI RECHARGE SIMULATION ---
  function openUpiRecharge() {
    dom.modalUpiRecharge.classList.remove('hidden');
  }

  function simulateUpiPaymentSuccess() {
    state.walletBalance += 500.0;
    updateWalletUi();
    dom.modalUpiRecharge.classList.add('hidden');
    playSuccessChime();
    showToast('₹500 Recharge Successful via UPI! Account unlocked.');
  }

  // --- EVENT ATTACHMENTS ---
  function setupEventListeners() {
    // Sound Toggle
    dom.soundToggle.addEventListener('click', () => {
      isSoundEnabled = !isSoundEnabled;
      dom.soundIconOn.classList.toggle('hidden', !isSoundEnabled);
      dom.soundIconOff.classList.toggle('hidden', isSoundEnabled);
      showToast(isSoundEnabled ? 'Alert Sounds: ON' : 'Alert Sounds: MUTED');
    });

    // View Mode Toggle
    dom.viewDesktopBtn.addEventListener('click', () => {
      dom.viewDesktopBtn.classList.add('active');
      dom.viewMobileBtn.classList.remove('active');
      dom.deviceFrame.classList.add('desktop-mode');
    });

    dom.viewMobileBtn.addEventListener('click', () => {
      dom.viewMobileBtn.classList.add('active');
      dom.viewDesktopBtn.classList.remove('active');
      dom.deviceFrame.classList.remove('desktop-mode');
    });

    // Wallet Simulation Controls
    dom.btnWalletNormal.addEventListener('click', () => setWalletBalance(450.0));
    dom.btnWalletLocked.addEventListener('click', () => setWalletBalance(-320.0));
    dom.btnRechargeUpi.addEventListener('click', openUpiRecharge);
    dom.btnUpiClose.addEventListener('click', () => dom.modalUpiRecharge.classList.add('hidden'));
    dom.btnUpiSimulateSuccess.addEventListener('click', simulateUpiPaymentSuccess);

    // Duty Switcher
    dom.btnDutyToggle.addEventListener('click', toggleDuty);

    // Incoming Dispatch
    dom.btnSimulateDispatch.addEventListener('click', triggerDispatchModal);
    dom.btnFlashDecline.addEventListener('click', declineDispatch);
    dom.btnFlashAccept.addEventListener('click', acceptDispatch);

    // Active Trip Steps
    dom.btnDriverArrived.addEventListener('click', onDriverArrived);
    dom.btnDriverCall.addEventListener('click', () => {
      playTone(550, 0.1, 'sine', 0.2);
      showToast('Connecting via Virtual DID Masked Bridge (080-47360000)...');
    });

    // 4-Digit Keypad
    document.querySelectorAll('.key-btn[data-key]').forEach(btn => {
      btn.addEventListener('click', () => handleKeypadPress(btn.getAttribute('data-key')));
    });
    dom.btnPinClear.addEventListener('click', clearPin);
    dom.btnPinVerify.addEventListener('click', verifyEnteredPin);

    // In-Trip & Toll Modals
    dom.btnReachedDrop.addEventListener('click', openTollParkingModal);
    dom.inputToll.addEventListener('input', calculateExtras);
    dom.inputParking.addEventListener('input', calculateExtras);
    dom.btnTollCancel.addEventListener('click', () => {
      dom.modalTollParking.classList.add('hidden');
      dom.stepInTrip.classList.add('hidden');
      dom.stepSwipeComplete.classList.remove('hidden');
      resetSwipeSlider();
    });
    dom.btnTollSave.addEventListener('click', saveTollAndProceed);
    dom.btnEditToll.addEventListener('click', openTollParkingModal);

    // Receipt Done
    dom.btnReceiptDone.addEventListener('click', finishTripAndReset);

    // Initialize physical Swipe Slider
    initSwipeSlider();
  }

  // --- INITIALIZE APPLICATION ---
  window.addEventListener('DOMContentLoaded', () => {
    initMap();
    updateWalletUi();
    setupEventListeners();
  });

})();
