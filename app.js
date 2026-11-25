/**
 * 宿洗通 DormWash - 宿舍洗衣房即時使用看板與洗畢提醒
 * 🌟 支援 Firebase 雲端即時資料庫 (全宿舍不同手機 / 電腦 100% 跨裝置即時同步)
 * 配置：
 * - 全部機台集中於「宿舍洗衣房」
 * - 6 台洗衣機：固定 30 分鐘（半小時）
 * - 4 台烘衣機：自選 10～100 分鐘（以 10 分鐘為單位）
 * - 示範快進模式、Web Audio 提示音、桌面通知、CRUD 管理面板
 */

// Firebase 設定
const firebaseConfig = {
  apiKey: "AIzaSyCYcX32J1eVbPJFSRdrp00PdX2cddlbL7k",
  authDomain: "dorm-wash-93aa0.firebaseapp.com",
  databaseURL: "https://dorm-wash-93aa0-default-rtdb.firebaseio.com",
  projectId: "dorm-wash-93aa0",
  storageBucket: "dorm-wash-93aa0.firebasestorage.app",
  messagingSenderId: "955733127491",
  appId: "1:955733127491:web:6d0fd6967a9b69c7753ff6"
};

// 預設機台資料（6 台洗衣機 ＋ 4 台烘衣機）
const DEFAULT_MACHINES = [
  // each machine can have optional pin (string) and helper (object)

  { id: "w-1", name: "#1 洗衣機", location: "宿舍洗衣房", type: "washer", status: "idle", durationMinutes: 30, startedAt: null, endsAt: null, user: null, pin: null, helper: null },
  { id: "w-2", name: "#2 洗衣機", location: "宿舍洗衣房", type: "washer", status: "idle", durationMinutes: 30, startedAt: null, endsAt: null, user: null, pin: null, helper: null },
  { id: "w-3", name: "#3 洗衣機", location: "宿舍洗衣房", type: "washer", status: "idle", durationMinutes: 30, startedAt: null, endsAt: null, user: null, pin: null, helper: null },
  { id: "w-4", name: "#4 洗衣機", location: "宿舍洗衣房", type: "washer", status: "idle", durationMinutes: 30, startedAt: null, endsAt: null, user: null, pin: null, helper: null },
  { id: "w-5", name: "#5 洗衣機", location: "宿舍洗衣房", type: "washer", status: "idle", durationMinutes: 30, startedAt: null, endsAt: null, user: null, pin: null, helper: null },
  { id: "w-6", name: "#6 洗衣機", location: "宿舍洗衣房", type: "washer", status: "idle", durationMinutes: 30, startedAt: null, endsAt: null, user: null, pin: null, helper: null },

  { id: "d-1", name: "#1 烘衣機", location: "宿舍洗衣房", type: "dryer", status: "idle", durationMinutes: 40, startedAt: null, endsAt: null, user: null, pin: null, helper: null },
  { id: "d-2", name: "#2 烘衣機", location: "宿舍洗衣房", type: "dryer", status: "idle", durationMinutes: 40, startedAt: null, endsAt: null, user: null, pin: null, helper: null },
  { id: "d-3", name: "#3 烘衣機", location: "宿舍洗衣房", type: "dryer", status: "idle", durationMinutes: 40, startedAt: null, endsAt: null, user: null, pin: null, helper: null },
  { id: "d-4", name: "#4 烘衣機", location: "宿舍洗衣房", type: "dryer", status: "idle", durationMinutes: 40, startedAt: null, endsAt: null, user: null, pin: null, helper: null },
  { id: "w-2", name: "#2 洗衣機", location: "宿舍洗衣房", type: "washer", status: "idle", durationMinutes: 30, startedAt: null, endsAt: null, user: null },
  { id: "w-3", name: "#3 洗衣機", location: "宿舍洗衣房", type: "washer", status: "idle", durationMinutes: 30, startedAt: null, endsAt: null, user: null },
  { id: "w-4", name: "#4 洗衣機", location: "宿舍洗衣房", type: "washer", status: "idle", durationMinutes: 30, startedAt: null, endsAt: null, user: null },
  { id: "w-5", name: "#5 洗衣機", location: "宿舍洗衣房", type: "washer", status: "idle", durationMinutes: 30, startedAt: null, endsAt: null, user: null },
  { id: "w-6", name: "#6 洗衣機", location: "宿舍洗衣房", type: "washer", status: "idle", durationMinutes: 30, startedAt: null, endsAt: null, user: null },

  { id: "d-1", name: "#1 烘衣機", location: "宿舍洗衣房", type: "dryer", status: "idle", durationMinutes: 40, startedAt: null, endsAt: null, user: null },
  { id: "d-2", name: "#2 烘衣機", location: "宿舍洗衣房", type: "dryer", status: "idle", durationMinutes: 40, startedAt: null, endsAt: null, user: null },
  { id: "d-3", name: "#3 烘衣機", location: "宿舍洗衣房", type: "dryer", status: "idle", durationMinutes: 40, startedAt: null, endsAt: null, user: null },
  { id: "d-4", name: "#4 烘衣機", location: "宿舍洗衣房", type: "dryer", status: "idle", durationMinutes: 40, startedAt: null, endsAt: null, user: null }
];

