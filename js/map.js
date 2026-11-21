// js/map.js
import { FUELS, LYON, getPrice, getUpdate, getCoords, formatPrice } from "./api.js";

let map;
let markersLayer;
let userMarker = null;

// En dessous de ce niveau de zoom, on affiche des pastilles compactes
const COMPACT_BELOW_ZOOM = 13;

// Crée la carte (L est fourni par la bibliothèque Leaflet chargée dans index.html)
export function initMap() {
  map = L.map("map", { zoomControl: false }).setView([LYON.lat, LYON.lon], 11);

  // Fond de carte sombre (CARTO, données OpenStreetMap)
  L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", {
    subdomains: "abcd",
    maxZoom: 19,
    attribution:
      '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>',
  }).addTo(map);

  // Attribution en haut à droite pour ne pas passer sous les boutons du bas
  map.attributionControl.setPosition("topright");

  markersLayer = L.layerGroup().addTo(map);

  updateCompact();
  map.on("zoomend", updateCompact);
}

function updateCompact() {
  map.getContainer().classList.toggle("compact", map.getZoom() < COMPACT_BELOW_ZOOM);
}

// Déplace la carte et affiche un point bleu à la position de l'utilisateur
export function showUser(lat, lon) {
  map.setView([lat, lon], 13);
  if (userMarker) userMarker.remove();
  userMarker = L.circleMarker([lat, lon], {
    radius: 8,
    color: "#fff",
    weight: 2,
    fillColor: "#0b5fa5",
    fillOpacity: 1,
  }).addTo(map);
}

// Centre la carte sur une station et ouvre sa fenêtre
export function focusStation(entry) {
  map.setView(entry.coords, Math.max(map.getZoom(), 15));
  entry.marker.openPopup();
}

// Niveau de couleur par tiers : le tiers le moins cher est vert, le plus cher est rouge
function getLevel(price, sortedPrices) {
  const n = sortedPrices.length;
  if (price <= sortedPrices[Math.ceil(n / 3) - 1]) return "low";
  if (price <= sortedPrices[Math.ceil((2 * n) / 3) - 1]) return "mid";
  return "high";
}

// Contenu de la fenêtre qui s'ouvre au clic (construit avec le DOM : pas d'injection HTML possible)
function buildPopup(station, fuelKey) {
  const root = document.createElement("div");
  root.className = "popup";

  const title = document.createElement("h2");
  title.textContent = station.adresse || "Station-service";
  root.appendChild(title);

  const city = document.createElement("p");
  city.textContent = [station.cp, station.ville].filter(Boolean).join(" ");
  root.appendChild(city);

  const list = document.createElement("ul");
  for (const fuel of FUELS) {
    const price = getPrice(station, fuel.key);
    if (price === null) continue;

    const item = document.createElement("li");
    if (fuel.key === fuelKey) item.className = "selected";

    const name = document.createElement("span");
    name.textContent = fuel.label;
    const value = document.createElement("span");
    value.textContent = `${formatPrice(price)} €/L`;
    item.append(name, value);
    list.appendChild(item);
  }
  root.appendChild(list);

  const update = getUpdate(station, fuelKey);
  if (update) {
    const small = document.createElement("small");
    small.textContent = `Prix du ${update.toLocaleDateString("fr-FR")} à ${update.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}`;
    root.appendChild(small);
  }

  return root;
}

// Dessine une épingle par station ayant ce carburant.
// Renvoie la liste des stations affichées : { station, price, level, coords, marker }
export function renderMarkers(stations, fuelKey) {
  markersLayer.clearLayers();

  const priced = [];
  for (const station of stations) {
    const price = getPrice(station, fuelKey);
    const coords = getCoords(station);
    if (price !== null && coords) priced.push({ station, price, coords });
  }

  const sorted = priced.map((p) => p.price).sort((a, b) => a - b);
  const maxPrice = sorted[sorted.length - 1];

  return priced.map((entry) => {
    const level = getLevel(entry.price, sorted);
    // Seuls des nombres et des valeurs fixes sont insérés dans ce HTML
    const icon = L.divIcon({
      className: "pin-wrap",
      html: `<div class="pin ${level}"><div class="pin-head">⛽</div><div class="pin-price"><span class="full">${formatPrice(entry.price)} €</span><span class="short">${formatPrice(entry.price, 2)}</span></div></div>`,
      iconSize: [72, 70],
      iconAnchor: [36, 70],
    });

    // Les stations les moins chères passent au-dessus des autres
    const marker = L.marker(entry.coords, {
      icon,
      zIndexOffset: Math.round((maxPrice - entry.price) * 1000),
    })
      .bindPopup(buildPopup(entry.station, fuelKey))
      .addTo(markersLayer);

    return { ...entry, level, marker };
  });
}
