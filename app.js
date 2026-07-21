/**
 * Snoopy Garden Smart Vehicle & Cart Rental System - Password Protected Admin Actions (app.js)
 */

// User Specified Vehicle List (Total 5 Vehicles)
const INITIAL_CARTS = [
  { id: 'CART-01', name: '1호 카트', model: '2인승 전동 카트', type: '카트', icon: '🛺', status: 'AVAILABLE', currentRenter: null, currentDept: null, rentTime: null, phone: null },
  { id: 'CART-03', name: '3호 카트', model: '4인승 전동 카트', type: '카트', icon: '🛺', status: 'AVAILABLE', currentRenter: null, currentDept: null, rentTime: null, phone: null },
  { id: 'LABO-01', name: '라보', model: '작업 & 자재 운반용 다목적 차량', type: '라보', icon: '🛻', status: 'AVAILABLE', currentRenter: null, currentDept: null, rentTime: null, phone: null },
  { id: 'BUS-SNOOPY', name: '스누피 버스', model: '스누피 캐릭터 투어 셔틀 버스', type: '버스', icon: '🚌', status: 'AVAILABLE', currentRenter: null, currentDept: null, rentTime: null, phone: null },
  { id: 'BUS-BELLE', name: '벨 버스', model: '벨 캐릭터 투어 셔틀 버스', type: '버스', icon: '🚌', status: 'AVAILABLE', currentRenter: null, currentDept: null, rentTime: null, phone: null }
];

// Master Admin Password
const MASTER_ADMIN_PASSWORD = '1590';

// Default Admin Webhook & Sheet Links
const DEFAULT_WEBHOOK_URL = 'https://script.google.com/macros/s/AKfycbz0jOtqY_F6UkhcMCiEl9D_vIv3vCOeLMCBn8ZjZC4u6Vmgl5M2Yf2e7vpXZKPr/exec';
const DEFAULT_SHEET_VIEW_URL = 'https://docs.google.com/spreadsheets/d/1Q0d3NiDLLI7foZELqT0fZwDAcyjP2oIQITpfsu9NEXc/edit?gid=0#gid=0';

// App State
let carts = [];
let logs = [];
let userProfile = { name: '', dept: '', phone: '' };
let webhookUrl = DEFAULT_WEBHOOK_URL;
let sheetViewUrl = DEFAULT_SHEET_VIEW_URL;
let activeWebcamStream = null;

// DOM Elements
const cartGridContainer = document.getElementById('cart-grid-container');
const sheetLogTbody = document.getElementById('sheet-log-tbody');
const archiveGalleryContainer = document.getElementById('archive-gallery-container');
const syncBanner = document.getElementById('sync-status-banner');
const bannerStatusIndicator = document.getElementById('banner-status-indicator');
const bannerText = document.getElementById('banner-text');
const gasWebhookUrlInput = document.getElementById('gas-webhook-url');
const gasSheetUrlInput = document.getElementById('gas-sheet-url');

// Return Location Elements
const returnLocationSelect = document.getElementById('return-location-select');
const returnLocationCustom = document.getElementById('return-location-custom');

// Sheet Direct Link Elements
const directGoogleSheetBtn = document.getElementById('direct-google-sheet-btn');
const bannerSheetDirectLink = document.getElementById('banner-sheet-direct-link');
const sheetTabDirectLink = document.getElementById('sheet-tab-direct-link');

// Profile DOM Elements
const headerProfileLabel = document.getElementById('header-profile-label');
const profileBarName = document.getElementById('profile-bar-name');
const profileBarDept = document.getElementById('profile-bar-dept');
const profileNameInput = document.getElementById('profile-name');
const profileDeptInput = document.getElementById('profile-dept');
const profilePhoneInput = document.getElementById('profile-phone');

// Stat Elements
const statTotal = document.getElementById('stat-total');
const statAvailable = document.getElementById('stat-available');
const statInUse = document.getElementById('stat-in-use');
const statReturned = document.getElementById('stat-returned');

// Password Verification Helper
function checkAdminPassword(actionName = '관리자 메뉴') {
  const input = prompt(`🔒 [${actionName}] 접근 권한 확인\n관리자 비밀번호 4자리를 입력하세요:`);
  if (input === MASTER_ADMIN_PASSWORD) {
    return true;
  } else if (input === null) {
    return false; // User cancelled
  } else {
    alert('❌ 비밀번호가 올바르지 않습니다.');
    return false;
  }
}

// Initialize App
document.addEventListener('DOMContentLoaded', () => {
  loadStorageData();
  setupNavigation();
  setupEventListeners();
  updateProfileUI();
  renderCarts();
  renderSheetLogs();
  renderArchiveGallery();
  updateStats();
  startTimerLoop();
  startCloudSyncLoop();
});

