// Toggle between login and signup forms
const loginForm = document.getElementById("login-form");
const signupForm = document.getElementById("signup-form");
const showSignup = document.getElementById("showSignup");
const showLogin = document.getElementById("showLogin");
const errorBox = document.getElementById("auth-error");


// FORGOT PASSWORD FORM TOGGLE
// Shows the forgot-password form in place of login/signup, and back again.


const forgotForm = document.getElementById("forgot-form");

document.getElementById("showForgotPassword").addEventListener("click", (e) => {
  e.preventDefault();
  loginForm.classList.add("d-none");
  forgotForm.classList.remove("d-none");
});

document.getElementById("backToLoginFromForgot").addEventListener("click", (e) => {
  e.preventDefault();
  forgotForm.classList.add("d-none");
  loginForm.classList.remove("d-none");
});


// FORGOT PASSWORD SUBMISSION
// Sends the entered email to the backend, which emails a reset link
// if an account with that email exists.


document.getElementById("forgotForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  hideError();

  const email = document.getElementById("forgotEmail").value;

  const response = await fetch(`${API_URL}/forgot-password`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email }),
  });

  const data = await response.json();

  // Always show the same message, whether or not the email exists —
  // matches the backend's deliberate vagueness for security reasons
  showError(data.message);
});

// References to the two main "views" on the landing page:
// landingView = hero section + how-it-works (shown by default)
// authView = login/signup forms (hidden until "Get Started" is clicked)
const landingView = document.getElementById("landing-view");
const authView = document.getElementById("auth-view");

// Clicking "Get Started" hides the marketing content and reveals the auth forms
document.getElementById("getStartedBtn").addEventListener("click", () => {
  landingView.classList.add("d-none");
  authView.classList.remove("d-none");
});

// "Back" link lets a visitor return to the landing page without logging in
document.getElementById("backToLanding").addEventListener("click", () => {
  authView.classList.add("d-none");
  landingView.classList.remove("d-none");
});

showSignup.addEventListener("click", (e) => {
  e.preventDefault();
  loginForm.classList.add("d-none");
  signupForm.classList.remove("d-none");
});

showLogin.addEventListener("click", (e) => {
  e.preventDefault();
  signupForm.classList.add("d-none");
  loginForm.classList.remove("d-none");
});

function showError(message) {
  errorBox.textContent = message;
  errorBox.classList.remove("d-none");
}

function hideError() {
  errorBox.classList.add("d-none");
}

const API_URL = "";

