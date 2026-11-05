const STORAGE_KEY = "mirrorAIProjectData";
const API_BASE_URL = "https://smart-mirror-backend-vdrg-t4ti.onrender.com";

// LIVE WEATHER API
async function loadWeather() {
    try {
        const response = await fetch(
            `${API_BASE_URL}/api/weather?city=Nagpur`
        );

        if (!response.ok) {
            throw new Error("Weather API failed");
        }

        const data = await response.json();
        latestWeather = data;

        let icon = "🌤️";
        const condition = data.condition.toLowerCase();

        if (condition.includes("rain")) icon = "🌧️";
        else if (condition.includes("cloud")) icon = "☁️";
        else if (condition.includes("clear")) icon = "☀️";
        else if (condition.includes("haze") || condition.includes("mist")) icon = "🌫️";
        else if (condition.includes("thunder")) icon = "⛈️";

        function update(id, value) {
            const element = document.getElementById(id);
            if (element) {
                element.textContent = value;
            }
        }

        // Dashboard weather
        update("dashboard-temperature", `${Math.round(data.temperature)}°C`);
        update("dashboard-condition", data.condition);
        update("dashboard-city", data.city);
        update("dashboard-weather-icon", icon);

        // Weather page
        update("weather-temperature", `${Math.round(data.temperature)}°C`);
        update("weather-condition", data.condition);
        update("weather-city", data.city);
        update("weather-icon", icon);
        update("weather-humidity", `${data.humidity}%`);
        update("weather-wind", `${(data.windSpeed * 3.6).toFixed(1)} km/h`);
        update("weather-forecast", data.condition);
        update("weather-updated", "Weather updated successfully");

    } catch (error) {
        console.error("Weather error:", error);

        const condition = document.getElementById("weather-condition");
        if (condition) condition.textContent = "Weather unavailable";

        const dashboardCondition = document.getElementById("dashboard-condition");
        if (dashboardCondition) dashboardCondition.textContent = "Weather unavailable";
    }
}

// Automatically refresh weather every 10 minutes
function startWeatherRefresh() {
    loadWeather();

    if (weatherRefreshTimer) {
        clearInterval(weatherRefreshTimer);
    }

    weatherRefreshTimer = setInterval(loadWeather, 60 * 1000);
}

let latestWeather = null;
let weatherRefreshTimer = null;
let cameraStream = null;

const $ = (id) => document.getElementById(id);

const readData = () => {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || {};
  } catch {
    return {};
  }
};

const saveData = () => {
  if (!currentUser) return;
  const all = readData();
  all[currentUser.email] = { settings };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
};

async function apiRequest(path, options = {}) {
  const token = localStorage.getItem("token");
  const headers = {
    "Content-Type": "application/json",
    ...(options.headers || {})
  };

  if (token) headers.Authorization = `Bearer ${token}`;

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers
  });

  const result = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(result.message || `Request failed (${response.status})`);
  }

  return result;
}

function getRecord(result, key) {
  return result?.[key] || result?.data || result;
}

async function loadCloudData() {
  try {
    const [scheduleResult, reminderResult, historyResult] =
      await Promise.all([
        apiRequest("/api/schedules"),
        apiRequest("/api/reminders"),
        apiRequest("/api/history")
      ]);

    const scheduleRows = Array.isArray(scheduleResult)
      ? scheduleResult
      : (scheduleResult.schedules || scheduleResult.data || []);

    const reminderRows = Array.isArray(reminderResult)
      ? reminderResult
      : (reminderResult.reminders || reminderResult.data || []);

    const historyRows = Array.isArray(historyResult)
      ? historyResult
      : (historyResult.history || historyResult.data || []);

    events = scheduleRows.map(x => ({
      ...x,
      id: String(x._id || x.id)
    }));

    reminders = reminderRows.map(x => ({
      ...x,
      id: String(x._id || x.id)
    }));

    historyItems = historyRows.map(x => ({
      ...x,
      id: String(x._id || x.id),
      time: x.time || x.createdAt || ""
    }));

    historyItems.sort(
      (a, b) => new Date(b.createdAt || b.time) -
                new Date(a.createdAt || a.time)
    );

    historyItems = historyItems.slice(0, 100);
    chatCount = historyItems.filter(
    x => x.type === "AI conversation" || x.type === "AI question"
).length;

    renderAll();
    renderReminders();

  } catch (error) {
    console.error("Cloud data loading failed:", error);
    showToast("Could not load saved data. Please refresh.");
  }
}

