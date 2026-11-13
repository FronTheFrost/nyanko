let allUnits = [];
let currentUnit = null;
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
  try {
    const res = await fetch("./data/units.json");
    allUnits = await res.json();
    renderList();
    initAutocomplete();
  } catch (err) {
    document.getElementById("resultCount").textContent = "units.json 로드 실패: " + err.message;
  }
}

// 필터링 및 렌더링 (기본적으로 1진 형태 기준 표시)
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
    
    // 속성 아이콘 + 텍스트 렌더링
    const traitsHtml = (form1.traits || [])
      .map(t => `<span class="badge trait-${t}"><img src="assets/img/traits/${t}.png" class="icon-sm" onerror="this.style.display='none'"> ${TRAIT_MAP[t] || t}</span>`).join("");

    return `
      <div class="unit-card" onclick="openUnitModal(${unit.id})">
        <div class="card-top">
          <span class="unit-id">No.${String(unit.id).padStart(3, "0")}</span>
          <span class="unit-rarity">${form1.rarity}</span>
        </div>
        <div class="unit-img-wrap">
          <!-- 폴더 구조: assets/img/캐릭터ID/1.png -->
          <img src="assets/img/${unit.id}/1.png" alt="${form1.name}" loading="lazy" onerror="this.style.display='none'" />
        </div>
        <div class="unit-name">${form1.name}</div>
        <div class="card-traits">${traitsHtml || '<span class="badge">무속성/범용</span>'}</div>
      </div>
    `;
  }).join("");
}

// 실시간 자동완성 검색 드롭다운 로직
function initAutocomplete() {
  const searchInput = document.getElementById("searchInput");
  const listContainer = document.getElementById("autocompleteList");

  searchInput.addEventListener("input", (e) => {
    const keyword = e.target.value.trim().toLowerCase();
    renderList(); // 메인 리스트도 필터링

    if (!keyword) {
      listContainer.classList.add("hidden");
      listContainer.innerHTML = "";
      return;
    }

    const matched = allUnits.filter(unit => {
      const forms = Object.values(unit.forms);
      return String(unit.id) === keyword || forms.some(f => f.name.toLowerCase().includes(keyword));
    }).slice(0, 8); // 최대 8개까지만 추천

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
            <span class="ac-id">No.${String(unit.id).padStart(3, "0")}</span>
            <span class="ac-name">${form1.name}</span>
            <span class="ac-rarity">(${form1.rarity})</span>
          </div>
        </div>
      `;
    }).join("");

    listContainer.classList.remove("hidden");
  });

  // 바깥 영역 누르면 자동완성 닫기
  document.addEventListener("click", (e) => {
    if (!e.target.closest(".search-container")) {
      listContainer.classList.add("hidden");
    }
  });
}

function selectAutocomplete(unitId, name) {
  document.getElementById("searchInput").value = name;
  document.getElementById("autocompleteList").classList.add("hidden");
  renderList();
  openUnitModal(unitId);
}

// 상세 모달 열기 (1~4형태 탭 및 속성/능력 아이콘 반영)
function openUnitModal(unitId) {
  currentUnit = allUnits.find(u => u.id === unitId);
  if (!currentUnit) return;

  const formKeys = Object.keys(currentUnit.forms);
  currentFormKey = formKeys[0]; // 기본 모달 열었을 때도 1형태 기준
  currentLevel = 30;

  renderModalContent();
  document.getElementById("unitModal").classList.remove("hidden");
}

function renderModalContent() {
  const formKeys = Object.keys(currentUnit.forms);
  const form = currentUnit.forms[currentFormKey];

  document.getElementById("formTabs").innerHTML = formKeys.map(k => `
    <button class="tab-btn ${k === currentFormKey ? "active" : ""}" 
            onclick="switchForm('${k}')">
      ${k}형태 (${currentUnit.forms[k].name})
    </button>
  `).join("");

  const hp = calcStat(form.rawHitpoints, currentLevel, form.levelCurve);
  const hits = form.rawAttacks.filter(a => a > 0).map(a => calcStat(a, currentLevel, form.levelCurve));
  const totalAtk = hits.reduce((sum, v) => sum + v, 0);
  const cycleSec = (form.attackCycleFrames / form.fps).toFixed(2);
  const dps = Math.round(totalAtk / (form.attackCycleFrames / form.fps));
  const cdSec = (form.cooldownFrames / form.fps).toFixed(2);
  const rangesText = (form.actualRanges || []).map(r => r.text).join(" / ");

  // 특수 능력 및 아이콘 렌더링
  const abilitiesHtml = (form.abilities || []).map(ab => `
    <li>
      <img src="assets/img/abilities/${ab.key}.png" class="icon-sm" onerror="this.style.display='none'">
      <strong>${ab.label_ko}</strong> ${ab._ref ? `<span class="ref">(${ab._ref})</span>` : ""}
    </li>
  `).join("");

  document.getElementById("modalBody").innerHTML = `
    <div class="modal-header-flex">
      <!-- 폴더 구조: assets/img/캐릭터ID/형태번호.png -->
      <img src="assets/img/${currentUnit.id}/${currentFormKey}.png" alt="${form.name}" class="modal-unit-img" onerror="this.style.display='none'" />
      <div>
        <h2>[No.${String(currentUnit.id).padStart(3, "0")}] ${form.name} <small>(${form.rarity})</small></h2>
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

    <h3>특수 능력</h3>
    <ul class="ability-list">${abilitiesHtml}</ul>
  `;
}

function switchForm(formKey) {
  currentFormKey = formKey;
  renderModalContent();
}

function updateLevel(val) {
  currentLevel = Number(val);
  renderModalContent();
}

["rarityFilter", "traitFilter", "abilityFilter"].forEach(id => {
  document.getElementById(id).addEventListener("input", renderList);
});
document.getElementById("closeModal").addEventListener("click", () => {
  document.getElementById("unitModal").classList.add("hidden");
});

init();
