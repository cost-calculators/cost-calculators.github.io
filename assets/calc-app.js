/* ============================================================
   Shopify Cost — shared calculator app
   Each page defines window.CALC_COMPUTE(state) -> result object.
   Cost pages can use CalcKit.cost(config, state).
   ============================================================ */
/* ███████████████████████████████████████████████████████████████████████
   ██  PASTE YOUR WEB3FORMS KEY BELOW (between the quotes) AND SAVE.        ██
   ██  Get it free at web3forms.com — enter your email, "Create Access Key".██
   ██  This is the ONLY change you must make for the lead form to email you.██
   ███████████████████████████████████████████████████████████████████████ */
var WEB3FORMS_KEY = "YOUR-WEB3FORMS-ACCESS-KEY";

/* ███████████████████████████████████████████████████████████████████████
   ██  (OPTIONAL) GOOGLE TAG MANAGER — paste your container ID below.      ██
   ██  Get it free at tagmanager.google.com (looks like GTM-ABC1234).      ██
   ██  Leave as-is to keep analytics off.                                  ██
   ███████████████████████████████████████████████████████████████████████ */
var GTM_ID = "GTM-XXXXXXX";
/* ███████████████████████████████████████████████████████████████████████ */
/* ███████████████████████████████████████████████████████████████████████ */