const escapeHTML = (value) =>
  String(value ?? "").replace(/[&<>"']/g, c => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  }[c]));

function showToast(message) {
  const t = $("toast");
  t.textContent = message;
  t.classList.add("show");
  setTimeout(() => t.classList.remove("show"), 2200);
}

function switchAuth(mode) {
  $("login-form").classList.toggle("hidden", mode !== "login");
  $("register-form").classList.toggle("hidden", mode !== "register");
  $("login-tab").classList.toggle("active", mode === "login");
  $("register-tab").classList.toggle("active", mode === "register");
  $("auth-message").textContent = "";
}

function openApp(data) {
    currentUser = data.user;

    const saved = readData();

    settings = {
        greeting: true,
        history: true,
        sound: false,
        ...(saved[currentUser.email]?.settings || {})
    };

    // Start live weather after login
    startWeatherRefresh();

    events = [];
    historyItems = [];
    chatCount = 0;
    reminders = [];

    $("auth-screen").classList.add("hidden");
    $("app").classList.remove("hidden");

    renderAll();
    navigate("dashboard");
}

function logout() {
    localStorage.removeItem("token");

    currentUser = null;

    if (weatherRefreshTimer) {
        clearInterval(weatherRefreshTimer);
        weatherRefreshTimer = null;
    }

    try {
        stopCamera();
    } catch (error) {
        console.log("Camera already stopped.");
    }

    $("app").classList.add("hidden");
    $("auth-screen").classList.remove("hidden");
    $("login-password").value = "";

    switchAuth("login");
}
function navigate(page) {
  if (page === "weather") {
    loadWeather();
}
  document.querySelectorAll(".page").forEach(
    p => p.classList.remove("active")
  );

  $("page-" + page).classList.add("active");

  document.querySelectorAll(".nav-link").forEach(
    b => b.classList.toggle("active", b.dataset.page === page)
  );

  if (page === "profile") renderProfile();
  if (page === "dashboard") renderAll();
  if (page === "reminders") renderReminders();
  if (page === "settings") loadSettings();

}

async function addHistory(type, detail) {
  const item = {
    type,
    detail,
    time: new Date().toLocaleString()
  };

  historyItems.unshift(item);
  historyItems = historyItems.slice(0, 100);

  renderHistory();
  renderStats();

  if (localStorage.getItem("token")) {
    try {
      const saved = await apiRequest("/api/history", {
        method: "POST",
        body: JSON.stringify(item)
      });

      const record = getRecord(saved, "history");

      if (record && record._id) {
        item.id = String(record._id);
      }

    } catch (error) {
      console.error("History save failed:", error);
      showToast("Activity could not be saved to database.");
    }
  }
}

function renderProfile() {
  $("profile-title").textContent = currentUser.name;
  $("profile-name").value = currentUser.name || "";
  $("profile-email").value = currentUser.email || "";
  $("profile-phone").value = currentUser.phone || "";
  $("profile-dob").value = currentUser.dob || "";
  $("profile-about").value = currentUser.about || "";
}

function renderEvents() {
  const sorted = [...events].sort(
    (a, b) => (a.date + a.time).localeCompare(b.date + b.time)
  );

  $("event-list").innerHTML = sorted.length
    ? sorted.map(e => `
      <div class="list-item">
        <div>
          <b>${escapeHTML(e.title)}</b>
          <small>
            ${escapeHTML(e.date)} · ${escapeHTML(e.time)}
            ${e.description ? " · " + escapeHTML(e.description) : ""}
          </small>
        </div>
        <button class="delete-btn" data-delete="${escapeHTML(e.id)}">
          Delete
        </button>
      </div>
    `).join("")
    : "No events yet. Add your first event above.";

  $("upcoming-events").innerHTML =
    sorted.slice(0, 3).map(e => `
      <div class="list-item">
        <div>
          <b>${escapeHTML(e.title)}</b>
          <small>${escapeHTML(e.date)} · ${escapeHTML(e.time)}</small>
        </div>
      </div>
    `).join("") || "No events added yet.";
}

function renderHistory() {
  $("history-list").innerHTML = historyItems.length
    ? historyItems.map(h => `
      <div class="list-item">
        <div>
          <b>${escapeHTML(h.type)}</b>
          <small>
            ${escapeHTML(h.detail)} · ${escapeHTML(h.time)}
          </small>
        </div>
      </div>
    `).join("")
    : "No activity recorded yet.";
}

function renderStats() {
  $("event-count").textContent = events.length;
  $("chat-count").textContent = chatCount;
  $("history-count").textContent = historyItems.length;
}

function renderAll() {
  $("top-user").textContent = currentUser.name;

  $("welcome-name").textContent = settings.greeting
    ? currentUser.name.split(" ")[0]
    : "there";

  $("today-date").textContent = new Date().toLocaleDateString(
    undefined,
    {
      weekday: "short",
      day: "numeric",
      month: "short",
      year: "numeric"
    }
  );

  renderProfile();
  renderEvents();
  renderHistory();
  renderStats();
}

function renderReminders() {
  const sorted = [...reminders].sort(
    (a, b) => (a.date + a.time).localeCompare(b.date + b.time)
  );

  $("reminder-list").innerHTML = sorted.length
    ? sorted.map(r => `
      <div class="list-item">
        <div>
          <b>${escapeHTML(r.title)}</b>
          <small>${escapeHTML(r.date)} · ${escapeHTML(r.time)}</small>
        </div>
        <button class="delete-btn"
          data-reminder-delete="${escapeHTML(r.id)}">
          Delete
        </button>
      </div>
    `).join("")
    : "No reminders added yet.";
}

function loadSettings() {
  $("setting-greeting").checked = !!settings.greeting;
  $("setting-history").checked = !!settings.history;
  $("setting-sound").checked = !!settings.sound;
}

function stopCamera() {
    if (cameraStream) {
        cameraStream.getTracks().forEach(track => track.stop());
        cameraStream = null;
    }

    if ($("camera-video")) {
        $("camera-video").srcObject = null;
    }

    if ($("camera-status")) {
        $("camera-status").textContent = "Camera is off.";
    }
}

async function startCamera() {
  if (!navigator.mediaDevices ||
      !navigator.mediaDevices.getUserMedia) {
    $("camera-status").textContent =
      "Camera access is unavailable here. Try a recent browser using localhost or HTTPS.";
    return;
  }

  try {
    cameraStream = await navigator.mediaDevices.getUserMedia({
      video: true,
      audio: false
    });

    $("camera-video").srcObject = cameraStream;
    $("camera-status").textContent =
      "Camera is running. Browser permission is active.";

    addHistory("Camera started", "Live camera preview opened");

  } catch (error) {
    $("camera-status").textContent =
      "Unable to open camera. Check browser permission and close other apps using the camera.";
  }
}

async function assistantReply(question) {
  const q = question.toLowerCase();

  if (/\b(hi|hello|hey)\b/.test(q))
    return "Hello! 😊 Welcome back. What would you like to know today?";

  if (q.includes("weather") || q.includes("temperature")) {
    if (!latestWeather) {
        await loadWeather();
    }

    if (latestWeather) {
        return `The weather in ${latestWeather.city} is ${latestWeather.temperature}°C with ${latestWeather.condition}. Humidity is ${latestWeather.humidity}% and wind speed is ${(latestWeather.windSpeed * 3.6).toFixed(1)} km/h.`;
    }

    return "Sorry, I cannot fetch the weather right now.";
}

  if (q.includes("schedule") || q.includes("plan my day"))
    return "You can organize your day in My Schedule. Add events with a date, time and description, and they will appear on your dashboard.";

  if (q.includes("profile"))
    return "Open My Profile to update your name, phone number, date of birth and personal introduction.";

  if (q.includes("history"))
    return "Your Mirror History page stores recent activities and questions asked in this browser.";

  if (q.includes("motivat") || q.includes("quote"))
    return "✨ Believe in yourself! Small steps every day lead to big achievements. Keep learning and keep growing!";

  if (q.includes("artificial intelligence") || q === "ai")
    return "Artificial Intelligence (AI) enables computers to perform tasks that normally require human intelligence, such as learning, reasoning and understanding language.";

  if (q.includes("study") || q.includes("exam"))
    return "Try the Pomodoro technique: study for 25 minutes, take a 5-minute break, and repeat. Add your study sessions to My Schedule!";

  if (q.includes("time") || q.includes("date"))
    return `Today is ${new Date().toLocaleDateString()} and the time is ${new Date().toLocaleTimeString()}.`;

  return "That is an interesting question! This starter version uses sample responses. Connect an AI model API through a secure backend to answer open-ended questions.";
}

async function sendMessage(question) {
    if (!question.trim()) return;

    const box = $("chat-messages");

    const userBubble = document.createElement("div");
    userBubble.className = "bubble user";
    userBubble.textContent = question;
    box.appendChild(userBubble);

    const answerText = await assistantReply(question);

    const answer = document.createElement("div");
    answer.className = "bubble bot";
    answer.textContent = answerText;
    box.appendChild(answer);

    box.scrollTop = box.scrollHeight;

    chatCount++;

    // Save both question and assistant response
    await addHistory(
        "AI conversation",
        `You: ${question}\nMirrorAI: ${answerText}`
    );

    renderStats();
}

// AUTH BUTTONS

$("login-tab").addEventListener("click", () => switchAuth("login"));
$("register-tab").addEventListener("click", () => switchAuth("register"));
$("go-register").addEventListener("click", () => switchAuth("register"));

// REGISTER

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

    if (!result.token) {
      throw new Error("Registration API did not return a login token.");
    }

    localStorage.setItem("token", result.token);

    openApp({ user: result.user });
    await loadCloudData();

    showToast("Account created successfully!");

  } catch (error) {
    $("auth-message").textContent =
      "Cannot connect to server. Please try again.";

    console.error(error);
  }
});

