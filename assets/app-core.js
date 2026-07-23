"use strict";const $=(id)=>document.getElementById(id);const periodUtils=window.KeyWestPeriodUtils;if(!periodUtils)throw new Error("Period utilities failed to load.");const TRUMBO_BOUNDS=[[-81.814,24.543],[-81.770,24.571]];const BASE_STYLE="https://tiles.openfreemap.org/styles/liberty";const CUSP_QUERY_URL="https://services.arcgis.com/rD2ylXRs80UroD90/ArcGIS/rest/services/NOAA_Coastal_Shoreline/FeatureServer/0/query"+"?where=1%3D1"+"&geometry=-81.84%2C24.46%2C-81.68%2C24.73"+"&geometryType=esriGeometryEnvelope"+"&inSR=4326"+"&spatialRel=esriSpatialRelIntersects"+"&outFields=FEATURE_ID%2CSOURCE_ID%2CSRC_DATE%2CHOR_ACC%2CATTRIBUTE%2CDATA_SOURC%2CEX_METH%2CSRC_CITA"+"&returnGeometry=true"+"&outSR=4326"+"&resultRecordCount=2000"+"&f=geojson";const state={manifest:null,periods:[],sources:[],coverage:null,index:0,mapReady:false,activeEvidence:null,cuspLoaded:false,aerialDiscovery:{status:"pending",years:0,frames:0},};let map=null;function escapeHtml(value){return String(value).replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;").replaceAll("'","&#039;");}async function fetchJson(url,{timeoutMs=15000,cache="no-cache"}={}){const controller=new AbortController();const timer=window.setTimeout(()=>controller.abort(),timeoutMs);try{const response=await fetch(url,{cache,signal:controller.signal});if(!response.ok)throw new Error(`${response.status} ${response.statusText}`);const data=await response.json();if(data?.error){throw new Error(data.error.message||"The remote GIS service returned an error.");}return data;}finally{window.clearTimeout(timer);}}function showMapMessage(text){const node=$("map-message");node.textContent=text;node.hidden=false;}function clearMapMessage(){$("map-message").hidden=true;}function studyFitBounds(){const[west,south,east,north]=state.manifest.studyBounds;return[[west,south],[east,north]];}function fit(bounds,duration=700){if(!map)return;map.fitBounds(bounds,{padding:{top:42,right:42,bottom:42,left:42},duration,});}function sourceById(id){return state.sources.find((source)=>source.id===id);}function renderSourceLinks(container,sourceIds,className="source-link"){container.replaceChildren(...sourceIds.map(sourceById).filter(Boolean).map((source)=>{const link=document.createElement("a");link.className=className;link.href=source.url;link.target="_blank";link.rel="noreferrer";link.innerHTML=`
            <span class="source-title">${escapeHtml(source.title)}</span>
            <span class="source-meta">${escapeHtml(source.institution)} · ${escapeHtml(source.coverage)}</span>
          `;return link;}));}function buildSourceCatalog(){const catalog=$("source-catalog");catalog.replaceChildren(...state.sources.map((source)=>{const link=document.createElement("a");link.className="source-card";link.href=source.url;link.target="_blank";link.rel="noreferrer";link.innerHTML=`
          <span class="source-title">${escapeHtml(source.title)}</span>
          <span class="source-meta">${escapeHtml(source.institution)} · ${escapeHtml(source.coverage)}</span>
          <span class="source-meta">${escapeHtml(source.use)}</span>
        `;return link;}));}function buildMilestones(){const container=$("milestone-list");container.replaceChildren(...state.manifest.milestones.map((milestone)=>{const article=document.createElement("article");article.className="milestone-card";article.innerHTML=`
          <div class="milestone-year">${escapeHtml(milestone.year)}</div>
          <div>
            <h4>${escapeHtml(milestone.title)}</h4>
            <p>${escapeHtml(milestone.status)}</p>
            <div class="milestone-sources"></div>
          </div>
        `;renderSourceLinks(article.querySelector(".milestone-sources"),milestone.sourceIds,"source-chip");return article;}));}function buildArchiveMaps(){
  const container=$("archive-map-list");
  const maps=state.manifest.archiveMaps||[];
  container.replaceChildren(...maps.map((item)=>{
    const source=sourceById(item.sourceId);
    const article=document.createElement("article");
    article.className="archive-map-card";
    article.innerHTML=`<div class="archive-map-year">${escapeHtml(item.year)}</div><div><h3>${escapeHtml(item.title)}</h3><p>${escapeHtml(item.scope)}</p><p class="archive-map-status">${escapeHtml(item.status)}</p>${source?`<a href="${escapeHtml(source.url)}" target="_blank" rel="noreferrer">Open Library of Congress record</a>`:""}</div>`;
    return article;
  }));
}
async function fetchJsonCandidates(urls,options){
  let lastError=null;
  for(const url of urls.filter(Boolean)){
    try{return await fetchJson(url,options);}catch(error){lastError=error;}
  }
  throw lastError||new Error("No data endpoint was available.");
}
function aerialProxyUrl(config){
  if(!config.catalogProxy)return null;
  const [west,south,east,north]=state.manifest.studyBounds;
  const params=new URLSearchParams({west,south,east,north,yearMin:config.yearMin,yearMax:config.yearMax});
  return `${config.catalogProxy}?${params.toString()}`;
}
