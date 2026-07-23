"use strict";function configureTabs(){const tabs=[...document.querySelectorAll('[role="tab"]')];tabs.forEach((tab)=>{tab.addEventListener("click",()=>{tabs.forEach((candidate)=>{const active=candidate===tab;candidate.classList.toggle("is-active",active);candidate.setAttribute("aria-selected",String(active));$(candidate.getAttribute("aria-controls")).hidden=!active;});});});}function configureControls(){$("period-slider").addEventListener("input",(event)=>selectPeriod(Number(event.target.value)));$("toggle-evidence").addEventListener("change",updateLayerVisibility);$("toggle-modern-shoreline").addEventListener("change",updateLayerVisibility);$("toggle-coverage").addEventListener("change",updateLayerVisibility);$("evidence-opacity").addEventListener("input",(event)=>setEvidenceOpacity(event.target.value));$("reset-view").addEventListener("click",()=>fit(studyFitBounds()));$("focus-trumbo").addEventListener("click",()=>fit(TRUMBO_BOUNDS));const dialog=$("about-dialog");$("open-about").addEventListener("click",()=>dialog.showModal());$("close-about").addEventListener("click",()=>dialog.close());dialog.addEventListener("click",(event)=>{if(event.target===dialog)dialog.close();});window.addEventListener("keydown",(event)=>{const tag=document.activeElement?.tagName;if(tag==="INPUT"||tag==="BUTTON")return;if(event.key==="ArrowLeft")selectPeriod(state.index-1);if(event.key==="ArrowRight")selectPeriod(state.index+1);});}async function initializeData(){try{
  $("availability-note").textContent="Loading the fixed historical map states…";
  const[manifest,sources,coverage]=await Promise.all([fetchJson("./data/periods.json"),fetchJson("./data/sources.json"),fetchJson("./data/survey-coverage.geojson")]);
  state.manifest=manifest;state.sources=sources.sources;state.coverage=coverage;
  buildSourceCatalog();buildMilestones();buildArchiveMaps();
  state.periods=periodUtils.enforceDistinctMapStates([...manifest.periods].sort((a,b)=>periodSortValue(a)-periodSortValue(b)));
  state.aerialDiscovery={status:"checking",years:0,frames:0};buildTimeline();
  const requested=new URL(window.location.href).searchParams.get("period");
  const requestedIndex=state.periods.findIndex((period)=>period.id===requested);selectPeriod(requestedIndex>=0?requestedIndex:0,false);
  discoverAerialPeriods(manifest.aerialDiscovery).then((discovered)=>{
    const selectedId=state.periods[state.index]?.id;
    state.periods=periodUtils.enforceDistinctMapStates([...manifest.periods,...discovered].sort((a,b)=>periodSortValue(a)-periodSortValue(b)));
    buildTimeline();
    const nextIndex=state.periods.findIndex((period)=>period.id===selectedId);
    selectPeriod(nextIndex>=0?nextIndex:0,false);
  });
}catch(error){$("period-title").textContent="Project manifest unavailable";$("period-summary").textContent=error.message;showMapMessage(error.message);throw error;}}
function startMap(dataReady){
  if(!window.maplibregl){
    $("overlay-status").textContent="Map engine unavailable";
    $("data-note").textContent="The historical catalog loaded, but the external MapLibre library did not. Reloading may restore the interactive map.";
    showMapMessage("The map engine could not load. The historical catalog remains available in the sidebar.");
    return;
  }
  map=new maplibregl.Map({container:"map",style:BASE_STYLE,center:[-81.7736,24.5557],zoom:12,minZoom:10,maxZoom:18,attributionControl:true,maplibreLogo:true});
  map.addControl(new maplibregl.NavigationControl({visualizePitch:true}),"top-right");
  map.addControl(new maplibregl.FullscreenControl(),"top-right");
  map.addControl(new maplibregl.ScaleControl({maxWidth:120,unit:"imperial"}),"bottom-right");
  map.on("load",async()=>{
    state.mapReady=true;
    try{await dataReady;}catch{return;}
    if(!state.manifest||!state.coverage)return;
    fit(studyFitBounds(),0);installBaseLayers();renderPeriod();installCuspLayer();
  });
  map.on("error",(event)=>{const message=event?.error?.message||"";if(message&&!message.includes("Failed to fetch"))showMapMessage(message);});
}
configureTabs();configureControls();const dataReady=initializeData();startMap(dataReady);