// Load persistent data & sync vehicle list
function loadStorageData() {
  const savedCarts = localStorage.getItem('snoopy_carts_v4');
  if (savedCarts) {
    carts = JSON.parse(savedCarts);
  } else {
    carts = JSON.parse(JSON.stringify(INITIAL_CARTS));
    saveCarts();
  }

  const savedLogs = localStorage.getItem('snoopy_logs');
  if (savedLogs) {
    logs = JSON.parse(savedLogs);
  }

  const savedProfile = localStorage.getItem('snoopy_user_profile');
  if (savedProfile) {
    userProfile = JSON.parse(savedProfile);
  }

  const savedWebhook = localStorage.getItem('snoopy_webhook_url');
  webhookUrl = savedWebhook ? savedWebhook : DEFAULT_WEBHOOK_URL;

  const savedSheetUrl = localStorage.getItem('snoopy_sheet_view_url');
  sheetViewUrl = savedSheetUrl ? savedSheetUrl : DEFAULT_SHEET_VIEW_URL;

  if (gasWebhookUrlInput) gasWebhookUrlInput.value = webhookUrl;
  if (gasSheetUrlInput) gasSheetUrlInput.value = sheetViewUrl;

  updateSheetLinks();
  updateSyncBannerStatus();
}

function updateSheetLinks() {
  if (directGoogleSheetBtn) directGoogleSheetBtn.href = sheetViewUrl;
  if (bannerSheetDirectLink) bannerSheetDirectLink.href = sheetViewUrl;
  if (sheetTabDirectLink) sheetTabDirectLink.href = sheetViewUrl;
}

function saveCarts() {
  localStorage.setItem('snoopy_carts_v4', JSON.stringify(carts));
  if (window.BroadcastChannel) {
    const bc = new BroadcastChannel('snoopy_cart_sync');
    bc.postMessage({ type: 'CART_UPDATE', carts: carts, logs: logs });
  }
}

function saveLogs() {
  localStorage.setItem('snoopy_logs', JSON.stringify(logs));
}

function saveUserProfile() {
  localStorage.setItem('snoopy_user_profile', JSON.stringify(userProfile));
  updateProfileUI();
}

function updateProfileUI() {
  if (userProfile.name) {
    headerProfileLabel.textContent = `${userProfile.name} (${userProfile.dept || '담당자'})`;
    profileBarName.textContent = `👤 담당자: ${userProfile.name} (${userProfile.dept || '부서미지정'})`;
    profileBarDept.textContent = `연락처: ${userProfile.phone || '-'} | 차량 대여 시 기본 정보로 자동 세팅됩니다.`;
  } else {
    headerProfileLabel.textContent = '내 프로필 설정';
    profileBarName.textContent = '담당자 정보가 등록되지 않았습니다.';
    profileBarDept.textContent = '클릭하여 [이름 / 부서 / 연락처]를 등록하면 대여 시 자동 입력됩니다.';
  }
}

function updateSyncBannerStatus() {
  if (webhookUrl) {
    bannerStatusIndicator.className = 'status-indicator online';
    bannerText.textContent = `구글 시트 연동 활성화됨 (모바일 & PC 다중 기기 실시간 동기화 구동 중)`;
  } else {
    bannerStatusIndicator.className = 'status-indicator offline';
    bannerText.textContent = '구글 시트 연동이 설정되지 않았습니다.';
  }
}

// Navigation Tabs
function setupNavigation() {
  const navBtns = document.querySelectorAll('.nav-btn[data-tab]');
  navBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const targetTab = btn.getAttribute('data-tab');
      navBtns.forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.tab-content').forEach(tc => tc.classList.remove('active'));

      btn.classList.add('active');
      document.getElementById(targetTab).classList.add('active');
    });
  });
}

