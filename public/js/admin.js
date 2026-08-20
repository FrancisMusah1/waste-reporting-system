const API_URL = "";

const token = localStorage.getItem("token");
const user = JSON.parse(localStorage.getItem("user"));

// Not logged in at all -> back to login
if (!token || !user) {
  window.location.href = "/index.html";
}

// Logged in, but NOT an admin -> send them to the citizen page instead
// (they shouldn't even see this page exist)
if (user.role !== "admin") {
  window.location.href = "/citizen.html";
}

document.getElementById("welcomeText").textContent = `Welcome, ${user.name}`;

document.getElementById("logoutBtn").addEventListener("click", () => {
  localStorage.removeItem("token");
  localStorage.removeItem("user");
  window.location.href = "/index.html";
});

let allReports = []; // holds every report fetched from the backend, unfiltered

async function loadReports() {
  const response = await fetch(`${API_URL}/reports`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  allReports = await response.json();
  updateStats();
  renderReports(allReports);
}

function updateStats() {
  document.getElementById("statTotal").textContent = allReports.length;
  document.getElementById("statPending").textContent =
    allReports.filter((r) => r.status === "pending").length;
  document.getElementById("statInProgress").textContent =
    allReports.filter((r) => r.status === "in_progress").length;
  document.getElementById("statResolved").textContent =
    allReports.filter((r) => r.status === "resolved").length;
}

function renderReports(reports) {
    const container = document.getElementById("reportsList");
    container.innerHTML = "";

    if (reports.length === 0) {
      container.innerHTML = `<p class="text-muted">No reports match your filters.</p>`;
      return;
    }

    const statusColors = {
      pending: "warning",
      in_progress: "info",
      resolved: "success",
    };

    reports.forEach((report) => {
      const badgeColor = statusColors[report.status] || "secondary";
      const reporterLabel = report.reporter_name || "Guest";
      const reporterBadgeClass = report.reporter_name ? "bg-secondary" : "bg-dark";
      const categoryLabel = report.category || "Uncategorized";

      const mediaHtml = report.video_url
        ? `<video src="${report.video_url}" class="card-img-top" style="height: 180px; object-fit: cover;" controls></video>`
        : `<img src="${report.photo_url}" class="card-img-top" style="height: 180px; object-fit: cover;">`;

      const audioHtml = report.audio_url
        ? `<audio src="${report.audio_url}" controls style="width: 100%; margin-top: 8px;"></audio>`
        : "";

      const descriptionHtml = report.description
        ? `<p class="card-text">${report.description}</p>`
        : "";

      const locationHtml = report.location
        ? `<p class="card-text"><small class="text-muted">${report.location}</small></p>`
        : "";

      const card = document.createElement("div");
      card.className = "col-md-4 mb-4";
      card.innerHTML = `
        <div class="card h-100">
          ${mediaHtml}
          <div class="card-body">
            <h5 class="card-title">${categoryLabel}</h5>
            ${descriptionHtml}
            ${locationHtml}
            <p class="card-text">
              <span class="badge ${reporterBadgeClass}">${reporterLabel}</span>
            </p>
            ${audioHtml}
            <span class="badge bg-${badgeColor} mb-2 mt-2">${report.status.replace("_", " ")}</span>
            <select class="form-select status-select mb-2" data-report-id="${report.id}">
              <option value="pending" ${report.status === "pending" ? "selected" : ""}>Pending</option>
              <option value="in_progress" ${report.status === "in_progress" ? "selected" : ""}>In Progress</option>
              <option value="resolved" ${report.status === "resolved" ? "selected" : ""}>Resolved</option>
            </select>
            <button class="btn btn-outline-danger btn-sm w-100 delete-btn" data-report-id="${report.id}">
              Delete Report
            </button>
          </div>
        </div>
      `;
      container.appendChild(card);
    });

    // Attach a change-listener to every status dropdown just created
    document.querySelectorAll(".status-select").forEach((select) => {
      select.addEventListener("change", handleStatusChange);
    });

    // Attach a click-listener to every delete button just created
    document.querySelectorAll(".delete-btn").forEach((button) => {
      button.addEventListener("click", handleDeleteClick);
    });
  }

  // Called whenever an admin changes a report's status dropdown.
// Sends the new status to the backend, then refreshes the dashboard
// so the stats and badge colors stay accurate.
async function handleStatusChange(e) {
    const reportId = e.target.dataset.reportId; // read the data-report-id attribute
    const newStatus = e.target.value;

    const response = await fetch(`${API_URL}/reports/${reportId}/status`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ status: newStatus }),
    });

    if (!response.ok) {
      alert("Failed to update status");
      return;
    }

    // Reload everything so stats and badges reflect the change immediately
    loadReports();
  }

  // Called when an admin clicks "Delete Report" on a card. Confirms
  // first (this is permanent and also removes the Cloudinary media),
  // then calls the DELETE endpoint and refreshes the dashboard.
  async function handleDeleteClick(e) {
    const reportId = e.target.dataset.reportId;

    const confirmed = confirm(
      "Delete this report permanently? This will also remove its photo/audio/video from storage. This cannot be undone."
    );
    if (!confirmed) return;

    const response = await fetch(`${API_URL}/reports/${reportId}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!response.ok) {
      alert("Failed to delete report");
      return;
    }

    // Reload everything so stats and the list reflect the deletion immediately
    loadReports();
  }

  // Re-applies the current search text, status filter, and category filter
// to the full report list, then re-renders just the matching ones.
function applyFilters() {
    const searchText = document.getElementById("searchInput").value.toLowerCase();
    const statusValue = document.getElementById("statusFilter").value;
    const categoryValue = document.getElementById("categoryFilter").value;

    const filtered = allReports.filter((report) => {
      const matchesSearch =
        (report.description || "").toLowerCase().includes(searchText) ||
        (report.location || "").toLowerCase().includes(searchText);
      const matchesStatus = statusValue === "" || report.status === statusValue;
      const matchesCategory = categoryValue === "" || report.category === categoryValue;

      return matchesSearch && matchesStatus && matchesCategory;
    });

    renderReports(filtered);
  }

  // Re-run filtering every time the admin types in search or changes a dropdown
  document.getElementById("searchInput").addEventListener("input", applyFilters);
  document.getElementById("statusFilter").addEventListener("change", applyFilters);
  document.getElementById("categoryFilter").addEventListener("change", applyFilters);

  // Load everything as soon as the page opens
  loadReports();


// MAP VIEW
// Plots every report on an interactive map using Leaflet.js, with pin

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

    const categoryLabel = report.category || "Uncategorized";


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
      <strong>${categoryLabel}</strong><br>
      ${report.description || ""}<br>
      <small class="text-muted">${report.location || ""}</small><br>
      <span class="badge" style="background-color:${color};">${report.status.replace("_", " ")}</span>
    `);

    markers.push(marker);
  });
}


// LIST/MAP VIEW TOGGLE


document.getElementById("showListBtn").addEventListener("click", () => {
  document.getElementById("reportsList").classList.remove("d-none");
  document.getElementById("mapView").classList.add("d-none");
  document.getElementById("showListBtn").classList.replace("btn-outline-primary", "btn-primary");
  document.getElementById("showMapBtn").classList.replace("btn-primary", "btn-outline-primary");
});

document.getElementById("showMapBtn").addEventListener("click", () => {
  document.getElementById("reportsList").classList.add("d-none");
  document.getElementById("mapView").classList.remove("d-none");
  document.getElementById("showMapBtn").classList.replace("btn-outline-primary", "btn-primary");
  document.getElementById("showListBtn").classList.replace("btn-primary", "btn-outline-primary");

  // Leaflet needs to recalculate its size after becoming visible,
  plotReportsOnMap(allReports);
  setTimeout(() => map.invalidateSize(), 100);
});