const LOCAL_CACHE_KEY = "dorm_wash_firebase_cache_v1";

// 狀態管理
let state = {
  machines: JSON.parse(JSON.stringify(DEFAULT_MACHINES)),
  logs: [
    { id: "log-init", time: formatTime(new Date()), text: "系統啟動：正在連線 Firebase 雲端即時資料庫..." }
  ],
  demoMode: false,
  filterType: "all",
  activeModalMachineId: null,
  isCloudConnected: false
};

// 初始化 Firebase
let db = null;
let laundryRef = null;

try {
  if (typeof firebase !== "undefined") {
    firebase.initializeApp(firebaseConfig);
    db = firebase.database();
    laundryRef = db.ref("laundry_room");
  }
} catch (err) {
  console.error("Firebase 初始化失敗，將使用本機模式", err);
}

// 監聽 Firebase 雲端資料變更（當任何一台手機或電腦改動時，全體裝置瞬間更新）
function initCloudSync() {
  if (!laundryRef) {
    updateCloudBadge(false);
    loadFromLocalStorage();
    renderAll();
    return;
  }

  // 監聽連線狀態
  db.ref(".info/connected").on("value", (snap) => {
    state.isCloudConnected = snap.val() === true;
    updateCloudBadge(state.isCloudConnected);
  });

  // 監聽資料即時變更
  laundryRef.on("value", (snapshot) => {
    const data = snapshot.val();
    if (data && Array.isArray(data.machines)) {
      state.machines = data.machines;
      if (Array.isArray(data.logs)) state.logs = data.logs;
      if (typeof data.demoMode === "boolean") state.demoMode = data.demoMode;
      saveToLocalStorage();
      renderAll();
    } else {
      // 資料庫為空時（初次啟動），自動將預設機台寫入雲端
      saveStateToCloud();
    }
  }, (err) => {
    console.error("Firebase 讀取失敗:", err);
    updateCloudBadge(false);
  });
}

// 儲存狀態至雲端（推播給所有手機）
function saveStateToCloud() {
  saveToLocalStorage();
  if (laundryRef) {
    laundryRef.set({
      machines: state.machines,
      logs: state.logs,
      demoMode: state.demoMode,
      updatedAt: Date.now()
    }).catch(err => {
      console.error("同步至雲端失敗:", err);
    });
  }
}

// 本機離線快取
function saveToLocalStorage() {
  try {
    localStorage.setItem(LOCAL_CACHE_KEY, JSON.stringify({
      machines: state.machines,
      logs: state.logs,
      demoMode: state.demoMode
    }));
  } catch (e) {}
}

function loadFromLocalStorage() {
  try {
    const cached = localStorage.getItem(LOCAL_CACHE_KEY);
    if (cached) {
      const parsed = JSON.parse(cached);
      if (parsed.machines) state.machines = parsed.machines;
      if (parsed.logs) state.logs = parsed.logs;
      if (typeof parsed.demoMode === "boolean") state.demoMode = parsed.demoMode;
    }
  } catch (e) {}
}