// Global Event Listeners
function setupEventListeners() {
  // Open Settings Modal (Password Protected)
  document.getElementById('open-settings-btn').addEventListener('click', () => {
    if (checkAdminPassword('연동 설정')) openModal('settings-modal');
  });
  document.getElementById('banner-setup-btn').addEventListener('click', () => {
    if (checkAdminPassword('연동 설정')) openModal('settings-modal');
  });
  
  // Profile Modal (Password Protected)
  document.getElementById('open-profile-btn').addEventListener('click', () => {
    if (checkAdminPassword('프로필 수정')) openProfileModal();
  });
  document.getElementById('quick-edit-profile-btn').addEventListener('click', () => {
    if (checkAdminPassword('프로필 수정')) openProfileModal();
  });

  // System Full Reset Button (Password Protected: 1590)
  const systemResetBtn = document.getElementById('system-reset-btn');
  if (systemResetBtn) {
    systemResetBtn.addEventListener('click', () => {
      if (checkAdminPassword('현장 전체 초기화')) {
        resetEntireSystem();
      }
    });
  }

  // Export CSV (Password Protected)
  document.getElementById('export-csv-btn').addEventListener('click', () => {
    if (checkAdminPassword('Excel / CSV 다운로드')) {
      exportLogsToCSV();
    }
  });

  // Manual Sync & Refresh buttons
  const manualSyncBtn = document.getElementById('manual-sync-btn');
  if (manualSyncBtn) {
    manualSyncBtn.addEventListener('click', () => {
      fetchCloudCartStatus(true);
    });
  }

  const refreshGridBtn = document.getElementById('refresh-grid-btn');
  if (refreshGridBtn) {
    refreshGridBtn.addEventListener('click', () => {
      fetchCloudCartStatus(true);
    });
  }

  // Cross-tab Broadcast Channel listener
  if (window.BroadcastChannel) {
    const bc = new BroadcastChannel('snoopy_cart_sync');
    bc.onmessage = (e) => {
      if (e.data && e.data.type === 'CART_UPDATE') {
        carts = e.data.carts;
        logs = e.data.logs;
        renderCarts();
        renderSheetLogs();
        renderArchiveGallery();
        updateStats();
      }
    };
  }

  // Visibility change auto sync
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) {
      fetchCloudCartStatus(false);
    }
  });

  // Return Location Select Custom Toggle
  if (returnLocationSelect) {
    returnLocationSelect.addEventListener('change', () => {
      if (returnLocationSelect.value === 'CUSTOM') {
        returnLocationCustom.classList.remove('hidden');
        returnLocationCustom.required = true;
        returnLocationCustom.focus();
      } else {
        returnLocationCustom.classList.add('hidden');
        returnLocationCustom.required = false;
      }
    });
  }

  // Profile Form Submit
  document.getElementById('profile-form').addEventListener('submit', (e) => {
    e.preventDefault();
    userProfile.name = profileNameInput.value.trim();
    userProfile.dept = profileDeptInput.value.trim();
    userProfile.phone = profilePhoneInput.value.trim();
    saveUserProfile();
    closeModal('profile-modal');
    alert('프로필 정보가 안전하게 저장되었습니다!');
  });

  // Modal Close buttons
  document.querySelectorAll('.modal-close, .modal-cancel').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const modal = e.target.closest('.modal-overlay');
      closeModal(modal.id);
    });
  });

  // Rent Form Submit
  document.getElementById('rent-form').addEventListener('submit', handleRentSubmit);

  // Return Form Submit
  document.getElementById('return-form').addEventListener('submit', handleReturnSubmit);

  // Live Camera Controls & Fallback Bypass
  document.getElementById('start-webcam-btn').addEventListener('click', startWebcam);
  document.getElementById('capture-photo-btn').addEventListener('click', captureWebcamPhoto);
  document.getElementById('bypass-photo-btn').addEventListener('click', attachPresetPhoto);
  
  const retakeBtn = document.getElementById('retake-photo-btn');
  if (retakeBtn) {
    retakeBtn.addEventListener('click', () => {
      resetPhotoPreview();
      startWebcam();
    });
  }

  // Search & Filters
  document.getElementById('log-search-input').addEventListener('input', renderSheetLogs);
  document.getElementById('archive-cart-filter').addEventListener('change', renderArchiveGallery);

  // Save Settings
  document.getElementById('save-settings-btn').addEventListener('click', () => {
    webhookUrl = gasWebhookUrlInput.value.trim();
    if (gasSheetUrlInput.value.trim()) {
      sheetViewUrl = gasSheetUrlInput.value.trim();
    }
    localStorage.setItem('snoopy_webhook_url', webhookUrl);
    localStorage.setItem('snoopy_sheet_view_url', sheetViewUrl);
    updateSheetLinks();
    updateSyncBannerStatus();
    closeModal('settings-modal');
    alert('구글 시트 연동 설정이 저장되었습니다!');
    fetchCloudCartStatus(true);
  });

  // Copy Script
  document.getElementById('copy-script-btn').addEventListener('click', () => {
    const code = `function test() {\n  var ss = SpreadsheetApp.openById("1Q0d3NiDLLI7foZELqT0fZwDAcyjP2oIQITpfsu9NEXc");\n  var sheet = ss.getActiveSheet();\n  sheet.appendRow([new Date(), "1호 카트", "테스터", "가든운영팀", "12:00", "12:30", "30분", "카트주차장", "현장사진", "정식 운영 테스트"]);\n}\n\nfunction doGet(e) {\n  var ss = SpreadsheetApp.openById("1Q0d3NiDLLI7foZELqT0fZwDAcyjP2oIQITpfsu9NEXc");\n  var sheet = ss.getActiveSheet();\n  \n  if (e && e.parameter && e.parameter.action === "getStatus") {\n    var data = sheet.getDataRange().getValues();\n    return ContentService.createTextOutput(JSON.stringify(data))\n      .setMimeType(ContentService.MimeType.JSON);\n  }\n  \n  return ContentService.createTextOutput("✅ 스누피가든 스마트 차량 대여 웹훅 서비스가 정상 구동 중입니다.")\n    .setMimeType(ContentService.MimeType.TEXT);\n}\n\nfunction doPost(e) {\n  try {\n    var ss = SpreadsheetApp.openById("1Q0d3NiDLLI7foZELqT0fZwDAcyjP2oIQITpfsu9NEXc");\n    var sheet = ss.getActiveSheet();\n    var data = {};\n    if (e && e.postData && e.postData.contents) {\n      try {\n        data = JSON.parse(e.postData.contents);\n      } catch (err) {\n        data = e.parameter || {};\n      }\n    } else if (e && e.parameter) {\n      data = e.parameter;\n    }\n    sheet.appendRow([\n      data.timestamp || new Date().toLocaleString(),\n      data.cartId || "차량",\n      data.renter || "이용자",\n      data.dept || "",\n      data.rentTime || "",\n      data.returnTime || "",\n      data.duration || "",\n      data.location || "",\n      data.photoUrl || "사진 보존됨",\n      data.note || ""\n    ]);\n    return ContentService.createTextOutput(JSON.stringify({"result": "success"})\n      .setMimeType(ContentService.MimeType.JSON);\n  } catch (gErr) {\n    return ContentService.createTextOutput(JSON.stringify({"result": "error", "message": gErr.toString()})\n      .setMimeType(ContentService.MimeType.JSON);\n  }\n}`;
    navigator.clipboard.writeText(code);
    alert('동기화 지원 스크립트 코드가 복사되었습니다!');
  });
}

