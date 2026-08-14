const API_URL = "";

// Get the logged-in user's info from localStorage
const token = localStorage.getItem("token");
const user = JSON.parse(localStorage.getItem("user"));

// If nobody's logged in, send them back to the login page
if (!token || !user) {
  window.location.href = "/index.html";
}

// Show a welcome message using their real name
document.getElementById("welcomeText").textContent = `Welcome, ${user.name}`;

// Logout button
document.getElementById("logoutBtn").addEventListener("click", () => {
  localStorage.removeItem("token");
  localStorage.removeItem("user");
  window.location.href = "/index.html";
});

// "Use My Current Location" button
document.getElementById("getLocationBtn").addEventListener("click", () => {
  if (!navigator.geolocation) {
    alert("Geolocation is not supported by your browser");
    return;
  }

  navigator.geolocation.getCurrentPosition(
    (position) => {
      const lat = position.coords.latitude;
      const lng = position.coords.longitude;

      document.getElementById("latitude").value = lat;
      document.getElementById("longitude").value = lng;
      document.getElementById("coordsDisplay").textContent =
        `Captured: ${lat.toFixed(5)}, ${lng.toFixed(5)}`;
    },
    (error) => {
      alert("Could not get your location: " + error.message);
    }
  );
});

document.getElementById("reportForm").addEventListener("submit", async (e) => {
  e.preventDefault();

  const errorBox = document.getElementById("submit-error");
  const successBox = document.getElementById("submit-success");
  const submitBtn = e.target.querySelector("button[type='submit']");
  errorBox.classList.add("d-none");
  successBox.classList.add("d-none");

  // Disable the button and show a spinner so the user knows their
  // click registered, especially important since a photo upload
  // can take several seconds on a slow connection
  const originalText = submitBtn.textContent;
  submitBtn.disabled = true;
  submitBtn.innerHTML = `<span class="spinner-border spinner-border-sm me-2"></span>Submitting...`;

  // FormData lets us bundle text fields AND a file together,
  // exactly the format multer expects on the backend
  const formData = new FormData();
  formData.append("category", document.getElementById("category").value);
  formData.append("description", document.getElementById("description").value);
  formData.append("location", document.getElementById("location").value);
  formData.append("latitude", document.getElementById("latitude").value);
  formData.append("longitude", document.getElementById("longitude").value);
  formData.append("photo", document.getElementById("photo").files[0]);

  try {
    const response = await fetch(`${API_URL}/reports`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        // Note: NO "Content-Type" header here — the browser sets it
        // automatically for FormData, including a required boundary value
      },
      body: formData,
    });

    const data = await response.json();

    if (!response.ok) {
      errorBox.textContent = data.message;
      errorBox.classList.remove("d-none");
      return;
    }

    successBox.textContent = "Report submitted successfully!";
    successBox.classList.remove("d-none");
    document.getElementById("reportForm").reset();
    document.getElementById("coordsDisplay").textContent = "";

    loadMyReports();
  } finally {
    // Always restore the button — whether the request succeeded, failed
    // with a handled error, or threw an unexpected network error
    submitBtn.disabled = false;
    submitBtn.textContent = originalText;
  }
});

async function loadMyReports() {
  const response = await fetch(`${API_URL}/my-reports`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  const reports = await response.json();
  const container = document.getElementById("reportsList");
  container.innerHTML = ""; // clear whatever was there before

  if (reports.length === 0) {
    container.innerHTML = `<p class="text-muted">You haven't submitted any reports yet.</p>`;
    return;
  }

  reports.forEach((report) => {
    const statusColors = {
      pending: "warning",
      in_progress: "info",
      resolved: "success",
    };
    const badgeColor = statusColors[report.status] || "secondary";

    const card = document.createElement("div");
    card.className = "col-md-4 mb-4";
    card.innerHTML = `
      <div class="card h-100">
        <img src="${report.photo_url}" class="card-img-top" style="height: 180px; object-fit: cover;">
        <div class="card-body">
          <h5 class="card-title">${report.category}</h5>
          <p class="card-text">${report.description}</p>
          <p class="card-text"><small class="text-muted">${report.location}</small></p>
          <span class="badge bg-${badgeColor}">${report.status.replace("_", " ")}</span>
        </div>
      </div>
    `;
    container.appendChild(card);
  });
}

// Load the reports as soon as the page opens
loadMyReports();