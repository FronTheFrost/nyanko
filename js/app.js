let allUnits = [];
let currentUnit = null;
let currentFormKey = "1";
let currentLevel = 30;

const TRAIT_MAP = {
  red: "빨간 적", floating: "떠있는 적", black: "검은 적", metal: "메탈 적",
  angel: "천사", alien: "에이리언", zombie: "좀비", relic: "고대종",
  aku: "악마", traitless: "무속성"
};

// 냥코대전쟁 공식 레벨 배율 계산 (미래편/우주편 보물 2.5배 기준)
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

// JSON 로드
async function init() {
  try {
    const res = await fetch("./data/units.json");
    allUnits = await res.json();
    renderList();
  } catch (err) {
    document.getElementById("resultCount").textContent = "units.json 로드 실패: " + err.message;
  }
}

// 검색 및 필터링
function renderList() {
  const query = document.getElementById("searchInput").value.trim().toLowerCase();
  const rarity = document.getElementById("rarityFilter").value;
  const trait = document.getElementById("traitFilter").value;
  const ability = document.getElementById("abilityFilter").value;

  const filtered = allUnits.filter(unit => {
    const forms = Object.values(unit.forms);
    const highestForm = forms[forms.length - 1];

    // 등급 필터
    if (rarity !== "ALL" && highestForm.rarity !== rarity) return false;

    // 이름/ID 검색 (1~4진 이름 모두 검색)
    if (query) {
      const matchId = String(unit.id) === query;
      const matchName = forms.some(f => f.name.toLowerCase().includes(query));
      if (!matchId && !matchName) return false;
    }

    // 속성 필터 (모든 진화 형태 중 하나라도 해당하면 통과)
    if (trait !== "ALL") {
      const hasTrait = forms.some(f => f.traits && f.traits.includes(trait));
      if (!hasTrait) return false;
    }

    // 능력 필터
    if (ability !== "ALL") {
      const hasAbility = forms.some(f => f.abilities && f.abilities.some(a => a.key === ability));
      if (!hasAbility) return false;
    }

    return true;
  });

  document.getElementById("resultCount").textContent = `검색 결과: ${filtered.length}개 유닛`;

  const grid = document.getElementById("unitGrid");
  // 렌더링 성능 보호를 위해 상위 120개 우선 표시 (필요 시 더보기 구현)
  grid.innerHTML = filtered.slice(0, 120).map(unit => {
    const formKeys = Object.keys(unit.forms);
    const latest = unit.forms[formKeys[formKeys.length - 1]];
    const traitsHtml = (latest.traits || [])
      .map(t => `<span class="badge trait-${t}">${TRAIT_MAP[t] || t}</span>`).join("");

    return `
      <div class="unit-card" onclick="openUnitModal(${unit.id})">
        <div class="card-top">
          <span class="unit-id">No.${String(unit.id).padStart(3, "0")}</span>
          <span class="unit-rarity">${latest.rarity}</span>
        </div>
        <div class="unit-name">${latest.name}</div>
        <div class="unit-sub">1진: ${unit.forms["1"].name}</div>
        <div class="card-traits">${traitsHtml || '<span class="badge">무속성/범용</span>'}</div>
      </div>
    `;
  }).join("");
}

// 상세 모달 열기
function openUnitModal(unitId) {
  currentUnit = allUnits.find(u => u.id === unitId);
  if (!currentUnit) return;

  const formKeys = Object.keys(currentUnit.forms);
  currentFormKey = formKeys[formKeys.length - 1]; // 기본으로 최종 진화 형태 표시
  currentLevel = 30;

  renderModalContent();
  document.getElementById("unitModal").classList.remove("hidden");
}

function renderModalContent() {
  const formKeys = Object.keys(currentUnit.forms);
  const form = currentUnit.forms[currentFormKey];

  // 진화 단계 탭
  document.getElementById("formTabs").innerHTML = formKeys.map(k => `
    <button class="tab-btn ${k === currentFormKey ? "active" : ""}" 
            onclick="switchForm('${k}')">
      ${k}형태 (${currentUnit.forms[k].name})
    </button>
  `).join("");

  // 스탯 및 DPS 계산
  const hp = calcStat(form.rawHitpoints, currentLevel, form.levelCurve);
  const hits = form.rawAttacks.filter(a => a > 0).map(a => calcStat(a, currentLevel, form.levelCurve));
  const totalAtk = hits.reduce((sum, v) => sum + v, 0);
  const cycleSec = (form.attackCycleFrames / form.fps).toFixed(2);
  const dps = Math.round(totalAtk / (form.attackCycleFrames / form.fps));
  const cdSec = (form.cooldownFrames / form.fps).toFixed(2);
  const rangesText = (form.actualRanges || []).map(r => r.text).join(" / ");

  // 능력 목록
  const abilitiesHtml = (form.abilities || []).map(ab => `
    <li><strong>${ab.label_ko}</strong> ${ab._ref ? `<span class="ref">(${ab._ref})</span>` : ""}</li>
  `).join("");

  // 본능 목록
  const talentsHtml = (currentUnit.talents || []).length > 0
    ? currentUnit.talents.map(t => `
        <div class="talent-item">
          <span class="talent-kind ${t.kind}">${t.kind === "ultra" ? "초본능" : "본능"}</span>
          <strong>${t.label}</strong> (Max Lv.${t.maxLevel})
          <p>${t.description.replace(/\n/g, " ")}</p>
        </div>
      `).join("")
    : "<p class='empty'>본능 데이터 없음</p>";

  document.getElementById("modalBody").innerHTML = `
    <h2>[No.${String(currentUnit.id).padStart(3, "0")}] ${form.name} <small>(${form.rarity})</small></h2>
    <p class="desc">${form.description.replace(/\n/g, "<br>")}</p>

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
      <tr><th>이동 속도</th><td>${form.speed}</td><th>히트백 (KB)</th><td>${form.knockbacks}회</td></tr>
    </table>

    <h3>특수 능력</h3>
    <ul class="ability-list">${abilitiesHtml}</ul>

    <h3>본능 정보</h3>
    <div class="talent-list">${talentsHtml}</div>
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

// 이벤트 연결
["searchInput", "rarityFilter", "traitFilter", "abilityFilter"].forEach(id => {
  document.getElementById(id).addEventListener("input", renderList);
});
document.getElementById("closeModal").addEventListener("click", () => {
  document.getElementById("unitModal").classList.add("hidden");
});

init();