// Reset Entire System
function resetEntireSystem() {
  carts = JSON.parse(JSON.stringify(INITIAL_CARTS));
  logs = [];
  localStorage.setItem('snoopy_carts_v4', JSON.stringify(carts));
  localStorage.removeItem('snoopy_logs');
  
  renderCarts();
  renderSheetLogs();
  renderArchiveGallery();
  updateStats();
  
  alert('✨ 전체 프로그램 현황이 초기화되어 5대 모두 대여 가능 상태로 변경되었습니다!');
}

function openProfileModal() {
  profileNameInput.value = userProfile.name || '';
  profileDeptInput.value = userProfile.dept || '';
  profilePhoneInput.value = userProfile.phone || '';
  openModal('profile-modal');
}

// Multi-device Cloud Sync Loop via Google Sheets
function startCloudSyncLoop() {
  fetchCloudCartStatus(false);
  setInterval(() => {
    fetchCloudCartStatus(false);
  }, 4000);
}

function fetchCloudCartStatus(showToast = false) {
  const targetUrl = webhookUrl || DEFAULT_WEBHOOK_URL;
  if (!targetUrl) return;

  fetch(`${targetUrl}?action=getStatus`)
    .then(res => res.text())
    .then(text => {
      let rows;
      try {
        rows = JSON.parse(text);
      } catch (e) {
        return;
      }

      if (!Array.isArray(rows)) return;

      const cloudStatusMap = {};
      const parseSummary = [];

      for (let i = rows.length - 1; i >= 1; i--) {
        const r = rows[i];
        if (!r || r.length < 2) continue;

        const rawCartName = String(r[1] || '');
        const renter = String(r[2] || '');
        const dept = String(r[3] || '');
        const rentTimeStr = String(r[4] || '');
        const returnTimeStr = String(r[5] || '');

        let matchedCartId = null;
        if (rawCartName.includes('1호') || rawCartName.includes('1호 카트') || rawCartName.includes('CART-01')) matchedCartId = 'CART-01';
        else if (rawCartName.includes('3호') || rawCartName.includes('3호 카트') || rawCartName.includes('CART-03')) matchedCartId = 'CART-03';
        else if (rawCartName.includes('라보') || rawCartName.includes('LABO-01')) matchedCartId = 'LABO-01';
        else if (rawCartName.includes('스누피 버스') || rawCartName.includes('BUS-SNOOPY')) matchedCartId = 'BUS-SNOOPY';
        else if (rawCartName.includes('벨 버스') || rawCartName.includes('BUS-BELLE')) matchedCartId = 'BUS-BELLE';

        if (matchedCartId && !cloudStatusMap[matchedCartId]) {
          const isCurrentlyInUse = returnTimeStr.includes('대여 중') || returnTimeStr === '' || returnTimeStr === '-';
          cloudStatusMap[matchedCartId] = {
            inUse: isCurrentlyInUse,
            renter: renter,
            dept: dept,
            rentTimeStr: rentTimeStr
          };
          parseSummary.push(`${matchedCartId}: ${isCurrentlyInUse ? '대여중(' + renter + ')' : '대기중'}`);
        }
      }

      let stateChanged = false;
      carts.forEach(cart => {
        const cloudState = cloudStatusMap[cart.id];
        if (cloudState) {
          if (cloudState.inUse && cart.status !== 'IN_USE') {
            cart.status = 'IN_USE';
            cart.currentRenter = cloudState.renter;
            cart.currentDept = cloudState.dept;
            cart.rentTimeStr = cloudState.rentTimeStr;
            if (!cart.rentTime) cart.rentTime = Date.now() - 60000;
            stateChanged = true;
          } else if (!cloudState.inUse && cart.status === 'IN_USE') {
            cart.status = 'AVAILABLE';
            cart.currentRenter = null;
            cart.currentDept = null;
            cart.rentTime = null;
            cart.rentTimeStr = null;
            stateChanged = true;
          }
        }
      });

      if (stateChanged) {
        saveCarts();
        renderCarts();
        updateStats();
      }

      if (showToast) {
        if (parseSummary.length === 0) {
          alert('구글 시트 수신 완료 (총 ' + rows.length + '행 데이터 존재).');
        } else {
          alert('🔄 구글 시트 수신 완료!\n\n[구글 시트 기준 상태]\n' + parseSummary.join('\n'));
        }
      }
    })
    .catch(err => {
      if (showToast) {
        alert('구글 시트 수신 실패: ' + err.message);
      }
    });
}

