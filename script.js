const STORAGE_KEY = "mirrorAIProjectData";
let currentUser = null, events = [], historyItems = [], chatCount = 0, reminders = [], settings = { greeting: true, history: true, sound: false }, cameraStream = null, photoUrls = [];

const $ = (id) => document.getElementById(id);
const readData = () => { try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || {}; } catch { return {}; } };
const saveData = () => {
  if (!currentUser) return;
  const all = readData();
  all[currentUser.email] = { user: currentUser, events, historyItems, chatCount, reminders, settings };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
};
const escapeHTML = (value) => String(value ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
function showToast(message) { const t=$("toast"); t.textContent=message; t.classList.add("show"); setTimeout(()=>t.classList.remove("show"),2200); }
function switchAuth(mode) {
  $("login-form").classList.toggle("hidden", mode !== "login");
  $("register-form").classList.toggle("hidden", mode !== "register");
  $("login-tab").classList.toggle("active", mode === "login");
  $("register-tab").classList.toggle("active", mode === "register");
  $("auth-message").textContent = "";
}
function openApp(data) {
  currentUser = data.user; events = data.events || []; historyItems = data.historyItems || []; chatCount = data.chatCount || 0; reminders = data.reminders || []; settings = { greeting: true, history: true, sound: false, ...(data.settings || {}) };
  $("auth-screen").classList.add("hidden"); $("app").classList.remove("hidden");
  renderAll(); navigate("dashboard");
}
function logout() { saveData(); stopCamera(); currentUser=null; $("app").classList.add("hidden"); $("auth-screen").classList.remove("hidden"); $("login-password").value=""; switchAuth("login"); }
function navigate(page) {
  document.querySelectorAll(".page").forEach(p=>p.classList.remove("active"));
  $("page-"+page).classList.add("active");
  document.querySelectorAll(".nav-link").forEach(b=>b.classList.toggle("active",b.dataset.page===page));
  if(page==="profile") renderProfile();
  if(page==="dashboard") renderAll();
  if(page==="reminders") renderReminders();
  if(page==="settings") loadSettings();
}
function addHistory(type, detail) {
  historyItems.unshift({type,detail,time:new Date().toLocaleString()});
  historyItems=historyItems.slice(0,100); saveData(); renderHistory(); renderStats();
}
function renderProfile() {
  $("profile-title").textContent=currentUser.name;
  $("profile-name").value=currentUser.name || "";
  $("profile-email").value=currentUser.email || "";
  $("profile-phone").value=currentUser.phone || "";
  $("profile-dob").value=currentUser.dob || "";
  $("profile-about").value=currentUser.about || "";
}
function renderEvents() {
  const sorted=[...events].sort((a,b)=>(a.date+a.time).localeCompare(b.date+b.time));
  $("event-list").innerHTML=sorted.length ? sorted.map(e=>`<div class="list-item"><div><b>${escapeHTML(e.title)}</b><small>${escapeHTML(e.date)} · ${escapeHTML(e.time)}${e.description?" · "+escapeHTML(e.description):""}</small></div><button class="delete-btn" data-delete="${e.id}">Delete</button></div>`).join("") : "No events yet. Add your first event above.";
  $("upcoming-events").innerHTML=sorted.slice(0,3).map(e=>`<div class="list-item"><div><b>${escapeHTML(e.title)}</b><small>${escapeHTML(e.date)} · ${escapeHTML(e.time)}</small></div></div>`).join("") || "No events added yet.";
}
function renderHistory() {
  $("history-list").innerHTML=historyItems.length ? historyItems.map(h=>`<div class="list-item"><div><b>${escapeHTML(h.type)}</b><small>${escapeHTML(h.detail)} · ${escapeHTML(h.time)}</small></div></div>`).join("") : "No activity recorded yet.";
}
function renderStats() {
  $("event-count").textContent=events.length; $("chat-count").textContent=chatCount; $("history-count").textContent=historyItems.length;
}
function renderAll() {
  $("top-user").textContent=currentUser.name; $("welcome-name").textContent=settings.greeting ? currentUser.name.split(" ")[0] : "there";
  $("today-date").textContent=new Date().toLocaleDateString(undefined,{weekday:"short",day:"numeric",month:"short",year:"numeric"});
  renderProfile(); renderEvents(); renderHistory(); renderStats();
}

function renderReminders() {
  const sorted = [...reminders].sort((a,b)=>(a.date+a.time).localeCompare(b.date+b.time));
  $("reminder-list").innerHTML = sorted.length ? sorted.map(r=>`<div class="list-item"><div><b>${escapeHTML(r.title)}</b><small>${escapeHTML(r.date)} · ${escapeHTML(r.time)}</small></div><button class="delete-btn" data-reminder-delete="${r.id}">Delete</button></div>`).join("") : "No reminders added yet.";
}
function loadSettings() {
  $("setting-greeting").checked = !!settings.greeting;
  $("setting-history").checked = !!settings.history;
  $("setting-sound").checked = !!settings.sound;
}
function stopCamera() {
  if (cameraStream) cameraStream.getTracks().forEach(track=>track.stop());
  cameraStream = null;
  $("camera-video").srcObject = null;
  $("camera-status").textContent = "Camera is off.";
}
async function startCamera() {
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    $("camera-status").textContent = "Camera access is unavailable here. Try a recent browser using localhost or HTTPS.";
    return;
  }
  try {
    cameraStream = await navigator.mediaDevices.getUserMedia({video:true,audio:false});
    $("camera-video").srcObject = cameraStream;
    $("camera-status").textContent = "Camera is running. Browser permission is active.";
    addHistory("Camera started","Live camera preview opened");
  } catch (error) {
    $("camera-status").textContent = "Unable to open camera. Check browser permission and close other apps using the camera.";
  }
}

