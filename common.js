const $=s=>document.querySelector(s);
const esc=s=>String(s??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const n=v=>Math.round(v).toLocaleString('ko-KR');
const TR={red:'빨간 적',floating:'떠있는 적',black:'검은 적',metal:'메탈',angel:'천사',alien:'에일리언',zombie:'좀비',relic:'고대종',aku:'악마',traitless:'속성 없음',witch:'마녀',eva:'사도'};
const AF={chance:v=>`확률 ${v}%`,duration_frames:v=>`${(v/30).toFixed(1)}초`,boost_percent:v=>`+${v}%`,threshold_percent:v=>`체력 ${v}% 이하`,hit_count:v=>`${v}연타`,level:v=>`Lv ${v}`,attack_limit:v=>`${v}회 제한`,production_percent:v=>`생산 ${v}%`,attack_to_percent:v=>`공격력 ${v}%로`,dodge_chance:v=>`회피 ${v}%`,dodge_duration_frames:v=>`회피 ${(v/30).toFixed(1)}초`,damage_multiplier:v=>`피해 ${v}배`,received_damage_multiplier:v=>`받는 피해 ${v}배`,current_hp_reduction_percent:v=>`현재 체력 ${v}% 감소`};
const lastK=u=>String(Math.max(...Object.keys(u.forms)));
const sec=f=>f.attackCycleFrames/(f.fps||30);
const mult=(L,c)=>{let p=100;for(let i=2;i<=L;i++)p+=+c[Math.min((i-1)/10|0,c.length-1)]||0;return p/100};
const TREAS=2.5;
function stats(f,b,p,G){const m=mult(b+p,f.levelCurve),sc=v=>Math.floor(Math.round(v*m)*TREAS+1e-9),
  hits=(G?G.atk:f.rawAttacks).map(a=>a>0?sc(a):0),atk=hits.reduce((a,x)=>a+x,0),s=(G?G.cyc:f.attackCycleFrames)/(f.fps||30);
  return{hp:sc(G?G.hp:f.rawHitpoints),hits,atk,dps:atk&&s?atk/s:0}}
const abil=a=>{const x=Object.entries(a).filter(([k,v])=>AF[k]&&typeof v==='number'&&v>0).map(([k,v])=>AF[k](v));if(a.txt)x.push(a.txt);
  return`<b>${esc(a.label_ko)}</b>`+(x.length?` <i>${x.join(' · ')}</i>`:'')+(a.src?` <span class="tag r">${a.src==='ultra'?'초본능':'본능'}</span>`:'')};
async function load(){try{const r=await fetch('data/units.json');if(!r.ok)throw 0;return await r.json()}
  catch(e){$('#cnt').textContent='data/units.json을 불러오지 못했어요. GitHub Pages 같은 웹 주소로 열어야 해요.';return null}}

const TT={33:'red',34:'floating',35:'black',36:'metal',37:'angel',38:'alien',39:'zombie',40:'relic',41:'traitless',57:'aku'};
const tkey=t=>t.kind+t.group;
const tfmt=(id,v)=>[1,2,3,51,60].includes(id)?`확률 ${v[0]}% · ${(v[1]/30).toFixed(1)}초`:[8,11,15,58].includes(id)?`확률 ${v[0]}%`:[18,19,20,21,22,30,52,54].includes(id)?`${v[0]}% 경감`:'';
function derive(u,k,f,st){
  const g={hp:f.rawHitpoints,atk:f.rawAttacks.slice(),cost:f.cost,cd:f.cooldownFrames,spd:f.speed,cyc:f.attackCycleFrames,ab:f.abilities.map(a=>({...a})),tr:[...f.traits]};
  const get=x=>g.ab.find(a=>a.key===x),up=(key,label,p,src)=>{let a=get(key);if(!a)g.ab.push(a={key,label_ko:label});Object.assign(a,p);a.src=src};
  if(+k>=3)for(const t of u.talents||[]){
    const l=(t.kind==='ultra'?st.TU:st.TN)?(st.TL[tkey(t)]??t.maxLevel):0;if(!l)continue;
    const v=t.levels[l].values,id=t.abilityId,s=t.kind;
    if(id===32||id===71)g.hp*=1+v[0]/100;
    else if(id===31)g.atk=g.atk.map(a=>a*(1+v[0]/100));
    else if(id===25)g.cost=Math.max(0,g.cost-v[0]);
    else if(id===26)g.cd=Math.max(60,g.cd-v[0]);
    else if(id===27)g.spd+=v[0];
    else if(id===61)g.cyc=Math.max(1,g.cyc-v[0]);
    else if(id===10)up('strengthen','공격력 업',{threshold_percent:v[0],boost_percent:v[1]},s);
    else if(id===13)up('critical','크리티컬',{chance:(get('critical')?.chance||0)+v[0]},s);
    else if(id===50)up('savage_blow','혼신의 일격',{chance:(get('savage_blow')?.chance||0)+v[0],boost_percent:v[1]},s);
    else if(id===17)up('wave','파동 공격',{chance:v[0],level:v[1]},s);
    else if(id===62)up('mini_wave','소파동',{chance:v[0],level:v[1]},s);
    else if(id===56)up('surge','열파 공격',{chance:v[0],level:v[1],anchor:v[2]/4,span:v[3]/4},s);
    else if(id===65)up('mini_surge','소열파',{chance:v[0],level:v[1],anchor:v[2]/4,span:v[3]/4},s);
    else if(TT[id]){if(!g.tr.includes(TT[id]))g.tr.push(TT[id])}
    else g.ab.push({key:'t'+id,label_ko:t.label,src:s,txt:tfmt(id,v)});
  }
  return g
}
function rangeX(f,G){let x=Math.max(1,...f.actualRanges.map(r=>r.maximum));
  for(const a of G.ab){if(/wave$/.test(a.key))x=Math.max(x,332.5+200*((a.level||1)-1));if(/surge$/.test(a.key))x=Math.max(x,a.anchor+a.span+125);
    if(a.key==='explosion'){const b=a.band_widths;x=Math.max(x,a.anchor+a.span+b[0]/2+b[1]+b[2])}}
  return Math.ceil(x)}
function dps(f,G,S,d,adj,str){
  const A=x=>G.ab.find(a=>a.key===x),cr=A('critical'),sv=A('savage_blow'),mh=A('multi_hit'),st=A('strengthen'),ah=mh?mh.ability_hits:null;
  const cc=adj&&cr?cr.chance/100:0,sc=adj&&sv?sv.chance/100:0,sb=sv?sv.boost_percent/100:0;
  const E=h=>!ah||ah.includes(h)?(1+cc)*(1+sc*sb):1;
  let t=0;for(const r of f.actualRanges)if(d>=r.minimum&&d<=r.maximum)t+=(S.hits[r.hit-1]||0)*E(r.hit);
  if(adj)S.hits.forEach((h,i)=>{const hn=i+1;if(!h||(ah&&!ah.includes(hn)))return;const e=h*E(hn);
    for(const[key,m]of[['wave',1],['mini_wave',.2]]){const a=A(key);if(a&&d>-67.5&&d<=332.5+200*((a.level||1)-1))t+=e*m*a.chance/100}
    for(const[key,m]of[['surge',1],['mini_surge',.2]]){const a=A(key);if(!a)continue;
      const lo=a.anchor,hi=a.anchor+a.span,cnt=Math.max(1,Math.round(a.span*4));
      const pos=a.span>0?Math.max(0,Math.min(hi,d+250)-Math.max(lo,d-125))*4:(lo>=d-125&&lo<d+250?1:0);
      t+=e*m*(a.chance/100)*(a.level||1)*pos/cnt}
    const x=A('explosion');if(x){const lo=x.anchor,hi=x.anchor+x.span,cnt=Math.max(1,Math.round(x.span*4)),bw=x.band_widths,e0=bw[0]/2,e1=e0+bw[1],e2=e1+bw[2];
      const ov=(a,b)=>Math.max(0,Math.min(hi,b)-Math.max(lo,a));let w;
      if(x.span>0)w=[ov(d-e0,d+e0),ov(d-e1,d-e0)+ov(d+e0,d+e1),ov(d-e2,d-e1)+ov(d+e1,d+e2)].map(v=>v*4);
      else{const q=Math.abs(d-lo);w=[q<=e0?1:0,q>e0&&q<=e1?1:0,q>e1&&q<=e2?1:0]}
      const p=x.damage_bands_percent;t+=e*(x.chance/100)*(w[0]*p[0]+w[1]*p[1]+w[2]*p[2])/100/cnt}});
  if(str&&st)t*=1+st.boost_percent/100;
  return t/(G.cyc/(f.fps||30))
}

자 여기.
