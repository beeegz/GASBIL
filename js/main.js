// js/main.js
import { FUELS, LYON, fetchStations, getUpdate } from "./api.js";
import { initMap, renderMarkers, showUser } from "./map.js";

const statusEl = document.getElementById("status");
const selectorEl = document.getElementById("fuel-selector");
const locateBtn = document.getElementById("locate-btn");

let stations = [];
let currentFuel = "gazole";

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

// Redessine la carte pour le carburant choisi et met à jour le message du bas
function refresh() {
  const count = renderMarkers(stations, currentFuel);
  const label = FUELS.find((f) => f.key === currentFuel).label;

  if (count === 0) {
    setStatus(`Aucune station avec ${label} dans cette zone.`);
    return;
  }

  // Date du prix le plus récent parmi les stations affichées
  const dates = stations.map((s) => getUpdate(s, currentFuel)).filter(Boolean);
  const latest = dates.length ? new Date(Math.max(...dates.map((d) => d.getTime()))) : null;
  setStatus(`${count} stations ${label}` + (latest ? ` · dernier prix ${timeAgo(latest)}` : ""));
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

// Boutons de choix du carburant
function buildSelector() {
  for (const fuel of FUELS) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "fuel-btn";
    button.textContent = fuel.label;
    button.dataset.key = fuel.key;
    button.setAttribute("aria-pressed", String(fuel.key === currentFuel));

    button.addEventListener("click", () => {
      currentFuel = fuel.key;
      for (const b of selectorEl.children) {
        b.setAttribute("aria-pressed", String(b.dataset.key === currentFuel));
      }
      refresh();
    });

    selectorEl.appendChild(button);
  }
}

// Bouton « autour de moi »
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
buildSelector();
load(LYON);