function updateCloudBadge(isConnected) {
  const badge = document.getElementById("cloudSyncBadge");
  const text = document.getElementById("cloudSyncText");
  if (!badge || !text) return;

  if (isConnected) {
    text.textContent = "🟢 跨手機雲端即時連線中 (Live Sync)";
    badge.style.background = "var(--gray-100)";
    badge.style.color = "var(--gray-700)";
  } else {
    text.textContent = "⚪ 本機離線運作中 (連線重試中...)";
    badge.style.background = "#fef2f2";
    badge.style.color = "#dc2626";
  }
}

function addLog(text) {
  const newLog = {
    id: "log-" + Date.now() + "-" + Math.random().toString(36).substr(2, 4),
    time: formatTime(new Date()),
    text: text
  };
  state.logs.unshift(newLog);
  if (state.logs.length > 30) state.logs.pop();
  saveStateToCloud();
}

function formatTime(date) {
  const d = new Date(date);
  const h = String(d.getHours()).padStart(2, "0");
  const m = String(d.getMinutes()).padStart(2, "0");
  const s = String(d.getSeconds()).padStart(2, "0");
  return `${h}:${m}:${s}`;
}

/* ================= Web Audio 提示音效 ================= */
function playChime() {
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    const ctx = new AudioContext();

    const notes = [523.25, 659.25, 783.99]; // C5 -> E5 -> G5
    notes.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, ctx.currentTime + idx * 0.16);
      
      gain.gain.setValueAtTime(0, ctx.currentTime + idx * 0.16);
      gain.gain.linearRampToValueAtTime(0.22, ctx.currentTime + idx * 0.16 + 0.04);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + idx * 0.16 + 0.35);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(ctx.currentTime + idx * 0.16);
      osc.stop(ctx.currentTime + idx * 0.16 + 0.4);
    });
  } catch (err) {
    console.log("Web Audio 播放受限:", err);
  }
}

/* ================= 桌面通知 ================= */
function sendDesktopNotification(title, body) {
  if (!("Notification" in window)) return;
  if (Notification.permission === "granted") {
    new Notification(title, {
      body: body,
      icon: "data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><text y=%22.9em%22 font-size=%2290%22>🧺</text></svg>"
    });
  }
}

function requestNotificationPermission() {
  if (!("Notification" in window)) {
    alert("此瀏覽器不支援桌面通知功能。");
    return;
  }
  Notification.requestPermission().then(permission => {
    updateNotifyBtnState();
    if (permission === "granted") {
      sendDesktopNotification("宿洗通 DormWash", "通知已啟用！洗衣或烘衣結束時會在此提醒你。");
    }
  });
}

function updateNotifyBtnState() {
  const notifyBtn = document.getElementById("notifyBtn");
  const notifyBtnText = document.getElementById("notifyBtnText");
  if (!notifyBtn) return;
  
  if (!("Notification" in window)) {
    notifyBtn.style.display = "none";
    return;
  }
  
  if (Notification.permission === "granted") {
    notifyBtnText.textContent = "通知已開啟";
    notifyBtn.classList.remove("btn-outline");
    notifyBtn.classList.add("btn-ghost");
  } else {
    notifyBtnText.textContent = "開啟提醒通知";
    notifyBtn.classList.add("btn-outline");
    notifyBtn.classList.remove("btn-ghost");
  }
}

/* ================= 核心計時更新 (Timer Tick) ================= */
function timerTick() {
  const now = Date.now();
  let stateChanged = false;

  state.machines.forEach(m => {
    if (m.status === "running" && m.endsAt) {
      if (now >= m.endsAt) {
        m.status = "finished";
        stateChanged = true;
        
        playChime();
        const actionLabel = m.type === "dryer" ? "烘衣" : "洗滌";
        const userNotice = m.user ? ` (${m.user})` : "";
        const alertMsg = `${m.name}${userNotice} ${actionLabel}行程已完成！請盡速前往洗衣房取衣。`;
        sendDesktopNotification("🧺 行程結束囉！", alertMsg);
        
        // 新增日誌
        const newLog = {
          id: "log-" + Date.now() + "-" + Math.random().toString(36).substr(2, 4),
          time: formatTime(new Date()),
          text: `🔔 【洗畢提醒】${alertMsg}`
        };
        state.logs.unshift(newLog);
        if (state.logs.length > 30) state.logs.pop();
      }
    }
  });

  if (stateChanged) {
    saveStateToCloud();
  }
  renderAllCardsTimerOnly();
  updateSummaryStats();
}

