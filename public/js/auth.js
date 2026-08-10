// Toggle between login and signup forms
const loginForm = document.getElementById("login-form");
const signupForm = document.getElementById("signup-form");
const showSignup = document.getElementById("showSignup");
const showLogin = document.getElementById("showLogin");
const errorBox = document.getElementById("auth-error");

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

const API_URL = "http://localhost:3000";

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