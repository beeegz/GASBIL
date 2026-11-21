// js/brands.js
// Les données officielles ne donnent pas l'enseigne des stations.
// On la récupère dans OpenStreetMap (service Overpass) et on la rapproche de chaque station par la position.
import { getCoords } from "./api.js";

const OVERPASS_URL = "https://overpass-api.de/api/interpreter";
const MATCH_DISTANCE_M = 100; // une station et son point OpenStreetMap doivent être à moins de 100 m

// Enseigne (texte libre) -> nom du fichier de logo dans img/logos/ (sans l'extension)
const KNOWN_BRANDS = [
  [/total/i, "totalenergies"],
  [/leclerc/i, "leclerc"],
  [/carrefour/i, "carrefour"],
  [/auchan/i, "auchan"],
  [/intermarch/i, "intermarche"],
  [/esso/i, "esso"],
  [/\bbp\b/i, "bp"],
  [/shell/i, "shell"],
  [/avia/i, "avia"],
  [/casino/i, "casino"],
  [/(super|hyper|syst[eè]me)\s*u\b|\bu\s*express/i, "u"],
  [/netto/i, "netto"],
  [/vito/i, "vito"],
  [/\b(agip|eni)\b/i, "agip"],
  [/\bcora\b/i, "cora"],
];

// "TotalEnergies Access" -> "totalenergies" ; "Ma Station" -> "ma-station"
export function getBrandSlug(name) {
  for (const [pattern, slug] of KNOWN_BRANDS) {
    if (pattern.test(name)) return slug;
  }
  return name
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

// Liste des stations-service d'OpenStreetMap autour d'un point, avec leur enseigne
export async function fetchBrandPlaces(center, radiusKm) {
  const query = `[out:json][timeout:25];nwr["amenity"="fuel"](around:${radiusKm * 1000},${center.lat},${center.lon});out center tags;`;
  const response = await fetch(`${OVERPASS_URL}?data=${encodeURIComponent(query)}`);
  if (!response.ok) {
    throw new Error(`Erreur Overpass : ${response.status}`);
  }
  const data = await response.json();

  return data.elements
    .map((el) => ({
      lat: el.lat ?? el.center?.lat,
      lon: el.lon ?? el.center?.lon,
      name: el.tags?.brand || el.tags?.name || el.tags?.operator || null,
    }))
    .filter((p) => p.name && Number.isFinite(p.lat) && Number.isFinite(p.lon));
}

// Distance en mètres entre deux points (formule de haversine)
function distanceMeters(lat1, lon1, lat2, lon2) {
  const rad = Math.PI / 180;
  const a =
    Math.sin(((lat2 - lat1) * rad) / 2) ** 2 +
    Math.cos(lat1 * rad) * Math.cos(lat2 * rad) * Math.sin(((lon2 - lon1) * rad) / 2) ** 2;
  return 12742000 * Math.asin(Math.sqrt(a));
}

// Ajoute station.brand à chaque station qui a un point OpenStreetMap tout proche
export function attachBrands(stations, places) {
  for (const station of stations) {
    const coords = getCoords(station);
    if (!coords) continue;

    let best = null;
    let bestDistance = MATCH_DISTANCE_M;
    for (const place of places) {
      const distance = distanceMeters(coords[0], coords[1], place.lat, place.lon);
      if (distance < bestDistance) {
        best = place;
        bestDistance = distance;
      }
    }
    if (best) station.brand = best.name;
  }
}