// Helper function when someone assists after finish
function helpRetrieve(machineId) {
  const m = state.machines.find(item => item.id === machineId);
  if (!m) return;
  const helperName = prompt("請輸入協助者姓名 (例如：阿明)");
  if (!helperName) return;
  // Record helper info
  m.helper = { name: helperName, time: Date.now() };
  // Notify original user if possible
  if (m.user) {
    sendDesktopNotification(`🧺 ${m.name} 已取出衣服`, `${helperName} 已協助取出衣服，請盡速領取。`);
  }
  addLog(`已幫 ${helperName} 拿出衣服 (${m.name})`);
  // Reset machine to idle
  m.status = "idle";
  m.startedAt = null;
  m.endsAt = null;
  m.user = null;
  m.pin = null;
  m.helper = null;
  renderAll();
  saveStateToCloud();
}
/* ================= 畫面渲染 ================= */
function renderAll() {
  renderMachineGrid();
  updateSummaryStats();
  renderActivityLogs();
  renderAdminTable();
  updateNotifyBtnState();

  const demoSwitch = document.getElementById("demoModeSwitch");
  if (demoSwitch) demoSwitch.checked = state.demoMode;
}

function updateSummaryStats() {
  let total = state.machines.length;
  let idle = 0;
  let running = 0;
  let finished = 0;
  let maintenance = 0;

  state.machines.forEach(m => {
    if (m.status === "idle") idle++;
    else if (m.status === "running") running++;
    else if (m.status === "finished") finished++;
    else if (m.status === "maintenance") maintenance++;
  });

  const elTotal = document.getElementById("statTotal");
  const elIdle = document.getElementById("statIdle");
  const elRunning = document.getElementById("statRunning");
  const elFinished = document.getElementById("statFinished");
  const elMaint = document.getElementById("statMaintenance");

  if (elTotal) elTotal.textContent = total;
  if (elIdle) elIdle.textContent = idle;
  if (elRunning) elRunning.textContent = running;
  if (elFinished) elFinished.textContent = finished;
  if (elMaint) elMaint.textContent = maintenance;
}

function renderAllCardsTimerOnly() {
  const now = Date.now();

  state.machines.forEach(m => {
    const card = document.getElementById(`card-${m.id}`);
    if (!card) return;

    const timerCountdown = card.querySelector(".timer-countdown");
    const progressBarFill = card.querySelector(".progress-bar-fill");
    const timerSubtext = card.querySelector(".timer-subtext");

    if (m.status === "running" && m.endsAt && m.startedAt) {
      const remainingSec = Math.max(0, Math.floor((m.endsAt - now) / 1000));
      const totalSec = Math.max(1, Math.floor((m.endsAt - m.startedAt) / 1000));
      const elapsedSec = totalSec - remainingSec;
      const progressPercent = Math.min(100, Math.max(0, (elapsedSec / totalSec) * 100));

      const minutes = String(Math.floor(remainingSec / 60)).padStart(2, "0");
      const seconds = String(remainingSec % 60).padStart(2, "0");

      if (timerCountdown) timerCountdown.textContent = `${minutes}:${seconds}`;
      if (progressBarFill) progressBarFill.style.width = `${progressPercent}%`;
      if (timerSubtext) {
        const estTime = new Date(m.endsAt);
        timerSubtext.textContent = `預計 ${formatTime(estTime)} 完成`;
      }
    } else if (m.status === "idle") {
      const defaultDurationText = m.type === "dryer" ? "可選 10~100分" : "固定 30:00";
      if (timerCountdown) timerCountdown.textContent = state.demoMode ? "00:30" : defaultDurationText;
      if (progressBarFill) progressBarFill.style.width = "0%";
      if (timerSubtext) timerSubtext.textContent = m.type === "dryer" ? "目前空閒，可自訂烘衣時間" : "目前空閒，標準洗滌 30 分鐘";
    } else if (m.status === "finished") {
      badgeHTML = `<span class="status-badge badge-finished">🔔 行程結束・待取衣</span>`;
      const userLabel = m.user ? `<small style="display:block;font-size:0.75rem;color:var(--gray-600);margin-top:2px;">登記人：${escapeHTML(m.user)}</small>` : "";
      actionBtnHTML = `
        <button class="btn-action btn-finish" onclick="finishMachineUsage('${m.id}')">
          ✨ 拿完衣服・結束使用
        </button>
        <button class="btn-action btn-helper" onclick="helpRetrieve('${m.id}')">
          已幫 拿出衣服
        </button>
        ${userLabel}
      `;

      if (timerCountdown) timerCountdown.textContent = "00:00";
      if (progressBarFill) progressBarFill.style.width = "100%";
      if (timerSubtext) timerSubtext.textContent = "行程已結束，取衣後請按結束釋放";
    } else if (m.status === "maintenance") {
      if (timerCountdown) timerCountdown.textContent = "--:--";
      if (progressBarFill) progressBarFill.style.width = "0%";
      if (timerSubtext) timerSubtext.textContent = "設備維護或清潔中，暫停使用";
    }
  });
}

