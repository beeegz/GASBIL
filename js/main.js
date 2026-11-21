// js/main.js
import { FUELS, LYON, fetchStations, getUpdate, formatPrice } from "./api.js";
import { initMap, renderMarkers, showUser, focusStation } from "./map.js";

const statusEl = document.getElementById("status");
const sheetEl = document.getElementById("sheet");
const sheetTitle = document.getElementById("sheet-title");
const sheetBody = document.getElementById("sheet-body");
const sheetClose = document.getElementById("sheet-close");
const listBtn = document.getElementById("list-btn");
const filtersBtn = document.getElementById("filters-btn");
const locateBtn = document.getElementById("locate-btn");

const LEVEL_LABELS = { low: "moins cher", mid: "moyen", high: "plus cher" };
const LIST_SIZE = 30;

let stations = [];
let entries = [];
let currentFuel = "gazole";
let sheetOpener = null;

function setStatus(message) {
  statusEl.textContent = message;
}

// "il y a 4 min", "il y a 2 h"...
function timeAgo(date) {
  const minutes = Math.max(0, Math.round((Date.now() - date.getTime()) / 60000));
  if (minutes < 60) return `il y a ${minutes} min`;
  const hours = Math.round(minutes / 60);
  return hours < 48 ? `il y a ${hours} h` : `il y a ${Math.round(hours / 24)} j`;
}

// Redessine la carte pour le carburant choisi et met à jour le bandeau d'état
function refresh() {
  entries = renderMarkers(stations, currentFuel);
  const label = FUELS.find((f) => f.key === currentFuel).label;

  if (entries.length === 0) {
    setStatus(`Aucune station avec ${label} dans cette zone.`);
    return;
  }

  // Date du prix le plus récent parmi les stations affichées
  const dates = entries.map((e) => getUpdate(e.station, currentFuel)).filter(Boolean);
  const latest = dates.length ? new Date(Math.max(...dates.map((d) => d.getTime()))) : null;
  setStatus(`${entries.length} stations ${label}` + (latest ? ` · dernier prix ${timeAgo(latest)}` : ""));
}

// Charge les stations autour d'un point puis redessine
async function load(center) {
  setStatus("Chargement des prix…");
  try {
    stations = await fetchStations(center);
    refresh();
  } catch (error) {
    console.error(error);
    setStatus("Impossible de charger les prix pour le moment. Réessaie dans quelques minutes.");
  }
}

// ---- Panneau du bas (liste / filtres) ----

function openSheet(title, opener, body) {
  sheetTitle.textContent = title;
  sheetBody.replaceChildren(body);
  sheetEl.hidden = false;
  sheetOpener = opener;
  sheetClose.focus();
}

function closeSheet() {
  sheetEl.hidden = true;
  if (sheetOpener) sheetOpener.focus();
}

// Contenu « Filtres » : choix du carburant + légende des couleurs
function buildFilters() {
  const fragment = document.createDocumentFragment();

  const group = document.createElement("div");
  group.className = "fuel-group";
  group.setAttribute("role", "group");
  group.setAttribute("aria-label", "Choix du carburant");

  for (const fuel of FUELS) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "fuel-btn";
    button.textContent = fuel.label;
    button.dataset.key = fuel.key;
    button.setAttribute("aria-pressed", String(fuel.key === currentFuel));

    button.addEventListener("click", () => {
      currentFuel = fuel.key;
      for (const b of group.children) {
        b.setAttribute("aria-pressed", String(b.dataset.key === currentFuel));
      }
      refresh();
    });
    group.appendChild(button);
  }
  fragment.appendChild(group);

  const legend = document.createElement("ul");
  legend.className = "legend";
  for (const [level, text] of Object.entries(LEVEL_LABELS)) {
    const item = document.createElement("li");
    const dot = document.createElement("span");
    dot.className = `dot ${level}`;
    item.append(dot, text);
    legend.appendChild(item);
  }
  fragment.appendChild(legend);

  return fragment;
}

// Contenu « Liste » : les stations les moins chères pour le carburant choisi
function buildList() {
  const label = FUELS.find((f) => f.key === currentFuel).label;

  if (entries.length === 0) {
    const empty = document.createElement("p");
    empty.textContent = `Aucune station avec ${label} dans cette zone.`;
    return empty;
  }

  const sorted = [...entries].sort((a, b) => a.price - b.price).slice(0, LIST_SIZE);
  const list = document.createElement("ul");
  list.className = "station-list";

  for (const entry of sorted) {
    const item = document.createElement("li");
    const button = document.createElement("button");
    button.type = "button";
    button.className = "station-item";

    const price = document.createElement("span");
    price.className = "station-price";
    const dot = document.createElement("span");
    dot.className = `dot ${entry.level}`;
    const hidden = document.createElement("span");
    hidden.className = "sr-only";
    hidden.textContent = LEVEL_LABELS[entry.level];
    price.append(dot, hidden, `${formatPrice(entry.price)} €`);

    const name = document.createElement("span");
    name.className = "station-name";
    const address = document.createElement("span");
    address.textContent = entry.station.adresse || "Station-service";
    const city = document.createElement("small");
    city.textContent = [entry.station.cp, entry.station.ville].filter(Boolean).join(" ");
    name.append(address, city);

    button.append(price, name);
    button.addEventListener("click", () => {
      sheetEl.hidden = true;
      focusStation(entry);
    });

    item.appendChild(button);
    list.appendChild(item);
  }

  return list;
}

listBtn.addEventListener("click", () => openSheet(`Les moins chers · ${FUELS.find((f) => f.key === currentFuel).label}`, listBtn, buildList()));
filtersBtn.addEventListener("click", () => openSheet("Filtres", filtersBtn, buildFilters()));
sheetClose.addEventListener("click", closeSheet);
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && !sheetEl.hidden) closeSheet();
});

// ---- Bouton « autour de moi » ----

locateBtn.addEventListener("click", () => {
  if (!navigator.geolocation) {
    setStatus("La géolocalisation n'est pas disponible sur cet appareil.");
    return;
  }
  setStatus("Localisation en cours…");
  navigator.geolocation.getCurrentPosition(
    (position) => {
      const center = { lat: position.coords.latitude, lon: position.coords.longitude };
      showUser(center.lat, center.lon);
      load(center);
    },
    () => setStatus("Position refusée ou introuvable. Autorise la localisation dans Safari."),
    { timeout: 10000 }
  );
});

initMap();
load(LYON);