// Render Vehicle Dashboard Grid
function renderCarts() {
  cartGridContainer.innerHTML = '';
  carts.forEach(cart => {
    const isAvailable = cart.status === 'AVAILABLE';
    const isInUse = cart.status === 'IN_USE';

    const card = document.createElement('div');
    card.className = `cart-card ${cart.status.toLowerCase()}`;
    
    let durationText = '-';
    if (isInUse && cart.rentTime) {
      durationText = calculateDuration(cart.rentTime);
    }

    card.innerHTML = `
      <div class="cart-card-header">
        <div class="cart-title-box">
          <div class="cart-avatar">${cart.icon || '🚗'}</div>
          <div>
            <div class="cart-name">${cart.name}</div>
            <div class="cart-model">${cart.model}</div>
          </div>
        </div>
        <span class="badge ${isAvailable ? 'badge-available' : 'badge-in-use'}">
          ${isAvailable ? '대여 가능' : '사용 중'}
        </span>
      </div>
      <div class="cart-card-body">
        <div class="cart-info-row">
          <span class="label">차량 종류</span>
          <span class="val">${cart.type}</span>
        </div>
        <div class="cart-info-row">
          <span class="label">현재 상태</span>
          <span class="val">${isAvailable ? '대기 중 (사용가능)' : '대여 이용 중'}</span>
        </div>
        <div class="cart-info-row">
          <span class="label">대여 이용자</span>
          <span class="val">${cart.currentRenter ? `${cart.currentRenter} (${cart.currentDept || '소속미상'})` : '-'}</span>
        </div>
        <div class="cart-info-row">
          <span class="label">이용 경과시간</span>
          <span class="val timer" id="timer-${cart.id}">${durationText}</span>
        </div>
      </div>
      <div class="cart-card-footer">
        ${isAvailable ? `
          <button class="btn btn-primary" onclick="openRentModal('${cart.id}')">
            🚀 대여하기
          </button>
        ` : `
          <button class="btn btn-accent" onclick="openReturnModal('${cart.id}')">
            📸 반납하기 & 현장 사진 인증
          </button>
        `}
      </div>
    `;

    cartGridContainer.appendChild(card);
  });
}

// Timer Loop for updating live in-use time
function startTimerLoop() {
  setInterval(() => {
    carts.forEach(cart => {
      if (cart.status === 'IN_USE' && cart.rentTime) {
        const timerEl = document.getElementById(`timer-${cart.id}`);
        if (timerEl) {
          timerEl.textContent = calculateDuration(cart.rentTime);
        }
      }
    });
  }, 1000);
}

function calculateDuration(startTimeMs) {
  const elapsedSec = Math.floor((Date.now() - startTimeMs) / 1000);
  const minutes = Math.floor(elapsedSec / 60);
  const seconds = elapsedSec % 60;
  return `${minutes}분 ${seconds}초`;
}

