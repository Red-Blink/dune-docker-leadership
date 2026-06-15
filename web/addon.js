const ADDON_REQUEST_TIMEOUT_MS = 8000;
const state = {
  rows: [],
  filteredRows: [],
  loading: false
};

const elements = {
  rows: document.getElementById("leaderRows"),
  status: document.getElementById("status"),
  refresh: document.getElementById("refreshButton"),
  search: document.getElementById("searchInput"),
  playerCount: document.getElementById("playerCount"),
  onlineCount: document.getElementById("onlineCount"),
  highestLevel: document.getElementById("highestLevel")
};

function addonRequest(action, payload = {}) {
  if (window.parent && window.parent !== window) {
    return bridgeRequest(action, payload);
  }
  return fetchRequest(action, payload);
}

function bridgeRequest(action, payload) {
  return new Promise((resolve, reject) => {
    const requestId = `leadership-${Date.now()}-${Math.random().toString(16).slice(2)}`;
    const timer = window.setTimeout(() => {
      window.removeEventListener("message", onMessage);
      reject(new Error("Dune Console addon bridge did not respond."));
    }, ADDON_REQUEST_TIMEOUT_MS);

    function onMessage(event) {
      const message = event.data || {};
      if (message.type !== "dune-addon-response" || message.requestId !== requestId) return;
      window.clearTimeout(timer);
      window.removeEventListener("message", onMessage);
      if (message.ok === false) reject(new Error(message.error || "Addon request failed."));
      else resolve(message.result || {});
    }

    window.addEventListener("message", onMessage);
    window.parent.postMessage({
      type: "dune-addon-request",
      requestId,
      addonId: "leadership-board-demo",
      permission: "players:read",
      action,
      payload
    }, "*");
  });
}

async function fetchRequest(action, payload) {
  if (action !== "leadership.players.list") throw new Error(`Unsupported action: ${action}`);
  const query = payload && payload.q ? `?q=${encodeURIComponent(payload.q)}` : "";
  const response = await fetch(`/api/addons/leadership/players${query}`, {
    headers: { "Accept": "application/json" }
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body.error || `Request failed with HTTP ${response.status}`);
  return body;
}

function normalizeRows(rows) {
  return (Array.isArray(rows) ? rows : []).map((row) => ({
    characterName: stringValue(row.characterName ?? row.character_name ?? row.name, "Unknown"),
    level: numberValue(row.level),
    faction: stringValue(row.faction ?? row.factionName ?? row.faction_name, "Unavailable"),
    guild: stringValue(row.guild ?? row.guildName ?? row.guild_name, "Unavailable"),
    onlineStatus: stringValue(row.onlineStatus ?? row.online_status, "Offline"),
    map: stringValue(row.map, "Unavailable"),
    lastSeen: stringValue(row.lastSeen ?? row.last_seen, "")
  }));
}

function stringValue(value, fallback) {
  const text = String(value ?? "").trim();
  return text || fallback;
}

function numberValue(value) {
  const next = Number(value);
  return Number.isFinite(next) ? next : 0;
}

function sortRows(rows) {
  return [...rows].sort((left, right) => {
    if (right.level !== left.level) return right.level - left.level;
    if (statusOnline(right.onlineStatus) !== statusOnline(left.onlineStatus)) {
      return statusOnline(right.onlineStatus) ? 1 : -1;
    }
    return left.characterName.localeCompare(right.characterName);
  });
}

function statusOnline(value) {
  return String(value || "").toLowerCase() === "online";
}

function applyFilter() {
  const query = String(elements.search.value || "").trim().toLowerCase();
  const sorted = sortRows(state.rows);
  state.filteredRows = query
    ? sorted.filter((row) => [row.characterName, row.faction, row.guild, row.onlineStatus, row.map].some((value) => String(value).toLowerCase().includes(query)))
    : sorted;
  render();
}

async function loadRows() {
  setLoading(true);
  setStatus("Loading leadership data...", "");
  try {
    const result = await addonRequest("leadership.players.list", {});
    state.rows = normalizeRows(result.rows);
    applyFilter();
    setStatus(state.rows.length ? `Loaded ${state.rows.length} player${state.rows.length === 1 ? "" : "s"}.` : "No players found.", "success");
  } catch (error) {
    state.rows = [];
    state.filteredRows = [];
    render();
    setStatus(error.message || "Unable to load leadership data.", "error");
  } finally {
    setLoading(false);
  }
}

function setLoading(loading) {
  state.loading = loading;
  elements.refresh.disabled = loading;
  elements.refresh.textContent = loading ? "Refreshing" : "Refresh";
}

function setStatus(text, tone) {
  elements.status.textContent = text;
  elements.status.className = `status ${tone || ""}`.trim();
}

function render() {
  const onlineCount = state.rows.filter((row) => statusOnline(row.onlineStatus)).length;
  const highestLevel = state.rows.reduce((max, row) => Math.max(max, row.level), 0);
  elements.playerCount.textContent = String(state.rows.length);
  elements.onlineCount.textContent = String(onlineCount);
  elements.highestLevel.textContent = String(highestLevel);
  elements.rows.replaceChildren(...state.filteredRows.map(renderRow));
}

function renderRow(row, index) {
  const tr = document.createElement("tr");
  appendCell(tr, `#${index + 1}`, "rank");
  appendCell(tr, row.characterName, "player");
  appendCell(tr, row.level || "0");
  appendCell(tr, row.faction);
  appendCell(tr, row.guild);
  const statusCell = document.createElement("td");
  const pill = document.createElement("span");
  pill.className = `status-pill ${statusOnline(row.onlineStatus) ? "online" : ""}`.trim();
  pill.textContent = statusOnline(row.onlineStatus) ? "Online" : "Offline";
  statusCell.appendChild(pill);
  tr.appendChild(statusCell);
  appendCell(tr, row.map);
  appendCell(tr, formatLastSeen(row.lastSeen), row.lastSeen ? "" : "muted");
  return tr;
}

function appendCell(tr, value, className = "") {
  const td = document.createElement("td");
  if (className) td.className = className;
  td.textContent = String(value ?? "");
  tr.appendChild(td);
}

function formatLastSeen(value) {
  if (!value) return "Unavailable";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString();
}

elements.refresh.addEventListener("click", loadRows);
elements.search.addEventListener("input", applyFilter);
loadRows();
