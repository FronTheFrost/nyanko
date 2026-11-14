const $=s=>document.querySelector(s);
const esc=s=>String(s??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const n=v=>Math.round(v).toLocaleString('ko-KR');
const TR={red:'빨간 적',floating:'떠있는 적',black:'검은 적',metal:'메탈',angel:'천사',alien:'에일리언',zombie:'좀비',relic:'고대종',aku:'악마',traitless:'무속성',witch:'마녀',eva:'사도'};
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
const TK={55:'surge_immune',48:'wave_immune',29:'curse_immune',49:'warp_immune',47:'knockback_immune',46:'slow_immune',44:'weaken_immune',45:'freeze_immune',53:'toxic_immune',69:'explosion_immune',14:'zombie_killer',15:'barrier_breaker',58:'shield_piercer',59:'soulstrike',60:'curse',63:'colossus_slayer',64:'behemoth_slayer',66:'sage_slayer',1:'weaken',2:'freeze',3:'slow',8:'knockback',11:'survive',51:'dodge',5:'strong',6:'resistant',7:'massive_damage',16:'double_bounty',68:'counter_surge',72:'production_speed'};
const SP={colossus:['초생명체','colossus_slayer',1.6],behemoth:['초수','behemoth_slayer',2.5],sage:['초현자','sage_slayer',1.2],villain:['괴인','villain_slayer',2.5],witch:['마녀','witch_killer',5],eva:['사도','eva_killer',5]};
const FR=['red','floating','black','metal','angel','alien','zombie'];
const tkey=t=>t.kind+t.group;
const tfmt=(id,v)=>[1,2,3,51,60].includes(id)?`확률 ${v[0]}% · ${(v[1]/30).toFixed(1)}초`:[8,11,15,58].includes(id)?`확률 ${v[0]}%`:[18,19,20,21,22,30,52,54].includes(id)?`${v[0]}% 경감`:'';
function derive(u,k,f,st){
  const lh=f.lastHitFrame||0,bk=(f.attackAnimationFrames||0)-lh;
  const g={hp:f.rawHitpoints,atk:f.rawAttacks.slice(),cost:f.cost,cd:f.cooldownFrames,spd:f.speed,tba:2*f.rawAttackInterval-1,lh,bk,cyc:f.attackCycleFrames,ab:f.abilities.map(a=>({...a})),tr:[...f.traits],trsrc:{},mod:{}};
  const get=x=>g.ab.find(a=>a.key===x),up=(key,label,p,src)=>{let a=get(key);if(!a)g.ab.push(a={key,label_ko:label});Object.assign(a,p);a.src=src};
  if(+k>=3)for(const t of u.talents||[]){
    const l=(t.kind==='ultra'?st.TU:st.TN)?(st.TL[tkey(t)]??t.maxLevel):0;if(!l)continue;
    const v=t.levels[l].values,id=t.abilityId,s=t.kind,mk=x=>g.mod[x]=(s==='ultra'||g.mod[x]==='ultra')?'ultra':'normal';
    if(id===32||id===71){g.hp*=1+v[0]/100;mk('hp')}
    else if(id===31){g.atk=g.atk.map(a=>a*(1+v[0]/100));mk('atk')}
    else if(id===25)g.cost=Math.max(0,g.cost-v[0]);
    else if(id===26)g.cd=Math.max(60,g.cd-v[0]);
    else if(id===27)g.spd+=v[0];
    else if(id===61){g.tba=Math.max(1,g.tba-2*v[0]);g.cyc=f.attackAnimationAvailable?lh+Math.max(bk,g.tba):g.cyc-2*v[0]}
    else if(id===10){const a=get('strengthen');up('strengthen','공격력 업',{threshold_percent:v[0]>0?v[0]:(a?.threshold_percent||0),boost_percent:(a?.boost_percent||0)+v[1]},s)}
    else if(id===13)up('critical','크리티컬',{chance:(get('critical')?.chance||0)+v[0]},s);
    else if(id===50){const a=get('savage_blow');up('savage_blow','혼신의 일격',{chance:(a?.chance||0)+v[0],boost_percent:v[1]>0?v[1]:(a?.boost_percent||0)},s)}
    else if(id===17)up('wave','파동 공격',{chance:v[0],level:v[1]},s);
    else if(id===62)up('mini_wave','소파동',{chance:v[0],level:v[1]},s);
    else if(id===56)up('surge','열파 공격',{chance:v[0],level:v[1],anchor:v[2]/4,span:v[3]/4},s);
    else if(id===65)up('mini_surge','소열파',{chance:v[0],level:v[1],anchor:v[2]/4,span:v[3]/4},s);
    else if(id===67)up('explosion','폭파 공격',{chance:v[0],anchor:v[1]/4,span:0,damage_bands_percent:[100,70,40],band_widths:[150,100,100]},s);
    else if([1,2,3,51,60].includes(id)){const key=TK[id],a=get(key),p={chance:(a?.chance||0)+v[0],duration_frames:(a?.duration_frames||0)+v[1]};if(id===1&&!a)p.attack_to_percent=100-v[2];up(key,t.label,p,s)}
    else if([8,11,15,58].includes(id)){const key=TK[id];up(key,t.label,{chance:(get(key)?.chance||0)+v[0]},s)}
    else if(TT[id]){if(!g.tr.includes(TT[id])){g.tr.push(TT[id]);g.trsrc[TT[id]]=s}}
    else up(TK[id]||'t'+id,t.label,{txt:tfmt(id,v)},s);
  }
  return g
}
function mkctx(G,EN,strOn){
  const has=x=>G.ab.some(a=>a.key===x),A=x=>G.ab.find(a=>a.key===x),cr=A('critical'),sv=A('savage_blow'),st=A('strengthen');
  let m=1,r=1;const hit=G.tr.filter(t=>EN.has(t));
  if(hit.length){const fr=hit.some(t=>FR.includes(t));m*=has('insane_damage')?(fr?6:5):has('massive_damage')?(fr?4:3):has('strong')?(fr?1.8:1.5):1;r=has('insanely_tough')?(fr?1/7:1/6):has('resistant')?(fr?1/5:1/4):has('strong')?(fr?.4:.5):1}
  for(const[e,[,key,x]]of Object.entries(SP))if(EN.has(e)&&has(key))m*=x;
  if(EN.has('sage')&&has('sage_slayer'))r*=A('sage_slayer').received_damage_multiplier??1;
  return{m,r,metal:EN.has('metal'),str:strOn&&st?1+st.boost_percent/100:1,cc:cr?cr.chance/100:0,sc:sv?sv.chance/100:0,sb:sv?sv.boost_percent/100:0}
}
function ehit(att,ap,adj,c){
  const b=att*c.m*c.str,norm=c.metal?1:b*(adj&&ap?1+c.sc*c.sb:1);
  return adj&&ap&&c.cc?(1-c.cc)*norm+c.cc*b*2*(1+c.sc*c.sb):norm
}
function rangeX(f,G){let x=Math.max(1,...f.actualRanges.map(r=>r.maximum));
  for(const a of G.ab){if(/wave$/.test(a.key))x=Math.max(x,332.5+200*((a.level||1)-1));if(/surge$/.test(a.key))x=Math.max(x,a.anchor+a.span+125);
    if(a.key==='explosion'){const b=a.band_widths;x=Math.max(x,a.anchor+a.span+b[0]/2+b[1]+b[2])}}
  return Math.ceil(x)}
function rangeMin(f,G){let x=Math.min(0,...f.actualRanges.map(r=>r.minimum));
  for(const a of G.ab){if(/wave$/.test(a.key))x=Math.min(x,-67.5);if(/surge$/.test(a.key))x=Math.min(x,a.anchor-250);
    if(a.key==='explosion'){const b=a.band_widths;x=Math.min(x,a.anchor-b[0]/2-b[1]-b[2])}}
  return Math.floor(x)}
function dps(f,G,S,d,adj,c){
  const A=x=>G.ab.find(a=>a.key===x),ah=A('multi_hit')?.ability_hits||null,ap=h=>!ah||ah.includes(h);
  let t=0;for(const r of f.actualRanges)if(d>=r.minimum&&d<=r.maximum)t+=ehit(S.hits[r.hit-1]||0,ap(r.hit),adj,c);
  if(adj)S.hits.forEach((h,i)=>{if(!h||!ap(i+1))return;
    for(const[key,m]of[['wave',1],['mini_wave',.2]]){const a=A(key);if(a&&d>-67.5&&d<=332.5+200*((a.level||1)-1))t+=ehit(h*m,1,1,c)*a.chance/100}
    for(const[key,m]of[['surge',1],['mini_surge',.2]]){const a=A(key);if(!a)continue;
      const lo=a.anchor,hi=lo+a.span,cnt=Math.max(1,Math.round(a.span*4)),pos=a.span>0?Math.max(0,Math.min(hi,d+250)-Math.max(lo,d-125))*4:(lo>=d-125&&lo<d+250?1:0);
      t+=ehit(h*m,1,1,c)*(a.chance/100)*(a.level||1)*pos/cnt}
    const x=A('explosion');if(x){const lo=x.anchor,hi=lo+x.span,cnt=Math.max(1,Math.round(x.span*4)),bw=x.band_widths,e0=bw[0]/2,e1=e0+bw[1],e2=e1+bw[2],ov=(a,b)=>Math.max(0,Math.min(hi,b)-Math.max(lo,a));let w;
      if(x.span>0)w=[ov(d-e0,d+e0),ov(d-e1,d-e0)+ov(d+e0,d+e1),ov(d-e2,d-e1)+ov(d+e1,d+e2)].map(v=>v*4);
      else{const q=Math.abs(d-lo);w=[q<=e0?1:0,q>e0&&q<=e1?1:0,q>e1&&q<=e2?1:0]}
      w.forEach((n2,j)=>{if(n2)t+=ehit(h*x.damage_bands_percent[j]/100,1,1,c)*(x.chance/100)*n2/cnt})}});
  return t/(G.cyc/(f.fps||30))
}

const ICON={"strong":"203","weaken":"195","critical":"201","knockback":"207","weaken_immune":"213","zombie_killer":"260","survive":"199","warp_immune":"262","mini_wave":"293","slow":"198","knockback_immune":"216","barrier_breaker":"264","freeze":"197","freeze_immune":"214","curse_immune":"116","resistant":"204","wave_blocker":"218","massive_damage":"206","wave_immune":"210","double_bounty":"205","wave":"208","slow_immune":"215","strengthen":"196","counter_surge":"315","colossus_slayer":"297","behemoth_slayer":"302","attack_only":"202","sage_slayer":"319","dodge":"231","surge":"239","base_destroyer":"200","soulstrike":"300","curse":"289","toxic_immune":"237","explosion":"335","explosion_immune":"337","surge_immune":"243","mini_surge":"310","savage_blow":"229","shield_piercer":"296","production_speed":"396","t20":"47","t19":"45","t18":"43","t22":"51","t21":"49","t30":"109","t52":"235","t54":"241","single":"217","area":"211","omni_strike":"112"};
const ICONID={"1":"195","2":"197","3":"198","4":"202","5":"203","6":"204","7":"206","8":"207","9":"266","10":"196","11":"199","12":"200","13":"201","14":"260","15":"264","16":"205","17":"208","18":"43","19":"45","20":"47","21":"49","22":"51","23":"218","24":"53","29":"116","30":"109","44":"213","45":"214","46":"215","47":"216","48":"210","49":"262","50":"229","51":"231","52":"235","53":"237","54":"241","55":"243","56":"239","58":"296","59":"300","60":"289","62":"293","63":"297","64":"302","65":"310","66":"319","67":"335","68":"315","69":"337","72":"396","33":"219","34":"220","35":"221","36":"222","37":"223","38":"224","39":"225","40":"226","57":"294","41":"227"};

const SM={colossus_slayer:1.6,behemoth_slayer:2.5,witch_killer:5,eva_killer:5},DUR=['weaken','freeze','slow','curse'],MR={strong:[1.5,1.8],massive_damage:[3,4],insane_damage:[5,6]};
const rg=(v,f,d)=>{const lo=Math.min(...v),hi=Math.max(...v);return lo===hi?f(lo):d?f(hi)+'~'+f(lo):f(lo)+'~'+f(hi)},fx=(a,b,p)=>a+(b-a)*p/300;
// 과실 보정: 대상 속성마다 과실 0(없음)~300(최대). 선택한 속성이 있으면 그 속성만, 없으면 유닛의 대응 속성 전체
const FPof=(G,EN)=>{const R=EN.size?G.tr.filter(t=>EN.has(t)):G.tr;return R.length?R.map(t=>FR.includes(t)?300:0):[0]};
function det(a,P){if(a.txt)return a.txt;const x=[],ch=a.chance??a.dodge_chance,du=a.duration_frames??a.dodge_duration_frames;
  if(ch>0)x.push(`확률 ${ch}%`);
  if(du>0)x.push((DUR.includes(a.key)?rg(P.map(p=>Math.floor(du*(1500+p)/1500)),v=>+(v/30).toFixed(1)):+(du/30).toFixed(1))+'초');
  if(MR[a.key])x.push(rg(P.map(p=>fx(MR[a.key][0],MR[a.key][1],p)),v=>+v.toFixed(2))+'배');
  else if(a.key==='resistant')x.push('받는 피해 '+rg(P.map(p=>fx(1/4,1/5,p)),v=>'1/'+Math.round(1/v),1));
  else if(a.key==='insanely_tough')x.push('받는 피해 '+rg(P.map(p=>fx(1/6,1/7,p)),v=>'1/'+Math.round(1/v),1));
  else{const m=SM[a.key]??a.damage_multiplier??(a.boost_percent?1+a.boost_percent/100:a.attack_to_percent?a.attack_to_percent/100:0);if(m)x.push(`${+(+m).toFixed(2)}배`)}
  if(a.level>0&&/wave|surge/.test(a.key))x.push(`Lv.${a.level}`);
  if(/surge|explosion/.test(a.key)&&a.anchor!=null)x.push('생성 '+(a.span>0?`${a.anchor}~${a.anchor+a.span}`:a.anchor));return x.join(' · ')}
const header=q=>`<header><div class="bar"><a class="brand" href="index.html">냥코<span>연구소</span></a><form class="sf" action="index.html"><input name="q" type="search" value="${esc(q||'')}" placeholder="유닛 이름 검색" autocomplete="off"></form></div></header>`;
