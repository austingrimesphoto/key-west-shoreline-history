(() => {
'use strict';
const $ = id => document.getElementById(id);
const BOUNDS=[[-81.825,24.525],[-81.690,24.615]], TRUMBO=[[-81.814,24.543],[-81.770,24.571]];
const CUSP_QUERY_URL='https://services.arcgis.com/rD2ylXRs80UroD90/ArcGIS/rest/services/NOAA_Coastal_Shoreline/FeatureServer/0/query?where=1%3D1&geometry=-81.84%2C24.46%2C-81.68%2C24.73&geometryType=esriGeometryEnvelope&inSR=4326&spatialRel=esriSpatialRelIntersects&outFields=FEATURE_ID%2CSOURCE_ID%2CSRC_DATE%2CHOR_ACC%2CATTRIBUTE%2CDATA_SOURC%2CEX_METH%2CSRC_CITA&returnGeometry=true&outSR=4326&resultRecordCount=2000&f=geojson';
const S={periods:[],sources:[],coverage:null,index:0,ready:false,cache:new Map(),raster:null};
const map=new maplibregl.Map({container:'map',style:'https://tiles.openfreemap.org/styles/liberty',center:[-81.7736,24.5557],zoom:12,minZoom:10,maxZoom:18,attributionControl:true,maplibreLogo:true});
map.addControl(new maplibregl.NavigationControl({visualizePitch:true}),'top-right');
map.addControl(new maplibregl.FullscreenControl(),'top-right');
map.addControl(new maplibregl.ScaleControl({maxWidth:120,unit:'imperial'}),'bottom-right');
const esc=v=>String(v).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#039;');
const get=async p=>{const r=await fetch(p,{cache:'no-cache'});if(!r.ok)throw Error(`Failed to load ${p}: ${r.status}`);return r.json()};
const vis=(id,on)=>map.getLayer(id)&&map.setLayoutProperty(id,'visibility',on?'visible':'none');
const add=l=>!map.getLayer(l.id)&&map.addLayer(l);
const source=(id,data)=>{const s=map.getSource(id);s?s.setData(data):map.addSource(id,{type:'geojson',data})};
const fit=(b,d=700)=>map.fitBounds(b,{padding:{top:42,right:42,bottom:42,left:42},duration:d});
const msg=t=>{const n=$('map-message');n.textContent=t;n.hidden=false};
const clearMsg=()=>{$('map-message').hidden=true};
function buildTimeline(){
$('period-slider').max=S.periods.length-1;
$('timeline-labels').innerHTML=`<span>${esc(S.periods[0].shortLabel)}</span><span>${esc(S.periods.at(-1).shortLabel)}</span>`;
$('period-buttons').replaceChildren(...S.periods.map((p,i)=>{const b=document.createElement('button');b.type='button';b.className='period-button';b.textContent=p.shortLabel;b.onclick=()=>select(i);return b}));
}
function buildCatalog(){
$('source-catalog').replaceChildren(...S.sources.map(s=>{const a=document.createElement('a');a.className='source-card';a.href=s.url;a.target='_blank';a.rel='noreferrer';a.innerHTML=`<span class="source-title">${esc(s.title)}</span><span class="source-meta">${esc(s.institution)} · ${esc(s.coverage)}</span><span class="source-meta">${esc(s.use)}</span>`;return a}));
}
function periodSources(ids){
$('period-sources').replaceChildren(...ids.map(id=>S.sources.find(s=>s.id===id)).filter(Boolean).map(s=>{const a=document.createElement('a');a.className='source-link';a.href=s.url;a.target='_blank';a.rel='noreferrer';a.innerHTML=`<span class="source-title">${esc(s.title)}</span><span class="source-meta">${esc(s.institution)} · ${esc(s.coverage)}</span>`;return a}));
}
function archive(a){
const sec=$('archival-map-section');sec.hidden=!a;if(!a){$('archival-map-image').removeAttribute('src');return}
$('archival-map-link').href=a.pageUrl;$('archival-map-image').src=a.imageUrl;$('archival-map-image').alt=a.title;$('archival-map-caption').textContent=a.caption;
}
function chartControls(o){
const ok=!!o;$('toggle-chart').disabled=!ok;$('chart-opacity').disabled=!ok;
if(ok){const v=Math.round((o.defaultOpacity??.7)*100);$('chart-opacity').value=v;$('chart-opacity-output').textContent=`${v}%`}else $('chart-opacity-output').textContent='N/A';
}
async function periodData(p){
if(S.cache.has(p.id))return S.cache.get(p.id);
const [land,fill,rail]=await Promise.all([get(p.layers.land),get(p.layers.fill),get(p.layers.rail)]),d={land,fill,rail};S.cache.set(p.id,d);return d;
}
function installBaseLayers(){
source('survey-coverage',S.coverage);
add({id:'survey-coverage-fill',type:'fill',source:'survey-coverage',paint:{'fill-color':'#0f5d6c','fill-opacity':.1},filter:['==',['get','coverage_id'],'__none__']});
add({id:'survey-coverage-line',type:'line',source:'survey-coverage',paint:{'line-color':'#0f5d6c','line-width':2.4,'line-dasharray':[2,1.5]},filter:['==',['get','coverage_id'],'__none__']});
map.on('click','survey-coverage-fill',e=>{const p=e.features?.[0]?.properties;if(p)new maplibregl.Popup().setLngLat(e.lngLat).setHTML(`<h3>${esc(p.source_title)}</h3><p><strong>Survey date:</strong> ${esc(p.survey_date)}</p><p>${esc(p.notice)}</p>`).addTo(map)});
map.on('mouseenter','survey-coverage-fill',()=>map.getCanvas().style.cursor='pointer');map.on('mouseleave','survey-coverage-fill',()=>map.getCanvas().style.cursor='');
}
function installPeriodLayers(d){
source('historical-land',d.land);source('new-fill',d.fill);source('railway',d.rail);
add({id:'historical-land-fill',type:'fill',source:'historical-land',paint:{'fill-color':'#d6b56f','fill-opacity':.42}});
add({id:'historical-land-line',type:'line',source:'historical-land',paint:{'line-color':'#6c5527','line-width':2,'line-opacity':.95}});
add({id:'new-fill-layer',type:'fill',source:'new-fill',paint:{'fill-color':'#d66a42','fill-opacity':.62,'fill-outline-color':'#7a2e18'}});
add({id:'railway-line',type:'line',source:'railway',paint:{'line-color':'#222629','line-width':4,'line-dasharray':[2,1]}});
}
function raster(o){
if(S.raster){const l=`chart-layer-${S.raster}`,s=`chart-source-${S.raster}`;if(map.getLayer(l))map.removeLayer(l);if(map.getSource(s))map.removeSource(s);S.raster=null}
if(!o)return;S.raster=o.id;const sid=`chart-source-${o.id}`,lid=`chart-layer-${o.id}`;
map.addSource(sid,{type:'raster',tiles:o.tiles,tileSize:o.tileSize||256,minzoom:o.minzoom||0,maxzoom:o.maxzoom||22,attribution:o.attribution||''});
const before=map.getStyle().layers.find(l=>l.type==='symbol')?.id;
map.addLayer({id:lid,type:'raster',source:sid,paint:{'raster-opacity':+$('chart-opacity').value/100,'raster-fade-duration':0}},before);
}
function layerVisibility(){
vis('modern-cusp-line',$('toggle-modern-shoreline').checked);vis('survey-coverage-fill',$('toggle-coverage').checked);vis('survey-coverage-line',$('toggle-coverage').checked);
vis('historical-land-fill',$('toggle-land').checked);vis('historical-land-line',$('toggle-land').checked);vis('new-fill-layer',$('toggle-fill').checked);vis('railway-line',$('toggle-rail').checked);
if(S.raster)vis(`chart-layer-${S.raster}`,$('toggle-chart').checked);
}
function status(p,d){
const n=['land','fill','rail'].reduce((a,k)=>a+(d[k].features?.length||0),0);$('feature-count').textContent=n;$('data-status').textContent=p.dataStatus;
$('data-note').textContent=n?'Published geometry passed the provenance validator.':p.rasterOverlay&&p.coverageId?'A genuine chart overlay and authoritative NOAA survey-coverage footprint are active. The rectangle is not the shoreline.':p.rasterOverlay?'The chart overlay is active; historical vectors remain unpublished rather than guessed.':p.coverageId?'The NOAA survey-coverage footprint is active; the shoreline vector remains pending.':'This milestone is documented, but no geometry is published yet.';
}
async function render(){
const p=S.periods[S.index];$('period-kicker').textContent=p.kicker;$('period-title').textContent=p.title;$('period-summary').textContent=p.summary;$('period-confidence').textContent=p.confidenceLabel;
$('period-highlights').replaceChildren(...p.highlights.map(t=>{const li=document.createElement('li');li.textContent=t;return li}));periodSources(p.sourceIds);archive(p.archivalMap);chartControls(p.rasterOverlay);
if(!S.ready)return;try{clearMsg();const d=await periodData(p);installPeriodLayers(d);raster(p.rasterOverlay);const f=p.coverageId?['==',['get','coverage_id'],p.coverageId]:['==',['get','coverage_id'],'__none__'];map.setFilter('survey-coverage-fill',f);map.setFilter('survey-coverage-line',f);status(p,d);layerVisibility()}catch(e){msg(e.message)}
}
function select(i,url=true){S.index=Math.max(0,Math.min(i,S.periods.length-1));$('period-slider').value=S.index;document.querySelectorAll('.period-button').forEach((b,j)=>{b.classList.toggle('is-active',j===S.index);b.setAttribute('aria-current',j===S.index)});if(url){const u=new URL(location);u.searchParams.set('period',S.periods[S.index].id);history.replaceState({},'',u)}render()}
async function cusp(){
$('cusp-status').textContent='Loading…';try{const r=await fetch(CUSP_QUERY_URL);if(!r.ok)throw Error(r.status);const g=await r.json();source('modern-cusp',g);add({id:'modern-cusp-line',type:'line',source:'modern-cusp',paint:{'line-color':'#006de6','line-width':['interpolate',['linear'],['zoom'],10,1.2,15,3],'line-opacity':.9}});$('cusp-status').textContent=`${g.features.length} segments`;layerVisibility()}catch{$('cusp-status').textContent='Unavailable'}
}
function controls(){
document.querySelectorAll('[role="tab"]').forEach(t=>t.onclick=()=>document.querySelectorAll('[role="tab"]').forEach(x=>{const a=x===t;x.classList.toggle('is-active',a);x.setAttribute('aria-selected',a);$(x.getAttribute('aria-controls')).hidden=!a}));
$('period-slider').oninput=e=>select(+e.target.value);['toggle-chart','toggle-modern-shoreline','toggle-coverage','toggle-land','toggle-fill','toggle-rail'].forEach(id=>$(id).onchange=layerVisibility);
$('chart-opacity').oninput=e=>{const v=+e.target.value;$('chart-opacity-output').textContent=`${v}%`;if(S.raster&&map.getLayer(`chart-layer-${S.raster}`))map.setPaintProperty(`chart-layer-${S.raster}`,'raster-opacity',v/100)};
$('reset-view').onclick=()=>fit(BOUNDS);$('focus-trumbo').onclick=()=>fit(TRUMBO);const d=$('about-dialog');$('open-about').onclick=()=>d.showModal();$('close-about').onclick=()=>d.close();d.onclick=e=>e.target===d&&d.close();
}
async function init(){try{const [p,s,c]=await Promise.all([get('./data/periods.json'),get('./data/sources.json'),get('./data/survey-coverage.geojson')]);S.periods=p.periods;S.sources=s.sources;S.coverage=c;buildTimeline();buildCatalog();const q=new URL(location).searchParams.get('period'),i=S.periods.findIndex(x=>x.id===q);select(i<0?0:i,false)}catch(e){$('period-title').textContent='Project manifest unavailable';$('period-summary').textContent=e.message;msg(e.message)}}
controls();init();map.on('load',async()=>{S.ready=true;fit(BOUNDS,0);installBaseLayers();await cusp();render()});map.on('error',e=>{const m=e?.error?.message||'';if(m&&!m.includes('Failed to fetch'))msg(m)});
})();