function renderMachineGrid() {
  const grid = document.getElementById("machineGrid");
  if (!grid) return;

  const filtered = state.machines.filter(m => {
    if (state.filterType === "all") return true;
    return m.type === state.filterType;
  });

  if (filtered.length === 0) {
    grid.innerHTML = `
      <div style="grid-column: 1 / -1; text-align: center; padding: 48px; background: white; border-radius: 12px; border: 1px dashed var(--gray-300);">
        <p style="font-size: 1.1rem; color: var(--gray-600);">📍 目前沒有符合類別的機台。</p>
        <button class="btn btn-sm btn-primary" style="margin-top: 12px;" onclick="resetTypeFilter()">顯示全部機台</button>
      </div>
    `;
    return;
  }

  grid.innerHTML = filtered.map(m => createMachineCardHTML(m)).join("");
  renderAllCardsTimerOnly();
}

function resetTypeFilter() {
  const typeFilter = document.getElementById("typeFilter");
  if (typeFilter) typeFilter.value = "all";
  state.filterType = "all";
  renderMachineGrid();
}

function createMachineCardHTML(m) {
  let statusClass = `status-${m.status}`;
  let badgeHTML = "";
  let actionBtnHTML = "";
  const isDryer = m.type === "dryer";
  const typeTag = isDryer ? "♨️ 熱風烘衣機 (10~100分)" : "🌀 省水洗衣機 (固定30分)";
  const iconGraphic = isDryer ? "♨️" : "🌀";

  if (m.status === "idle") {
    badgeHTML = `<span class="status-badge badge-idle">🟢 空閒有位</span>`;
    actionBtnHTML = `
      <button class="btn-action btn-start" onclick="openStartModal('${m.id}')">
        🚀 選取並開始使用
      </button>
    `;
  } else if (m.status === "running") {
    badgeHTML = `<span class="status-badge badge-running">🟡 運轉中</span>`;
    const userLabel = m.user ? `<small style="display:block;font-size:0.75rem;color:var(--gray-600);margin-top:2px;">使用人：${escapeHTML(m.user)}</small>` : "";
    actionBtnHTML = `
      <button class="btn-action btn-disabled" disabled>
        ⏳ 運轉中 (請待行程結束)
      </button>
      ${userLabel}
      <button class="cancel-action-link" onclick="cancelMachineRunning('${m.id}')">
        誤按重設 / 提前取消
      </button>
    `;
  } else if (m.status === "finished") {
    badgeHTML = `<span class="status-badge badge-finished">🔔 行程結束・待取衣</span>`;
    const userLabel = m.user ? `<small style="display:block;font-size:0.75rem;color:var(--gray-600);margin-top:2px;">登記人：${escapeHTML(m.user)}</small>` : "";
    actionBtnHTML = `
      <button class="btn-action btn-finish" onclick="finishMachineUsage('${m.id}')">
        ✨ 拿完衣服・結束使用
      </button>
      ${userLabel}
    `;
  } else if (m.status === "maintenance") {
    badgeHTML = `<span class="status-badge badge-maintenance">🔧 故障維修中</span>`;
    actionBtnHTML = `
      <button class="btn-action btn-disabled" disabled>
        ⛔ 維修暫停服務
      </button>
    `;
  }

  return `
    <article class="machine-card ${statusClass}" id="card-${m.id}">
      <div class="machine-card-header">
        <div class="machine-meta">
          <h3>${escapeHTML(m.name)}</h3>
          <span class="machine-location">📍 宿舍洗衣房・${typeTag}</span>
        </div>
        ${badgeHTML}
      </div>

      <div class="machine-visual-wrap">
        <div class="washing-machine-body ${isDryer ? 'dryer-body' : ''}">
          <div class="machine-top-panel">
            <div class="panel-led"></div>
            <div class="panel-dial"></div>
          </div>
          <div class="washing-drum ${isDryer ? 'dryer-drum' : ''}">
            <span class="drum-inner-icon">${iconGraphic}</span>
          </div>
        </div>
      </div>

      <div class="timer-container">
        <div class="timer-countdown">載入中</div>
        <div class="progress-bar-container">
          <div class="progress-bar-fill" style="width: 0%"></div>
        </div>
        <div class="timer-subtext">載入狀態中...</div>
      </div>

      <div class="machine-card-footer">
        ${actionBtnHTML}
      </div>
    </article>
  `;
}

