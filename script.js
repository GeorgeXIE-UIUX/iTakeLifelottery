// 全域狀態：模擬當前用戶累積的消費金額與已領取的節點
const CURRENT_SPEND = 1050; // 模擬破千，讓你直接看見「萬元抽獎」解鎖的華麗特效！
let claimedTiers = [50, 100]; // 模擬使用者已經領取了 50、100 元的獎勵
let pendingClaimTier = null; // 當前正要領取的獎項節點 (數字或 'ALL')

const TIERS = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 1000];

// 獎品資料設定
const PRIZES = {
  50: { name: "飲料折$10", emoji: "🥤", pos: "col-start-2 row-start-1" },
  100: { name: "點數 100", emoji: "🪙", pos: "col-start-3 row-start-1" },
  200: { name: "限定貼圖", emoji: "✨", pos: "col-start-4 row-start-1" },
  300: { name: "蛋糕兌換券", emoji: "🍰", pos: "col-start-4 row-start-2" },
  400: { name: "電影票", emoji: "🎬", pos: "col-start-4 row-start-3" },
  500: { name: "藍牙耳機", emoji: "🎧", pos: "col-start-3 row-start-4" },
  600: { name: "保溫瓶", emoji: "🧴", pos: "col-start-2 row-start-4" },
  700: { name: "美食 $500", emoji: "🍱", pos: "col-start-1 row-start-4" },
  800: { name: "旅遊金 $800", emoji: "🧳", pos: "col-start-1 row-start-3" },
  900: { name: "潮流後背包", emoji: "🎒", pos: "col-start-1 row-start-2" },
  1000: { name: "萬元現金", emoji: "💰", pos: "center" },
};

// 配送資料設定
let SHIPMENTS = [
  { tier: 50, status: "已送達", date: "06/01", icon: "check-circle-2", eta: "06/01" },
  { tier: 100, status: "已出貨", date: "06/02", icon: "package", eta: "06/05" },
];

const RULES = [
  { icon: "coins", title: "活動期間", body: "2026/06/01 – 2026/06/30，活動期間內所有消費自動累計。" },
  { icon: "gift", title: "獎勵領取", body: "消費滿 50/100/200…900 元，各對應獎勵 ＊ 每筆獎勵僅可領取一次。" },
  { icon: "trophy", title: "萬元現金抽獎", body: "每滿 1000 元獲得一次抽獎資格，資格可累計，不設上限。" },
  { icon: "truck", title: "獎品配送", body: "實體獎品於領取後 5–7 個工作天內出貨，數位獎勵即時發送。" },
];

// ================= 渲染邏輯 =================

// 1. 渲染上方統計與進度條
function renderProgress() {
  const nextTier = TIERS.find(t => t > CURRENT_SPEND) || 1000;
  const pct = Math.min((CURRENT_SPEND / 1000) * 100, 100);
  const grandDraws = Math.floor(CURRENT_SPEND / 1000);

  document.getElementById("current-spend").textContent = `$${CURRENT_SPEND}`;
  document.getElementById("next-tier-diff").textContent = `$${nextTier > CURRENT_SPEND ? nextTier - CURRENT_SPEND : 0}`;
  document.getElementById("next-tier-prize").textContent = `${PRIZES[nextTier].emoji} ${PRIZES[nextTier].name}`;
  
  const progressContainer = document.getElementById("progress-container");
  const barFill = document.getElementById("progress-bar-fill");
  const barThumb = document.getElementById("progress-bar-thumb");

  const updateThumbPosition = () => {
    if (!progressContainer || !barThumb) return;
    const trackWidth = progressContainer.getBoundingClientRect().width;
    const thumbWidth = barThumb.getBoundingClientRect().width;
    const centerX = Math.min(Math.max((pct / 100) * trackWidth, thumbWidth / 2), trackWidth - thumbWidth / 2);
    barThumb.style.left = `${Math.round(centerX - thumbWidth / 2)}px`;
  };

  setTimeout(() => {
    barFill.style.width = `${pct}%`;
    updateThumbPosition();
  }, 100);

  window.addEventListener('resize', updateThumbPosition);

  document.getElementById("stat-unlocked").textContent = claimedTiers.length;
  document.getElementById("stat-draws").textContent = grandDraws;

  const markersContainer = document.getElementById("tier-markers");
  let markersHtml = '';
  TIERS.forEach(t => {
    const reached = CURRENT_SPEND >= t;
    const isGrand = t === 1000;
    const dotClasses = isGrand 
        ? "w-3.5 h-3.5 sm:w-4 sm:h-4 bg-gradient-gold" 
        : (reached ? "w-2.5 h-2.5 sm:w-3 sm:h-3 bg-primary" : "w-2.5 h-2.5 sm:w-3 sm:h-3 bg-card");
    const textClasses = reached ? "text-primary" : "text-muted-foreground";
    const badgeClasses = isGrand ? "bg-gold/20 text-ink" : "bg-muted text-muted-foreground";
    const badgeText = isGrand ? "可累計" : "限一次";

    markersHtml += `
      <div class="flex flex-col items-center gap-1 sm:gap-1.5 min-w-0">
        <div class="rounded-full border-2 border-ink shrink-0 ${dotClasses}"></div>
        <span class="${textClasses}">$${t}</span>
        <span class="hidden sm:inline-block text-[9px] px-1.5 py-0.5 rounded-full border border-ink/30 ${badgeClasses}">${badgeText}</span>
      </div>
    `;
  });
  markersContainer.innerHTML = markersHtml;
}

