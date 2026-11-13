let allUnits = [];
let currentUnitId = null;
let currentFormKey = "0"; // 기본 첫 형태를 0으로 설정
let currentBaseLevel = 30;
let currentPlusLevel = 0;
let selectedTargetTrait = "ALL";
let targetDistance = 0;

const TRAIT_MAP = {
  red: "빨간 적", floating: "떠있는 적", black: "검은 적", metal: "메탈 적",
  angel: "천사", alien: "에이리언", zombie: "좀비", relic: "고대종",
  aku: "악마", traitless: "무속성"
};

function calcStat(rawStat, level, levelCurve, treasureMultiplier = 2.5) {
  let mult = 1.0;
  let remaining = level - 1;
  for (let i = 0; i < levelCurve.length && remaining > 0; i++) {
    const step = Math.min(remaining, 10);
    mult += step * (levelCurve[i] / 100);
    remaining -= step;
  }
  return Math.round(Math.round(rawStat * mult) * treasureMultiplier);
}

async function init() {
  const countEl = document.getElementById("resultCount");
  try {
    countEl.textContent = "데이터 불러오는 중...";
    const res = await fetch("./data/units.json");
    if (!res.ok) throw new Error(`HTTP 에러 (${res.status})`);
    
    const rawData = await res.json();
    allUnits = rawData.entries || rawData; 
    
    if (!Array.isArray(allUnits) || allUnits.length === 0) {
      throw new Error("JSON 내부 데이터가 비어있거나 형식이 잘못되었습니다.");
    }

    initAutocomplete();
    checkRoute();
    window.addEventListener("popstate", checkRoute);

  } catch (err) {
    countEl.innerHTML = `<span style="color: #ef4444;">데이터 로드 실패: ${err.message}<br>(data/units.json 경로를 확인해주세요)</span>`;
    console.error(err);
  }
}

function checkRoute() {
  const params = new URLSearchParams(window.location.search);
  const unitIdParam = params.get("id");

  if (unitIdParam !== null) {
    showDetailView(Number(unitIdParam), false);
  } else {
    showMainView(false);
  }
}

function showMainView(pushHistory = true) {
  document.getElementById("detailView").classList.add("hidden");
  document.getElementById("mainView").classList.remove("hidden");
  window.scrollTo(0, 0);
  if (pushHistory) {
    history.pushState({}, "", window.location.pathname);
  }
  renderList();
}

function showDetailView(unitId, pushHistory = true) {
  const unit = allUnits.find(u => u.id === unitId);
  if (!unit) return;

  currentUnitId = unitId;
  const formKeys = Object.keys(unit.forms); // 예: ["0", "1", "2"] 또는 ["0", "1", "2", "3"]
  currentFormKey = formKeys[0]; // 첫 번째 형태 (0)로 초기화
  currentBaseLevel = 30;
  currentPlusLevel = 0;
  targetDistance = 0;

  renderDetailContent();

  document.getElementById("mainView").classList.add("hidden");
  document.getElementById("detailView").classList.remove("hidden");
  window.scrollTo(0, 0);

  if (pushHistory) {
    history.pushState({ id: unitId }, "", `?id=${unitId}`);
  }
}

