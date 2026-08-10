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
  
      const card = document.createElement("div");
      card.className = "col-md-4 mb-4";
      card.innerHTML = `
        <div class="card h-100">
          <img src="${report.photo_url}" class="card-img-top" style="height: 180px; object-fit: cover;">
          <div class="card-body">
            <h5 class="card-title">${report.category}</h5>
            <p class="card-text">${report.description}</p>
            <p class="card-text"><small class="text-muted">${report.location}</small></p>
            <p class="card-text"><small class="text-muted">Reported by: ${report.reporter_name}</small></p>
            <span class="badge bg-${badgeColor} mb-2">${report.status.replace("_", " ")}</span>
            <select class="form-select status-select" data-report-id="${report.id}">
              <option value="pending" ${report.status === "pending" ? "selected" : ""}>Pending</option>
              <option value="in_progress" ${report.status === "in_progress" ? "selected" : ""}>In Progress</option>
              <option value="resolved" ${report.status === "resolved" ? "selected" : ""}>Resolved</option>
            </select>
          </div>
        </div>
      `;
      container.appendChild(card);
    });
  
    // Attach a change-listener to every status dropdown just created
    document.querySelectorAll(".status-select").forEach((select) => {
      select.addEventListener("change", handleStatusChange);
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

  // Re-applies the current search text, status filter, and category filter
// to the full report list, then re-renders just the matching ones.
function applyFilters() {
    const searchText = document.getElementById("searchInput").value.toLowerCase();
    const statusValue = document.getElementById("statusFilter").value;
    const categoryValue = document.getElementById("categoryFilter").value;
  
    const filtered = allReports.filter((report) => {
      const matchesSearch =
        report.description.toLowerCase().includes(searchText) ||
        report.location.toLowerCase().includes(searchText);
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