// 2. 渲染獎池九宮格
function renderPrizeGrid() {
  const prizeGrid = document.getElementById("prize-grid");
  prizeGrid.innerHTML = ""; 

  // 加入 onerror 處理如果沒有圖片才不會顯示破圖圖示
  prizeGrid.insertAdjacentHTML('beforeend', `
    <div class="col-start-1 row-start-1 rounded-xl sm:rounded-2xl border-2 border-dashed border-ink/40 bg-cream/60 flex items-center justify-center p-1 overflow-hidden">
      <img src="robot.png" alt="" class="w-2/3 h-2/3 object-contain opacity-60 animate-float" onerror="this.style.display='none'" />
    </div>
  `);

  const claimableTiers = TIERS.filter(t => t < 1000 && CURRENT_SPEND >= t && !claimedTiers.includes(t));
  const canClaimAll = claimableTiers.length > 0;

  TIERS.forEach(t => {
    if (t === 1000) return; 
    
    const p = PRIZES[t];
    const unlocked = CURRENT_SPEND >= t;
    const claimed = claimedTiers.includes(t);
    const claimable = unlocked && !claimed; 

    let bgClass = "bg-card";
    let opacityClass = "opacity-50 grayscale";
    let badgeHtml = `<span class="mt-0.5 sm:mt-1 inline-block rounded-full px-1.5 sm:px-2 py-0.5 text-[9px] sm:text-[10px] font-bold border border-ink bg-muted text-muted-foreground">$${t}</span>`;
    let checkHtml = "";

    if (claimed) {
      bgClass = "bg-cream"; 
      opacityClass = "";
      badgeHtml = `<span class="mt-0.5 sm:mt-1 inline-block rounded-full px-1.5 sm:px-2 py-0.5 text-[9px] sm:text-[10px] font-bold border border-ink bg-muted text-muted-foreground">已領取</span>`;
      checkHtml = `<div class="absolute -top-1.5 -right-1.5 sm:-top-2 sm:-right-2 bg-primary text-primary-foreground border-2 border-ink rounded-full w-5 h-5 sm:w-6 sm:h-6 flex items-center justify-center text-[10px] sm:text-xs font-bold"><i data-lucide="check" class="w-3 h-3"></i></div>`;
    } else if (claimable) {
      bgClass = "bg-gradient-prize text-primary-foreground shadow-card";
      opacityClass = "animate-pulse"; 
      badgeHtml = `<button data-tier="${t}" class="claim-btn mt-0.5 sm:mt-1 inline-block rounded-full px-2 sm:px-3 py-0.5 text-[10px] sm:text-[11px] font-bold border-2 border-ink bg-gold text-ink shadow-card hover:-translate-y-0.5 active:translate-y-0 transition-all cursor-pointer relative z-10">領取!</button>`;
    }

    const html = `
      <div class="${p.pos} relative h-full w-full rounded-xl sm:rounded-2xl border-2 border-ink p-1 sm:p-2 flex flex-col items-center justify-center text-center transition-all ${bgClass}">
        <span class="hidden sm:inline-block absolute top-1 left-1 text-[8px] md:text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-ink/85 text-card">限一次</span>
        <div class="text-xl sm:text-2xl md:text-4xl ${opacityClass}">${p.emoji}</div>
        <p class="mt-0.5 sm:mt-1 text-[8px] sm:text-[10px] md:text-xs font-bold leading-tight line-clamp-2 ${claimable ? 'text-primary-foreground' : 'text-ink'}">${p.name}</p>
        ${badgeHtml}
        ${checkHtml}
      </div>
    `;
    prizeGrid.insertAdjacentHTML('beforeend', html);
  });

  prizeGrid.insertAdjacentHTML('beforeend', `
    <div class="col-start-4 row-start-4 rounded-xl sm:rounded-2xl border-2 border-dashed border-ink/40 bg-cream/60 flex items-center justify-center p-1 overflow-hidden">
      <img src="robot.png" alt="" class="w-2/3 h-2/3 object-contain opacity-60 animate-float" onerror="this.style.display='none'" />
    </div>
  `);

  // ================= 華麗版 1000 元大獎 =================
  const isGrandUnlocked = CURRENT_SPEND >= 1000;
  const grandDraws = Math.floor(CURRENT_SPEND / 1000);
  
  // 大幅壓縮手機版的 padding (px, py, pb) 與 text 大小
  let centerActionHtml = `
    <div class="mt-auto flex flex-col items-center gap-1 sm:gap-2 w-full px-1.5 sm:px-3 relative z-20 pb-1.5 sm:pb-4">
      <span class="inline-flex items-center gap-1 sm:gap-1.5 rounded-full bg-ink text-gold px-2.5 sm:px-4 py-0.5 sm:py-1.5 text-[9px] sm:text-sm font-black shadow-md">
        <i data-lucide="ticket" class="w-3 h-3 sm:w-4 sm:h-4 text-gold"></i> 抽獎券 x ${grandDraws}
      </span>
  `;

  if (canClaimAll) {
    centerActionHtml += `
      <button id="btn-claim-all" class="w-full flex items-center justify-center gap-1 rounded-full bg-white text-ink px-1.5 py-1 sm:py-2.5 text-[10px] sm:text-sm font-black border-[2px] sm:border-[3px] border-ink shadow-[0_2px_0_0_var(--ink)] sm:shadow-[0_4px_0_0_var(--ink)] hover:-translate-y-0.5 active:translate-y-1 active:shadow-none transition-all cursor-pointer mt-0.5 sm:mt-1">
        <i data-lucide="gift" class="w-3 h-3 sm:w-5 sm:h-5 text-primary"></i> 
        一鍵全領 (${claimableTiers.length})
      </button>
    `;
  }
  
  centerActionHtml += `</div>`;

  const grandBgClass = isGrandUnlocked ? 'bg-gold' : 'bg-card';

  prizeGrid.insertAdjacentHTML('beforeend', `
    <div id="prize-1000" class="col-start-2 col-span-2 row-start-2 row-span-2 h-full w-full relative rounded-2xl sm:rounded-3xl border-[3px] sm:border-[4px] border-ink ${grandBgClass} shadow-pop flex flex-col items-center justify-between text-center overflow-hidden transition-all group z-10 p-0">
      
      ${isGrandUnlocked ? `
      <div class="absolute inset-0 opacity-30 mix-blend-overlay animate-[spin_15s_linear_infinite]" style="background: repeating-conic-gradient(from 0deg, transparent 0deg 15deg, #ffffff 15deg 30deg);"></div>
      ` : ''}

      <svg class="absolute text-white w-4 h-4 sm:w-8 sm:h-8 top-3 sm:top-5 left-2 sm:left-3 z-10 ${isGrandUnlocked ? 'animate-pulse' : 'hidden'}" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0 L14 10 L24 12 L14 14 L12 24 L10 14 L0 12 L10 10 Z"/></svg>
      <svg class="absolute text-white w-3 h-3 sm:w-6 sm:h-6 bottom-12 sm:bottom-16 right-2 sm:right-3 z-10 ${isGrandUnlocked ? 'animate-pulse' : 'hidden'}" style="animation-delay: 0.5s;" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0 L14 10 L24 12 L14 14 L12 24 L10 14 L0 12 L10 10 Z"/></svg>

      <div class="absolute top-0 inset-x-0 flex justify-center z-20">
        <div class="bg-ink text-gold text-[8px] sm:text-xs font-black px-3 sm:px-6 py-0.5 sm:py-1.5 rounded-b-md sm:rounded-b-xl border-x-[2px] sm:border-x-[3px] border-b-[2px] sm:border-b-[3px] border-ink tracking-widest uppercase shadow-sm">
          Grand Prize
        </div>
      </div>

      <div class="relative z-20 flex flex-col items-center justify-center flex-1 w-full px-1 sm:px-2 mt-4 sm:mt-6">
        
        <div class="relative flex items-center justify-center h-8 sm:h-12 mb-0.5 sm:mb-2 ${isGrandUnlocked ? (canClaimAll ? '' : 'animate-wiggle') : 'grayscale opacity-50'}">
          <div class="text-3xl sm:text-5xl absolute transform -rotate-12 -translate-x-2 sm:-translate-x-4" style="filter: hue-rotate(210deg) saturate(1.5);">💵</div>
          <div class="text-3xl sm:text-5xl absolute transform rotate-12 translate-x-2 sm:translate-x-4" style="filter: hue-rotate(210deg) saturate(1.5);">💵</div>
          <div class="text-4xl sm:text-6xl relative z-10 transform -translate-y-1" style="filter: hue-rotate(210deg) saturate(1.5) drop-shadow(0 4px 4px rgba(0,0,0,0.3));">💵</div>
        </div>
        
        <h3 class="font-black text-ink leading-none flex items-center justify-center gap-0.5 sm:gap-1 w-full drop-shadow-sm">
          <span class="text-sm sm:text-3xl">抽</span>
          <span class="inline-block bg-white text-primary px-1 sm:px-2 py-0.5 rounded-md sm:rounded-lg border-2 border-ink shadow-[0_2px_0_0_var(--ink)] transform -rotate-3 text-lg sm:text-4xl">萬元</span>
          <span class="text-sm sm:text-3xl">現金</span>
        </h3>
        
        <p class="text-[8px] sm:text-[10px] font-bold text-ink bg-white/90 px-1.5 sm:px-2 py-0.5 rounded border border-ink/30 mt-1 sm:mt-2 shadow-sm leading-tight">
          每滿$1000抽獎
        </p>
      </div>

      ${centerActionHtml}
    </div>
  `);
}

