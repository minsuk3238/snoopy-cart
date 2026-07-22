/**
 * Snoopy Garden Smart Vehicle & Cart Rental System - Full Sync Logs & Archive Gallery (app.js)
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

// Official Active Admin Webhook & Sheet Links
const DEFAULT_WEBHOOK_URL = 'https://script.google.com/macros/s/AKfycby0_9mhc_CYTJ3j34eWSJNb1691AUcJEw7C_FJXd788FfBfuV0lDBfMKHZTtcN4b53L/exec';
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

let isAdminAuthenticated = false;

// Password Verification Helper (Cached for current session)
function checkAdminPassword(actionName = '관리자 메뉴') {
  if (isAdminAuthenticated) {
    return true;
  }
  const input = prompt(`🔒 [${actionName}] 접근 권한 확인\n관리자 비밀번호 4자리를 입력하세요:`);
  if (input === MASTER_ADMIN_PASSWORD) {
    isAdminAuthenticated = true;
    updateAdminToggleUI();
    return true;
  } else if (input === null) {
    return false;
  } else {
    alert('❌ 비밀번호가 올바르지 않습니다.');
    return false;
  }
}

// Toggle Admin Mode Status and visibility of features
function toggleAdminMode() {
  if (isAdminAuthenticated) {
    isAdminAuthenticated = false;
    updateAdminToggleUI();
    // Redirect user to dashboard tab if they were inside locked admin tabs
    const activeTabBtn = document.querySelector('.nav-btn.active');
    if (activeTabBtn && activeTabBtn.getAttribute('data-tab') !== 'dashboard-tab') {
      const dashboardBtn = document.querySelector('.nav-btn[data-tab="dashboard-tab"]');
      if (dashboardBtn) dashboardBtn.click();
    }
    alert('🔒 관리자 모드가 안전하게 로그아웃되었습니다.');
  } else {
    const input = prompt('🔑 관리자 비밀번호 4자리를 입력하세요:');
    if (input === MASTER_ADMIN_PASSWORD) {
      isAdminAuthenticated = true;
      updateAdminToggleUI();
      alert('🔓 관리자 인증 성공! 전체 관리용 탭 및 버튼이 모두 노출되었습니다.');
    } else if (input !== null) {
      alert('❌ 비밀번호가 올바르지 않습니다.');
    }
  }
}

// Update Admin Toggle Buttons GUI
function updateAdminToggleUI() {
  const toggleBtn = document.getElementById('admin-mode-toggle-btn');
  const toggleMobileBtn = document.getElementById('admin-mode-toggle-mobile-btn');
  
  if (isAdminAuthenticated) {
    if (toggleBtn) {
      toggleBtn.innerHTML = '<span class="icon">🔓</span> 로그아웃';
      toggleBtn.style.background = 'rgba(16, 185, 129, 0.15)';
      toggleBtn.style.color = '#10B981';
      toggleBtn.style.borderColor = 'rgba(16, 185, 129, 0.3)';
    }
    if (toggleMobileBtn) {
      toggleMobileBtn.innerHTML = '<span class="icon">🔓</span> 로그아웃';
      toggleMobileBtn.style.background = 'rgba(16, 185, 129, 0.2)';
      toggleMobileBtn.style.color = '#34D399';
    }
    document.body.classList.add('admin-mode-active');
  } else {
    if (toggleBtn) {
      toggleBtn.innerHTML = '<span class="icon">🔒</span> 관리자 모드';
      toggleBtn.style.background = 'rgba(239, 68, 68, 0.15)';
      toggleBtn.style.color = '#F87171';
      toggleBtn.style.borderColor = 'rgba(239, 68, 68, 0.3)';
    }
    if (toggleMobileBtn) {
      toggleMobileBtn.innerHTML = '<span class="icon">🔒</span> 관리자';
      toggleMobileBtn.style.background = 'rgba(239, 68, 68, 0.2)';
      toggleMobileBtn.style.color = '#F87171';
    }
    document.body.classList.remove('admin-mode-active');
  }
}

// Initialize App
document.addEventListener('DOMContentLoaded', () => {
  loadStorageData();
  setupNavigation();
  setupEventListeners();
  updateProfileUI();
  updateAdminToggleUI(); // Render the initial admin toggle UI state (locked)
  renderCarts();
  renderSheetLogs();
  renderArchiveGallery();
  updateStats();
  startTimerLoop();
  startCloudSyncLoop();
});

// Load persistent data & sync vehicle list with latest Webhook URL
function loadStorageData() {
  const savedCarts = localStorage.getItem('snoopy_carts_v5');
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

  // Force updated Webhook URL
  webhookUrl = DEFAULT_WEBHOOK_URL;
  localStorage.setItem('snoopy_webhook_url', DEFAULT_WEBHOOK_URL);

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
  localStorage.setItem('snoopy_carts_v5', JSON.stringify(carts));
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
    bannerText.textContent = `구글 시트 연동 활성화됨 (전체 이력 및 사진 아카이브 동기화 구동 중)`;
  } else {
    bannerStatusIndicator.className = 'status-indicator offline';
    bannerText.textContent = '구글 시트 연동이 설정되지 않았습니다.';
  }
}

// Navigation Tabs
function setupNavigation() {
  const navBtns = document.querySelectorAll('.nav-btn[data-tab]');
  navBtns.forEach(btn => {
    btn.addEventListener('click', (e) => {
      const targetTab = btn.getAttribute('data-tab');
      if (targetTab !== 'dashboard-tab') {
        if (!checkAdminPassword('관리자 메뉴')) {
          e.preventDefault();
          return;
        }
      }
      navBtns.forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.tab-content').forEach(tc => tc.classList.remove('active'));

      btn.classList.add('active');
      document.getElementById(targetTab).classList.add('active');
    });
  });
}

// Global Event Listeners
function setupEventListeners() {
  document.getElementById('open-settings-btn').addEventListener('click', () => {
    if (checkAdminPassword('연동 설정')) openModal('settings-modal');
  });
  document.getElementById('banner-setup-btn').addEventListener('click', () => {
    if (checkAdminPassword('연동 설정')) openModal('settings-modal');
  });
  
  const handleProfileClick = () => {
    // Initial profile registration is free. Subsequent modifications require master password 1590
    if (!userProfile.name) {
      openProfileModal();
    } else {
      if (checkAdminPassword('프로필 수정')) {
        openProfileModal();
      }
    }
  };

  document.getElementById('open-profile-btn').addEventListener('click', handleProfileClick);
  document.getElementById('quick-edit-profile-btn').addEventListener('click', handleProfileClick);

  const profileSummaryBar = document.getElementById('profile-summary-bar');
  if (profileSummaryBar) {
    profileSummaryBar.addEventListener('click', (e) => {
      if (e.target.tagName !== 'BUTTON' && !e.target.closest('button')) {
        handleProfileClick();
      }
    });
  }

  // Mobile Top Header Actions delegation
  const openProfileMobileBtn = document.getElementById('open-profile-mobile-btn');
  if (openProfileMobileBtn) {
    openProfileMobileBtn.addEventListener('click', () => {
      document.getElementById('open-profile-btn').click();
    });
  }
  const openSettingsMobileBtn = document.getElementById('open-settings-mobile-btn');
  if (openSettingsMobileBtn) {
    openSettingsMobileBtn.addEventListener('click', () => {
      document.getElementById('open-settings-btn').click();
    });
  }
  const directGoogleSheetMobileBtn = document.getElementById('direct-google-sheet-mobile-btn');
  if (directGoogleSheetMobileBtn) {
    directGoogleSheetMobileBtn.addEventListener('click', (e) => {
      if (!checkAdminPassword('구글 시트 바로가기')) {
        e.preventDefault();
      }
    });
  }

  // Admin mode toggle buttons listeners
  const adminToggleBtn = document.getElementById('admin-mode-toggle-btn');
  if (adminToggleBtn) {
    adminToggleBtn.addEventListener('click', toggleAdminMode);
  }
  const adminToggleMobileBtn = document.getElementById('admin-mode-toggle-mobile-btn');
  if (adminToggleMobileBtn) {
    adminToggleMobileBtn.addEventListener('click', toggleAdminMode);
  }

  const sheetLinks = [
    document.getElementById('direct-google-sheet-btn'),
    document.getElementById('banner-sheet-direct-link'),
    document.getElementById('sheet-tab-direct-link')
  ];
  sheetLinks.forEach(link => {
    if (link) {
      link.addEventListener('click', (e) => {
        if (!checkAdminPassword('구글 시트 바로가기')) {
          e.preventDefault();
        }
      });
    }
  });

  const systemResetBtn = document.getElementById('system-reset-btn');
  if (systemResetBtn) {
    systemResetBtn.addEventListener('click', () => {
      if (checkAdminPassword('현장 전체 초기화')) {
        resetEntireSystem();
      }
    });
  }

  document.getElementById('export-csv-btn').addEventListener('click', () => {
    if (checkAdminPassword('Excel / CSV 다운로드')) {
      exportLogsToCSV();
    }
  });

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

  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) {
      fetchCloudCartStatus(false);
    }
  });

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

  document.getElementById('profile-form').addEventListener('submit', (e) => {
    e.preventDefault();
    userProfile.name = profileNameInput.value.trim();
    userProfile.dept = profileDeptInput.value.trim();
    userProfile.phone = profilePhoneInput.value.trim();
    saveUserProfile();
    closeModal('profile-modal');
    alert('프로필 정보가 안전하게 저장되었습니다!');
  });

  document.querySelectorAll('.modal-close, .modal-cancel').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const modal = e.target.closest('.modal-overlay');
      closeModal(modal.id);
    });
  });

  document.getElementById('rent-form').addEventListener('submit', handleRentSubmit);
  document.getElementById('return-form').addEventListener('submit', handleReturnSubmit);

  const startWebcamBtn = document.getElementById('start-webcam-btn');
  if (startWebcamBtn) {
    startWebcamBtn.addEventListener('click', startWebcam);
  }
  


  const retakeBtn = document.getElementById('retake-photo-btn');
  if (retakeBtn) {
    retakeBtn.addEventListener('click', () => {
      resetPhotoPreview();
      startWebcam();
    });
  }

  document.getElementById('log-search-input').addEventListener('input', renderSheetLogs);
  document.getElementById('archive-cart-filter').addEventListener('change', renderArchiveGallery);

  document.getElementById('save-settings-btn').addEventListener('click', () => {
    webhookUrl = gasWebhookUrlInput.value.trim() || DEFAULT_WEBHOOK_URL;
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

  document.getElementById('copy-script-btn').addEventListener('click', () => {
    const code = `function doGet(e) {\n  var ss = SpreadsheetApp.openById("1Q0d3NiDLLI7foZELqT0fZwDAcyjP2oIQITpfsu9NEXc");\n  var sheet = ss.getActiveSheet();\n  \n  if (e && e.parameter && e.parameter.action === "getStatus") {\n    var data = sheet.getDataRange().getValues();\n    var callback = e.parameter.callback;\n    if (callback) {\n      return ContentService.createTextOutput(callback + "(" + JSON.stringify(data) + ");")\n        .setMimeType(ContentService.MimeType.JAVASCRIPT);\n    }\n    return ContentService.createTextOutput(JSON.stringify(data))\n      .setMimeType(ContentService.MimeType.JSON);\n  }\n  \n  return ContentService.createTextOutput("✅ 스누피가든 스마트 차량 대여 웹훅 서비스가 정상 구동 중입니다.")\n    .setMimeType(ContentService.MimeType.TEXT);\n}\n\nfunction doPost(e) {\n  try {\n    var ss = SpreadsheetApp.openById("1Q0d3NiDLLI7foZELqT0fZwDAcyjP2oIQITpfsu9NEXc");\n    var sheet = ss.getActiveSheet();\n    var data = {};\n    if (e && e.postData && e.postData.contents) {\n      try {\n        data = JSON.parse(e.postData.contents);\n      } catch (err) {\n        data = e.parameter || {};\n      }\n    } else if (e && e.parameter) {\n      data = e.parameter;\n    }\n    \n    var photoUrlText = data.photoUrl || "사진 보존됨";\n    if (photoUrlText && photoUrlText.indexOf("data:image/") === 0) {\n      photoUrlText = saveBase64ImageToDrive(photoUrlText, data.renter || "이용자", data.cartId || "차량");\n    }\n    \n    sheet.appendRow([\n      data.timestamp || new Date().toLocaleString(),\n      data.cartId || "차량",\n      data.renter || "이용자",\n      data.dept || "",\n      data.rentTime || "",\n      data.returnTime || "",\n      data.duration || "",\n      data.location || "",\n      photoUrlText,\n      data.note || ""\n    ]);\n    return ContentService.createTextOutput(JSON.stringify({"result": "success", "driveUrl": photoUrlText}))\n      .setMimeType(ContentService.MimeType.JSON);\n  } catch (gErr) {\n    return ContentService.createTextOutput(JSON.stringify({"result": "error", "message": gErr.toString()}))\n      .setMimeType(ContentService.MimeType.JSON);\n  }\n}\n\nfunction saveBase64ImageToDrive(base64Str, renterName, cartId) {\n  try {\n    var parts = base64Str.split(",");\n    var contentType = parts[0].split(":")[1].split(";")[0];\n    var decoded = Utilities.base64Decode(parts[1]);\n    var fileName = cartId.replace(/[^a-zA-Z0-9ㄱ-ㅎㅏ-ㅣ가-힣]/g, "_") + "_" + renterName + "_" + Utilities.formatDate(new Date(), "GMT+9", "yyyyMMdd_HHmmss") + ".jpg";\n    var blob = Utilities.newBlob(decoded, contentType, fileName);\n    var folderName = "스누피가든 반납인증사진";\n    var folders = DriveApp.getFoldersByName(folderName);\n    var folder;\n    if (folders.hasNext()) {\n      folder = folders.next();\n    } else {\n      folder = DriveApp.createFolder(folderName);\n    }\n    var file = folder.createFile(blob);\n    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);\n    return file.getUrl();\n  } catch (e) {\n    return "구글 드라이브 저장 실패: " + e.toString();\n  }\n}`;
    navigator.clipboard.writeText(code);
    alert('구글 드라이브 업로더가 내장된 최신 웹훅 스크립트 코드가 클립보드에 복사되었습니다!');
  });
}

function resetEntireSystem() {
  carts = JSON.parse(JSON.stringify(INITIAL_CARTS));
  logs = [];
  localStorage.setItem('snoopy_carts_v5', JSON.stringify(carts));
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
  }, 3000);
}

// Ultra Robust Helper for matching raw Cart/Bus names from Google Sheet
function matchCartId(rawName) {
  const s = String(rawName || '').toUpperCase();
  if (s.includes('1호') || s.includes('CART-01')) return 'CART-01';
  if (s.includes('3호') || s.includes('CART-03')) return 'CART-03';
  if (s.includes('라보') || s.includes('LABO')) return 'LABO-01';
  if (s.includes('스누피') || s.includes('SNOOPY')) return 'BUS-SNOOPY';
  if (s.includes('벨') || s.includes('BELLE')) return 'BUS-BELLE';
  return null;
}

// Convert Google Drive view URL to direct embed image URL for <img> tags
function getGoogleDriveDirectImageUrl(url) {
  if (!url) return '';
  if (url.includes('drive.google.com/file/d/')) {
    const parts = url.split('drive.google.com/file/d/');
    if (parts.length > 1) {
      const fileId = parts[1].split('/')[0];
      return `https://drive.google.com/uc?export=view&id=${fileId}`;
    }
  }
  return url;
}

// Preset Photo Creator for Cloud Synced Logs
function createPresetReturnPhoto(cartName, renter, returnTime) {
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
  ctx.fillText(`차량: ${cartName || '스마트 차량'}`, 50, 95);
  ctx.fillText(`대여인: ${renter || '이용자'}`, 50, 120);
  ctx.fillText(`반납일시: ${returnTime || '상세시각 보존됨'}`, 50, 145);

  return canvas.toDataURL('image/jpeg', 0.85);
}

// Ultra Mobile Safari / Chrome Friendly JSONP & Fetch Cloud Sync (Reconstructs Logs & Archive!)
function fetchCloudCartStatus(showToast = false) {
  const targetUrl = DEFAULT_WEBHOOK_URL;
  if (!targetUrl) return;

  const callbackName = 'gasCallback_' + Date.now();
  let scriptTag = null;

  const processRows = (rows) => {
    if (!Array.isArray(rows) || rows.length <= 1) return;

    const cloudStatusMap = {};
    const parseSummary = [];
    const cloudLogs = [];

    for (let i = rows.length - 1; i >= 1; i--) {
      const r = rows[i];
      if (!r || r.length < 2) continue;

      const timestampStr = String(r[0] || '');
      const rawCartName = String(r[1] || '');
      const renter = String(r[2] || '');
      const dept = String(r[3] || '');
      const rentTimeStr = String(r[4] || '');
      const returnTimeStr = String(r[5] || '');
      const duration = String(r[6] || '');
      const location = String(r[7] || '');
      const photoText = String(r[8] || '');
      const note = String(r[9] || '');

      const matchedCartId = matchCartId(rawCartName);
      const isCurrentlyInUse = returnTimeStr.includes('대여 중') || returnTimeStr === '' || returnTimeStr === '-';

      if (matchedCartId && !cloudStatusMap[matchedCartId]) {
        cloudStatusMap[matchedCartId] = {
          inUse: isCurrentlyInUse,
          renter: renter,
          dept: dept,
          rentTimeStr: rentTimeStr
        };
        parseSummary.push(`${matchedCartId}: ${isCurrentlyInUse ? '대여중(' + renter + ')' : '대기중'}`);
      }

      // Reconstruct Log Entry for Table & Archive Gallery on ALL devices!
      const isReturned = !isCurrentlyInUse;
      
      // Use photoText if it contains base64 image data or Google Drive URL, otherwise fallback to preset template
      let resolvedPhotoData = null;
      if (isReturned) {
        if (photoText.startsWith('data:image/')) {
          resolvedPhotoData = photoText;
        } else if (photoText.includes('drive.google.com/')) {
          resolvedPhotoData = getGoogleDriveDirectImageUrl(photoText);
        } else {
          resolvedPhotoData = createPresetReturnPhoto(rawCartName, renter, returnTimeStr);
        }
      }

      cloudLogs.push({
        id: 'GAS-' + i + '-' + timestampStr,
        timestamp: timestampStr,
        cartId: matchedCartId || rawCartName,
        cartName: rawCartName,
        renter: renter,
        dept: dept,
        rentTime: rentTimeStr,
        returnTime: returnTimeStr || (isCurrentlyInUse ? '대여 중...' : '-'),
        duration: duration || (isCurrentlyInUse ? '사용 중' : '-'),
        location: location || '-',
        photoData: resolvedPhotoData,
        status: isCurrentlyInUse ? '사용 중' : '반납 완료',
        note: note,
        gasSynced: true
      });
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

    // Merge & update logs dynamically across all devices
    if (cloudLogs.length > 0) {
      cloudLogs.forEach(cLog => {
        // Find existing local log by timestamp and cartId to preserve actual user-captured photos
        const localMatch = logs.find(l => l.timestamp === cLog.timestamp && l.cartId === cLog.cartId);
        if (localMatch && localMatch.photoData) {
          cLog.photoData = localMatch.photoData; // Preserve original local high-quality webcam photo
        }
      });
      logs = cloudLogs;
      saveLogs();
      renderSheetLogs();
      renderArchiveGallery();
    }

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
  };

  window[callbackName] = function(rows) {
    delete window[callbackName];
    if (scriptTag && scriptTag.parentNode) scriptTag.parentNode.removeChild(scriptTag);
    processRows(rows);
  };

  scriptTag = document.createElement('script');
  scriptTag.src = `${targetUrl}?action=getStatus&callback=${callbackName}`;
  scriptTag.onerror = function() {
    delete window[callbackName];
    if (scriptTag && scriptTag.parentNode) scriptTag.parentNode.removeChild(scriptTag);
    
    fetch(`${targetUrl}?action=getStatus`)
      .then(res => res.text())
      .then(text => {
        try {
          const rows = JSON.parse(text);
          processRows(rows);
        } catch (e) {
          if (showToast) alert('구글 앱스 스크립트 업데이트가 필요합니다.');
        }
      })
      .catch(err => {
        if (showToast) alert('모바일 통신 연결 상태를 확인해 주세요.');
      });
  };

  document.head.appendChild(scriptTag);
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

// Rent Modal Logic
window.openRentModal = function(cartId) {
  const cart = carts.find(c => c.id === cartId);
  if (!cart) return;

  if (cart.status === 'IN_USE') {
    alert(`⚠️ [${cart.name}]은(는) 이미 ${cart.currentRenter || '다른 이용자'}님이 대여 중입니다.`);
    return;
  }

  document.getElementById('rent-cart-id').value = cartId;
  document.getElementById('rent-modal-title').textContent = `${cart.icon || '🚗'} ${cart.name} 대여하기`;

  const autoNotice = document.getElementById('auto-filled-notice');
  const renterNameInput = document.getElementById('renter-name');
  const renterDeptInput = document.getElementById('renter-dept');
  const renterPhoneInput = document.getElementById('renter-phone');

  if (userProfile.name) {
    renterNameInput.value = userProfile.name;
    renterDeptInput.value = userProfile.dept || '';
    renterPhoneInput.value = userProfile.phone || '';
    
    // Set to read-only so users cannot type a different name manually during checkout
    renterNameInput.readOnly = true;
    renterDeptInput.readOnly = true;
    renterPhoneInput.readOnly = true;
    
    // Styling overrides for visual indicator
    renterNameInput.style.backgroundColor = '#E2E8F0';
    renterDeptInput.style.backgroundColor = '#E2E8F0';
    renterPhoneInput.style.backgroundColor = '#E2E8F0';
    renterNameInput.style.cursor = 'not-allowed';
    renterDeptInput.style.cursor = 'not-allowed';
    renterPhoneInput.style.cursor = 'not-allowed';

    autoNotice.style.display = 'block';
    autoNotice.textContent = '✨ 프로필 정보로 자동 잠금 입력되었습니다. (변경 시 관리자 확인 필요)';
  } else {
    renterNameInput.value = '';
    renterDeptInput.value = '';
    renterPhoneInput.value = '';
    
    // Make editable for initial registration on checkout
    renterNameInput.readOnly = false;
    renterDeptInput.readOnly = false;
    renterPhoneInput.readOnly = false;
    
    renterNameInput.style.backgroundColor = '';
    renterDeptInput.style.backgroundColor = '';
    renterPhoneInput.style.backgroundColor = '';
    renterNameInput.style.cursor = '';
    renterDeptInput.style.cursor = '';
    renterPhoneInput.style.cursor = '';

    autoNotice.style.display = 'none';
  }

  document.getElementById('rent-note').value = '';
  
  openModal('rent-modal');
};

// 100% Guaranteed Unblocked Mobile Rent Handler
function handleRentSubmit(e) {
  e.preventDefault();
  const cartId = document.getElementById('rent-cart-id').value;
  const renterName = document.getElementById('renter-name').value.trim();
  const renterDept = document.getElementById('renter-dept').value.trim();
  const renterPhone = document.getElementById('renter-phone').value.trim();
  const rentNote = document.getElementById('rent-note').value.trim();

  const cart = carts.find(c => c.id === cartId);
  if (!cart) return;

  const submitBtn = e.target.querySelector('button[type="submit"]');
  const originalText = submitBtn.textContent;
  submitBtn.disabled = true;
  submitBtn.textContent = '⏳ 대여 등록 처리 중...';

  const nowMs = Date.now();
  const rentTimeStr = formatTimestamp(new Date(nowMs));

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

  if (!userProfile.name) {
    userProfile.name = renterName;
    userProfile.dept = renterDept;
    userProfile.phone = renterPhone;
    saveUserProfile();
  }

  cart.status = 'IN_USE';
  cart.currentRenter = renterName;
  cart.currentDept = renterDept;
  cart.phone = renterPhone;
  cart.rentTime = nowMs;
  cart.rentTimeStr = rentTimeStr;

  logs.unshift(logEntry);
  saveCarts();
  saveLogs();

  renderCarts();
  renderSheetLogs();
  updateStats();
  closeModal('rent-modal');

  submitBtn.disabled = false;
  submitBtn.textContent = originalText;

  // Background Async Send to Google Sheet
  sendToGoogleSheet(logEntry);

  alert(`🚀 [${cart.name}] 대여 등록이 완벽하게 완료되었습니다!`);
}

// Return Modal Logic
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

function resetPhotoPreview() {
  document.getElementById('webcam-preview').classList.add('hidden');
  document.getElementById('photo-canvas').classList.add('hidden');
  document.getElementById('photo-preview-img').classList.add('hidden');
  
  const placeholder = document.getElementById('camera-placeholder');
  if (placeholder) {
    placeholder.classList.remove('hidden');
    document.getElementById('placeholder-status-text').textContent = '카메라가 시작되는 중...';
  }
  
  const retakeBtn = document.getElementById('retake-photo-btn');
  if (retakeBtn) retakeBtn.classList.add('hidden');

  const startBtn = document.getElementById('start-webcam-btn');
  if (startBtn) startBtn.classList.add('hidden');

  document.getElementById('captured-photo-data').value = '';
}

function startWebcam() {
  const video = document.getElementById('webcam-preview');
  resetPhotoPreview();

  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    document.getElementById('camera-placeholder').classList.remove('hidden');
    document.getElementById('placeholder-status-text').textContent = '⚠️ 이 브라우저는 카메라를 지원하지 않습니다. 아래 [사진 업로드] 버튼을 이용해 주세요.';
    const startBtn = document.getElementById('start-webcam-btn');
    if (startBtn) startBtn.classList.add('hidden');
    return;
  }

  navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })
    .then(stream => {
      activeWebcamStream = stream;
      video.srcObject = stream;
      video.classList.remove('hidden');
      document.getElementById('camera-placeholder').classList.add('hidden');
      const startBtn = document.getElementById('start-webcam-btn');
      if (startBtn) startBtn.classList.add('hidden');
    })
    .catch(err => {
      console.warn('Camera access error:', err);
      document.getElementById('camera-placeholder').classList.remove('hidden');
      document.getElementById('placeholder-status-text').textContent = '⚠️ 카메라를 시작하지 못했습니다. 아래 [사진 업로드] 버튼으로 현장 사진을 업로드해 주세요.';
      const startBtn = document.getElementById('start-webcam-btn');
      if (startBtn) startBtn.classList.remove('hidden');
    });
}

function stopWebcam() {
  if (activeWebcamStream) {
    activeWebcamStream.getTracks().forEach(track => track.stop());
    activeWebcamStream = null;
  }
}

function setCapturedPhoto(dataUrl) {
  stopWebcam();
  document.getElementById('webcam-preview').classList.add('hidden');
  document.getElementById('camera-placeholder').classList.add('hidden');

  const img = document.getElementById('photo-preview-img');
  img.src = dataUrl;
  img.classList.remove('hidden');

  const retakeBtn = document.getElementById('retake-photo-btn');
  if (retakeBtn) retakeBtn.classList.remove('hidden');

  document.getElementById('captured-photo-data').value = dataUrl;
}

// Return Handler
function handleReturnSubmit(e) {
  e.preventDefault();
  const cartId = document.getElementById('return-cart-id').value;
  
  let finalLocation = returnLocationSelect.value;
  if (finalLocation === 'CUSTOM') {
    finalLocation = returnLocationCustom.value.trim() || '기타 장소';
  }

  const note = document.getElementById('return-note').value.trim();
  let photoData = document.getElementById('captured-photo-data').value;

  const submitBtn = e.target.querySelector('button[type="submit"]');
  const originalText = submitBtn.textContent;
  submitBtn.disabled = true;
  submitBtn.textContent = '⏳ 반납 등록 처리 중...';

  // 📸 Capture Frame instantly if webcam is active on submit click!
  if (!photoData && activeWebcamStream) {
    try {
      const video = document.getElementById('webcam-preview');
      const canvas = document.getElementById('photo-canvas');
      const context = canvas.getContext('2d');

      canvas.width = video.videoWidth || 640;
      canvas.height = video.videoHeight || 480;
      context.drawImage(video, 0, 0, canvas.width, canvas.height);

      photoData = canvas.toDataURL('image/jpeg', 0.85);
      setCapturedPhoto(photoData);
    } catch (err) {
      console.error('Instant frame capture failed:', err);
    }
  }

  // Strictly block submission if photo is missing!
  if (!photoData) {
    alert('⚠️ [반납 오류] 현장 인증 사진 촬영이 필수입니다!\n카메라 화면을 보며 반납을 완료하거나, [사진 업로드] 버튼으로 직접 찍은 사진 파일을 첨부해 주세요.');
    submitBtn.disabled = false;
    submitBtn.textContent = originalText;
    return;
  }

  const cart = carts.find(c => c.id === cartId);
  if (!cart) return;

  const returnTimeMs = Date.now();
  const returnTimeStr = formatTimestamp(new Date(returnTimeMs));
  const durationStr = calculateDuration(cart.rentTime);

  const renterName = cart.currentRenter;
  const renterDept = cart.currentDept;
  const rentTimeStr = cart.rentTimeStr;

  // Find the exact local log record to append the high-quality captured photo data
  let activeLog = logs.find(l => l.cartId === cartId && (l.status === '사용 중' || l.returnTime === '대여 중...'));
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
  activeLog.photoData = photoData; // Store the actual high-quality webcam/fallback photo securely
  activeLog.status = '반납 완료';
  activeLog.note = note;

  cart.status = 'AVAILABLE';
  cart.currentRenter = null;
  cart.currentDept = null;
  cart.rentTime = null;
  cart.rentTimeStr = null;
  cart.phone = null;

  saveCarts();
  saveLogs();

  renderCarts();
  renderSheetLogs();
  renderArchiveGallery();
  updateStats();
  closeModal('return-modal');

  submitBtn.disabled = false;
  submitBtn.textContent = originalText;

  sendToGoogleSheet(activeLog);

  alert(`✅ [${cart.name}] 반납 처리 완료! 구글 시트로 백그라운드 전송됩니다.`);
}

// Helper to scale down and compress base64 webcam photos to keep under Google Sheets cell size limits (~6KB)
function getCompressedBase64(dataUrl, callback) {
  if (!dataUrl || !dataUrl.startsWith('data:image/')) {
    callback(dataUrl);
    return;
  }
  const img = new Image();
  img.onload = function() {
    const canvas = document.createElement('canvas');
    let width = img.width;
    let height = img.height;
    
    // Bounding box of max 320px
    const max_size = 320;
    if (width > height) {
      if (width > max_size) {
        height = Math.round(height * (max_size / width));
        width = max_size;
      }
    } else {
      if (height > max_size) {
        width = Math.round(width * (max_size / height));
        height = max_size;
      }
    }
    
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(img, 0, 0, width, height);
    
    // Save as compressed jpeg (quality 0.5 is extremely small and fast to sync)
    const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.5);
    callback(compressedDataUrl);
  };
  img.onerror = function() {
    callback(dataUrl);
  };
  img.src = dataUrl;
}

// Ultra-robust Google Apps Script Webhook sender with fallback
function sendToGoogleSheet(logData) {
  const targetUrl = DEFAULT_WEBHOOK_URL;
  if (!targetUrl) return;

  // Compress photo asynchronously first before posting to Google Sheet
  getCompressedBase64(logData.photoData, (compressedPhoto) => {
    const payload = JSON.stringify({
      timestamp: logData.timestamp,
      cartId: logData.cartId + ' (' + logData.cartName + ')',
      renter: logData.renter,
      dept: logData.dept || '',
      rentTime: logData.rentTime,
      returnTime: logData.returnTime,
      duration: logData.duration,
      location: logData.location,
      photoUrl: compressedPhoto || '사진 없음',
      note: logData.note || ''
    });

    try {
      fetch(targetUrl, {
        method: 'POST',
        mode: 'no-cors',
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
    } catch(e) {
      console.error('GAS POST exception:', e);
    }
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

  if (statTotal) statTotal.textContent = `${total}대`;
  if (statAvailable) statAvailable.textContent = `${available}대`;
  if (statInUse) statInUse.textContent = `${inUse}대`;
  if (statReturned) statReturned.textContent = `${returnedCount}건`;
}