function renderActivityLogs() {
  const list = document.getElementById("activityLogList");
  if (!list) return;

  if (state.logs.length === 0) {
    list.innerHTML = `<li style="text-align: center; color: var(--gray-500); padding: 12px;">尚無動態紀錄</li>`;
    return;
  }

  list.innerHTML = state.logs.map(log => `
    <li class="activity-log-item">
      <span>${escapeHTML(log.text)}</span>
      <span class="log-time">${log.time}</span>
    </li>
  `).join("");
}

function renderAdminTable() {
  const tbody = document.getElementById("adminTableBody");
  if (!tbody) return;

  tbody.innerHTML = state.machines.map(m => {
    let statusText = "🟢 空閒";
    if (m.status === "running") statusText = "🟡 運轉中";
    else if (m.status === "finished") statusText = "🔔 待取衣";
    else if (m.status === "maintenance") statusText = "🔧 維修中";

    const isMaint = m.status === "maintenance";
    const toggleMaintBtnText = isMaint ? "恢復正常" : "標記維修";
    const toggleMaintBtnClass = isMaint ? "btn-primary" : "btn-outline";

    return `
      <tr>
        <td><strong>${escapeHTML(m.name)}</strong></td>
        <td>宿舍洗衣房</td>
        <td>${m.type === "dryer" ? "♨️ 烘衣機" : "🌀 洗衣機"}</td>
        <td>${statusText}</td>
        <td>
          <button class="btn btn-sm ${toggleMaintBtnClass}" onclick="toggleMachineMaintenance('${m.id}')">
            ${toggleMaintBtnText}
          </button>
        </td>
        <td>
          <button class="btn btn-sm btn-outline-danger" onclick="deleteMachine('${m.id}')" title="刪除機台">
            🗑️ 刪除
          </button>
        </td>
      </tr>
    `;
  }).join("");
}

