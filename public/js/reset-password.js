
// Read the reset token from the URL's query string.
// A link like reset-password.html?token=abc123 makes "abc123" available
// here via URLSearchParams — a built-in browser API for parsing URLs.

const params = new URLSearchParams(window.location.search);
const token = params.get("token");

const errorBox = document.getElementById("reset-error");
const successBox = document.getElementById("reset-success");

// If someone opens this page without a token at all (e.g. typed the URL
// manually), there's nothing valid to reset — show an error immediately.
if (!token) {
  errorBox.textContent = "Invalid or missing reset link.";
  errorBox.classList.remove("d-none");
}


// Password visibility toggle (same pattern as auth.js)

const passwordInput = document.getElementById("newPassword");
const toggle = document.getElementById("toggleNewPassword");

toggle.addEventListener("click", () => {
  if (passwordInput.type === "password") {
    passwordInput.type = "text";
    toggle.textContent = "Hide";
  } else {
    passwordInput.type = "password";
    toggle.textContent = "Show";
  }
});


// Password strength meter (same pattern as auth.js)


function checkPasswordStrength(password) {
  let score = 0;
  if (password.length >= 8) score++;
  if (password.length >= 12) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;
  return score;
}

passwordInput.addEventListener("input", (e) => {
  const score = checkPasswordStrength(e.target.value);
  const fill = document.getElementById("strengthFill");
  const label = document.getElementById("strengthLabel");

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




// Submit the new password, along with the token, to the backend


document.getElementById("resetForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  errorBox.classList.add("d-none");
  successBox.classList.add("d-none");

  const newPassword = passwordInput.value;

  const response = await fetch("/reset-password", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token, newPassword }),
  });

  const data = await response.json();

  if (!response.ok) {
    errorBox.textContent = data.message;
    errorBox.classList.remove("d-none");
    return;
  }

  successBox.textContent = data.message;
  successBox.classList.remove("d-none");
  document.getElementById("resetForm").reset();
});