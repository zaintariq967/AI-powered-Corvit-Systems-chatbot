const state = {
  dataset: null,
  history: JSON.parse(localStorage.getItem("corvit_chat_history") || "[]"),
  onlineSearch: false,
  busy: false
};

const $ = (id) => document.getElementById(id);
const officialHome = "https://corvit.com/systems/";

document.addEventListener("DOMContentLoaded", async () => {
  bindUI();
  await loadDataset();
  renderStaticContent();
  renderHistory();

  if (!state.history.length) {
    addAssistant("Assalam-o-Alaikum! 👋 I’m the Corvit AI Assistant. Ask me about courses, current timetable, instructors, NAVTTC, fees, labs, images, campuses or career guidance.");
  }
});

async function loadDataset(){
  try{
    const res = await fetch("dataset.json", {cache:"no-store"});
    if(!res.ok) throw new Error("dataset.json not found");
    state.dataset = await res.json();
  }catch(err){
    console.error(err);
    state.dataset = {};
    addAssistant("I could not load the local Corvit knowledge base. Please make sure dataset.json is in the same folder and run the site through Live Preview/HTTP, not file://.");
  }
}

function bindUI(){
  $("chatLauncher").onclick = openChat;
  $("navChatBtn").onclick = openChat;
  $("heroChatBtn").onclick = openChat;
  $("closeChat").onclick = closeChat;
  $("chatOverlay").onclick = closeChat;
  $("clearChat").onclick = () => {
    state.history = [];
    localStorage.removeItem("corvit_chat_history");
    $("chatMessages").innerHTML = "";
    addAssistant("Chat cleared. What would you like to know about Corvit?");
  };
  $("chatForm").onsubmit = e => { e.preventDefault(); sendCurrentMessage(); };
  $("toggleOnlineSearch").onclick = toggleOnlineSearch;

  $("chatInput").addEventListener("keydown", e => {
    if(e.key === "Enter" && !e.shiftKey){
      e.preventDefault();
      sendCurrentMessage();
    }
  });
  $("chatInput").addEventListener("input", e => {
    e.target.style.height = "auto";
    e.target.style.height = Math.min(e.target.scrollHeight,110) + "px";
  });

  document.querySelectorAll(".quick-questions button,.chip").forEach(btn => {
    btn.onclick = () => {
      const q = btn.dataset.question;
      openChat();
      $("chatInput").value = q;
      sendCurrentMessage();
    };
  });

  $("mobileMenuBtn").onclick = () => $("navLinks").classList.toggle("mobile-open");
  document.querySelectorAll(".nav-link").forEach(a => a.onclick = () => $("navLinks").classList.remove("mobile-open"));

  document.querySelectorAll(".filter").forEach(btn => {
    btn.onclick = () => {
      document.querySelectorAll(".filter").forEach(x => x.classList.remove("active"));
      btn.classList.add("active");
      renderCourses(btn.dataset.filter);
    };
  });

  window.addEventListener("keydown", e => {
    if(e.key === "Escape") closeChat();
  });
}

function openChat(){
  $("chatbot").classList.add("open");
  $("chatOverlay").classList.add("show");
  setTimeout(() => $("chatInput").focus(), 100);
}
function closeChat(){
  $("chatbot").classList.remove("open");
  $("chatOverlay").classList.remove("show");
}
function toggleOnlineSearch(){
  state.onlineSearch = !state.onlineSearch;
  $("toggleOnlineSearch").textContent = state.onlineSearch ? "Disable online search" : "Enable online search";
  $("searchStatus").innerHTML = state.onlineSearch
    ? '<span>●</span> Live Corvit search enabled <button id="toggleOnlineSearch">Disable online search</button>'
    : '<span>●</span> Official knowledge mode <button id="toggleOnlineSearch">Enable online search</button>';
  $("toggleOnlineSearch").onclick = toggleOnlineSearch;
}

function renderStaticContent(){
  if(!state.dataset) return;
  const d = state.dataset;
  $("aboutTitle").textContent = d.institute?.name || "Corvit Systems";
  $("aboutDescription").textContent = d.institute?.description || "Professional IT training and student guidance.";
  $("officialHomeLink").href = d.official_links?.home || officialHome;

  const modes = d.training_and_facilities?.training_modes || d.training_modes;
  if(Array.isArray(modes)) $("trainingModes").textContent = modes.join(" • ");

  const c = d.institute?.contact || d.contact || {};
  $("contactAddress").textContent = c.address || "11A-D1 Ghalib Road, Gulberg III, Lahore, Pakistan";
  $("contactPhone").textContent = c.phone || "+92-303-8888555";
  $("contactEmail").textContent = c.email || "[email protected]";

  renderCourses("all");
  renderFacilityImages();
}