// 3. 渲染獎品配送進度 (節點直接擺在進度條上)
function renderShipments() {
  const shipmentContainer = document.getElementById("shipment-list");
  const emptyState = document.getElementById("shipment-empty");
  
  if (SHIPMENTS.length === 0) {
    shipmentContainer.innerHTML = '';
    emptyState.classList.remove('hidden');
    return;
  }
  
  emptyState.classList.add('hidden');
  let shipmentHtml = '';
  
  const reversedShipments = [...SHIPMENTS].reverse();
  const steps = ["處理中", "已出貨", "配送中", "已送達"];

  reversedShipments.forEach(s => {
    const prize = PRIZES[s.tier];
    
    // 設定右上角的狀態標籤顏色
    let statusColor = "bg-muted text-muted-foreground border-ink/30";
    if (s.status === "已送達") statusColor = "bg-primary text-primary-foreground border-ink";
    else if (s.status === "配送中") statusColor = "bg-gold text-ink border-ink";
    else if (s.status === "處理中" || s.status === "已出貨") statusColor = "bg-accent text-ink border-ink";

    // 取得當前狀態的 Index (0, 1, 2, 3)
    let currentStepIndex = steps.indexOf(s.status);
    if (currentStepIndex === -1) currentStepIndex = 0;

    // 計算進度百分比 (0%, 33.3%, 66.6%, 100%)
    const pct = (currentStepIndex / (steps.length - 1)) * 100;

    // 產生預計抵達文字
    let arrivalText = s.status === "已送達" 
      ? `已於 ${s.date} 送達` 
      : `預計抵達：<span class="text-primary font-bold">${s.eta || "約 3-5 個工作天"}</span>`;

    // 產生鑲嵌在軌道上的節點 HTML
    let markersHtml = '';
    steps.forEach((stepName, idx) => {
      const isReached = idx <= currentStepIndex;
      const isCurrent = idx === currentStepIndex;
      
      // 依據是否為「當前階段」，設定圓圈大小、粗細與顏色
      let sizeClasses = isCurrent ? "w-5 h-5 sm:w-6 sm:h-6" : "w-4 h-4 sm:w-5 sm:h-5"; 
      let borderClasses = isCurrent ? "border-[3px]" : "border-[2px]";
      let bgClasses = isReached ? "bg-primary" : "bg-card";
      
      // 當前階段的文字變特粗，過去的變粗體，未達成的保持一般字重
      let textClasses = isCurrent ? "text-primary font-black" : (isReached ? "text-primary font-bold" : "text-muted-foreground");
      
      // 若為當前階段，內部加上一顆小白點，像單選按鈕(Radio)被選中的感覺
      let innerDot = isCurrent ? `<div class="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-card"></div>` : "";

      markersHtml += `
        <div class="absolute flex flex-col items-center" style="left: ${(idx / (steps.length - 1)) * 100}%; top: 50%; transform: translate(-50%, -50%);">
          <div class="flex items-center justify-center rounded-full border-ink shrink-0 ${sizeClasses} ${borderClasses} ${bgClasses} relative z-10 transition-all duration-300 shadow-sm">
            ${innerDot}
          </div>
          <span class="absolute top-full mt-1.5 sm:mt-2 text-[10px] sm:text-[11px] md:text-xs ${textClasses} whitespace-nowrap transition-colors duration-300">${stepName}</span>
        </div>
      `;
    });

    shipmentHtml += `
      <div class="flex flex-col gap-4 rounded-2xl border-2 border-ink bg-card p-5 sm:p-6 shadow-card hover:-translate-y-0.5 transition-transform text-ink animate-in slide-in-from-bottom-2 fade-in">
        
        <div class="flex items-center gap-3 sm:gap-4">
          <div class="flex items-center justify-center w-12 h-12 sm:w-14 sm:h-14 rounded-xl border-2 border-ink bg-gradient-prize text-xl sm:text-2xl shrink-0 shadow-sm">
            ${prize.emoji}
          </div>
          <div class="flex-1 min-w-0">
            <p class="font-bold text-sm sm:text-lg truncate">${prize.name}</p>
            <p class="text-xs sm:text-sm text-muted-foreground mt-0.5">${arrivalText}</p>
          </div>
          <span class="inline-flex items-center gap-1 rounded-full px-2 sm:px-3 py-1 sm:py-1.5 text-[10px] sm:text-xs font-bold border-2 shrink-0 ${statusColor}">
            <i data-lucide="${s.icon}" class="w-3 h-3 sm:w-3.5 sm:h-3.5"></i> ${s.status}
          </span>
        </div>
        
        <div class="w-full h-px bg-ink/10 my-1"></div>

        <div class="px-6 sm:px-8 pb-6 sm:pb-8 pt-2 mt-2">
          <div class="relative h-3 sm:h-4 w-full">
            <div class="absolute inset-0 rounded-full border-2 border-ink bg-muted overflow-hidden">
              <div class="absolute inset-y-0 left-0 bg-gradient-prize transition-all duration-700" style="width: ${pct}%"></div>
            </div>
            ${markersHtml}
          </div>
        </div>

      </div>
    `;
  });
  
  shipmentContainer.innerHTML = shipmentHtml;
}

