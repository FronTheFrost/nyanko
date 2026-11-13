function dps(f,G,S,d,adj,str,useCR=true,useSV=true){
  const A=x=>G.ab.find(a=>a.key===x),
    cr=A('critical'),
    sv=A('savage_blow'),
    mh=A('multi_hit'),
    st=A('strengthen'),
    ah=mh?mh.ability_hits:null;
  // adj는 크리티컬·혼신의 일격의 적용 여부만 제어
  const cc=adj&&useCR&&cr?cr.chance/100:0,
    sc=adj&&useSV&&sv?sv.chance/100:0,
    sb=sv?sv.boost_percent/100:0;
  const E=h=>!ah||ah.includes(h)?(1+cc)*(1+sc*sb):1;
  let t=0;
  // 직접 공격
  for(const r of f.actualRanges){
    if(d>=r.minimum&&d<=r.maximum)
      t+=(S.hits[r.hit-1]||0)*E(r.hit);
  }
  // 파동·소파동·열파·소열파·폭파는 항상 적용
  S.hits.forEach((h,i)=>{
    const hn=i+1;
    if(!h||(ah&&!ah.includes(hn)))return;
    const e=h*E(hn);
    // 파동 및 소파동
    for(const[key,m]of[['wave',1],['mini_wave',.2]]){
      const a=A(key);
      if(a&&d>-67.5&&d<=332.5+200*((a.level||1)-1))
        t+=e*m*a.chance/100;
    }
    // 열파 및 소열파
    for(const[key,m]of[['surge',1],['mini_surge',.2]]){
      const a=A(key);
      if(!a)continue;
      const lo=a.anchor,hi=a.anchor+a.span,
        cnt=Math.max(1,Math.round(a.span*4));
      const pos=a.span>0
        ?Math.max(0,Math.min(hi,d+250)-Math.max(lo,d-125))*4
        :(lo>=d-125&&lo<d+250?1:0);
      t+=e*m*(a.chance/100)*(a.level||1)*pos/cnt;
    }
    // 폭파
    const x=A('explosion');
    if(x){
      const lo=x.anchor,hi=x.anchor+x.span,
        cnt=Math.max(1,Math.round(x.span*4)),
        bw=x.band_widths,
        e0=bw[0]/2,e1=e0+bw[1],e2=e1+bw[2];
      const ov=(a,b)=>Math.max(0,Math.min(hi,b)-Math.max(lo,a));
      let w;
      if(x.span>0){
        w=[
          ov(d-e0,d+e0),
          ov(d-e1,d-e0)+ov(d+e0,d+e1),
          ov(d-e2,d-e1)+ov(d+e1,d+e2)
        ].map(v=>v*4);
      }else{
        const q=Math.abs(d-lo);
        w=[
          q<=e0?1:0,
          q>e0&&q<=e1?1:0,
          q>e1&&q<=e2?1:0
        ];
      }
      const p=x.damage_bands_percent;
      t+=e*(x.chance/100)*(w[0]*p[0]+w[1]*p[1]+w[2]*p[2])/100/cnt;
    }
  });
  // 공격력 업
  if(str&&st)t*=1+st.boost_percent/100;
  return t/(G.cyc/(f.fps||30));
}