// Handle login form submission
document.getElementById("loginForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  hideError();

  const email = document.getElementById("loginEmail").value;
  const password = document.getElementById("loginPassword").value;

  const response = await fetch(`${API_URL}/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });

  const data = await response.json();

  if (!response.ok) {
    showError(data.message);
    return;
  }

  // Save token and user info so other pages can use them
  localStorage.setItem("token", data.token);
  localStorage.setItem("user", JSON.stringify(data.user));

  // Send citizens and admins to different pages
  if (data.user.role === "admin") {
    window.location.href = "/admin.html";
  } else {
    window.location.href = "/citizen.html";
  }
});

// Handle signup form submission
document.getElementById("signupForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  hideError();

  const name = document.getElementById("signupName").value;
  const email = document.getElementById("signupEmail").value;
  const password = document.getElementById("signupPassword").value;

  const response = await fetch(`${API_URL}/signup`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, email, password }),
  });

  const data = await response.json();

  if (!response.ok) {
    showError(data.message);
    return;
  }

  // After successful signup, switch back to the login form
  signupForm.classList.add("d-none");
  loginForm.classList.remove("d-none");
  showError("Account created! Please log in.");
});


// PASSWORD VISIBILITY TOGGLES


function setupPasswordToggle(inputId, toggleId) {
  const input = document.getElementById(inputId);
  const toggle = document.getElementById(toggleId);

  toggle.addEventListener("click", () => {
    if (input.type === "password") {
      input.type = "text";
      toggle.textContent = "Hide";
    } else {
      input.type = "password";
      toggle.textContent = "Show";
    }
  });
}

setupPasswordToggle("loginPassword", "toggleLoginPassword");
setupPasswordToggle("signupPassword", "toggleSignupPassword");


// PASSWORD STRENGTH METER (signup only)
// Gives the user real-time feedback so they choose a stronger password


function checkPasswordStrength(password) {
  let score = 0;

  if (password.length >= 8) score++;
  if (password.length >= 12) score++;
  if (/[A-Z]/.test(password)) score++; // has an uppercase letter
  if (/[0-9]/.test(password)) score++; // has a number
  if (/[^A-Za-z0-9]/.test(password)) score++; // has a symbol

  return score; // 0 (empty/very weak) to 5 (very strong)
}

document.getElementById("signupPassword").addEventListener("input", (e) => {
  const score = checkPasswordStrength(e.target.value);
  const fill = document.getElementById("strengthFill");
  const label = document.getElementById("strengthLabel");

  // Map the 0-5 score to a percentage width, a color, and a readable label
  const levels = [
    { width: "0%", color: "#e0e0e0", text: "" },
    { width: "20%", color: "#e53935", text: "Very weak" },
    { width: "40%", color: "#fb8c00", text: "Weak" },
    { width: "60%", color: "#fdd835", text: "Fair" },
    { width: "80%", color: "#7cb342", text: "Good" },
    { width: "100%", color: "#2e7d32", text: "Strong" },
  ];

  const level = levels[score];
  fill.style.width = level.width;
  fill.style.backgroundColor = level.color;
  label.textContent = level.text;
});

// ==========================================================================
// MAP VIEW
// Plots every report on an interactive map using Leaflet.js, with pin
// color matching status, and a popup showing report details on click.
// ==========================================================================

let map = null; // holds the Leaflet map instance once created
let markers = []; // holds every pin currently on the map, so we can clear them

function initMap() {
  // Only create the map once — Leaflet errors if you try to initialize
  // a map on the same container twice
  if (map) return;

  // Center the map on Accra, Ghana, at a reasonable zoom level
  map = L.map("reportsMap").setView([5.6037, -0.187], 12);

  // Add the actual visual map tiles, from OpenStreetMap (free, no API key)
  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution: "© OpenStreetMap contributors",
  }).addTo(map);
}

function plotReportsOnMap(reports) {
  initMap();

  // Clear any existing pins before plotting the current filtered set
  markers.forEach((marker) => map.removeLayer(marker));
  markers = [];

  const statusColors = {
    pending: "#f4a825",
    in_progress: "#1976d2",
    resolved: "#2e7d32",
  };

  reports.forEach((report) => {
    // Skip any report that doesn't have real coordinates
    if (!report.latitude || !report.longitude) return;

    const color = statusColors[report.status] || "#666";

    // A custom circular marker, colored by status, instead of Leaflet's
    // default blue pin — keeps the map visually consistent with the
    // status badges used elsewhere in the dashboard
    const icon = L.divIcon({
      className: "",
      html: `<div style="background-color:${color}; width:18px; height:18px; border-radius:50%; border:3px solid white; box-shadow:0 2px 6px rgba(0,0,0,0.3);"></div>`,
      iconSize: [18, 18],
    });

    const marker = L.marker([report.latitude, report.longitude], { icon }).addTo(map);

    // Popup content shown when the pin is clicked
    marker.bindPopup(`
      <strong>${report.category}</strong><br>
      ${report.description}<br>
      <small class="text-muted">${report.location}</small><br>
      <span class="badge" style="background-color:${color};">${report.status.replace("_", " ")}</span>
    `);

    markers.push(marker);
  });
}


// PUBLIC MAP (landing page)

function initPublicMap() {
  const map = L.map("publicMap").setView([5.6037, -0.187], 12);

  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution: "© OpenStreetMap contributors",
  }).addTo(map);

  fetch("/public-reports")
    .then((res) => res.json())
    .then((reports) => {
      const statusColors = {
        pending: "#f4a825",
        in_progress: "#1976d2",
        resolved: "#2e7d32",
      };

      reports.forEach((report) => {
        if (!report.latitude || !report.longitude) return;

        const color = statusColors[report.status] || "#666";

        const icon = L.divIcon({
          className: "",
          html: `<div style="background-color:${color}; width:16px; height:16px; border-radius:50%; border:2px solid white; box-shadow:0 2px 5px rgba(0,0,0,0.3);"></div>`,
          iconSize: [16, 16],
        });

        // Popup only shows category + status — no description or reporter
        // info, since this map is public and unauthenticated
        L.marker([report.latitude, report.longitude], { icon })
          .addTo(map)
          .bindPopup(`<strong>${report.category}</strong><br>Status: ${report.status.replace("_", " ")}`);
      });
    });
}

// The public map loads immediately, since it's visible on page load
// (unlike the admin map, which only loads once "Map View" is clicked)
initPublicMap();