// LOGIN

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

    localStorage.setItem("token", result.token);

    openApp({ user: result.user });
    await loadCloudData();

    showToast("Login successful!");

  } catch (error) {
    $("auth-message").textContent =
      "Cannot connect to server. Please try again.";

    console.error(error);
  }
});

// NAVIGATION AND LOGOUT

$("logout-btn").addEventListener("click", logout);

document.querySelectorAll(".nav-link").forEach(b =>
  b.addEventListener("click", () => navigate(b.dataset.page))
);

document.querySelectorAll("[data-goto]").forEach(b =>
  b.addEventListener("click", () => navigate(b.dataset.goto))
);

document.querySelectorAll(".quick-ask").forEach(b =>
  b.addEventListener("click", () => {
    navigate("assistant");
    sendMessage(b.dataset.question);
  })
);

// PROFILE

$("profile-form").addEventListener("submit", e => {
  e.preventDefault();

  currentUser.name = $("profile-name").value.trim();
  currentUser.phone = $("profile-phone").value;
  currentUser.dob = $("profile-dob").value;
  currentUser.about = $("profile-about").value;

  saveData();
  renderAll();

  $("profile-message").textContent = "Profile saved successfully.";

  addHistory("Profile updated", "Personal profile details updated");
  showToast("Profile updated");
});