function assistantReply(question) {
  const q=question.toLowerCase();
  if(/\b(hi|hello|hey)\b/.test(q)) return "Hello! 😊 Welcome back. What would you like to know today?";
  if(q.includes("weather")||q.includes("temperature")) return "Open the Weather page to see the weather module. Connect a weather API to display live temperature, humidity and forecast.";
  if(q.includes("schedule")||q.includes("plan my day")) return "You can organize your day in My Schedule. Add events with a date, time and description, and they will appear on your dashboard.";
  if(q.includes("profile")) return "Open My Profile to update your name, phone number, date of birth and personal introduction.";
  if(q.includes("history")) return "Your Mirror History page stores recent activities and questions asked in this browser.";
  if(q.includes("motivat")||q.includes("quote")) return "✨ Believe in yourself! Small steps every day lead to big achievements. Keep learning and keep growing!";
  if(q.includes("artificial intelligence")||q==="ai") return "Artificial Intelligence (AI) enables computers to perform tasks that normally require human intelligence, such as learning, reasoning and understanding language.";
  if(q.includes("study")||q.includes("exam")) return "Try the Pomodoro technique: study for 25 minutes, take a 5-minute break, and repeat. Add your study sessions to My Schedule!";
  if(q.includes("time")||q.includes("date")) return `Today is ${new Date().toLocaleDateString()} and the time is ${new Date().toLocaleTimeString()}.`;
  return "That is an interesting question! This starter version uses sample responses. Connect an AI model API through a secure backend to answer open-ended questions.";
}
function sendMessage(question) {
  if(!question.trim()) return;
  const box=$("chat-messages");
  const userBubble=document.createElement("div"); userBubble.className="bubble user"; userBubble.textContent=question; box.appendChild(userBubble);
  const answer=document.createElement("div"); answer.className="bubble bot"; answer.textContent=assistantReply(question); box.appendChild(answer);
  box.scrollTop=box.scrollHeight; chatCount++; addHistory("AI question",question); saveData(); renderStats();
}

$("login-tab").addEventListener("click",()=>switchAuth("login"));
$("register-tab").addEventListener("click",()=>switchAuth("register"));
$("go-register").addEventListener("click",()=>switchAuth("register"));

$("register-form").addEventListener("submit", async e => {
    e.preventDefault();

    const name = $("register-name").value.trim();
    const email = $("register-email").value.trim().toLowerCase();
    const password = $("register-password").value;

    if (password !== $("register-confirm").value) {
        $("auth-message").textContent = "Passwords do not match.";
        return;
    }

    try {
        const response = await fetch(`${API_BASE_URL}/api/users`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ name, email, password })
        });

        const result = await response.json();

        if (!response.ok) {
            $("auth-message").textContent = result.message;
            return;
        }

        openApp({
            user: result.user,
            events: [],
            historyItems: [],
            chatCount: 0,
            reminders: []
        });

        showToast("Account created successfully!");

    } catch (error) {
        $("auth-message").textContent =
            "Cannot connect to server. Please try again.";
        console.error(error);
    }
});


