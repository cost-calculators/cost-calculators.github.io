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
var WEB3FORMS_KEY = "6609639b-4c84-4353-92e2-b75cb8167ec5";
/* ███████████████████████████████████████████████████████████████████████ */
/* ███████████████████████████████████████████████████████████████████████
   ██  (OPTIONAL) REAL SHARED RATINGS — paste a Firebase Realtime DB base   ██
   ██  URL to make star ratings GLOBAL and persistent across all visitors.  ██
   ██  Example: "https://yourproject-default-rtdb.firebaseio.com"           ██
   ██  Leave "" and ratings still work locally (one vote per device).       ██
   ███████████████████████████████████████████████████████████████████████ */
var RATINGS_DB = "";
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

  /* ---------- build premium report sheet ---------- */
  function esc(x){return String(x==null?"":x).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");}
  function buildReport(){
    var r=window.__lastResult||{};
    var meta=window.REPORT_META||{calc:document.title,site:"Shopify Cost Calculators",url:location.href};
    var promo=window.REPORT_PROMO||{kicker:"CartCoders — Certified Shopify Experts",headline:"Turn this estimate into a plan.",sub:"",bullets:[],ctaText:"Book a free consultation",ctaUrl:"https://cartcoders.com/contact-us"};
    var fig=(r.high!=null)?((r.isMoney!==false?fmtMoney:fmtNum)(r.low)+" – "+(r.isMoney!==false?fmtMoney:fmtNum)(r.high)):((r.isMoney!==false?fmtMoney:fmtNum)(r.low||0));
    var date=new Date().toLocaleDateString("en-US",{year:"numeric",month:"long",day:"numeric"});
    function rows(arr){return (arr||[]).map(function(x){return '<tr><td style="padding:9px 12px;border-bottom:1px solid #eee;color:#555;font-size:13px">'+esc(x.k)+'</td><td style="padding:9px 12px;border-bottom:1px solid #eee;text-align:right;font-weight:600;font-size:13px;font-family:\'Space Grotesk\',sans-serif">'+esc(x.v)+'</td></tr>';}).join("");}
    var inputRows=(r.summary||[]).filter(function(x){return ["Estimated timeline","Estimated budget range","Annual revenue uplift","Annual revenue gain","Net annual benefit","Annual revenue added","Net annual gain","Monthly retainer","Monthly cost"].indexOf(x.k)===-1;});
    var estRows=(r.rows||[]);
    var pkg=r.package?('<div style="margin-top:14px;border:1px solid #111;border-radius:10px;padding:14px 16px"><div style="font-size:10px;letter-spacing:.12em;text-transform:uppercase;color:#777;font-family:\'Space Grotesk\',sans-serif">'+esc(r.package.label)+'</div><div style="font-family:\'Space Grotesk\',sans-serif;font-weight:700;font-size:16px;margin-top:3px">'+esc(r.package.name)+'</div><div style="font-size:12px;color:#555;margin-top:3px">'+esc(r.package.desc)+'</div></div>'):'';
    var bullets=(promo.bullets||[]).map(function(b){return '<li style="font-size:12.5px;color:#e7e7e7;padding:5px 0 5px 22px;position:relative;list-style:none"><span style="position:absolute;left:0;top:9px;width:11px;height:7px;border-left:2px solid #fff;border-bottom:2px solid #fff;transform:rotate(-45deg)"></span>'+esc(b)+'</li>';}).join("");
    var host=document.getElementById("reportSheet");
    if(!host){host=document.createElement("div");host.id="reportSheet";host.style.cssText="position:fixed;left:-99999px;top:0;width:820px;background:#fff";document.body.appendChild(host);}
    host.innerHTML=''+
      '<div style="width:820px;background:#fff;color:#111;font-family:ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,sans-serif">'+
        '<div style="background:#111;color:#fff;padding:30px 40px;display:flex;justify-content:space-between;align-items:flex-start">'+
          '<div><div style="font-family:\'Space Grotesk\',sans-serif;font-weight:700;font-size:21px;letter-spacing:-.02em">'+esc(meta.site)+'</div>'+
          '<div style="font-size:12px;color:#bbb;margin-top:4px">'+esc(meta.calc)+' · Estimate report</div></div>'+
          '<div style="text-align:right;font-size:11.5px;color:#bbb;line-height:1.6">'+esc(date)+'<br>'+esc((meta.url||"").replace(/^https?:\/\//,""))+'</div>'+
        '</div>'+
        '<div style="padding:30px 40px">'+
          '<div style="font-family:\'Space Grotesk\',sans-serif;font-size:11px;letter-spacing:.14em;text-transform:uppercase;color:#777">'+esc(r.primaryLabel||"Estimate")+'</div>'+
          '<div style="font-family:\'Space Grotesk\',sans-serif;font-weight:700;font-size:42px;letter-spacing:-.03em;margin:4px 0 2px">'+esc(fig)+'</div>'+
          '<div style="font-size:12.5px;color:#777">'+esc(r.sub||"")+'</div>'+
          '<div style="display:flex;gap:26px;margin-top:26px">'+
            '<div style="flex:1"><div style="font-family:\'Space Grotesk\',sans-serif;font-weight:700;font-size:14px;margin-bottom:8px">Your selections</div><table style="width:100%;border-collapse:collapse;border:1px solid #eee;border-radius:8px;overflow:hidden">'+rows(inputRows)+'</table></div>'+
            '<div style="flex:1"><div style="font-family:\'Space Grotesk\',sans-serif;font-weight:700;font-size:14px;margin-bottom:8px">Your estimate</div><table style="width:100%;border-collapse:collapse;border:1px solid #eee;border-radius:8px;overflow:hidden">'+rows(estRows)+'</table>'+pkg+'</div>'+
          '</div>'+
          '<div style="margin-top:22px;font-size:11.5px;color:#999">This is an indicative estimate based on the details you entered, not a formal quote. Final pricing follows a short discovery review.</div>'+
        '</div>'+
        '<div style="background:#111;color:#fff;padding:30px 40px">'+
          '<div style="font-family:\'Space Grotesk\',sans-serif;font-size:11px;letter-spacing:.14em;text-transform:uppercase;color:#aaa">'+esc(promo.kicker)+'</div>'+
          '<div style="font-family:\'Space Grotesk\',sans-serif;font-weight:700;font-size:23px;margin-top:7px;letter-spacing:-.02em">'+esc(promo.headline)+'</div>'+
          '<div style="font-size:13px;color:#cfcfcf;margin-top:8px;max-width:62ch">'+esc(promo.sub)+'</div>'+
          '<ul style="margin:14px 0 0;padding:0">'+bullets+'</ul>'+
          '<div style="margin-top:18px;display:inline-block;background:#fff;color:#111;font-family:\'Space Grotesk\',sans-serif;font-weight:700;font-size:14px;padding:12px 20px;border-radius:9px">'+esc(promo.ctaText)+' → '+esc((promo.ctaUrl||"").replace(/^https?:\/\//,""))+'</div>'+
          '<div style="font-size:11.5px;color:#999;margin-top:16px">CartCoders · Certified Shopify Partner · 250+ projects across 25+ countries · cartcoders.com</div>'+
        '</div>'+
      '</div>';
    return host.firstChild;
  }

  function captureTarget(){return buildReport();}
  if($("#saveImg"))$("#saveImg").addEventListener("click",function(){toast("Preparing your report image…");loadScript("https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js").then(function(){window.html2canvas(captureTarget(),{backgroundColor:"#ffffff",scale:2,useCORS:true}).then(function(cv){var a=document.createElement("a");a.href=cv.toDataURL("image/png");a.download=(document.body.dataset.calc||"estimate")+"-report.png";a.click();toast("Report image saved");});}).catch(function(){toast("Could not load image tool")});});
  if($("#dlPdf"))$("#dlPdf").addEventListener("click",function(){toast("Building your PDF report…");loadScript("https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js").then(function(){return loadScript("https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js");}).then(function(){window.html2canvas(captureTarget(),{backgroundColor:"#ffffff",scale:2,useCORS:true}).then(function(cv){
      var jsPDF=window.jspdf.jsPDF,pdf=new jsPDF("p","pt","a4");
      var pw=pdf.internal.pageSize.getWidth(),ph=pdf.internal.pageSize.getHeight();
      var iw=pw,ih=cv.height*(pw/cv.width);
      var img=cv.toDataURL("image/png"),y=0;
      if(ih<=ph){pdf.addImage(img,"PNG",0,0,iw,ih);}
      else{var left=ih;while(left>0){pdf.addImage(img,"PNG",0,y,iw,ih);left-=ph;if(left>0){pdf.addPage();y-=ph;}}}
      pdf.save((document.body.dataset.calc||"estimate")+"-report.pdf");toast("PDF report downloaded");
    });}).catch(function(){window.print();});});

  /* ---------- compare ---------- */
  var cmpOn=false;
  if($("#cmpToggle"))$("#cmpToggle").addEventListener("click",function(){cmpOn=!cmpOn;this.setAttribute("aria-checked",cmpOn?"true":"false");$("#comparePanel").classList.toggle("on",cmpOn);if(cmpOn)$("#comparePanel").scrollIntoView({behavior:"smooth",block:"nearest"});});
  if($("#snapB"))$("#snapB").addEventListener("click",function(){$("#cmpB").textContent=lastRange;$("#cmpBtitle").textContent="Option B — saved";toast("Saved as Option B — now adjust inputs");});

  /* ---------- lead form ---------- */
  if($("#leadForm"))$("#leadForm").addEventListener("submit",function(e){e.preventDefault();var b=this.querySelector('button[type="submit"]');b.disabled=true;b.textContent="Sending…";fetch(this.action,{method:"POST",body:new FormData(this),headers:{Accept:"application/json"}}).then(function(r){return r.json().catch(function(){return{}})}).then(done).catch(done);function done(){$("#leadGrid").style.display="none";$("#leadSuccess").classList.add("on");$("#leadSuccess").scrollIntoView({behavior:"smooth",block:"center"});}});

  /* ---------- rating: handled by a self-contained inline script in each page ---------- */

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
  if($("#yr"))$("#yr").textContent=new Date().getFullYear();
  applyState();syncBoxes();render();
})();
