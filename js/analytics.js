// A220 Pro · Estadísticas visuales anónimas
let a220StatsRange='30d',a220StatsClock=null;

function a220CurrentPeriodStart(){
 return new Date(appData?.statsCurrentStartedAt||appData?.sales?.[0]?.date||Date.now());
}
function a220CurrentPeriodSales(){
 const start=a220CurrentPeriodStart();
 return (appData?.sales||[]).filter(s=>new Date(s.date)>=start);
}
function a220SalesRange(range){
 const now=new Date(),start=new Date(now);
 if(range==='today')start.setHours(0,0,0,0);
 else if(range==='7d'){start.setDate(start.getDate()-6);start.setHours(0,0,0,0)}
 else if(range==='30d'){start.setDate(start.getDate()-29);start.setHours(0,0,0,0)}
 else if(range==='month'){start.setDate(1);start.setHours(0,0,0,0)}
 else if(range==='year'){start.setMonth(0,1);start.setHours(0,0,0,0)}
 const baseline=a220CurrentPeriodStart();
 if(start<baseline)start.setTime(baseline.getTime());
 return (appData?.sales||[]).filter(s=>{const d=new Date(s.date);return d>=start&&d<=now});
}
function a220VisualChart(values,kind){
 const vals=(values||[]).map(v=>Math.max(0,Number(v)||0));
 const W=Math.max(420,vals.length*26),H=190,L=12,R=12,T=14,B=12,PH=H-T-B,PW=W-L-R;
 const max=Math.max(1,...vals),step=PW/Math.max(1,vals.length),bw=Math.max(5,Math.min(18,step*.58));
 const grid=[0,1,2,3].map(i=>{const y=T+PH*i/3;return '<line x1="'+L+'" y1="'+y+'" x2="'+(W-R)+'" y2="'+y+'" class="a220-vgrid"/>'}).join('');
 const bars=vals.map((v,i)=>{const h=v?Math.max(3,v/max*(PH-4)):0,x=L+i*step+(step-bw)/2,y=T+PH-h;return '<rect class="a220-vbar '+(kind||'')+'" x="'+x.toFixed(1)+'" y="'+y.toFixed(1)+'" width="'+bw.toFixed(1)+'" height="'+h.toFixed(1)+'" rx="'+Math.min(6,bw/2)+'"/>'}).join('');
 return '<div class="a220-visual-chart"><svg viewBox="0 0 '+W+' '+H+'" role="img" aria-label="Visualización estadística"><defs><linearGradient id="a220VisualGradient" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#63e6ff"/><stop offset="100%" stop-color="#2875e8"/></linearGradient><linearGradient id="a220VisualGradient2" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#8ef7d0"/><stop offset="100%" stop-color="#168c91"/></linearGradient><linearGradient id="a220VisualGradient3" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#bba2ff"/><stop offset="100%" stop-color="#6a5be8"/></linearGradient><linearGradient id="a220VisualGradient4" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#ffd37a"/><stop offset="100%" stop-color="#e17b35"/></linearGradient></defs>'+grid+bars+'</svg></div>';
}
function a220EmptyVisual(){
 return '<div class="a220-visual-empty" aria-label="Sin actividad"><span></span><span></span><span></span><span></span><span></span><span></span><i></i></div>';
}
function a220CleanStatsNavigation(){
 const nav=document.getElementById('a220Dock');if(!nav)return;
 nav.querySelectorAll('button').forEach(b=>{
  const key=String(b.dataset.view||'').toLowerCase(),label=(b.textContent||'').trim().toLowerCase();
  if(key==='stats'||key==='stat'||label==='stats'||label==='stat')b.remove();
 });
 const items=[...nav.querySelectorAll('button[data-view="estadisticas"]')];
 items.slice(1).forEach(b=>b.remove());
 const legacy=document.querySelectorAll('main>#stats,main>#stat,main>#stats-view');
 legacy.forEach(el=>el.remove());
}
async function a220ResetStatsPeriod(){
 if(!appData)return;
 if(!confirm('¿Reiniciar todas las estadísticas desde cero? Se conservarán las ventas, los artículos, el stock y los comprobantes. Solo se reiniciará el período estadístico.'))return;
 const previousStart=appData.statsCurrentStartedAt;
 const previousPeriods=Array.isArray(appData.statsPeriods)?appData.statsPeriods.slice():[];
 appData.statsCurrentStartedAt=new Date().toISOString();
 appData.statsPeriods=[];
 const ok=await saveLocalData(false);
 if(!ok){
  appData.statsCurrentStartedAt=previousStart;
  appData.statsPeriods=previousPeriods;
  return;
 }
 a220StatsRange='30d';
 a220Analytics();
 showToast('Estadísticas reiniciadas desde cero','success');
}
function a220Analytics(){
 if(!appData)return;
 a220CleanStatsNavigation();
 let view=document.getElementById('estadisticas');
 if(!view){
  view=document.createElement('section');
  view.id='estadisticas';view.className='view';
  view.innerHTML='<div class="a220-stats-head"><div><div class="eyebrow">A220 · ANÁLISIS VISUAL</div><h2>Estadísticas</h2><p>Indicadores gráficos de actividad</p></div><button class="a220-stats-reset" type="button" onclick="a220ResetStatsPeriod()">↻ Reiniciar</button></div><div class="range a220-stats-ranges" id="statsRanges"><button class="range-btn" data-r="today">Hoy</button><button class="range-btn" data-r="7d">Semana</button><button class="range-btn active" data-r="30d">Mes</button><button class="range-btn" data-r="year">Año</button></div><div class="a220-stats-grid"><article class="a220-stats-card"><div class="a220-stats-card-head"><span class="a220-stats-symbol">◷</span><h3>Ritmo de ventas</h3></div><div id="statsHourBars"></div></article><article class="a220-stats-card"><div class="a220-stats-card-head"><span class="a220-stats-symbol">⌁</span><h3>Actividad diaria</h3></div><div id="statsDayBars"></div></article><article class="a220-stats-card"><div class="a220-stats-card-head"><span class="a220-stats-symbol">▥</span><h3>Composición de ventas</h3></div><div id="statsProducts"></div></article><article class="a220-stats-card"><div class="a220-stats-card-head"><span class="a220-stats-symbol">◉</span><h3>Estado del inventario</h3></div><div id="inventoryAnalysis"></div></article></div>';
  document.querySelector('main')?.appendChild(view);
 }
 const sales=a220SalesRange(a220StatsRange);
 const byHour=Array.from({length:24},()=>0),byProduct={},byDay={};
 sales.forEach(s=>{
  const hour=new Date(s.date).getHours();
  (s.items||[]).forEach(item=>{
   const qty=Math.max(0,Number(item.qty)||0);
   byHour[hour]+=Math.max(0,Number(item.total)||0);
   byProduct[item.id]=(byProduct[item.id]||0)+qty;
  });
  const d=new Date(s.date),key=d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');
  byDay[key]=(byDay[key]||0)+Math.max(0,Number(s.total)||0);
 });
 const hourValues=byHour.filter((v,i)=>v>0||byHour.some(x=>x>0)).slice(0,24);
 const dayValues=Object.keys(byDay).sort().slice(-14).map(k=>byDay[k]);
 const productValues=Object.values(byProduct).sort((x,y)=>y-x).slice(0,12);
 const setVisual=(id,values,kind)=>{const el=document.getElementById(id);if(el)el.innerHTML=values.some(v=>v>0)?a220VisualChart(values,kind):a220EmptyVisual()};
 setVisual('statsHourBars',hourValues,'hour');
 setVisual('statsDayBars',dayValues,'day');
 setVisual('statsProducts',productValues,'product');
 const products=appData.products||[];
 const stockGroups=[products.filter(p=>Number(p.stock||0)<=Number(p.minStock||0)).length,products.filter(p=>Number(p.stock||0)>Number(p.minStock||0)&&Number(p.stock||0)<=Math.max(Number(p.minStock||0)*3,5)).length,products.filter(p=>Number(p.stock||0)>Math.max(Number(p.minStock||0)*3,5)).length];
 setVisual('inventoryAnalysis',stockGroups,'inventory');
 document.querySelectorAll('#statsRanges .range-btn').forEach(b=>b.classList.toggle('active',b.dataset.r===a220StatsRange));
}
function injectAnalyticsUI(){
 a220CleanStatsNavigation();
 document.querySelectorAll('#statsRanges .range-btn').forEach(b=>b.onclick=()=>{
  a220StatsRange=b.dataset.r;
  a220Analytics();
 });
}
function a220PurchaseItems(){
 const sales=a220SalesRange('30d');
 return (appData?.products||[]).map(p=>{
  const sold=sales.reduce((n,s)=>n+(s.items||[]).filter(i=>Number(i.id)===Number(p.id)).reduce((m,i)=>m+Number(i.qty||0),0),0);
  const target=Math.max(Number(p.minStock||0),Math.ceil((sold/30)*7));
  return {...p,sold,target,buy:Math.max(0,target-Number(p.stock||0))};
 }).filter(p=>p.buy>0);
}
