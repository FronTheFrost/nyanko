let allUnits = [];
let currentUnitId = null;
let currentFormKey = "1";
let currentLevel = 30;

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
    // 절대경로/상대경로 모두 대응하도록 수정
    const res = await fetch("./data/units.json");
    if (!res.ok) throw new Error(`HTTP 에러 (${res.status})`);
    
    allUnits = await res.json();
    
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
  const formKeys = Object.keys(unit.forms);
  currentFormKey = formKeys[0];
  currentLevel = 30;

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
    const form1 = unit.forms["1"] || Object.values(unit.forms)[0];
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
    const form1 = unit.forms["1"] || Object.values(unit.forms)[0];
    
    const traitsHtml = (form1.traits || [])
      .map(t => `<span class="badge"><img src="assets/img/traits/${t}.png" class="icon-sm" onerror="this.style.display='none'"> ${TRAIT_MAP[t] || t}</span>`).join("");

    return `
      <div class="unit-card" onclick="showDetailView(${unit.id})">
        <div class="card-top">
          <span class="unit-id">No.${String(unit.id).padStart(3, "0")}</span>
          <span class="unit-rarity">${form1.rarity}</span>
        </div>
        <div class="unit-img-wrap">
          <img src="assets/img/${unit.id}/1.png" alt="${form1.name}" loading="lazy" onerror="this.style.display='none'" />
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

  const formKeys = Object.keys(unit.forms);
  const form = unit.forms[currentFormKey];

  document.getElementById("formTabs").innerHTML = formKeys.map(k => `
    <button class="tab-btn ${k === currentFormKey ? "active" : ""}" 
            onclick="switchForm('${k}')">
      ${k}형태 (${unit.forms[k].name})
    </button>
  `).join("");

  const hp = calcStat(form.rawHitpoints, currentLevel, form.levelCurve);
  const hits = form.rawAttacks.filter(a => a > 0).map(a => calcStat(a, currentLevel, form.levelCurve));
  const totalAtk = hits.reduce((sum, v) => sum + v, 0);
  const cycleSec = (form.attackCycleFrames / form.fps).toFixed(2);
  const dps = Math.round(totalAtk / (form.attackCycleFrames / form.fps));
  const cdSec = (form.cooldownFrames / form.fps).toFixed(2);
  const rangesText = (form.actualRanges || []).map(r => r.text).join(" / ");

  const abilitiesHtml = (form.abilities || []).map(ab => `
    <li>
      <img src="assets/img/abilities/${ab.key}.png" class="icon-sm" onerror="this.style.display='none'">
      <strong>${ab.label_ko}</strong> ${ab._ref ? `<span class="ref">(${ab._ref})</span>` : ""}
    </li>
  `).join("");

  document.getElementById("detailBody").innerHTML = `
    <div class="detail-header-flex">
      <img src="assets/img/${unit.id}/${currentFormKey}.png" alt="${form.name}" class="detail-unit-img" onerror="this.style.display='none'" />
      <div>
        <h2>[No.${String(unit.id).padStart(3, "0")}] ${form.name} <small style="color:var(--text-muted); font-size:0.8rem;">(${form.rarity})</small></h2>
        <p class="desc">${form.description.replace(/\n/g, "<br>")}</p>
      </div>
    </div>

    <div class="level-control">
      <label>기준 레벨: <strong>Lv.${currentLevel}</strong></label>
      <input type="range" min="1" max="${form.maxBaseLevel + form.maxPlusLevel}" value="${currentLevel}" 
             oninput="updateLevel(this.value)" />
    </div>

    <table class="stat-table">
      <tr><th>체력</th><td>${hp.toLocaleString()}</td><th>공격력</th><td>${totalAtk.toLocaleString()} (${hits.join(" / ")})</td></tr>
      <tr><th>DPS</th><td>${dps.toLocaleString()}</td><th>인식 사거리</th><td>${form.recognitionRange} (실제: ${rangesText})</td></tr>
      <tr><th>공격 주기</th><td>${form.attackCycleFrames}f (${cycleSec}초)</td><th>선딜레이</th><td>${form.foreswingFrames.join(", ")}f</td></tr>
      <tr><th>생산 코스트</th><td>${form.cost}원</td><th>재생산</th><td>${form.cooldownFrames}f (${cdSec}초)</td></tr>
    </table>

    <h3 style="font-size:1rem; margin-top:24px;">특수 능력</h3>
    <ul class="ability-list">${abilitiesHtml}</ul>
  `;
}

function switchForm(formKey) {
  currentFormKey = formKey;
  renderDetailContent();
}

function updateLevel(val) {
  currentLevel = Number(val);
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
      const form1 = unit.forms["1"] || Object.values(unit.forms)[0];
      return `
        <div class="autocomplete-item" onclick="selectAutocomplete(${unit.id}, '${form1.name}')">
          <img src="assets/img/${unit.id}/1.png" onerror="this.style.display='none'" />
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
