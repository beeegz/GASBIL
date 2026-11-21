// js/api.js
// Adresse de l'API officielle (gratuite, sans clé)
const API_URL =
  "https://data.economie.gouv.fr/api/explore/v2.1/catalog/datasets/prix-des-carburants-en-france-flux-instantane-v2/records";

// Centre de Lyon (attention : longitude d'abord dans la requête)
const LYON = { lat: 45.76, lon: 4.83 };

// Récupère les stations situées à moins de radiusKm km du centre de Lyon
export async function fetchStations(radiusKm = 10, limit = 100) {
  const params = new URLSearchParams({
    where: `within_distance(geom, geom'POINT(${LYON.lon} ${LYON.lat})', ${radiusKm}km)`,
    limit: String(limit),
  });

  const response = await fetch(`${API_URL}?${params}`);
  if (!response.ok) {
    throw new Error(`Erreur API : ${response.status}`);
  }
  return response.json();
}