function renderList() {
  const query = document.getElementById("searchInput").value.trim().toLowerCase();
  const rarity = document.getElementById("rarityFilter").value;
  const trait = document.getElementById("traitFilter").value;
  const ability = document.getElementById("abilityFilter").value;

  const filtered = allUnits.filter(unit => {
    // 0번 형태(또는 첫 번째 형태) 기준
    const formKeys = Object.keys(unit.forms);
    const form1 = unit.forms["0"] || unit.forms[formKeys[0]];
    const forms = Object.values(unit.forms);

    if (rarity !== "ALL" && form1.rarity !== rarity) return false;

    if (query) {
      const matchId = String(unit.id) === query;
      const matchName = forms.some(f => f.name.toLowerCase().includes(query));
      if (!matchId && !matchName) return false;
    }

    if (trait !== "ALL") {
      const hasTrait = forms.some(f => f.traits && f.traits.includes(trait));
      if (!hasTrait) return false;
    }

    if (ability !== "ALL") {
      const hasAbility = forms.some(f => f.abilities && f.abilities.some(a => a.key === ability));
      if (!hasAbility) return false;
    }

    return true;
  });

  document.getElementById("resultCount").textContent = `검색 결과: ${filtered.length}개 유닛`;

  const grid = document.getElementById("unitGrid");
  grid.innerHTML = filtered.slice(0, 100).map(unit => {
    const formKeys = Object.keys(unit.forms);
    const form1 = unit.forms["0"] || unit.forms[formKeys[0]];
    const defaultKey = unit.forms["0"] ? "0" : formKeys[0];
    
    const traitsHtml = (form1.traits || [])
      .map(t => `<span class="badge"><img src="assets/img/traits/${t}.png" class="icon-sm" onerror="this.style.display='none'"> ${TRAIT_MAP[t] || t}</span>`).join("");

    return `
      <div class="unit-card" onclick="showDetailView(${unit.id})">
        <div class="card-top">
          <span class="unit-id">No.${String(unit.id).padStart(3, "0")}</span>
          <span class="unit-rarity">${form1.rarity}</span>
        </div>
        <div class="unit-img-wrap">
          <!-- 0, 1, 2, 3 형태 키값 그대로 반영 -->
          <img src="assets/img/${unit.id}/${defaultKey}.png" alt="${form1.name}" loading="lazy" onerror="this.style.display='none'" />
        </div>
        <div class="unit-name">${form1.name}</div>
        <div class="card-traits">${traitsHtml || '<span class="badge">무속성</span>'}</div>
      </div>
    `;
  }).join("");
}