// SCHEDULE

$("event-date").value = new Date().toISOString().slice(0, 10);

$("event-form").addEventListener("submit", async e => {
  e.preventDefault();

  const event = {
    title: $("event-title").value.trim(),
    date: $("event-date").value,
    time: $("event-time").value,
    description: $("event-description").value.trim()
  };

  try {
    const result = await apiRequest("/api/schedules", {
      method: "POST",
      body: JSON.stringify(event)
    });

    const saved = getRecord(result, "schedule");

    events.push({
      ...event,
      ...(saved || {}),
      id: String(saved?._id || saved?.id || Date.now())
    });

    renderEvents();
    renderStats();

    await addHistory(
      "Schedule added",
      event.title + " · " + event.date + " " + event.time
    );

    e.target.reset();
    $("event-date").value = new Date().toISOString().slice(0, 10);

    showToast("Event saved to database");

  } catch (error) {
    showToast(error.message || "Could not save event");
  }
});

$("event-list").addEventListener("click", async e => {
  const button = e.target.closest("[data-delete]");
  if (!button) return;

  const id = String(button.dataset.delete);
  const event = events.find(x => String(x.id) === id);

  try {
    await apiRequest(
      `/api/schedules/${encodeURIComponent(id)}`,
      { method: "DELETE" }
    );

    events = events.filter(x => String(x.id) !== id);

    renderEvents();
    renderStats();

    await addHistory(
      "Schedule deleted",
      event?.title || "Event removed"
    );

    showToast("Schedule deleted");

  } catch (error) {
    showToast(error.message || "Could not delete schedule");
  }
});

