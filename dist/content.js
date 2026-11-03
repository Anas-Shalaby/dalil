(function(){"use strict";function d(t,e,n={}){const i=e.trim(),o=i?`«${i}»`:"";switch(t){case"click":return n.kind==="button"?i?`اضغط على زر ${o}.`:"اضغط على الزر المحدد.":n.kind==="link"?i?`افتح رابط ${o}.`:"افتح الرابط المحدد.":n.kind==="tab"?i?`افتح تبويب ${o}.`:"افتح التبويب المحدد.":n.kind==="menuitem"?i?`اختر ${o} من القائمة.`:"اختر عنصرًا من القائمة.":i?`اضغط على ${o}.`:"تفاعل مع العنصر المحدد.";case"input":return i?`أدخل البيانات في حقل ${o}.`:"أدخل البيانات في الحقل المحدد.";case"select":return i?`اختر خيارًا من قائمة ${o}.`:"اختر خيارًا من القائمة المحددة.";case"toggle":return n.kind==="radio"?i?`اختر ${o}.`:"اختر الخيار المحدد.":n.checked===!1?i?`ألغِ تحديد ${o}.`:"ألغِ تحديد الخيار المحدد.":i?`حدّد ${o}.`:"حدّد الخيار المحدد.";case"manual":return""}}const A="لحماية خصوصيتك، لا تُلتقط لقطات لحقول الإدخال. يمكنك إضافة لقطة يدويًا من المحرر.",P="لحماية خصوصيتك، لا تُلتقط لقطات لحقول الإدخال والقوائم. يمكنك إضافة لقطة يدويًا من المحرر.",S="تم تجاهل اللقطة لأن الحقل قد يحتوي على بيانات حساسة.",G="لم تُلتقط اللقطة لأن الإجراءات كانت متتابعة بسرعة. يمكنك إضافتها يدويًا من المحرر.",m="لم تُلتقط اللقطة لأن التبويب لم يكن مرئيًا. أبقِ الصفحة في المقدمة أثناء التسجيل.";function K(t){return typeof t=="object"&&t!==null&&"type"in t&&typeof t.type=="string"&&t.type.startsWith("DALIL_")}const U=90;function z(t,e=U){const n=t.replace(/\s+/g," ").trim();return n.length<=e?n:`${n.slice(0,e-1).trimEnd()}…`}const j=["a[href]","button",'input:not([type="hidden"])',"select","textarea","summary",'[role="button"]','[role="link"]','[role="tab"]','[role="menuitem"]','[role="checkbox"]','[role="radio"]','[role="switch"]','[role="combobox"]',"[onclick]"].join(","),V=/current-password|new-password|one-time-code|cc-number|cc-csc|cc-exp|cc-name|cc-type|cc-given-name|cc-family-name|transaction-currency|transaction-amount/i,Y=/password|passwd|pwd|passcode|otp|one[-_. ]?time|token|secret|api[-_. ]?key|cvv|cvc|card[-_. ]?(?:number|no|num)|credit[-_. ]?card|security[-_. ]?code|iban|\bcc\b|cardnumber/i;function L(t){return t instanceof HTMLElement?t.innerText:t.textContent??""}function q(t){return z(t.replace(/[\u200B-\u200D\uFEFF]/g,"").replace(/\s+/g," ").trim())}function W(t){const e=(t.getAttribute("aria-labelledby")??"").split(/\s+/).filter(Boolean);return e.length===0?"":e.map(n=>document.getElementById(n)?.textContent??"").join(" ").trim()}function X(t){if("labels"in t){const n=t.labels;if(n&&n.length>0)return Array.from(n).map(i=>L(i)).join(" ").trim()}const e=t.closest("label");return e?L(e):""}function p(t){if(!t)return"";const e=[W(t),t.getAttribute("aria-label")??"",X(t)];t instanceof HTMLInputElement&&["button","submit","reset"].includes(t.type)&&e.push(t.getAttribute("value")??"");const n=t.getAttribute("role");if(t.matches('button, a, summary, [role="button"], [role="link"], [role="tab"], [role="menuitem"]')||n==="checkbox"||n==="radio"||n==="switch"){e.push(L(t));const o=t.querySelector("img[alt]")?.getAttribute("alt")??"";e.push(o)}(t instanceof HTMLInputElement||t instanceof HTMLTextAreaElement)&&e.push(t.getAttribute("placeholder")??""),e.push(t.getAttribute("title")??"");const i=t.getAttribute("name")??t.getAttribute("id")??"";i&&i.length<=48&&e.push(i.replace(/[-_]+/g," "));for(const o of e){const a=q(o);if(a)return a}return""}function J(t){if(t instanceof HTMLInputElement)return["button","submit","reset","image"].includes(t.type)?"button":t.type==="checkbox"?"checkbox":t.type==="radio"?"radio":(t.type==="search"||t.type==="email"||t.type==="tel","input");if(t instanceof HTMLSelectElement)return"select";if(t instanceof HTMLTextAreaElement)return"textarea";const e=t.getAttribute("role");return e==="button"?"button":e==="link"?"link":e==="tab"?"tab":e==="menuitem"?"menuitem":e==="checkbox"||e==="switch"?"checkbox":e==="radio"?"radio":t.tagName.toLowerCase()==="a"?"link":t.tagName.toLowerCase()==="button"?"button":"control"}function Q(t){if(!t)return null;const e=t.closest("label");return e instanceof HTMLLabelElement&&e.control?e.control:t.closest(j)}function Z(t){if(!(t instanceof HTMLElement))return!1;const e=t.getBoundingClientRect();if(e.width<=0||e.height<=0)return!1;const n=window.getComputedStyle(t);return n.visibility==="hidden"||n.display==="none"?!1:Number(n.opacity)>0}function C(t){return t.getAttribute("aria-disabled")==="true"?!0:t.matches(":disabled")}function y(t){if(t instanceof HTMLInputElement&&t.type==="password")return!0;const e=(t.getAttribute("autocomplete")??"").toLowerCase();if(V.test(e))return!0;const n=[t.getAttribute("name"),t.getAttribute("id"),t.getAttribute("placeholder"),t.getAttribute("aria-label"),t.getAttribute("data-testid"),t.getAttribute("autocomplete")].filter(Boolean).join(" ").replace(/[_-]+/g," ");return Y.test(n)}function tt(t){if(!Z(t)||C(t)||t instanceof HTMLInputElement&&(["checkbox","radio","file","range","color"].includes(t.type)||!["button","submit","reset","image"].includes(t.type))||t instanceof HTMLSelectElement||t instanceof HTMLTextAreaElement||t instanceof HTMLElement&&t.isContentEditable&&!t.matches('[role="button"], [role="link"]'))return null;const e=J(t),n=p(t),i=t.getAttribute("role");if(i==="checkbox"||i==="radio"||i==="switch"){const a=t.getAttribute("aria-checked");return{actionType:"toggle",elementKind:i==="radio"?"radio":"checkbox",elementLabel:n,instruction:d("toggle",n,{kind:i==="radio"?"radio":"checkbox",checked:a==="true"?!1:a==="false"?!0:void 0}),sensitive:!1,allowScreenshot:!0}}return{actionType:"click",elementKind:e,elementLabel:n,instruction:d("click",n,{kind:e}),sensitive:!1,allowScreenshot:!0}}function et(t){if(C(t))return null;if(t instanceof HTMLInputElement){const e=(t.type||"text").toLowerCase();if(["file","hidden","button","submit","reset","image"].includes(e))return null;if(e==="checkbox"||e==="radio"){const o=e==="radio"?"radio":"checkbox",a=p(t);return{actionType:"toggle",elementKind:o,elementLabel:a,instruction:d("toggle",a,{kind:o,checked:t.checked}),sensitive:!1,allowScreenshot:!0}}if(e==="range"||e==="color")return null;const n=y(t),i=p(t);return{actionType:"input",elementKind:"input",elementLabel:i,instruction:d("input",i),sensitive:n,allowScreenshot:!1,screenshotNote:n?S:A}}if(t instanceof HTMLTextAreaElement){const e=y(t),n=p(t);return{actionType:"input",elementKind:"textarea",elementLabel:n,instruction:d("input",n),sensitive:e,allowScreenshot:!1,screenshotNote:e?S:A}}if(t instanceof HTMLSelectElement){const e=p(t);return{actionType:"select",elementKind:"select",elementLabel:e,instruction:d("select",e),sensitive:y(t),allowScreenshot:!1,screenshotNote:P}}return null}const h="dalil-recording-indicator",I="dalil-recording-indicator-style",nt=`
  #${h} {
    all: initial;
    position: fixed;
    bottom: 20px;
    left: 20px;
    z-index: 2147483647;
    direction: rtl;
    font-family: 'IBM Plex Sans Arabic', 'Segoe UI', Tahoma, Arial, sans-serif;
  }
  #${h} * { box-sizing: border-box; }
  .dalil-pill {
    display: inline-flex;
    align-items: center;
    gap: 10px;
    padding: 8px 12px;
    border-radius: 14px;
    border: 1px solid rgba(233, 231, 241, 0.9);
    background: rgba(255, 255, 255, 0.97);
    box-shadow: 0 16px 40px -18px rgba(25, 24, 39, 0.45);
    backdrop-filter: blur(8px);
    color: #191827;
    font-size: 13px;
    line-height: 1;
  }
  .dalil-dot {
    width: 9px;
    height: 9px;
    border-radius: 999px;
    background: #B4233A;
    box-shadow: 0 0 0 4px rgba(180, 35, 58, 0.14);
    animation: dalil-blink 1.6s ease-in-out infinite;
  }
  .dalil-pill[data-paused='true'] .dalil-dot {
    background: #9A5B00;
    box-shadow: 0 0 0 4px rgba(154, 91, 0, 0.14);
    animation: none;
  }
  .dalil-label { font-weight: 600; white-space: nowrap; }
  .dalil-count {
    color: #747387;
    font-variant-numeric: tabular-nums;
    white-space: nowrap;
  }
  .dalil-actions { display: inline-flex; align-items: center; gap: 4px; }
  .dalil-btn {
    all: unset;
    cursor: pointer;
    border-radius: 9px;
    padding: 5px 9px;
    font-size: 12px;
    font-weight: 600;
    color: #4E229F;
    background: #F2EDFE;
    transition: background-color 120ms ease;
  }
  .dalil-btn:hover { background: #E7DDFD; }
  .dalil-btn[data-kind='stop'] { color: #B4233A; background: #FCEFF1; }
  .dalil-btn[data-kind='stop']:hover { background: #F8E0E5; }
  .dalil-hint {
    position: absolute;
    bottom: calc(100% + 8px);
    left: 0;
    width: 268px;
    padding: 9px 11px;
    border-radius: 12px;
    border: 1px solid #E9E7F1;
    background: #FFFFFF;
    box-shadow: 0 16px 40px -20px rgba(25, 24, 39, 0.4);
    color: #747387;
    font-size: 12px;
    line-height: 1.7;
    opacity: 0;
    pointer-events: none;
    transform: translateY(4px);
    transition: opacity 140ms ease, transform 140ms ease;
  }
  #${h}:hover .dalil-hint { opacity: 1; transform: translateY(0); }
  @keyframes dalil-blink {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.35; }
  }
  @media (prefers-reduced-motion: reduce) {
    .dalil-dot { animation: none; }
  }
`;let s=null,c=null,f=null,b=null,E=null,l=null;function it(){if(document.getElementById(I))return;const t=document.createElement("style");t.id=I,t.textContent=nt,(document.head??document.documentElement).appendChild(t)}function _(t,e){const n=document.createElement("button");return n.type="button",n.className="dalil-btn",n.dataset.kind=t,n.textContent=e,n}function k(t){if(!c||!b||!E||!f||!l)return;const e=t.status==="paused";c.dataset.paused=e?"true":"false",f.setAttribute("aria-hidden","true"),b.textContent=e?"التسجيل متوقف مؤقتًا":"جارٍ التسجيل",E.textContent=t.stepCount===1?"خطوة واحدة":`${t.stepCount} خطوة`,l.textContent=e?"متابعة":"إيقاف مؤقت",l.dataset.kind="toggle"}function w(t,e){if(it(),s){k(t);return}s=document.createElement("div"),s.id=h,s.setAttribute("dir","rtl"),c=document.createElement("div"),c.className="dalil-pill",c.setAttribute("role","status"),c.setAttribute("aria-live","polite"),f=document.createElement("span"),f.className="dalil-dot",b=document.createElement("span"),b.className="dalil-label",E=document.createElement("span"),E.className="dalil-count",l=_("toggle","إيقاف مؤقت"),l.addEventListener("click",()=>{c?.dataset.paused==="true"?e.onResume():e.onPause()});const n=_("stop","إنهاء");n.addEventListener("click",()=>e.onStop());const i=document.createElement("div");i.className="dalil-actions",i.append(l,n);const o=document.createElement("div");o.className="dalil-hint",o.textContent="يستمع دليل للتفاعل داخل هذه الصفحة فقط، ولا يرسل أي بيانات خارج جهازك.",c.append(f,b,E,i),s.append(o,c),document.documentElement.appendChild(s),k(t)}function ot(t){k(t)}function D(){s?.remove(),s=null,c=null,f=null,b=null,E=null,l=null}const rt=350,at=500;let r=null,N={key:"",at:0},R={key:"",at:0};function u(t){try{chrome.runtime.sendMessage(t)}catch{}}function ct(t){if(!t)return"";const e=t.tagName.toLowerCase(),n=t.id?`#${t.id}`:"",i=t.getAttribute("name");return`${e}${n}${i?`[name="${i}"]`:""}`}function st(t){return`${ct(t)}::${p(t)}`}function v(t,e,n,i,o){if(!r||r.status!=="recording")return;const a=e==="click"?Q(t.target):t.target;if(!a||!a.isConnected)return;const g=Date.now(),$=st(a);if($===i.key&&g-i.at<n)return;const B=o(a);if(!B)return;const pt=e==="click"&&g-i.at<n;i.key=$,i.at=g,lt(B,pt)}function O(t){v(t,"click",rt,N,tt)}function H(t){v(t,"change",at,R,et)}function x(){r&&(document.hidden?r.lastScreenshotError=m:r.lastScreenshotError===m&&(r.lastScreenshotError=void 0))}function lt(t,e){if(!r)return;x();let n=t.allowScreenshot,i=t.screenshotNote;document.hidden?(n=!1,i=m):n&&e&&(n=!1,i=G),u({type:"DALIL_ACTION",pageTitle:document.title||"",action:{...t,allowScreenshot:n,screenshotNote:i}})}function ut(){document.addEventListener("click",O,!0),document.addEventListener("change",H,!0),document.addEventListener("visibilitychange",x,!0)}function M(){document.removeEventListener("click",O,!0),document.removeEventListener("change",H,!0),document.removeEventListener("visibilitychange",x,!0)}function F(t){M(),r=t,N={key:"",at:0},R={key:"",at:0},ut(),w({status:t.status,stepCount:t.stepCount},{onPause:()=>u({type:"DALIL_PAUSE_RECORDING"}),onResume:()=>u({type:"DALIL_RESUME_RECORDING"}),onStop:()=>u({type:"DALIL_STOP_RECORDING",openEditor:!0})})}function T(){M(),D(),r=null}async function dt(){try{const t=await chrome.runtime.sendMessage({type:"DALIL_GET_STATE"});t?.session?F(t.session):T()}catch{T()}}chrome.runtime.onMessage.addListener(t=>{if(K(t))switch(t.type){case"DALIL_RECORDER_START":F(t.session);break;case"DALIL_RECORDER_STATE":r&&(r.status=t.status,r.stepCount=t.stepCount,r.lastScreenshotError=t.lastScreenshotError,ot({status:t.status,stepCount:t.stepCount}));break;case"DALIL_RECORDER_STOP":T();break;case"DALIL_HIDE_INDICATOR":D();break;case"DALIL_SHOW_INDICATOR":r&&w({status:r.status,stepCount:r.stepCount},{onPause:()=>u({type:"DALIL_PAUSE_RECORDING"}),onResume:()=>u({type:"DALIL_RESUME_RECORDING"}),onStop:()=>u({type:"DALIL_STOP_RECORDING",openEditor:!0})});break}}),dt()})();
