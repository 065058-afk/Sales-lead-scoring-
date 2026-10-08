const sampleLeads = [
  {
    company: "Northstar Systems",
    contact: "Ava Mehta",
    industry: "SaaS",
    employees: 540,
    revenue: 62,
    visits: 18,
    emails: 7,
    demo: "yes",
    intent: 88,
    source: "Referral"
  },
  {
    company: "Brightline Health",
    contact: "Marcus Chen",
    industry: "Healthcare",
    employees: 1200,
    revenue: 140,
    visits: 9,
    emails: 5,
    demo: "yes",
    intent: 76,
    source: "Webinar"
  },
  {
    company: "Copperfield Retail",
    contact: "Nina Lopez",
    industry: "Retail",
    employees: 180,
    revenue: 18,
    visits: 4,
    emails: 2,
    demo: "no",
    intent: 44,
    source: "Paid Search"
  },
  {
    company: "Orbit Financial",
    contact: "Rohan Iyer",
    industry: "Financial Services",
    employees: 2600,
    revenue: 310,
    visits: 22,
    emails: 10,
    demo: "yes",
    intent: 94,
    source: "Partner"
  },
  {
    company: "Pioneer Manufacturing",
    contact: "Elena Brooks",
    industry: "Manufacturing",
    employees: 75,
    revenue: 9,
    visits: 2,
    emails: 1,
    demo: "no",
    intent: 21,
    source: "Outbound"
  },
  {
    company: "Cedar Learning",
    contact: "Imani Wells",
    industry: "Education",
    employees: 420,
    revenue: 35,
    visits: 11,
    emails: 3,
    demo: "no",
    intent: 61,
    source: "Website"
  }
];

const state = {
  leads: [],
  query: "",
  tier: "all",
  sort: "score-desc"
};

const els = {
  csvInput: document.querySelector("#csvInput"),
  loadSampleBtn: document.querySelector("#loadSampleBtn"),
  clearBtn: document.querySelector("#clearBtn"),
  exportCsvBtn: document.querySelector("#exportCsvBtn"),
  copySummaryBtn: document.querySelector("#copySummaryBtn"),
  leadForm: document.querySelector("#leadForm"),
  leadTableBody: document.querySelector("#leadTableBody"),
  leadCount: document.querySelector("#leadCount"),
  hotCount: document.querySelector("#hotCount"),
  warmCount: document.querySelector("#warmCount"),
  coldCount: document.querySelector("#coldCount"),
  avgScore: document.querySelector("#avgScore"),
  tableStatus: document.querySelector("#tableStatus"),
  emptyState: document.querySelector("#emptyState"),
  searchInput: document.querySelector("#searchInput"),
  tierFilter: document.querySelector("#tierFilter"),
  sortSelect: document.querySelector("#sortSelect"),
  recommendationTitle: document.querySelector("#recommendationTitle"),
  recommendationBody: document.querySelector("#recommendationBody"),
  toast: document.querySelector("#toast")
};

const csvHeaders = [
  "Company",
  "Contact",
  "Industry",
  "Employees",
  "Annual Revenue",
  "Website Visits",
  "Email Opens",
  "Demo Requested",
  "Intent Score",
  "Lead Source",
  "Lead Score",
  "Tier",
  "Next Action"
];

function clamp(number, min, max) {
  return Math.max(min, Math.min(max, number));
}

function toNumber(value, fallback = 0) {
  const parsed = Number(String(value ?? "").replace(/[$,]/g, "").trim());
  return Number.isFinite(parsed) ? parsed : fallback;
}