(function(){
  "use strict";
  var $=function(s,c){return (c||document).querySelector(s)};
  var $$=function(s,c){return Array.prototype.slice.call((c||document).querySelectorAll(s))};
  var store={get:function(k){try{return localStorage.getItem(k)}catch(e){return null}},set:function(k,v){try{localStorage.setItem(k,v)}catch(e){}}};
  var fmtMoney=function(n){return "$"+Math.round(n).toLocaleString("en-US")};
  var fmtNum=function(n){return Math.round(n).toLocaleString("en-US")};

  /* ---------- CalcKit: reusable cost engine + helpers ---------- */
  window.CalcKit={
    fmtMoney:fmtMoney, fmtNum:fmtNum,
    cost:function(cfg,state){
      var total=0,sel=0;
      cfg.fields.forEach(function(f){
        if(f.type==="multi"){(state[f.name]||[]).forEach(function(v){total+=(f.costs[v]||0);sel++;});}
        else{var v=state[f.name];if(f.costs[v]!=null){total+=f.costs[v];if(f.costs[v]>0)sel++;}}
      });
      var lowMul=cfg.lowMul||0.85, highMul=cfg.highMul||1.25;
      var low=total*lowMul, high=total*highMul;
      var cx=Math.min(100,Math.round((total/(cfg.cxMax||60000))*100 + sel*2));
      var cxLabel=cx<25?"Low":cx<50?"Moderate":cx<75?"High":"Enterprise";
      var wk=(cfg.timeBaseWeeks||3)+total/(cfg.timeDivisor||3500)+sel*0.7;
      var wkLow=Math.max(2,Math.round(wk*0.85)), wkHigh=Math.round(wk*1.2);
      var pkg=(cfg.packages||[]).filter(function(p){return cx<=p.max;})[0]||{name:"Project-based engagement",desc:""};
      var rows=[{k:cfg.timelineLabel||"Estimated timeline",v:wkLow+"–"+wkHigh+" weeks"}];
      var monthly=0;
      if(cfg.monthly){monthly=cfg.monthly.costs[state[cfg.monthly.name]]||0;
        rows.push({k:cfg.monthly.label||"Monthly support",v:monthly?fmtMoney(monthly)+"/mo":"Not included"});}
      if(cfg.rowsExtra)rows=rows.concat(cfg.rowsExtra(total,state)||[]);
      var summary=(cfg.summaryFields||[]).map(function(name){
        var L=(cfg.labels||{})[name]||{label:name,values:{}};
        var val;
        if(Array.isArray(state[name]))val=state[name].length?state[name].map(function(v){return L.values[v]||v}).join(", "):"None";
        else val=L.values[state[name]]||state[name]||"–";
        return {k:L.label,v:val};
      });
      summary.push({k:"Estimated timeline",v:wkLow+"–"+wkHigh+" weeks"});
      summary.push({k:"Estimated budget range",v:fmtMoney(low)+" – "+fmtMoney(high)});
      return {
        primaryLabel:cfg.primaryLabel||"Estimated cost",
        low:low,high:high,isMoney:true,sub:cfg.sub||"Indicative range (USD). Not a quote.",
        meter:{label:cfg.meterLabel||"Project complexity",value:cxLabel,pct:cx},
        rows:rows,
        package:cfg.packages?{label:"Suggested engagement",name:pkg.name,desc:pkg.desc}:null,
        summary:summary,
        shareText:cfg.shareText,
        configString:summary.map(function(r){return r.k+": "+r.v}).join(" | ")
      };
    }
  };

  /* ---------- read form into state ---------- */
  var form=$("#calcForm");
  if(!form)return;
  function readState(){
    var st={};
    $$('input,select',form).forEach(function(el){
      if(!el.name)return;
      if(el.type==="checkbox"){if(!st[el.name])st[el.name]=[];if(el.checked)st[el.name].push(el.value);}
      else if(el.type==="radio"){if(el.checked)st[el.name]=el.value;}
      else st[el.name]=el.value;
    });
    return st;
  }

  /* ---------- animated counter ---------- */
  function animate(el,to,money){
    if(window.matchMedia&&window.matchMedia("(prefers-reduced-motion: reduce)").matches){el.textContent=(money?fmtMoney:fmtNum)(to);return;}
    var from=parseFloat(el.getAttribute("data-v")||"0")||0,start=performance.now(),dur=420;
    function step(t){var p=Math.min(1,(t-start)/dur),e=1-Math.pow(1-p,3);el.textContent=(money?fmtMoney:fmtNum)(from+(to-from)*e);if(p<1)requestAnimationFrame(step);else el.setAttribute("data-v",to);}
    requestAnimationFrame(step);
  }

  /* ---------- render ---------- */
  var lastRange="";
  function render(){
    var st=readState();
    var r=window.CALC_COMPUTE(st);
    $("#rPrimaryLabel").textContent=r.primaryLabel;
    animate($("#rLow"),r.low,r.isMoney!==false);
    if(r.high!=null){$("#rTo").style.display="";$("#rHigh").style.display="";animate($("#rHigh"),r.high,r.isMoney!==false);lastRange=(r.isMoney!==false?fmtMoney:fmtNum)(r.low)+" – "+(r.isMoney!==false?fmtMoney:fmtNum)(r.high);}
    else{$("#rTo").style.display="none";$("#rHigh").style.display="none";lastRange=(r.isMoney!==false?fmtMoney:fmtNum)(r.low);}
    $("#rSub").textContent=r.sub||"";
    var mw=$("#rMeterWrap");
    if(r.meter){mw.style.display="";$("#rMeterLabel").textContent=r.meter.label;$("#rMeterVal").textContent=r.meter.value;$("#rMeterFill").style.width=r.meter.pct+"%";}
    else mw.style.display="none";
    $("#rRows").innerHTML=(r.rows||[]).map(function(x){return '<div class="r-line"><span class="k">'+x.k+'</span><span class="v num">'+x.v+'</span></div>';}).join("");
    var pk=$("#rPkg");
    if(r.package){pk.style.display="";$("#rPkgLabel").textContent=r.package.label;$("#rPkgName").textContent=r.package.name;$("#rPkgDesc").textContent=r.package.desc;}
    else pk.style.display="none";
    if($("#rSummary"))$("#rSummary").innerHTML=(r.summary||[]).map(function(x){return '<div class="r-line"><span class="k">'+x.k+'</span><span class="v">'+x.v+'</span></div>';}).join("");
    // progress
    var touched=$$('input:checked,select',form).filter(function(el){return el.tagName==="SELECT"?el.selectedIndex>0:true;}).length;
    var groups=$$('.fieldset',form).length||1;
    $("#progFill").style.width=Math.min(100,(touched/Math.max(groups,1))*100)+"%";
    // hidden lead fields
    if($("#hidEstimate"))$("#hidEstimate").value=lastRange;
    if($("#hidComplexity"))$("#hidComplexity").value=r.meter?r.meter.value:"";
    if($("#hidConfig"))$("#hidConfig").value=r.configString||"";
    // compare A
    if($("#cmpA")){$("#cmpA").textContent=lastRange;if($("#cmpAmeta"))$("#cmpAmeta").textContent=(r.meter?r.meter.value+" · ":"")+((r.rows&&r.rows[0])?r.rows[0].v:"");}
    window.__lastResult=r;
    updateShare();
  }

  /* ---------- option visual state ---------- */
  function syncBoxes(){$$('.opt').forEach(function(o){var i=o.querySelector("input");if(i)o.setAttribute("data-checked",i.checked?"true":"false");});}
  form.addEventListener("change",function(){syncBoxes();render();});
  form.addEventListener("input",function(e){if(e.target&&e.target.type==="number")render();});
  $$('.opt').forEach(function(o){
    o.setAttribute("tabindex","0");
    o.addEventListener("keydown",function(e){if(e.key===" "||e.key==="Enter"){var i=o.querySelector("input");if(i.type==="checkbox")i.checked=!i.checked;else i.checked=true;e.preventDefault();syncBoxes();render();}});
  });

  /* ---------- URL state ---------- */
  function encodeState(){
    var p=new URLSearchParams(),seen={};
    $$('input,select',form).forEach(function(el){
      if(!el.name)return;
      if(el.type==="checkbox"){if(el.checked){var k=el.name;seen[k]=(seen[k]?seen[k]+".":"")+el.value;}}
      else if(el.type==="radio"){if(el.checked)p.set(el.name,el.value);}
      else p.set(el.name,el.value);
    });
    Object.keys(seen).forEach(function(k){p.set(k,seen[k]);});
    return location.origin+location.pathname+"?"+p.toString();
  }
  function applyState(){
    var p=new URLSearchParams(location.search);if(![].slice.call(p.keys()).length)return;
    p.forEach(function(val,key){
      var els=$$('[name="'+key+'"]',form);
      if(!els.length)return;
      if(els[0].type==="checkbox"){var vals=val.split(".");els.forEach(function(el){el.checked=vals.indexOf(el.value)>-1;});}
      else if(els[0].type==="radio"){els.forEach(function(el){el.checked=(el.value===val);});}
      else els[0].value=val;
    });
    syncBoxes();
  }

  function updateShare(){
    var url=encodeState();
    var text=(window.__lastResult&&window.__lastResult.shareText)||document.title;
    var u=encodeURIComponent(url),t=encodeURIComponent(text);
    if($("#shLinkedin"))$("#shLinkedin").href="https://www.linkedin.com/sharing/share-offsite/?url="+u;
    if($("#shX"))$("#shX").href="https://twitter.com/intent/tweet?text="+t+"&url="+u;
    if($("#shFb"))$("#shFb").href="https://www.facebook.com/sharer/sharer.php?u="+u;
    if($("#shWa"))$("#shWa").href="https://wa.me/?text="+t+"%20"+u;
  }

  /* ---------- toast ---------- */
  var toastEl=$("#toast"),tT;
  function toast(m){if(!toastEl)return;toastEl.textContent=m;toastEl.classList.add("show");clearTimeout(tT);tT=setTimeout(function(){toastEl.classList.remove("show")},2200);}

  /* ---------- actions ---------- */
  if($("#copyLink"))$("#copyLink").addEventListener("click",function(){var u=encodeState();if(navigator.clipboard)navigator.clipboard.writeText(u).then(function(){toast("Result link copied")},function(){prompt("Copy link:",u)});else prompt("Copy link:",u);});
  if($("#getDetailed"))$("#getDetailed").addEventListener("click",function(){var d=$("#detailed");if(d){d.scrollIntoView({behavior:"smooth"});var n=$("#ln");if(n)n.focus();}});
  if($("#resetBtn"))$("#resetBtn").addEventListener("click",function(){form.reset();history.replaceState(null,"",location.pathname);syncBoxes();render();toast("Calculator reset");});

  function loadScript(src){return new Promise(function(res,rej){var s=document.createElement("script");s.src=src;s.onload=res;s.onerror=rej;document.head.appendChild(s);});}
  function captureTarget(){return $(".result-sticky");}
  if($("#saveImg"))$("#saveImg").addEventListener("click",function(){toast("Preparing image…");loadScript("https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js").then(function(){window.html2canvas(captureTarget(),{backgroundColor:"#f8f8f8",scale:2}).then(function(cv){var a=document.createElement("a");a.href=cv.toDataURL("image/png");a.download="estimate.png";a.click();toast("Image saved");});}).catch(function(){toast("Could not load image tool")});});
  if($("#dlPdf"))$("#dlPdf").addEventListener("click",function(){toast("Building PDF…");loadScript("https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js").then(function(){return loadScript("https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js");}).then(function(){window.html2canvas(captureTarget(),{backgroundColor:"#ffffff",scale:2}).then(function(cv){var jsPDF=window.jspdf.jsPDF,pdf=new jsPDF("p","pt","a4");var w=pdf.internal.pageSize.getWidth()-72,h=cv.height*(w/cv.width);pdf.setFontSize(15);pdf.text(document.title.split("|")[0].trim(),36,46);pdf.setFontSize(10);pdf.setTextColor(120);pdf.text("Generated with Shopify Cost · Indicative, not a quote",36,62);pdf.addImage(cv.toDataURL("image/png"),"PNG",36,80,w,h);pdf.save("estimate.pdf");toast("PDF downloaded");});}).catch(function(){window.print();});});

  /* ---------- compare ---------- */
  var cmpOn=false;
  if($("#cmpToggle"))$("#cmpToggle").addEventListener("click",function(){cmpOn=!cmpOn;this.setAttribute("aria-checked",cmpOn?"true":"false");$("#comparePanel").classList.toggle("on",cmpOn);if(cmpOn)$("#comparePanel").scrollIntoView({behavior:"smooth",block:"nearest"});});
  if($("#snapB"))$("#snapB").addEventListener("click",function(){$("#cmpB").textContent=lastRange;$("#cmpBtitle").textContent="Option B — saved";toast("Saved as Option B — now adjust inputs");});

  /* ---------- lead form ---------- */
  if($("#leadForm"))$("#leadForm").addEventListener("submit",function(e){e.preventDefault();var b=this.querySelector('button[type="submit"]');b.disabled=true;b.textContent="Sending…";fetch(this.action,{method:"POST",body:new FormData(this),headers:{Accept:"application/json"}}).then(function(r){return r.json().catch(function(){return{}})}).then(done).catch(done);function done(){$("#leadGrid").style.display="none";$("#leadSuccess").classList.add("on");$("#leadSuccess").scrollIntoView({behavior:"smooth",block:"center"});}});

  /* ---------- rating ---------- */
  var starsEl=$("#stars");
  if(starsEl){
    var STAR="M12 2.5l2.9 6.2 6.6.7-4.9 4.5 1.4 6.6L12 17.8 6 21l1.4-6.6L2.5 9.9l6.6-.7z";
    var key="cc_rating_"+(document.body.dataset.calc||"calc");
    var my=parseInt(store.get(key)||"0",10);
    function draw(active){starsEl.innerHTML="";for(var i=1;i<=5;i++){(function(i){var b=document.createElement("button");b.type="button";b.setAttribute("aria-label",i+" star"+(i>1?"s":""));b.innerHTML='<svg viewBox="0 0 24 24" class="'+((active||my)>=i?"s-on":"s-off")+'"><path d="'+STAR+'"/></svg>';b.addEventListener("mouseenter",function(){draw(i)});b.addEventListener("mouseleave",function(){draw(0)});b.addEventListener("click",function(){my=i;store.set(key,String(i));draw(0);if($("#rateFb"))$("#rateFb").classList.add("on");meta();toast("Thanks for rating");});starsEl.appendChild(b);})(i)}}
    function meta(){if($("#rateMeta"))$("#rateMeta").innerHTML=my?("You rated this <b>"+my+"/5</b>. Aggregate ratings appear once collected."):"No ratings yet — be the first.";}
    if($("#fbSubmit"))$("#fbSubmit").addEventListener("click",function(){if($("#rateFb"))$("#rateFb").classList.remove("on");toast("Feedback sent — thank you");});
    draw(0);meta();
  }

  /* ---------- scroll-spy ---------- */
  (function(){
    var links=$$('.toc a');if(!links.length)return;
    var secs=links.map(function(a){return document.getElementById(a.getAttribute("href").slice(1));});
    function spy(){var t=140,cur=0;for(var i=0;i<secs.length;i++){if(secs[i]&&secs[i].getBoundingClientRect().top-t<=0)cur=i;}links.forEach(function(a,i){a.classList.toggle("active",i===cur);});}
    var tick=false;function onS(){if(!tick){tick=true;requestAnimationFrame(function(){spy();tick=false;});}}
    window.addEventListener("scroll",onS,{passive:true});window.addEventListener("resize",onS,{passive:true});spy();
  })();

  /* ---------- init ---------- */
  if(typeof WEB3FORMS_KEY!=="undefined" && WEB3FORMS_KEY && WEB3FORMS_KEY.indexOf("YOUR-")!==0){
    $$('input[name="access_key"]').forEach(function(el){el.value=WEB3FORMS_KEY;});
  }
  // stamp the source page into the lead so you know which calculator it came from
  $$('input[name="page_url"]').forEach(function(el){el.value=location.href;});
  // optional Google Tag Manager
  if(typeof GTM_ID!=="undefined" && GTM_ID && GTM_ID.indexOf("GTM-")===0 && GTM_ID!=="GTM-XXXXXXX"){
    (function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src='https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);})(window,document,'script','dataLayer',GTM_ID);
  }
  if($("#yr"))$("#yr").textContent=new Date().getFullYear();
  applyState();syncBoxes();render();
})();