function renderCourses(filter){
  const grid = $("courseGrid");
  const cats = state.dataset?.courses?.main_categories || {};
  const labels = {
    networking:"Networking", cybersecurity:"Cyber Security", cloud:"Cloud",
    ai_and_programming:"AI & Programming", devops:"DevOps",
    linux_and_systems:"Linux & Systems", web_and_creative:"Web & Creative", other:"Professional"
  };
  let rows = [];
  Object.entries(cats).forEach(([key, list]) => {
    if(filter !== "all" && key !== filter) return;
    (list || []).slice(0, filter === "all" ? 4 : 10).forEach(name => rows.push({name,cat:labels[key] || key}));
  });
  grid.innerHTML = rows.map((x,i)=>`
    <article class="course-card">
      <div class="course-icon">${iconFor(x.cat)}</div>
      <h3>${escapeHtml(x.name)}</h3>
      <p>Explore official Corvit training information, outline and career relevance.</p>
      <div class="tag">${escapeHtml(x.cat)}</div>
    </article>`).join("");
}
function iconFor(cat){
  if(cat.includes("Cyber")) return "⌁";
  if(cat.includes("Cloud")) return "☁";
  if(cat.includes("AI")) return "✦";
  if(cat.includes("DevOps")) return "◈";
  return "⌘";
}

function renderFacilityImages(){
  const media = Array.isArray(state.dataset?.media) ? state.dataset.media : [];
  const picks = media.filter(x => ["labs","classrooms","training_mode"].includes(x.category)).slice(0,3);
  $("facilityImages").innerHTML = picks.map((x,i)=>`
    <div class="facility-image ${["one","two","three"][i]}">
      <img src="${escapeAttr(x.url)}" alt="${escapeAttr(x.alt || "Corvit official image")}" loading="lazy">
    </div>`).join("");
}

function renderHistory(){
  $("chatMessages").innerHTML = "";
  state.history.forEach(m => appendBubble(m.role,m.content,m.images));
}

function saveMessage(role,content,images=[]){
  state.history.push({role,content,images});
  localStorage.setItem("corvit_chat_history",JSON.stringify(state.history.slice(-60)));
}

function addAssistant(content,images=[]){
  saveMessage("assistant",content,images);
  appendBubble("assistant",content,images);
}
function addUser(content){
  saveMessage("user",content,[]);
  appendBubble("user",content,[]);
}
function appendBubble(role,content,images=[]){
  const wrap=document.createElement("div");
  wrap.className=`message ${role}`;
  const bubble=document.createElement("div");
  bubble.className="bubble";
  bubble.innerHTML=formatText(content);
  if(images?.length){
    const box=document.createElement("div");
    box.className="chat-image-grid";
    images.slice(0,3).forEach(im=>{
      const img=document.createElement("img");
      img.src=im.url; img.alt=im.alt||"Corvit official image"; img.loading="lazy";
      box.appendChild(img);
    });
    bubble.appendChild(box);
  }
  wrap.appendChild(bubble);
  $("chatMessages").appendChild(wrap);
  $("chatMessages").scrollTop=$("chatMessages").scrollHeight;
}
function showTyping(){
  const el=document.createElement("div");
  el.id="typing";
  el.className="message assistant";
  el.innerHTML='<div class="bubble typing"><i></i><i></i><i></i></div>';
  $("chatMessages").appendChild(el);
  $("chatMessages").scrollTop=$("chatMessages").scrollHeight;
}
function hideTyping(){ $("typing")?.remove(); }

async function sendCurrentMessage(){
  const input=$("chatInput");
  const q=input.value.trim();
  if(!q || state.busy) return;
  input.value=""; input.style.height="auto";
  addUser(q);
  state.busy=true;
  showTyping();

  try{
    const result=await answerQuestion(q);
    hideTyping();
    addAssistant(result.text,result.images||[]);
  }catch(err){
    console.error(err);
    hideTyping();
    addAssistant("I’m sorry, I could not complete that request. I can still answer from the Corvit knowledge base or direct you to the official Corvit website.");
  }finally{
    state.busy=false;
  }
}