function normalizeLead(raw) {
  const lead = {};
  Object.entries(raw).forEach(([key, value]) => {
    const normalizedKey = key.toLowerCase().replace(/[\s_-]/g, "");
    lead[normalizedKey] = value;
  });

  return {
    id: crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`,
    company: lead.company || lead.account || "Untitled Account",
    contact: lead.contact || lead.name || lead.leadname || "Unknown Contact",
    industry: lead.industry || "Other",
    employees: toNumber(lead.employees || lead.companysize),
    revenue: toNumber(lead.revenue || lead.annualrevenue || lead.revenuem || lead.arr),
    visits: toNumber(lead.visits || lead.websitevisits || lead.sitevisits),
    emails: toNumber(lead.emails || lead.emailopens || lead.opens),
    demo: String(lead.demo || lead.demorequest || lead.demorequested || "no").toLowerCase().startsWith("y") ? "yes" : "no",
    intent: clamp(toNumber(lead.intent || lead.intentscore), 0, 100),
    source: lead.source || lead.leadsource || "Website"
  };
}

function scoreLead(lead) {
  const industryFit = {
    SaaS: 100,
    Healthcare: 88,
    "Financial Services": 92,
    Manufacturing: 70,
    Retail: 62,
    Education: 66,
    Other: 50
  };
  const sourceFit = {
    Referral: 100,
    Partner: 92,
    Webinar: 86,
    Website: 78,
    "Paid Search": 64,
    Outbound: 48
  };

  const employeeFit = lead.employees >= 200 && lead.employees <= 3000
    ? 100
    : lead.employees > 3000
      ? 78
      : lead.employees >= 50
        ? 68
        : 42;
  const revenueFit = lead.revenue >= 20 && lead.revenue <= 500
    ? 100
    : lead.revenue > 500
      ? 80
      : lead.revenue >= 5
        ? 60
        : 36;
  const firmographic = Math.round(
    employeeFit * 0.32 +
    revenueFit * 0.28 +
    (industryFit[lead.industry] || industryFit.Other) * 0.4
  );

  const engagement = Math.round(
    clamp(lead.visits * 5, 0, 100) * 0.25 +
    clamp(lead.emails * 9, 0, 100) * 0.18 +
    (lead.demo === "yes" ? 100 : 20) * 0.27 +
    lead.intent * 0.3
  );
  const source = sourceFit[lead.source] || 58;
  const score = Math.round(firmographic * 0.4 + engagement * 0.45 + source * 0.15);
  const tier = score >= 80 ? "Hot" : score >= 55 ? "Warm" : "Cold";

  return {
    ...lead,
    firmographic,
    engagement,
    sourceScore: source,
    score,
    tier,
    nextAction: getNextAction(tier, lead)
  };
}

function getNextAction(tier, lead) {
  if (tier === "Hot") {
    return lead.demo === "yes"
      ? "Route to AE today for demo follow-up"
      : "Call within 24 hours and offer a tailored demo";
  }
  if (tier === "Warm") {
    return "Add to nurture sequence and schedule SDR follow-up";
  }
  return "Keep in awareness campaign until engagement increases";
}

function getScoredLeads() {
  const query = state.query.trim().toLowerCase();
  return state.leads
    .map(scoreLead)
    .filter((lead) => {
      const matchesTier = state.tier === "all" || lead.tier === state.tier;
      const haystack = `${lead.company} ${lead.contact} ${lead.industry} ${lead.source} ${lead.tier}`.toLowerCase();
      return matchesTier && (!query || haystack.includes(query));
    })
    .sort((a, b) => {
      if (state.sort === "score-asc") return a.score - b.score;
      if (state.sort === "company-asc") return a.company.localeCompare(b.company);
      if (state.sort === "engagement-desc") return b.engagement - a.engagement;
      return b.score - a.score;
    });
}

function render() {
  const visibleLeads = getScoredLeads();
  const allScored = state.leads.map(scoreLead);
  const counts = allScored.reduce((acc, lead) => {
    acc[lead.tier] += 1;
    return acc;
  }, { Hot: 0, Warm: 0, Cold: 0 });
  const average = allScored.length
    ? Math.round(allScored.reduce((sum, lead) => sum + lead.score, 0) / allScored.length)
    : 0;

  els.leadCount.textContent = `${state.leads.length} ${state.leads.length === 1 ? "lead" : "leads"}`;
  els.hotCount.textContent = counts.Hot;
  els.warmCount.textContent = counts.Warm;
  els.coldCount.textContent = counts.Cold;
  els.avgScore.textContent = average;
  els.tableStatus.textContent = visibleLeads.length
    ? `${visibleLeads.length} shown, ${state.leads.length} total`
    : state.leads.length
      ? "No leads match the current filters"
      : "No leads loaded";

  els.emptyState.classList.toggle("show", visibleLeads.length === 0);
  els.leadTableBody.innerHTML = visibleLeads.map(renderLeadRow).join("");
  renderRecommendation(allScored);
}

function renderLeadRow(lead) {
  return `
    <tr>
      <td>
        <div class="lead-name">
          <strong>${escapeHtml(lead.company)}</strong>
          <span>${escapeHtml(lead.contact)} - ${escapeHtml(lead.industry)}</span>
        </div>
      </td>
      <td>
        <div class="fit-block">
          <strong>${lead.firmographic}/100</strong>
          <span>${lead.employees.toLocaleString()} employees - $${lead.revenue.toLocaleString()}M revenue</span>
        </div>
      </td>
      <td>
        <strong>${lead.engagement}/100</strong>
        <span class="signal-line">${lead.visits} visits - ${lead.emails} opens - Demo ${lead.demo}</span>
      </td>
      <td>
        <strong class="score-value">${lead.score}</strong>
        <div class="score-bar" aria-hidden="true">
          <div class="score-fill" style="width: ${lead.score}%"></div>
        </div>
      </td>
      <td><span class="tier-badge tier-${lead.tier.toLowerCase()}">${lead.tier}</span></td>
      <td>${escapeHtml(lead.nextAction)}</td>
    </tr>
  `;
}

function renderRecommendation(leads) {
  if (!leads.length) {
    els.recommendationTitle.textContent = "Load leads to see guidance";
    els.recommendationBody.textContent = "Your highest scoring accounts and follow-up actions will appear here.";
    return;
  }

  const sorted = [...leads].sort((a, b) => b.score - a.score);
  const top = sorted[0];
  const hotCount = sorted.filter((lead) => lead.tier === "Hot").length;
  els.recommendationTitle.textContent = `${top.company} is your top account`;
  els.recommendationBody.textContent = `${top.contact} scored ${top.score} (${top.tier}). ${top.nextAction}. You currently have ${hotCount} hot ${hotCount === 1 ? "lead" : "leads"} ready for immediate attention.`;
}

function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    const next = text[i + 1];

    if (char === '"' && inQuotes && next === '"') {
      field += '"';
      i += 1;
    } else if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === "," && !inQuotes) {
      row.push(field.trim());
      field = "";
    } else if ((char === "\n" || char === "\r") && !inQuotes) {
      if (char === "\r" && next === "\n") i += 1;
      row.push(field.trim());
      if (row.some(Boolean)) rows.push(row);
      row = [];
      field = "";
    } else {
      field += char;
    }
  }

  row.push(field.trim());
  if (row.some(Boolean)) rows.push(row);

  if (rows.length < 2) return [];
  const headers = rows[0];
  return rows.slice(1).map((cells) => {
    return headers.reduce((record, header, index) => {
      record[header] = cells[index] || "";
      return record;
    }, {});
  });
}

function toCsv(rows) {
  return rows
    .map((row) => row.map((cell) => {
      const value = String(cell ?? "");
      return /[",\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
    }).join(","))
    .join("\n");
}

function exportCsv() {
  const rows = getScoredLeads();
  if (!rows.length) {
    showToast("No leads available to export.");
    return;
  }

  const data = [
    csvHeaders,
    ...rows.map((lead) => [
      lead.company,
      lead.contact,
      lead.industry,
      lead.employees,
      lead.revenue,
      lead.visits,
      lead.emails,
      lead.demo,
      lead.intent,
      lead.source,
      lead.score,
      lead.tier,
      lead.nextAction
    ])
  ];
  const blob = new Blob([toCsv(data)], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "crm-lead-scores.csv";
  link.click();
  URL.revokeObjectURL(url);
  showToast("CRM export downloaded.");
}

function copySummary() {
  const leads = state.leads.map(scoreLead);
  if (!leads.length) {
    showToast("No summary to copy yet.");
    return;
  }

  const hot = leads.filter((lead) => lead.tier === "Hot").length;
  const warm = leads.filter((lead) => lead.tier === "Warm").length;
  const cold = leads.filter((lead) => lead.tier === "Cold").length;
  const top = [...leads].sort((a, b) => b.score - a.score).slice(0, 3);
  const summary = [
    `Lead scoring summary: ${leads.length} leads, ${hot} hot, ${warm} warm, ${cold} cold.`,
    "Top accounts:",
    ...top.map((lead, index) => `${index + 1}. ${lead.company} - ${lead.score} (${lead.tier}) - ${lead.nextAction}`)
  ].join("\n");

  navigator.clipboard.writeText(summary)
    .then(() => showToast("Summary copied to clipboard."))
    .catch(() => showToast(summary));
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

let toastTimer;
function showToast(message) {
  clearTimeout(toastTimer);
  els.toast.textContent = message;
  els.toast.classList.add("show");
  toastTimer = setTimeout(() => els.toast.classList.remove("show"), 2600);
}

els.loadSampleBtn.addEventListener("click", () => {
  state.leads = sampleLeads.map(normalizeLead);
  render();
  showToast("Sample lead data loaded.");
});

els.clearBtn.addEventListener("click", () => {
  state.leads = [];
  els.csvInput.value = "";
  render();
  showToast("Lead queue cleared.");
});

els.csvInput.addEventListener("change", (event) => {
  const [file] = event.target.files;
  if (!file) return;

  const reader = new FileReader();
  reader.onload = () => {
    const records = parseCsv(String(reader.result || ""));
    state.leads = records.map(normalizeLead);
    render();
    showToast(`${state.leads.length} leads imported and scored.`);
  };
  reader.readAsText(file);
});

els.leadForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const formData = new FormData(event.currentTarget);
  const lead = normalizeLead(Object.fromEntries(formData.entries()));
  state.leads = [lead, ...state.leads];
  event.currentTarget.reset();
  render();
  showToast(`${lead.company} added to the lead queue.`);
});

els.searchInput.addEventListener("input", (event) => {
  state.query = event.target.value;
  render();
});

els.tierFilter.addEventListener("change", (event) => {
  state.tier = event.target.value;
  render();
});

els.sortSelect.addEventListener("change", (event) => {
  state.sort = event.target.value;
  render();
});

els.exportCsvBtn.addEventListener("click", exportCsv);
els.copySummaryBtn.addEventListener("click", copySummary);

render();