function renderDetailContent() {
  const unit = allUnits.find(u => u.id === currentUnitId);
  if (!unit) return;

  const formKeys = Object.keys(unit.forms); // ["0", "1", "2"...]
  const form = unit.forms[currentFormKey];

  if (currentBaseLevel > form.maxBaseLevel) currentBaseLevel = form.maxBaseLevel;
  if (currentPlusLevel > form.maxPlusLevel) currentPlusLevel = form.maxPlusLevel;
  const totalLevel = currentBaseLevel + currentPlusLevel;

  // 탭 이름 매핑 (0->1단, 1->2단, 2->3단, 3->4단)
  const formNames = ["1단 형태", "2단 형태", "3단 형태", "4단 형태"];

  document.getElementById("formTabs").innerHTML = formKeys.map((k, idx) => `
    <button class="tab-btn ${k === currentFormKey ? "active" : ""}" 
            onclick="switchForm('${k}')">
      ${formNames[idx] || (Number(k)+1 + '단 형태')} (${unit.forms[k].name})
    </button>
  `).join("");

  const hp = calcStat(form.rawHitpoints, totalLevel, form.levelCurve);
  const rawHits = form.rawAttacks.filter(a => a > 0);
  const baseHitsAtk = rawHits.map(a => calcStat(a, totalLevel, form.levelCurve));
  const baseTotalAtk = baseHitsAtk.reduce((sum, v) => sum + v, 0);

  // 속성 상성 배율 계산
  let multiplier = 1.0;
  let activeAbilityText = "";
  
  if (selectedTargetTrait !== "ALL" && form.abilities) {
    form.abilities.forEach(ab => {
      const isTargetMatch = ab.traits && (ab.traits.includes(selectedTargetTrait) || ab.traits.includes("all"));
      if (isTargetMatch) {
        if (ab.key === "massive_damage" || ab.key === "insane_damage") {
          multiplier = ab.multiplier ? ab.multiplier / 100 : 4.0;
          activeAbilityText = ` (${ab.label_ko}: ${multiplier}배)`;
        } else if (ab.key === "strong") {
          multiplier = 1.5;
          activeAbilityText = ` (엄청 강하다: 1.5배)`;
        }
      }
    });
  }

  const finalHitsAtk = baseHitsAtk.map(a => Math.round(a * multiplier));
  const finalTotalAtk = finalHitsAtk.reduce((sum, v) => sum + v, 0);
  
  const cycleSec = form.attackCycleFrames > 0 ? (form.attackCycleFrames / form.fps).toFixed(2) : 0;
  const finalDps = cycleSec > 0 ? Math.round(finalTotalAtk / (form.attackCycleFrames / form.fps)) : 0;
  const cdSec = (form.cooldownFrames / form.fps).toFixed(2);
  const rangesText = (form.actualRanges || []).map(r => r.text).join(" / ");

  // 거리별 유효 DPS 시뮬레이션
  let distanceEffectiveAtk = 0;
  if (form.actualRanges && form.actualRanges.length > 0) {
    form.actualRanges.forEach((range, idx) => {
      if (targetDistance >= range.min && targetDistance <= range.max) {
        distanceEffectiveAtk += finalHitsAtk[idx] || 0;
      }
    });
  } else {
    distanceEffectiveAtk = finalTotalAtk;
  }
  const distanceEffectiveDps = cycleSec > 0 ? Math.round(distanceEffectiveAtk / (form.attackCycleFrames / form.fps)) : 0;

  const abilitiesHtml = (form.abilities || []).map(ab => `
    <li>
      <img src="assets/img/abilities/${ab.key}.png" class="icon-sm" onerror="this.style.display='none'">
      <strong>${ab.label_ko}</strong> ${ab._ref ? `<span class="ref">(${ab._ref})</span>` : ""}
    </li>
  `).join("");

  document.getElementById("detailBody").innerHTML = `
    <div class="detail-header-flex">
      <!-- 0, 1, 2, 3 형태 키값에 따른 이미지 경로 -->
      <img src="assets/img/${currentUnitId}/${currentFormKey}.png" alt="${form.name}" class="detail-unit-img" onerror="this.style.display='none'" />
      <div>
        <h2>[No.${String(currentUnitId).padStart(3, "0")}] ${form.name} <small style="color:var(--text-muted); font-size:0.8rem;">(${form.rarity})</small></h2>
        <p class="desc">${form.description.replace(/\n/g, "<br>")}</p>
      </div>
    </div>

    <!-- 레벨 조절 컨트롤 (기본 + 플러스) -->
    <div class="calc-section">
      <h3>레벨 설정 (총 합산: Lv.${totalLevel})</h3>
      <div class="level-inputs-grid">
        <div class="input-group">
          <label>기본 레벨 (1 ~ ${form.maxBaseLevel})</label>
          <div class="slider-with-input">
            <input type="range" min="1" max="${form.maxBaseLevel}" value="${currentBaseLevel}" 
                   oninput="updateBaseLevel(this.value)" />
            <input type="number" min="1" max="${form.maxBaseLevel}" value="${currentBaseLevel}" 
                   onchange="updateBaseLevel(this.value)" />
          </div>
        </div>
        <div class="input-group">
          <label>플러스 레벨 (0 ~ ${form.maxPlusLevel})</label>
          <div class="slider-with-input">
            <input type="range" min="0" max="${form.maxPlusLevel}" value="${currentPlusLevel}" 
                   oninput="updatePlusLevel(this.value)" />
            <input type="number" min="0" max="${form.maxPlusLevel}" value="${currentPlusLevel}" 
                   onchange="updatePlusLevel(this.value)" />
          </div>
        </div>
      </div>
    </div>

    <!-- 속성 상성 선택 -->
    <div class="calc-section">
      <h3>상성 속성 선택 (DPS 배율 적용)</h3>
      <select id="targetTraitSelect" onchange="updateTargetTrait(this.value)" class="trait-select-box">
        <option value="ALL">일반 (속성 배율 없음)</option>
        <option value="red">빨간 적</option>
        <option value="floating">떠있는 적</option>
        <option value="black">검은 적</option>
        <option value="metal">메탈 적</option>
        <option value="angel">천사</option>
        <option value="alien">에이리언</option>
        <option value="zombie">좀비</option>
        <option value="relic">고대종</option>
        <option value="aku">악마</option>
      </select>
    </div>

    <table class="stat-table">
      <tr><th>체력</th><td>${hp.toLocaleString()}</td><th>공격력${activeAbilityText}</th><td><b>${finalTotalAtk.toLocaleString()}</b> (${finalHitsAtk.join(" / ")})</td></tr>
      <tr><th>DPS</th><td><span class="highlight-dps">${finalDps.toLocaleString()}</span></td><th>인식 사거리</th><td>${form.recognitionRange} (실제 타점: ${rangesText || '단일/전체'})</td></tr>
      <tr><th>공격 주기</th><td>${form.attackCycleFrames}f (${cycleSec}초)</td><th>선딜레이</th><td>${form.foreswingFrames.join(", ")}f</td></tr>
      <tr><th>생산 코스트</th><td>${form.cost}원</td><th>재생산</th><td>${form.cooldownFrames}f (${cdSec}초)</td></tr>
    </table>

    <!-- 거리별 DPS 시뮬레이터 -->
    <div class="calc-section">
      <h3>적과의 거리별 유효 DPS 시뮬레이터</h3>
      <div class="distance-simulator">
        <div class="distance-slider-wrap">
          <label>적과의 거리: <span id="distVal">${targetDistance}</span> (인식사거리: ${form.recognitionRange})</label>
          <input type="range" min="0" max="${Math.max(600, form.recognitionRange + 100)}" value="${targetDistance}" 
                 oninput="updateTargetDistance(this.value)" />
        </div>
        <div class="distance-result-box">
          <div>해당 거리 유효 공격력: <b>${distanceEffectiveAtk.toLocaleString()}</b></div>
          <div>해당 거리 실시간 DPS: <span class="highlight-dps">${distanceEffectiveDps.toLocaleString()}</span></div>
        </div>
      </div>
    </div>

    <h3 style="font-size:1rem; margin-top:24px;">특수 능력</h3>
    <ul class="ability-list">${abilitiesHtml}</ul>
  `;

  const traitSelectEl = document.getElementById("targetTraitSelect");
  if (traitSelectEl) traitSelectEl.value = selectedTargetTrait;
}

