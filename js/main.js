// js/main.js
import { fetchStations } from "./api.js";

const status = document.getElementById("status");
const output = document.getElementById("output");

async function init() {
  try {
    const data = await fetchStations();
    status.textContent = `${data.results.length} stations reçues (total : ${data.total_count})`;
    // textContent (et non innerHTML) : le texte est affiché tel quel, sans risque d'injection
    output.textContent = JSON.stringify(data.results[0], null, 2);
  } catch (error) {
    status.textContent = "Impossible de charger les prix. Réessaie plus tard.";
    console.error(error);
  }
}

init();
