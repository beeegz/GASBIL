// js/map.js
import { FUELS, LYON, getPrice, getUpdate, getCoords, formatPrice } from "./api.js";
import { getBrandSlug } from "./brands.js";

let map;
let markersLayer;
let userMarker = null;

// En dessous de ce niveau de zoom, on masque les logos pour ne pas encombrer la carte
const LOGOS_FROM_ZOOM = 13;

// Crée la carte (L est fourni par la bibliothèque Leaflet chargée dans index.html)
export function initMap() {
  map = L.map("map").setView([LYON.lat, LYON.lon], 11);

  L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19,
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
  }).addTo(map);

  markersLayer = L.layerGroup().addTo(map);

  updateLogosVisibility();
  map.on("zoomend", updateLogosVisibility);
}

function updateLogosVisibility() {
  map.getContainer().classList.toggle("no-logos", map.getZoom() < LOGOS_FROM_ZOOM);
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

// Niveau de couleur par tiers : le tiers le moins cher est vert, le plus cher est rouge
function getLevel(price, sortedPrices) {
  const n = sortedPrices.length;
  if (price <= sortedPrices[Math.ceil(n / 3) - 1]) return "low";
  if (price <= sortedPrices[Math.ceil((2 * n) / 3) - 1]) return "mid";
  return "high";
}

// Pastille ronde de l'enseigne : le logo si le fichier img/logos/<enseigne>.png existe, sinon l'initiale
function buildBadge(brand) {
  const badge = document.createElement("span");
  badge.className = "brand-badge";

  const img = document.createElement("img");
  img.alt = "";
  img.src = `img/logos/${getBrandSlug(brand)}.png`;
  img.addEventListener("error", () => {
    badge.replaceChildren(brand.trim().charAt(0).toUpperCase());
  });
  badge.appendChild(img);

  return badge;
}

// Épingle de prix : pastille colorée + pastille d'enseigne si elle est connue
function buildPin(price, level, brand) {
  const pin = document.createElement("div");
  pin.className = `price-marker ${level}`;
  pin.textContent = formatPrice(price, 2);
  if (brand) pin.prepend(buildBadge(brand));
  return pin;
}

// Contenu de la fenêtre qui s'ouvre au clic (construit avec le DOM : pas d'injection HTML possible)
function buildPopup(station, fuelKey) {
  const root = document.createElement("div");
  root.className = "popup";

  const title = document.createElement("h2");
  title.textContent = station.brand || station.adresse || "Station-service";
  root.appendChild(title);

  const city = document.createElement("p");
  const address = station.brand ? station.adresse : null;
  city.textContent = [address, [station.cp, station.ville].filter(Boolean).join(" ")].filter(Boolean).join(", ");
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

// Dessine une pastille par station ayant ce carburant ; renvoie le nombre de stations affichées
export function renderMarkers(stations, fuelKey) {
  markersLayer.clearLayers();

  const priced = [];
  for (const station of stations) {
    const price = getPrice(station, fuelKey);
    const coords = getCoords(station);
    if (price !== null && coords) priced.push({ station, price, coords });
  }

  const sorted = priced.map((p) => p.price).sort((a, b) => a - b);

  for (const { station, price, coords } of priced) {
    const level = getLevel(price, sorted);
    const icon = L.divIcon({
      className: "",
      html: buildPin(price, level, station.brand),
      iconSize: [56, 30],
      iconAnchor: [28, 15],
    });
    L.marker(coords, { icon }).bindPopup(buildPopup(station, fuelKey)).addTo(markersLayer);
  }

  return priced.length;
}