// 4. 渲染活動辦法
function renderRules() {
  const rulesContainer = document.getElementById("rules-list");
  let rulesHtml = '';
  RULES.forEach(r => {
    rulesHtml += `
      <div class="rounded-2xl border-2 border-ink bg-card p-5 sm:p-6 shadow-card">
        <div class="flex items-start gap-3 sm:gap-4">
          <div class="flex items-center justify-center w-10 h-10 sm:w-12 sm:h-12 rounded-xl border-2 border-ink bg-primary text-primary-foreground shrink-0">
            <i data-lucide="${r.icon}" class="w-5 h-5 sm:w-6 sm:h-6"></i>
          </div>
          <div>
            <h3 class="text-base sm:text-lg font-bold mb-1">${r.title}</h3>
            <p class="text-xs sm:text-sm text-muted-foreground">${r.body}</p>
          </div>
        </div>
      </div>
    `;
  });
  rulesContainer.innerHTML = rulesHtml;
}

// ================= 事件綁定邏輯 =================

document.addEventListener("DOMContentLoaded", () => {
  renderProgress();
  renderPrizeGrid();
  renderShipments();
  renderRules();
  lucide.createIcons();

  const menuBtn = document.getElementById("mobile-menu-btn");
  const mobileMenu = document.getElementById("mobile-menu");
  const iconMenu = document.getElementById("icon-menu");
  const iconClose = document.getElementById("icon-close");
  const mobileLinks = document.querySelectorAll(".mobile-link");

  menuBtn.addEventListener("click", () => {
    mobileMenu.classList.toggle("hidden");
    iconMenu.classList.toggle("hidden");
    iconClose.classList.toggle("hidden");
  });

  mobileLinks.forEach(link => {
    link.addEventListener("click", () => {
      mobileMenu.classList.add("hidden");
      iconMenu.classList.remove("hidden");
      iconClose.classList.add("hidden");
    });
  });

  const modal = document.getElementById('claim-modal');
  const modalContent = document.getElementById('claim-modal-content');
  const btnConfirm = document.getElementById('btn-confirm-claim');
  const btnCancel = document.getElementById('btn-cancel-claim');
  const modalPrizeName = document.getElementById('modal-prize-name');

  document.getElementById('prize-grid').addEventListener('click', (e) => {
    const btnSingle = e.target.closest('.claim-btn');
    const btnAll = e.target.closest('#btn-claim-all');
    
    if (btnSingle) {
      pendingClaimTier = parseInt(btnSingle.getAttribute('data-tier'), 10);
      modalPrizeName.textContent = PRIZES[pendingClaimTier].name;
    } else if (btnAll) {
      pendingClaimTier = 'ALL';
      modalPrizeName.textContent = "所有已解鎖獎勵";
    } else {
      return; 
    }
    
    modal.classList.remove('hidden');
    setTimeout(() => {
      modalContent.classList.remove('scale-95');
      modalContent.classList.add('scale-100');
    }, 10);
  });

  function closeModal() {
    modalContent.classList.remove('scale-100');
    modalContent.classList.add('scale-95');
    setTimeout(() => {
      modal.classList.add('hidden');
      pendingClaimTier = null;
    }, 150);
  }

  modal.addEventListener('click', (e) => {
    if(e.target === modal) closeModal();
  });
  btnCancel.addEventListener('click', closeModal);

  btnConfirm.addEventListener('click', () => {
    if (!pendingClaimTier) return;
    
    const today = new Date();
    const dateStr = `${String(today.getMonth() + 1).padStart(2, '0')}/${String(today.getDate()).padStart(2, '0')}`;
    
    const etaDate = new Date(today);
    etaDate.setDate(etaDate.getDate() + 3);
    const etaStr = `${String(etaDate.getMonth() + 1).padStart(2, '0')}/${String(etaDate.getDate()).padStart(2, '0')}`;
    
    if (pendingClaimTier === 'ALL') {
      const claimableTiers = TIERS.filter(t => t < 1000 && CURRENT_SPEND >= t && !claimedTiers.includes(t));
      claimableTiers.forEach(t => {
        claimedTiers.push(t);
        SHIPMENTS.push({
          tier: t,
          status: "處理中",
          date: dateStr,
          icon: "clock",
          eta: etaStr
        });
      });
    } else {
      claimedTiers.push(pendingClaimTier);
      SHIPMENTS.push({
        tier: pendingClaimTier,
        status: "處理中",
        date: dateStr,
        icon: "clock",
        eta: etaStr
      });
    }
    
    SHIPMENTS.sort((a, b) => a.tier - b.tier);

    renderProgress(); 
    renderPrizeGrid();
    renderShipments();
    lucide.createIcons(); 
    
    closeModal();
  });
});