async function answerQuestion(question){
  const intent = detectIntent(question);
  const local = retrieveLocal(question,intent);

  // Exact/local deterministic answer first.
  if(local && local.confidence >= 0.88){
    return local;
  }

  // Optional live search against official Corvit pages through Netlify Function.
  let webContext = [];
  if(state.onlineSearch || isFreshQuestion(question)){
    webContext = await onlineCorvitSearch(question);
  }

  // GPT gets only relevant context, never the whole dataset.
  const context = buildContext(local,webContext);
  const modelAnswer = await askGroq(question,context);

  if(modelAnswer) return {text:modelAnswer,images:local?.images||[]};
  if(local) return local;

  return deterministicFallback(question,intent);
}

function isFreshQuestion(q){
  return /\b(today|now|current|latest|recent|this week|this month|available|batch|start|starting|schedule|timetable|fee|fees|price|seat|seats)\b/i.test(q);
}

function detectIntent(q){
  const s=q.toLowerCase();
  if(/\b(timetable|schedule|timing|timings|time|batch|start|starting)\b/.test(s)) return "schedule";
  if(/\b(fee|fees|price|cost|paid|payment)\b/.test(s)) return "fees";
  if(/\b(navttc|free course|free courses|government funded)\b/.test(s)) return "navttc";
  if(/\b(image|images|photo|photos|picture|pictures|lab|classroom|gallery)\b/.test(s)) return "images";
  if(/\b(instructor|trainer|teacher|teach|who is teaching)\b/.test(s)) return "instructor";
  if(/\b(campus|branch|location|address)\b/.test(s)) return "campus";
  if(/\b(best course|which course|recommend|recommendation|beginner|fresher|career|job|profession|become)\b/.test(s)) return "guidance";
  if(/\b(infrastructure|facility|facilities|lab|equipment)\b/.test(s)) return "infrastructure";
  if(/\b(about|corvit|history|experience)\b/.test(s)) return "about";
  if(/\b(course|courses|training|program|programs)\b/.test(s)) return "courses";
  return "general";
}

function retrieveLocal(q,intent){
  const d=state.dataset||{};
  const text=JSON.stringify(d).toLowerCase();
  const words=tokenize(q);
  let best=[], score=0;

  const docs=Array.isArray(d.knowledge_documents)?d.knowledge_documents:[];
  docs.forEach(doc=>{
    const hay=JSON.stringify(doc).toLowerCase();
    let sc=0; words.forEach(w=>{if(w.length>2 && hay.includes(w)) sc+=1});
    if(sc) best.push({doc,sc});
  });
  best.sort((a,b)=>b.sc-a.sc);

  if(intent==="schedule") return scheduleAnswer(q);
  if(intent==="fees") return feeAnswer();
  if(intent==="navttc") return navttcAnswer();
  if(intent==="images") return imageAnswer(q);
  if(intent==="instructor") return instructorAnswer(q);
  if(intent==="guidance") return guidanceAnswer(q);
  if(intent==="campus") return campusAnswer(q);
  if(intent==="infrastructure") return infrastructureAnswer(q);
  if(intent==="courses") return courseAnswer(q);

  if(best.length){
    return {confidence:Math.min(.87,best[0].sc/8),text:cleanDoc(best[0].doc)};
  }
  return null;
}

