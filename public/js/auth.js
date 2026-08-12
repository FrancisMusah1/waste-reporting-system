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