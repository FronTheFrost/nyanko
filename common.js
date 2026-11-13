const $=s=>document.querySelector(s);
const esc=s=>String(s??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const n=v=>Math.round(v).toLocaleString('ko-KR');
const TR={red:'빨간 적',floating:'떠있는 적',black:'검은 적',metal:'메탈',angel:'천사',alien:'에일리언',zombie:'좀비',relic:'고대종',aku:'악마',traitless:'속성 없음',witch:'마녀',eva:'사도'};
const AF={chance:v=>`확률 ${v}%`,duration_frames:v=>`${(v/30).toFixed(1)}초`,boost_percent:v=>`+${v}%`,threshold_percent:v=>`체력 ${v}% 이하`,hit_count:v=>`${v}연타`,level:v=>`Lv ${v}`,attack_limit:v=>`${v}회 제한`,production_percent:v=>`생산 ${v}%`,attack_to_percent:v=>`공격력 ${v}%로`,dodge_chance:v=>`회피 ${v}%`,dodge_duration_frames:v=>`회피 ${(v/30).toFixed(1)}초`,damage_multiplier:v=>`피해 ${v}배`,received_damage_multiplier:v=>`받는 피해 ${v}배`,current_hp_reduction_percent:v=>`현재 체력 ${v}% 감소`};
const lastK=u=>String(Math.max(...Object.keys(u.forms)));
const sec=f=>f.attackCycleFrames/(f.fps||30);
const mult=(L,c)=>{let p=100;for(let i=2;i<=L;i++)p+=+c[Math.min((i-1)/10|0,c.length-1)]||0;return p/100};
function stats(f,b,p){const m=mult(b+p,f.levelCurve),hits=f.rawAttacks.map(a=>a>0?Math.round(a*m):0),atk=hits.reduce((a,x)=>a+x,0);
  return{hp:Math.round(f.rawHitpoints*m),hits,atk,dps:atk&&sec(f)?atk/sec(f):0}}
const abil=a=>{const x=Object.entries(a).filter(([k,v])=>AF[k]&&typeof v==='number'&&v>0).map(([k,v])=>AF[k](v));return`<b>${esc(a.label_ko)}</b>`+(x.length?` <i>${x.join(' · ')}</i>`:'')};
async function load(){try{const r=await fetch('data/units.json');if(!r.ok)throw 0;return await r.json()}
  catch(e){$('#cnt').textContent='data/units.json을 불러오지 못했어요. GitHub Pages 같은 웹 주소로 열어야 해요.';return null}}
