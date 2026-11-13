let currentBaseLevel = 30;
let currentPlusLevel = 0;
let selectedTargetTrait = "ALL"; // 선택한 적 속성
let targetDistance = 0;          // 적과의 거리 시뮬레이션용

// 상세 페이지 렌더링 (레벨, 속성 선택, 거리별 DPS 포함)
function renderDetailContent() {
  const unit = allUnits.find(u => u.id === currentUnitId);
  if (!unit) return;

  const formKeys = Object.keys(unit.forms);
  const form = unit.forms[currentFormKey];

  // 최초 진입 시 max 레벨로 기본 세팅 (초과 방지)
  if (currentBaseLevel > form.maxBaseLevel) currentBaseLevel = form.maxBaseLevel;
  if (currentPlusLevel > form.maxPlusLevel) currentPlusLevel = form.maxPlusLevel;
  const totalLevel = currentBaseLevel + currentPlusLevel;

  document.getElementById("formTabs").innerHTML = formKeys.map(k => `
    <button class="tab-btn ${k === currentFormKey ? "active" : ""}" 
            onclick="switchForm('${k}')">
      ${k}형태 (${unit.forms[k].name})
    </button>
  `).join("");

  // 1. 기본 스탯 계산 (합산 레벨 기준)
  const hp = calcStat(form.rawHitpoints, totalLevel, form.levelCurve);
  
  // 기본 공격력 배열 (다단히트 각각의 공격력)
  const rawHits = form.rawAttacks.filter(a => a > 0);
  const baseHitsAtk = rawHits.map(a => calcStat(a, totalLevel, form.levelCurve));
  const baseTotalAtk = baseHitsAtk.reduce((sum, v) => sum + v, 0);

  // 2. 특수 능력 배율(속성 상성) 계산
  let multiplier = 1.0;
  let activeAbilityText = "";
  
  if (selectedTargetTrait !== "ALL" && form.abilities) {
    form.abilities.forEach(ab => {
      // 대상 속성과 일치하거나 무속성/모든 적일 때 배율 적용
      const isTargetMatch = ab.traits && (ab.traits.includes(selectedTargetTrait) || ab.traits.includes("all"));
      
      if (isTargetMatch) {
        if (ab.key === "massive_damage" || ab.key === "insane_damage") {
          multiplier = ab.multiplier ? ab.multiplier / 100 : 4.0; // 보통 초데미지 4배, 극데미지 5~6배
          activeAbilityText = ` (${ab.label_ko}: ${multiplier}배 적용)`;
        } else if (ab.key === "strong") {
          multiplier = 1.5; // 엄청 강하다 (일반적으로 1.5배~1.6배)
          activeAbilityText = ` (엄청 강하다: 1.5배 적용)`;
        }
      }
    });
  }

  // 속성이 적용된 최종 데미지 및 DPS
  const finalHitsAtk = baseHitsAtk.map(a => Math.round(a * multiplier));
  const finalTotalAtk = finalHitsAtk.reduce((sum, v) => sum + v, 0);
  
  const cycleSec = form.attackCycleFrames > 0 ? (form.attackCycleFrames / form.fps).toFixed(2) : 0;
  const baseDps = cycleSec > 0 ? Math.round(baseTotalAtk / (form.attackCycleFrames / form.fps)) : 0;
  const finalDps = cycleSec > 0 ? Math.round(finalTotalAtk / (form.attackCycleFrames / form.fps)) : 0;
  
  const cdSec = (form.cooldownFrames / form.fps).toFixed(2);
  const rangesText = (form.actualRanges || []).map(r => r.text).join(" / ");

  // 3. 거리별 유효 히트 및 DPS 계산 (실제 타점 분석)
  // actualRanges 구조 예시: [{min: 300, max: 500, text: "300~500"}, ...]
  let distanceEffectiveAtk = 0;
  if (form.actualRanges && form.actualRanges.length > 0) {
    form.actualRanges.forEach((range, idx) => {
      // targetDistance가 해당 히트의 최소/최대 사거리 범위 내에 있는지 확인
      if (targetDistance >= range.min && targetDistance <= range.max) {
        distanceEffectiveAtk += finalHitsAtk[idx] || 0;
      }
    });
  } else {
    distanceEffectiveAtk = finalTotalAtk; // 정보가 없으면 전체 데미지
  }
  const distanceEffectiveDps = cycleSec > 0 ? Math.round(distanceEffectiveAtk / (form.attackCycleFrames / form.fps)) : 0;

  // 특수 능력 리스트 렌더링
  const abilitiesHtml = (form.abilities || []).map(ab => `
    <li>
      <img src="assets/img/abilities/${ab.key}.png" class="icon-sm" onerror="this.style.display='none'">
      <strong>${ab.label_ko}</strong> ${ab._ref ? `<span class="ref">(${ab._ref})</span>` : ""}
    </li>
  `).join("");

  document.getElementById("detailBody").innerHTML = `
    <div class="detail-header-flex">
      <img src="assets/img/${currentUnitId}/${currentFormKey}.png" alt="${form.name}" class="detail-unit-img" onerror="this.style.display='none'" />
      <div>
        <h2>[No.${String(currentUnitId).padStart(3, "0")}] ${form.name} <small style="color:var(--text-muted); font-size:0.8rem;">(${form.rarity})</small></h2>
        <p class="desc">${form.description.replace(/\n/g, "<br>")}</p>
      </div>
    </div>

    <!-- 1. 레벨 조절 컨트롤 (기본 레벨 + 플러스 레벨 분리) -->
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

    <!-- 3. 속성 상성 선택 필터 -->
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

    <!-- 스탯 결과 테이블 -->
    <table class="stat-table">
      <tr><th>체력</th><td>${hp.toLocaleString()}</td><th>공격력${activeAbilityText}</th><td><b>${finalTotalAtk.toLocaleString()}</b> (${finalHitsAtk.join(" / ")})</td></tr>
      <tr><th>DPS</th><td><span class="highlight-dps">${finalDps.toLocaleString()}</span></td><th>인식 사거리</th><td>${form.recognitionRange} (실제 타점: ${rangesText || '단일/전체'})</td></tr>
      <tr><th>공격 주기</th><td>${form.attackCycleFrames}f (${cycleSec}초)</td><th>선딜레이</th><td>${form.foreswingFrames.join(", ")}f</td></tr>
      <tr><th>생산 코스트</th><td>${form.cost}원</td><th>재생산</th><td>${form.cooldownFrames}f (${cdSec}초)</td></tr>
    </table>

    <!-- 2. 거리별 사거리 DPS 시뮬레이터 -->
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

  // 선택된 속성 셀렉터 값 유지
  const traitSelectEl = document.getElementById("targetTraitSelect");
  if (traitSelectEl) traitSelectEl.value = selectedTargetTrait;
}

// 레벨 및 옵션 조절 함수들
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
  // 전체를 다시 그리지 않고 실시간성 확보를 위해 데미지 수치만 부분 업데이트할 수도 있지만, 안전하게 렌더링 호출
  renderDetailContent();
}

function switchForm(formKey) {
  currentFormKey = formKey;
  targetDistance = 0; // 형태 변경 시 거리 초기화
  renderDetailContent();
}