$("login-form").addEventListener("submit", async e => {
    e.preventDefault();

    const email = $("login-email").value.trim().toLowerCase();
    const password = $("login-password").value;

    try {
        const response = await fetch(`${API_BASE_URL}/api/login`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ email, password })
        });

        const result = await response.json();

        if (!response.ok) {
            $("auth-message").textContent = result.message;
            return;
        }

        openApp({
            user: result.user,
            events: [],
            historyItems: [],
            chatCount: 0,
            reminders: []
        });

        showToast("Login successful!");

    } catch (error) {
        $("auth-message").textContent =
            "Cannot connect to server. Please try again.";
        console.error(error);
    }
});

$("logout-btn").addEventListener("click",logout);
document.querySelectorAll(".nav-link").forEach(b=>b.addEventListener("click",()=>navigate(b.dataset.page)));
document.querySelectorAll("[data-goto]").forEach(b=>b.addEventListener("click",()=>navigate(b.dataset.goto)));
document.querySelectorAll(".quick-ask").forEach(b=>b.addEventListener("click",()=>{navigate("assistant");sendMessage(b.dataset.question);}));
$("profile-form").addEventListener("submit",e=>{
  e.preventDefault();currentUser.name=$("profile-name").value.trim();currentUser.phone=$("profile-phone").value;
  currentUser.dob=$("profile-dob").value;currentUser.about=$("profile-about").value;
  saveData();renderAll();$("profile-message").textContent="Profile saved successfully.";addHistory("Profile updated","Personal profile details updated");showToast("Profile updated");
});
$("event-date").value=new Date().toISOString().slice(0,10);
$("event-form").addEventListener("submit",e=>{
  e.preventDefault();const event={id:Date.now(),title:$("event-title").value.trim(),date:$("event-date").value,time:$("event-time").value,description:$("event-description").value.trim()};
  events.push(event);saveData();renderEvents();renderStats();addHistory("Schedule added",event.title+" · "+event.date+" "+event.time);e.target.reset();$("event-date").value=new Date().toISOString().slice(0,10);showToast("Event added to schedule");
});
$("event-list").addEventListener("click",e=>{
  const button=e.target.closest("[data-delete]");if(!button)return;
  const id=Number(button.dataset.delete),event=events.find(x=>x.id===id);events=events.filter(x=>x.id!==id);
  saveData();renderEvents();renderStats();addHistory("Schedule deleted",event?.title||"Event removed");
});
$("chat-form").addEventListener("submit",e=>{e.preventDefault();const q=$("chat-input").value.trim();$("chat-input").value="";sendMessage(q);});
$("clear-history").addEventListener("click",()=>{historyItems=[];saveData();renderHistory();renderStats();showToast("History cleared");});


// Additional pages: reminders, settings, live camera and photo gallery.
$("reminder-date").value = new Date().toISOString().slice(0,10);
$("reminder-form").addEventListener("submit",e=>{
  e.preventDefault();
  const title=$("reminder-title").value.trim();
  reminders.push({id:Date.now(),title,date:$("reminder-date").value,time:$("reminder-time").value});
  saveData();renderReminders();addHistory("Reminder added",title);
  e.target.reset();$("reminder-date").value=new Date().toISOString().slice(0,10);showToast("Reminder saved");
});
$("reminder-list").addEventListener("click",e=>{
  const button=e.target.closest("[data-reminder-delete]");if(!button)return;
  const id=Number(button.dataset.reminderDelete);reminders=reminders.filter(r=>r.id!==id);
  saveData();renderReminders();addHistory("Reminder deleted","A reminder was removed");showToast("Reminder deleted");
});
$("save-settings").addEventListener("click",()=>{
  settings={greeting:$("setting-greeting").checked,history:$("setting-history").checked,sound:$("setting-sound").checked};
  saveData();renderAll();showToast("Settings saved");
});
$("camera-start").addEventListener("click",startCamera);
$("camera-stop").addEventListener("click",stopCamera);
$("photo-upload").addEventListener("change",e=>{
  const gallery=$("photo-gallery");
  photoUrls.forEach(url=>URL.revokeObjectURL(url));photoUrls=[];
  const files=[...e.target.files].filter(file=>file.type.startsWith("image/"));
  if(!files.length){gallery.innerHTML='<p class="muted">No photos selected.</p>';return;}
  gallery.innerHTML="";
  files.forEach(file=>{
    const url=URL.createObjectURL(file);photoUrls.push(url);
    const img=document.createElement("img");img.src=url;img.alt=file.name;img.title=file.name;gallery.appendChild(img);
  });
  addHistory("Photos selected",`${files.length} photo(s) previewed`);
}); 

const API_BASE_URL = "https://smart-mirror-backend-vdrg.onrender.com";