function updateBaseLevel(val) {
  currentBaseLevel = Number(val);
  renderDetailContent();
}
function updatePlusLevel(val) {
  currentPlusLevel = Number(val);
  renderDetailContent();
}
function updateTargetTrait(trait) {
  selectedTargetTrait = trait;
  renderDetailContent();
}
function updateTargetDistance(dist) {
  targetDistance = Number(dist);
  const distSpan = document.getElementById("distVal");
  if (distSpan) distSpan.textContent = targetDistance;
  renderDetailContent();
}

function switchForm(formKey) {
  currentFormKey = formKey;
  targetDistance = 0;
  renderDetailContent();
}

function initAutocomplete() {
  const searchInput = document.getElementById("searchInput");
  const listContainer = document.getElementById("autocompleteList");

  searchInput.addEventListener("input", (e) => {
    const keyword = e.target.value.trim().toLowerCase();
    renderList();

    if (!keyword) {
      listContainer.classList.add("hidden");
      listContainer.innerHTML = "";
      return;
    }

    const matched = allUnits.filter(unit => {
      const forms = Object.values(unit.forms);
      return String(unit.id) === keyword || forms.some(f => f.name.toLowerCase().includes(keyword));
    }).slice(0, 8);

    if (matched.length === 0) {
      listContainer.classList.add("hidden");
      return;
    }

    listContainer.innerHTML = matched.map(unit => {
      const formKeys = Object.keys(unit.forms);
      const form1 = unit.forms["0"] || unit.forms[formKeys[0]];
      const defaultKey = unit.forms["0"] ? "0" : formKeys[0];
      return `
        <div class="autocomplete-item" onclick="selectAutocomplete(${unit.id}, '${form1.name}')">
          <img src="assets/img/${unit.id}/${defaultKey}.png" onerror="this.style.display='none'" />
          <div>
            <span style="font-size:0.75rem; color:var(--text-muted);">No.${String(unit.id).padStart(3, "0")}</span>
            <div style="font-weight:600; font-size:0.9rem;">${form1.name}</div>
          </div>
        </div>
      `;
    }).join("");

    listContainer.classList.remove("hidden");
  });

  document.addEventListener("click", (e) => {
    if (!e.target.closest(".search-container")) {
      listContainer.classList.add("hidden");
    }
  });
}

function selectAutocomplete(unitId, name) {
  document.getElementById("searchInput").value = name;
  document.getElementById("autocompleteList").classList.add("hidden");
  showDetailView(unitId);
}

document.getElementById("backBtn").addEventListener("click", () => {
  showMainView();
});

["searchInput", "rarityFilter", "traitFilter", "abilityFilter"].forEach(id => {
  document.getElementById(id).addEventListener("input", renderList);
});

init();