function escapeHTML(str) {
  if (!str) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

/* ================= 使用者操作事件 ================= */

window.openStartModal = function(machineId) {
  const m = state.machines.find(item => item.id === machineId);
  if (!m) return;
  state.activeModalMachineId = machineId;

  const modal = document.getElementById("startModal");
  const modalMachineName = document.getElementById("modalMachineName");
  const demoNoticeBox = document.getElementById("demoNoticeBox");
  const userNameInput = document.getElementById("userNameInput");
  const cycleSelect = document.getElementById("cycleSelect");
  const cycleLabel = document.getElementById("cycleLabel");

  if (modalMachineName) modalMachineName.textContent = m.name;
  if (userNameInput) userNameInput.value = "";
  if (demoNoticeBox) demoNoticeBox.style.display = state.demoMode ? "block" : "none";

  if (cycleSelect && cycleLabel) {
    if (m.type === "washer") {
      cycleLabel.textContent = "洗滌行程時間 (固定半小時)：";
      cycleSelect.innerHTML = `<option value="30" selected>標準洗滌 (30 分鐘)</option>`;
      cycleSelect.disabled = true;
    } else {
      cycleLabel.textContent = "烘衣時間選擇 (10～100 分鐘)：";
      cycleSelect.disabled = false;
      let optionsHTML = "";
      for (let min = 10; min <= 100; min += 10) {
        const isDefault = min === 40 ? "selected" : "";
        optionsHTML += `<option value="${min}" ${isDefault}>熱風烘衣 ${min} 分鐘</option>`;
      }
      cycleSelect.innerHTML = optionsHTML;
    }
  }

  if (modal) modal.classList.remove("hidden");
};

function closeStartModal() {
  const modal = document.getElementById("startModal");
  if (modal) modal.classList.add("hidden");
  state.activeModalMachineId = null;
}

function confirmStartMachine() {
  const machineId = state.activeModalMachineId;
  const m = state.machines.find(item => item.id === machineId);
  if (!m) return;

  const userNameInput = document.getElementById("userNameInput");
  const cycleSelect = document.getElementById("cycleSelect");
  const pinInput = document.getElementById("pinInput");
  const pin = pinInput ? pinInput.value.trim() : "";
  // store pin if provided
  m.pin = pin || null;
  const cycleMinutes = cycleSelect ? parseInt(cycleSelect.value, 10) : (m.type === "washer" ? 30 : 40);

  const now = Date.now();
  const durationSec = state.demoMode ? cycleMinutes : (cycleMinutes * 60);

  m.status = "running";
  m.durationMinutes = cycleMinutes;
  m.startedAt = now;
  m.endsAt = now + (durationSec * 1000);
  m.user = userName || "住宿同學";

  closeStartModal();
  renderAll();

  const userText = userName ? ` (${userName})` : "";
  const speedText = state.demoMode ? ` [示範快進模式：${cycleMinutes} 秒]` : ` [計時 ${cycleMinutes} 分鐘]`;
  const actionText = m.type === "dryer" ? "烘衣" : "洗衣";
  addLog(`🚀 ${m.name}${userText} 開始${actionText}${speedText}，預計 ${formatTime(new Date(m.endsAt))} 完成。`);
}

window.finishMachineUsage = function(machineId) {
  const m = state.machines.find(item => item.id === machineId);
  if (!m) return;

  const prevUser = m.user ? ` (${m.user})` : "";
  // Prompt for PIN if set
  if (m.pin) {
    const enteredPin = prompt("輸入 4 位數 PIN 以取消計時");
    if (enteredPin !== m.pin) {
      alert("PIN 不正確，無法取消");
      return;
    }
  }
  // Clear PIN after successful cancel
  m.pin = null;
  m.startedAt = null;
  m.endsAt = null;
  m.user = null;

  renderAll();
  addLog(`✨ ${m.name} 衣物已取完${prevUser}，機台釋放為【空閒有位】！`);
};

window.cancelMachineRunning = function(machineId) {
  if (!confirm("確定要取消當前行程並重設為空閒嗎？")) return;
  const m = state.machines.find(item => item.id === machineId);
  if (!m) return;

  // Prompt for PIN if set
  if (m.pin) {
    const enteredPin = prompt("輸入 4 位數 PIN 以取消計時");
    if (enteredPin !== m.pin) {
      alert("PIN 不正確，無法取消");
      return;
    }
  }
  // Clear PIN after successful cancel
  m.pin = null;
  m.startedAt = null;
  m.endsAt = null;
  m.user = null;

  renderAll();
  addLog(`⚠️ ${m.name} 行程已被手動取消重設。`);
};

/* ================= CRUD 管理事件 ================= */

function handleAddMachine(e) {
  e.preventDefault();
  const nameInput = document.getElementById("newMachineName");
  const typeSelect = document.getElementById("newMachineType");

  const name = nameInput.value.trim();
  const type = typeSelect.value;
  if (!name) return;

  const newMachine = {
    id: "m-" + Date.now(),
    name: name,
    location: "宿舍洗衣房",
    type: type,
    status: "idle",
    durationMinutes: type === "dryer" ? 40 : 30,
    startedAt: null,
    endsAt: null,
    user: null
  };

  state.machines.push(newMachine);
  nameInput.value = "";

  renderAll();
  addLog(`➕ 管理員新增了機台：${name} (${type === "dryer" ? "烘衣機" : "洗衣機"})`);
}

window.toggleMachineMaintenance = function(machineId) {
  const m = state.machines.find(item => item.id === machineId);
  if (!m) return;

  if (m.status === "maintenance") {
    // Prompt for PIN if set
  if (m.pin) {
    const enteredPin = prompt("輸入 4 位數 PIN 以取消計時");
    if (enteredPin !== m.pin) {
      alert("PIN 不正確，無法取消");
      return;
    }
  }
  // Clear PIN after successful cancel
  m.pin = null;
    m.startedAt = null;
    m.endsAt = null;
    m.user = null;
    addLog(`🔧 ${m.name} 維護完畢，已恢復空閒供同學使用。`);
  } else {
    m.status = "maintenance";
    m.startedAt = null;
    m.endsAt = null;
    m.user = null;
    addLog(`⚠️ ${m.name} 經通報故障，已標記為【維修中】暫停服務。`);
  }

  renderAll();
};

window.deleteMachine = function(machineId) {
  const m = state.machines.find(item => item.id === machineId);
  if (!m) return;
  if (!confirm(`確定要刪除 ${m.name} 嗎？此操作無法復原。`)) return;

  state.machines = state.machines.filter(item => item.id !== machineId);
  renderAll();
  addLog(`🗑️ 管理員刪除了機台：${m.name}`);
};

function handleResetDefaults() {
  if (!confirm("確定要重設為預設機台資料（6台洗衣機 ＋ 4台烘衣機）嗎？")) return;
  state.machines = JSON.parse(JSON.stringify(DEFAULT_MACHINES));
  renderAll();
  addLog("🔄 管理員將機台資料重設為標準 6 洗衣 ＋ 4 烘衣配置。");
}

/* ================= 頁面事件監聽綁定 ================= */
document.addEventListener("DOMContentLoaded", () => {
  initCloudSync();

  setInterval(timerTick, 1000);

  const typeFilter = document.getElementById("typeFilter");
  if (typeFilter) {
    typeFilter.addEventListener("change", (e) => {
      state.filterType = e.target.value;
      renderMachineGrid();
    });
  }

  const demoSwitch = document.getElementById("demoModeSwitch");
  if (demoSwitch) {
    demoSwitch.addEventListener("change", (e) => {
      state.demoMode = e.target.checked;
      renderAllCardsTimerOnly();
      const demoNoticeBox = document.getElementById("demoNoticeBox");
      if (demoNoticeBox) demoNoticeBox.style.display = state.demoMode ? "block" : "none";
      addLog(`⚙️ 示範模式切換：${state.demoMode ? "已開啟秒數快進模式 (1秒=1分鐘)" : "已切換回標準分鐘模式"}`);
    });
  }

  const notifyBtn = document.getElementById("notifyBtn");
  if (notifyBtn) {
    notifyBtn.addEventListener("click", requestNotificationPermission);
  }

  const confirmStartBtn = document.getElementById("confirmStartBtn");
  if (confirmStartBtn) confirmStartBtn.addEventListener("click", confirmStartMachine);

  const cancelStartBtn = document.getElementById("cancelStartBtn");
  if (cancelStartBtn) cancelStartBtn.addEventListener("click", closeStartModal);

  const closeStartModalBtn = document.getElementById("closeStartModalBtn");
  if (closeStartModalBtn) closeStartModalBtn.addEventListener("click", closeStartModal);

  const adminModal = document.getElementById("adminModal");
  const openAdminBtn = document.getElementById("openAdminBtn");
  const closeAdminModalBtn = document.getElementById("closeAdminModalBtn");
  const finishAdminBtn = document.getElementById("finishAdminBtn");

  if (openAdminBtn && adminModal) {
    openAdminBtn.addEventListener("click", () => {
      adminModal.classList.remove("hidden");
      renderAdminTable();
    });
  }

  const closeAdmin = () => {
    if (adminModal) adminModal.classList.add("hidden");
  };

  if (closeAdminModalBtn) closeAdminModalBtn.addEventListener("click", closeAdmin);
  if (finishAdminBtn) finishAdminBtn.addEventListener("click", closeAdmin);

  const addMachineForm = document.getElementById("addMachineForm");
  if (addMachineForm) addMachineForm.addEventListener("submit", handleAddMachine);

  const resetDefaultsBtn = document.getElementById("resetDefaultsBtn");
  if (resetDefaultsBtn) resetDefaultsBtn.addEventListener("click", handleResetDefaults);

  const clearLogsBtn = document.getElementById("clearLogsBtn");
  if (clearLogsBtn) {
    clearLogsBtn.addEventListener("click", () => {
      state.logs = [];
      saveStateToCloud();
      renderActivityLogs();
    });
  }
});