// CHAT

$("chat-form").addEventListener("submit", e => {
  e.preventDefault();

  const q = $("chat-input").value.trim();
  $("chat-input").value = "";

  sendMessage(q);
});

// CLEAR HISTORY

$("clear-history").addEventListener("click", async () => {
  try {
    await apiRequest("/api/history", {
      method: "DELETE"
    });

    historyItems = [];
    chatCount = 0;

    renderHistory();
    renderStats();

    showToast("History cleared");

  } catch (error) {
    showToast(error.message || "Could not clear history");
  }
});

// REMINDERS

$("reminder-date").value = new Date().toISOString().slice(0, 10);

$("reminder-form").addEventListener("submit", async e => {
  e.preventDefault();

  const reminder = {
    title: $("reminder-title").value.trim(),
    date: $("reminder-date").value,
    time: $("reminder-time").value
  };

  try {
    const result = await apiRequest("/api/reminders", {
      method: "POST",
      body: JSON.stringify(reminder)
    });

    const saved = getRecord(result, "reminder");

    reminders.push({
      ...reminder,
      ...(saved || {}),
      id: String(saved?._id || saved?.id || Date.now())
    });

    renderReminders();

    await addHistory("Reminder added", reminder.title);

    e.target.reset();
    $("reminder-date").value = new Date().toISOString().slice(0, 10);

    showToast("Reminder saved to database");

  } catch (error) {
    showToast(error.message || "Could not save reminder");
  }
});

$("reminder-list").addEventListener("click", async e => {
  const button = e.target.closest("[data-reminder-delete]");
  if (!button) return;

  const id = String(button.dataset.reminderDelete);

  try {
    await apiRequest(
      `/api/reminders/${encodeURIComponent(id)}`,
      { method: "DELETE" }
    );

    reminders = reminders.filter(r => String(r.id) !== id);

    renderReminders();

    await addHistory("Reminder deleted", "A reminder was removed");

    showToast("Reminder deleted");

  } catch (error) {
    showToast(error.message || "Could not delete reminder");
  }
});

// SETTINGS

$("save-settings").addEventListener("click", () => {
  settings = {
    greeting: $("setting-greeting").checked,
    history: $("setting-history").checked,
    sound: $("setting-sound").checked
  };

  saveData();
  renderAll();
  showToast("Settings saved");
});

// CAMERA

$("camera-start").addEventListener("click", startCamera);
$("camera-stop").addEventListener("click", stopCamera);

// PHOTO GALLERY

$("photo-upload").addEventListener("change", e => {
  const gallery = $("photo-gallery");

  photoUrls.forEach(url => URL.revokeObjectURL(url));
  photoUrls = [];

  const files = [...e.target.files].filter(
    file => file.type.startsWith("image/")
  );

  if (!files.length) {
    gallery.innerHTML = '<p class="muted">No photos selected.</p>';
    return;
  }

  gallery.innerHTML = "";

  files.forEach(file => {
    const url = URL.createObjectURL(file);
    photoUrls.push(url);

    const img = document.createElement("img");
    img.src = url;
    img.alt = file.name;
    img.title = file.name;

    gallery.appendChild(img);
  });

  addHistory(
    "Photos selected",
    `${files.length} photo(s) previewed`
  );
});