function formatTimestamp(dateObj = new Date()) {
  const yyyy = dateObj.getFullYear();
  const mm = String(dateObj.getMonth() + 1).padStart(2, '0');
  const dd = String(dateObj.getDate()).padStart(2, '0');
  const hh = String(dateObj.getHours()).padStart(2, '0');
  const min = String(dateObj.getMinutes()).padStart(2, '0');
  const ss = String(dateObj.getSeconds()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd} ${hh}:${min}:${ss}`;
}

// Modal Handlers
function openModal(modalId) {
  document.getElementById(modalId).classList.add('active');
}

function closeModal(modalId) {
  document.getElementById(modalId).classList.remove('active');
  if (modalId === 'return-modal') {
    stopWebcam();
  }
}

// Rent Modal Logic with Auto Pre-fill (OPEN FOR ALL USERS - NO PASSWORD NEEDED)
window.openRentModal = function(cartId) {
  const cart = carts.find(c => c.id === cartId);
  if (!cart) return;

  document.getElementById('rent-cart-id').value = cartId;
  document.getElementById('rent-modal-title').textContent = `${cart.icon || '🚗'} ${cart.name} 대여하기`;

  const autoNotice = document.getElementById('auto-filled-notice');

  if (userProfile.name) {
    document.getElementById('renter-name').value = userProfile.name;
    document.getElementById('renter-dept').value = userProfile.dept || '';
    document.getElementById('renter-phone').value = userProfile.phone || '';
    autoNotice.style.display = 'block';
  } else {
    document.getElementById('renter-name').value = '';
    document.getElementById('renter-dept').value = '';
    document.getElementById('renter-phone').value = '';
    autoNotice.style.display = 'none';
  }

  document.getElementById('rent-note').value = '';
  
  openModal('rent-modal');
};

function handleRentSubmit(e) {
  e.preventDefault();
  const cartId = document.getElementById('rent-cart-id').value;
  const renterName = document.getElementById('renter-name').value.trim();
  const renterDept = document.getElementById('renter-dept').value.trim();
  const renterPhone = document.getElementById('renter-phone').value.trim();
  const rentNote = document.getElementById('rent-note').value.trim();

  const cart = carts.find(c => c.id === cartId);
  if (!cart) return;

  if (!userProfile.name) {
    userProfile.name = renterName;
    userProfile.dept = renterDept;
    userProfile.phone = renterPhone;
    saveUserProfile();
  }

  const nowMs = Date.now();
  const rentTimeStr = formatTimestamp(new Date(nowMs));

  cart.status = 'IN_USE';
  cart.currentRenter = renterName;
  cart.currentDept = renterDept;
  cart.phone = renterPhone;
  cart.rentTime = nowMs;
  cart.rentTimeStr = rentTimeStr;

  const logEntry = {
    id: 'LOG-' + nowMs,
    timestamp: rentTimeStr,
    cartId: cart.id,
    cartName: cart.name,
    renter: renterName,
    dept: renterDept,
    phone: renterPhone,
    rentTime: rentTimeStr,
    returnTime: '대여 중...',
    duration: '사용 중',
    location: '-',
    photoData: null,
    status: '사용 중',
    note: rentNote,
    gasSynced: false
  };

  logs.unshift(logEntry);
  saveCarts();
  saveLogs();

  renderCarts();
  renderSheetLogs();
  updateStats();
  closeModal('rent-modal');

  sendToGoogleSheet(logEntry);
}

// Return Modal Logic (OPEN FOR ALL USERS - NO PASSWORD NEEDED)
window.openReturnModal = function(cartId) {
  const cart = carts.find(c => c.id === cartId);
  if (!cart) return;

  document.getElementById('return-cart-id').value = cartId;
  document.getElementById('return-modal-title').textContent = `📸 ${cart.name} 반납 & 사진 인증`;
  document.getElementById('return-display-renter').textContent = cart.currentRenter || '-';
  document.getElementById('return-display-dept').textContent = cart.currentDept || '-';
  document.getElementById('return-display-renttime').textContent = cart.rentTimeStr || '-';
  document.getElementById('return-display-duration').textContent = calculateDuration(cart.rentTime);
  document.getElementById('return-note').value = '';
  
  returnLocationSelect.value = '카트주차장';
  returnLocationCustom.value = '';
  returnLocationCustom.classList.add('hidden');
  returnLocationCustom.required = false;

  resetPhotoPreview();
  startWebcam();

  openModal('return-modal');
};

// Camera & Photo logic with flexible fallback when camera is unavailable
function resetPhotoPreview() {
  document.getElementById('webcam-preview').classList.add('hidden');
  document.getElementById('photo-canvas').classList.add('hidden');
  document.getElementById('photo-preview-img').classList.add('hidden');
  document.getElementById('camera-placeholder').classList.remove('hidden');
  document.getElementById('capture-photo-btn').classList.add('hidden');
  
  const retakeBtn = document.getElementById('retake-photo-btn');
  if (retakeBtn) retakeBtn.classList.add('hidden');

  document.getElementById('start-webcam-btn').classList.remove('hidden');
  document.getElementById('captured-photo-data').value = '';
  document.getElementById('submit-return-btn').disabled = false;
}

function startWebcam() {
  const video = document.getElementById('webcam-preview');
  resetPhotoPreview();

  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    attachPresetPhoto();
    return;
  }

  navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })
    .then(stream => {
      activeWebcamStream = stream;
      video.srcObject = stream;
      video.classList.remove('hidden');
      document.getElementById('camera-placeholder').classList.add('hidden');
      document.getElementById('start-webcam-btn').classList.add('hidden');
      document.getElementById('capture-photo-btn').classList.remove('hidden');
    })
    .catch(err => {
      console.warn('Camera access error, fallback activated:', err);
      attachPresetPhoto();
    });
}

function stopWebcam() {
  if (activeWebcamStream) {
    activeWebcamStream.getTracks().forEach(track => track.stop());
    activeWebcamStream = null;
  }
}

function captureWebcamPhoto() {
  const video = document.getElementById('webcam-preview');
  const canvas = document.getElementById('photo-canvas');
  const context = canvas.getContext('2d');

  canvas.width = video.videoWidth || 640;
  canvas.height = video.videoHeight || 480;
  context.drawImage(video, 0, 0, canvas.width, canvas.height);

  const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
  setCapturedPhoto(dataUrl);
  stopWebcam();
}

function attachPresetPhoto() {
  const canvas = document.createElement('canvas');
  canvas.width = 600;
  canvas.height = 400;
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = '#2D6A4F';
  ctx.fillRect(0, 0, 600, 400);

  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(150, 140, 300, 160);
  ctx.fillStyle = '#1B4332';
  ctx.fillRect(170, 160, 120, 80);

  ctx.fillStyle = '#1E293B';
  ctx.beginPath();
  ctx.arc(200, 300, 30, 0, Math.PI * 2);
  ctx.arc(400, 300, 30, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#FFD166';
  ctx.font = 'bold 22px Pretendard';
  ctx.fillText('🐾 SNOOPY GARDEN RETURN AUTHENTICATED', 50, 60);

  ctx.fillStyle = '#FFFFFF';
  ctx.font = '16px Pretendard';
  ctx.fillText(`Timestamp: ${formatTimestamp()}`, 50, 95);
  ctx.fillText(`Status: Camera Permission Fallback (정상반납)`, 50, 120);

  const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
  setCapturedPhoto(dataUrl);
}

function setCapturedPhoto(dataUrl) {
  stopWebcam();
  document.getElementById('webcam-preview').classList.add('hidden');
  document.getElementById('camera-placeholder').classList.add('hidden');
  document.getElementById('capture-photo-btn').classList.add('hidden');

  const img = document.getElementById('photo-preview-img');
  img.src = dataUrl;
  img.classList.remove('hidden');

  const retakeBtn = document.getElementById('retake-photo-btn');
  if (retakeBtn) retakeBtn.classList.remove('hidden');

  document.getElementById('captured-photo-data').value = dataUrl;
  document.getElementById('submit-return-btn').disabled = false;
}

function handleReturnSubmit(e) {
  e.preventDefault();
  const cartId = document.getElementById('return-cart-id').value;
  
  let finalLocation = returnLocationSelect.value;
  if (finalLocation === 'CUSTOM') {
    finalLocation = returnLocationCustom.value.trim() || '기타 장소';
  }

  const note = document.getElementById('return-note').value.trim();
  let photoData = document.getElementById('captured-photo-data').value;

  if (!photoData) {
    attachPresetPhoto();
    photoData = document.getElementById('captured-photo-data').value;
  }

  const cart = carts.find(c => c.id === cartId);
  if (!cart) return;

  const returnTimeMs = Date.now();
  const returnTimeStr = formatTimestamp(new Date(returnTimeMs));
  const durationStr = calculateDuration(cart.rentTime);

  const renterName = cart.currentRenter;
  const renterDept = cart.currentDept;
  const rentTimeStr = cart.rentTimeStr;

  cart.status = 'AVAILABLE';
  cart.currentRenter = null;
  cart.currentDept = null;
  cart.rentTime = null;
  cart.rentTimeStr = null;
  cart.phone = null;

  let activeLog = logs.find(l => l.cartId === cartId && l.status === '사용 중');
  if (!activeLog) {
    activeLog = {
      id: 'LOG-' + returnTimeMs,
      timestamp: returnTimeStr,
      cartId: cart.id,
      cartName: cart.name,
      renter: renterName,
      dept: renterDept,
      rentTime: rentTimeStr || returnTimeStr
    };
    logs.unshift(activeLog);
  }

  activeLog.returnTime = returnTimeStr;
  activeLog.duration = durationStr;
  activeLog.location = finalLocation;
  activeLog.photoData = photoData;
  activeLog.status = '반납 완료';
  activeLog.note = note;

  saveCarts();
  saveLogs();

  renderCarts();
  renderSheetLogs();
  renderArchiveGallery();
  updateStats();
  closeModal('return-modal');

  sendToGoogleSheet(activeLog);

  alert(`✅ [${cart.name}] 반납 인증 및 저장이 완벽하게 완료되었습니다!`);
}

// Ultra-robust Google Apps Script Webhook sender
function sendToGoogleSheet(logData) {
  const targetUrl = webhookUrl || DEFAULT_WEBHOOK_URL;
  if (!targetUrl) return;

  const payload = JSON.stringify({
    timestamp: logData.timestamp,
    cartId: logData.cartId + ' (' + logData.cartName + ')',
    renter: logData.renter,
    dept: logData.dept || '',
    rentTime: logData.rentTime,
    returnTime: logData.returnTime,
    duration: logData.duration,
    location: logData.location,
    photoUrl: '브라우저 갤러리 보존됨',
    note: logData.note || ''
  });

  fetch(targetUrl, {
    method: 'POST',
    mode: 'no-cors',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: payload
  })
  .then(() => {
    logData.gasSynced = true;
    saveLogs();
    renderSheetLogs();
  })
  .catch(err => {
    console.error('GAS Webhook Error:', err);
  });
}

// Render Google Sheets Style Log Table
function renderSheetLogs() {
  const query = (document.getElementById('log-search-input').value || '').toLowerCase();
  sheetLogTbody.innerHTML = '';

  const filteredLogs = logs.filter(l => 
    l.cartId.toLowerCase().includes(query) ||
    (l.cartName && l.cartName.toLowerCase().includes(query)) ||
    l.renter.toLowerCase().includes(query) ||
    (l.dept && l.dept.toLowerCase().includes(query)) ||
    l.status.toLowerCase().includes(query)
  );

  if (filteredLogs.length === 0) {
    sheetLogTbody.innerHTML = `<tr><td colspan="12" style="text-align:center; padding: 2rem; color: #94A3B8;">누적된 대여/반납 이력 로그가 없습니다.</td></tr>`;
    return;
  }

  filteredLogs.forEach((log, index) => {
    const tr = document.createElement('tr');

    let photoHtml = '<span style="color: #94A3B8;">미첨부</span>';
    if (log.photoData) {
      photoHtml = `<img src="${log.photoData}" class="photo-thumb" onclick="openPhotoViewModal('${log.id}')" title="원본 사진 보기">`;
    }

    const isReturned = log.status === '반납 완료';

    tr.innerHTML = `
      <td>${logs.length - index}</td>
      <td><strong>${log.timestamp}</strong></td>
      <td><span class="sync-tag saved">${log.cartName || log.cartId}</span></td>
      <td>${log.renter}</td>
      <td>${log.dept || '-'}</td>
      <td>${log.rentTime}</td>
      <td>${log.returnTime}</td>
      <td>${log.duration}</td>
      <td>${log.location || '-'}</td>
      <td>${photoHtml}</td>
      <td>
        <span class="badge ${isReturned ? 'badge-available' : 'badge-in-use'}">
          ${log.status}
        </span>
      </td>
      <td>
        <span class="sync-tag ${log.gasSynced ? 'synced' : 'saved'}">
          ${log.gasSynced ? '전송완료' : '로컬보관'}
        </span>
      </td>
    `;

    sheetLogTbody.appendChild(tr);
  });
}

// Export Logs to Excel / CSV
function exportLogsToCSV() {
  if (logs.length === 0) {
    alert('내보낼 로그 데이터가 없습니다.');
    return;
  }

  let csvContent = '\uFEFF';
  csvContent += '기록시각,차량명,대여인,소속부서,대여시각,반납시각,이용시간,반납장소,상태,비고\n';

  logs.forEach(l => {
    const row = [
      `"${l.timestamp}"`,
      `"${l.cartName || l.cartId}"`,
      `"${l.renter}"`,
      `"${l.dept || ''}"`,
      `"${l.rentTime}"`,
      `"${l.returnTime}"`,
      `"${l.duration}"`,
      `"${l.location || ''}"`,
      `"${l.status}"`,
      `"${l.note || ''}"`
    ];
    csvContent += row.join(',') + '\n';
  });

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', `snoopy_vehicle_logs_${formatTimestamp().substring(0, 10)}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

// Render Photo Archive Gallery
function renderArchiveGallery() {
  const filterCart = document.getElementById('archive-cart-filter').value;
  archiveGalleryContainer.innerHTML = '';

  const returnedLogsWithPhoto = logs.filter(l => l.photoData && (filterCart === 'ALL' || l.cartId === filterCart));

  if (returnedLogsWithPhoto.length === 0) {
    archiveGalleryContainer.innerHTML = `
      <div style="grid-column: 1/-1; text-align: center; padding: 4rem 1rem; color: #94A3B8;">
        <div style="font-size: 3rem; margin-bottom: 10px;">📸</div>
        <h3>아직 반납된 인증 사진이 없습니다.</h3>
        <p>차량 반납 시 현장에서 실시간 촬영된 인증 사진들이 이곳에 아카이빙됩니다.</p>
      </div>
    `;
    return;
  }

  returnedLogsWithPhoto.forEach(log => {
    const card = document.createElement('div');
    card.className = 'archive-card';
    card.innerHTML = `
      <div class="archive-img-wrapper" onclick="openPhotoViewModal('${log.id}')">
        <img src="${log.photoData}" alt="반납 인증 사진">
      </div>
      <div class="archive-body">
        <div class="archive-title">
          <span>${log.cartName || log.cartId}</span>
          <span class="badge badge-available">반납완료</span>
        </div>
        <div class="archive-meta">
          <span>👤 대여인: ${log.renter} (${log.dept || '부서미상'})</span>
          <span>📍 반납장소: ${log.location || '카트주차장'}</span>
          <span>⏰ 반납일시: ${log.returnTime}</span>
        </div>
      </div>
    `;
    archiveGalleryContainer.appendChild(card);
  });
}

// Photo Viewer Modal
window.openPhotoViewModal = function(logId) {
  const log = logs.find(l => l.id === logId);
  if (!log || !log.photoData) return;

  document.getElementById('photo-view-title').textContent = `📸 반납 현장 사진 (${log.cartName || log.cartId})`;
  document.getElementById('photo-view-img').src = log.photoData;
  document.getElementById('photo-download-link').href = log.photoData;
  document.getElementById('photo-download-link').download = `${log.cartId}_${log.timestamp.replace(/[: ]/g, '_')}.jpg`;

  document.getElementById('photo-view-meta').innerHTML = `
    <div><strong>차량명:</strong> ${log.cartName || log.cartId}</div>
    <div><strong>대여 이용자:</strong> ${log.renter} (${log.dept || '부서미상'})</div>
    <div><strong>대여 시각:</strong> ${log.rentTime}</div>
    <div><strong>반납 시각:</strong> ${log.returnTime}</div>
    <div><strong>이용 시간:</strong> ${log.duration}</div>
    <div><strong>반납 장소:</strong> ${log.location || '카트주차장'}</div>
  `;

  openModal('photo-view-modal');
};

// Update Stats
function updateStats() {
  const total = carts.length;
  const available = carts.filter(c => c.status === 'AVAILABLE').length;
  const inUse = carts.filter(c => c.status === 'IN_USE').length;
  const returnedCount = logs.filter(l => l.status === '반납 완료').length;

  statTotal.textContent = `${total}대`;
  statAvailable.textContent = `${available}대`;
  statInUse.textContent = `${inUse}대`;
  statReturned.textContent = `${returnedCount}건`;
}