function scheduleAnswer(q){
  const entries=state.dataset?.current_schedule?.entries||[];
  if(!entries.length) return null;
  const s=q.toLowerCase();
  let rows=entries;
  const matched=entries.filter(e=>tokenize(s).some(w=>w.length>3 && JSON.stringify(e).toLowerCase().includes(w)));
  if(matched.length) rows=matched.slice(0,5);
  const out=rows.slice(0,7).map(e=>`• ${e.course}\n  ${e.days} | ${e.time} | ${formatDate(e.start)}\n  Trainer: ${e.trainer} | ${e.mode}`).join("\n\n");
  return {confidence:.95,text:`Current Corvit schedule data:\n\n${out}\n\nSchedule information is time-sensitive; verify changes on the official Lahore schedule page.`,links:[state.dataset.official_links?.lahore_schedule]};
}
function feeAnswer(){
  const f=state.dataset?.paid_training?.fees || state.dataset?.fees;
  const url=state.dataset?.official_links?.lahore_fee;
  return {confidence:.94,text:"Corvit's fee information is dynamic. I will not invent a price. The official fee page/source should be checked for the latest amount and payment details.",links:[url]};
}
function navttcAnswer(){
  const n=state.dataset?.navttc||{};
  const programs=n.programs||n.courses||[];
  return {confidence:.94,text:`NAVTTC programs are government-funded for eligible students. Current Corvit information lists programs such as ${programs.slice(0,7).map(x=>typeof x==="string"?x:(x.name||"")).filter(Boolean).join(", ")}.\n\nEligibility, seats and admissions can change, so verify the current intake on the official NAVTTC/Corvit page.`,links:[state.dataset.official_links?.navttc]};
}
function imageAnswer(q){
  const media=Array.isArray(state.dataset?.media)?state.dataset.media:[];
  const s=q.toLowerCase();
  let picks=media;
  if(/\blab/.test(s)) picks=media.filter(x=>x.category==="labs");
  else if(/\bclass/.test(s)) picks=media.filter(x=>x.category==="classrooms");
  else if(/\bnavttc/.test(s)) picks=media.filter(x=>x.category==="navttc_gallery");
  return {confidence:.96,text:"Here are relevant official Corvit-hosted images from the knowledge base:",images:picks.slice(0,3)};
}
function instructorAnswer(q){
  const entries=state.dataset?.current_schedule?.entries||[];
  const names=[...new Set(entries.map(e=>e.trainer).filter(Boolean))];
  const matched=entries.filter(e=>tokenize(q).some(w=>w.length>3 && JSON.stringify(e).toLowerCase().includes(w)));
  const rows=(matched.length?matched:entries.slice(0,6)).map(e=>`• ${e.course} — ${e.trainer}`).join("\n");
  return {confidence:.9,text:`Current instructor information from the timetable:\n\n${rows}\n\nTrainer assignments can change with batches, so verify the latest schedule.`,links:[state.dataset.official_links?.lahore_schedule]};
}
function guidanceAnswer(q){
  const paths=state.dataset?.career_paths||state.dataset?.admission_and_student_guidance||{};
  const s=q.toLowerCase();
  let text="For a fresher, the best course depends on your background, interests, career goal and whether you prefer free/NAVTTC or paid training.";
  if(/\bnetwork/.test(s)) text+="\n\nNetworking path: start with CCNA, then move toward CCNP and advanced/vendor specializations.";
  else if(/\b(ai|machine learning|ml|data)/.test(s)) text+="\n\nAI path: build a Python foundation, then move into AI/ML and deep learning with practical projects.";
  else if(/\b(cyber|ethical|security|hacking)/.test(s)) text+="\n\nCybersecurity path: networking + Linux fundamentals are useful foundations before security/CEH and specialized tracks.";
  else if(/\b(cloud|aws|azure|devops)/.test(s)) text+="\n\nCloud path: networking/Linux fundamentals → AWS/Azure → DevOps and infrastructure automation.";
  text+="\n\nIf you tell me your education, current skills, preferred field and free-vs-paid preference, I can narrow it down.";
  return {confidence:.9,text};
}
function campusAnswer(q){
  const c=state.dataset?.campuses_and_locations;
  return {confidence:.92,text:JSON.stringify(c,null,2).slice(0,1800)+"\n\nFor any location not clearly identified as a current Systems training campus, please verify with Corvit.",links:[state.dataset.official_links?.contact]};
}
function infrastructureAnswer(q){
  const t=state.dataset?.training_and_facilities;
  return {confidence:.92,text:JSON.stringify(t,null,2).slice(0,2200),images:(state.dataset.media||[]).filter(x=>["labs","classrooms"].includes(x.category)).slice(0,3)};
}
function courseAnswer(q){
  const cats=state.dataset?.courses?.main_categories||{};
  const flat=[];
  Object.entries(cats).forEach(([cat,items])=>items.forEach(x=>flat.push(`${x} (${cat.replaceAll("_"," ")})`)));
  const words=tokenize(q);
  const matches=flat.filter(x=>words.some(w=>w.length>3&&x.toLowerCase().includes(w))).slice(0,12);
  return {confidence:.92,text:matches.length?`Relevant Corvit courses:\n\n${matches.map(x=>"• "+x).join("\n")}`:`Corvit covers networking, cybersecurity, cloud, DevOps, Linux/systems, AI/programming, web/creative and professional tracks.\n\nAsk me about a specific area for a focused list.`,links:[state.dataset.official_links?.best_it_training]};
}

