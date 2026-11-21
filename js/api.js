// js/api.js
// Adresse de l'API officielle (gratuite, sans clé)
const API_URL =
  "https://data.economie.gouv.fr/api/explore/v2.1/catalog/datasets/prix-des-carburants-en-france-flux-instantane-v2/records";

// Centre de Lyon
export const LYON = { lat: 45.76, lon: 4.83 };

// Carburants proposés (key = préfixe des champs de l'API : <key>_prix et <key>_maj)
export const FUELS = [
  { key: "gazole", label: "Gazole" },
  { key: "e10", label: "SP95-E10" },
  { key: "sp95", label: "SP95" },
  { key: "sp98", label: "SP98" },
  { key: "e85", label: "E85" },
  { key: "gplc", label: "GPL" },
];

const PAGE_SIZE = 100; // l'API renvoie 100 résultats maximum par requête
const MAX_STATIONS = 300;

// Récupère les stations à moins de radiusKm km du centre donné
export async function fetchStations(center = LYON, radiusKm = 10) {
  const stations = [];

  for (let offset = 0; offset < MAX_STATIONS; offset += PAGE_SIZE) {
    // Attention : dans la requête, la longitude passe avant la latitude
    const params = new URLSearchParams({
      where: `within_distance(geom, geom'POINT(${center.lon} ${center.lat})', ${radiusKm}km)`,
      limit: String(PAGE_SIZE),
      offset: String(offset),
    });

    const response = await fetch(`${API_URL}?${params}`);
    if (!response.ok) {
      throw new Error(`Erreur API : ${response.status}`);
    }
    const data = await response.json();
    stations.push(...data.results);
    if (stations.length >= data.total_count) break;
  }

  return stations;
}

// Prix (en €/L) d'un carburant pour une station, ou null s'il n'est pas proposé
export function getPrice(station, fuelKey) {
  const price = Number(station[`${fuelKey}_prix`]);
  return Number.isFinite(price) && price > 0 ? price : null;
}

// Date de dernière mise à jour du prix d'un carburant, ou null
export function getUpdate(station, fuelKey) {
  const date = new Date(station[`${fuelKey}_maj`]);
  return Number.isNaN(date.getTime()) ? null : date;
}

// Coordonnées [lat, lon] d'une station, ou null si absentes
export function getCoords(station) {
  const geom = station.geom;
  if (geom && Number.isFinite(geom.lat) && Number.isFinite(geom.lon)) {
    return [geom.lat, geom.lon];
  }
  return null;
}

// 1.789 -> "1,789"
export function formatPrice(price, decimals = 3) {
  return price.toFixed(decimals).replace(".", ",");
}