function cleanDoc(doc){
  if(typeof doc==="string") return doc.slice(0,1800);
  const title=doc.title||doc.name||"Corvit knowledge";
  const body=doc.content||doc.summary||doc.description||JSON.stringify(doc);
  return `${title}\n\n${String(body).slice(0,1800)}`;
}
function buildContext(local,web){
  return [
    local?`LOCAL DATASET RESULT:\n${local.text}`:"",
    web?.length?`LIVE OFFICIAL CORVIT SEARCH RESULTS:\n${web.map(x=>`TITLE: ${x.title}\nURL: ${x.url}\nTEXT: ${x.text}`).join("\n\n")}`:"",
    "RULES: Answer only from supplied Corvit context. Never invent fees, seats, dates, campuses, trainers or guarantees. Clearly label dynamic information as requiring verification."
  ].filter(Boolean).join("\n\n---\n\n");
}

async function askGroq(question,context){
  try{
    const keyRes=await fetch("api-key.txt",{cache:"no-store"});
    if(!keyRes.ok) return null;
    const apiKey=(await keyRes.text()).trim();
    if(!apiKey || !apiKey.startsWith("gsk_")) return null;

    const res=await fetch("https://api.groq.com/openai/v1/chat/completions",{
      method:"POST",
      headers:{"Content-Type":"application/json","Authorization":`Bearer ${apiKey}`},
      body:JSON.stringify({
        model:"openai/gpt-oss-120b",
        temperature:.2,
        max_completion_tokens:700,
        messages:[
          {role:"system",content:`You are Corvit AI Assistant for Corvit Systems Pakistan.
Answer using ONLY the retrieved context below.
Be concise, professional and helpful.
If asked for course recommendations, use the user's stated background/goal; do not say one course is universally best.
If information is missing or conflicting, say it needs verification and give the official page.
Never invent prices, seats, schedules, campus status, instructor assignments or guarantees.
If the user asks for images and images are supplied by the application, mention them naturally.
CONTEXT:
${context}`},
          {role:"user",content:question}
        ]
      })
    });
    if(!res.ok) return null;
    const json=await res.json();
    return json?.choices?.[0]?.message?.content?.trim()||null;
  }catch(e){
    console.warn("Groq unavailable:",e);
    return null;
  }
}

async function onlineCorvitSearch(question){
  try{
    const url=`/.netlify/functions/corvit-search?q=${encodeURIComponent(question)}`;
    const res=await fetch(url,{headers:{"Accept":"application/json"}});
    if(!res.ok) return [];
    const json=await res.json();
    return Array.isArray(json.results)?json.results:[];
  }catch(e){
    console.warn("Live search unavailable; using local dataset.",e);
    return [];
  }
}

function deterministicFallback(q,intent){
  const link=state.dataset?.official_links?.home||officialHome;
  const msgs={
    schedule:"I could not verify that exact schedule request from the local data. Please check the official Corvit Lahore schedule.",
    fees:"I could not verify a current fee amount. I won't guess a price; please check the official fee page.",
    general:"I could not find a verified answer in the Corvit knowledge base. Please ask about courses, timetable, instructors, NAVTTC, facilities, images, admissions or career guidance."
  };
  return {text:(msgs[intent]||msgs.general)+`\n\nOfficial source: ${link}`,links:[link]};
}

function formatText(text){
  let s=escapeHtml(String(text||""));
  s=s.replace(/(https?:\/\/[^\s<]+)/g,'<a href="$1" target="_blank" rel="noopener">$1</a>');
  s=s.replace(/\*\*(.*?)\*\*/g,"<strong>$1</strong>");
  return s.replace(/\n/g,"<br>");
}
function tokenize(s){return String(s).toLowerCase().replace(/[^\w\s-]/g," ").split(/\s+/).filter(Boolean)}
function formatDate(s){try{return new Date(s+"T00:00:00").toLocaleDateString(undefined,{day:"2-digit",month:"short",year:"numeric"})}catch{return s}}
function escapeHtml(s){return String(s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]))}
function escapeAttr(s){return escapeHtml(s)}
