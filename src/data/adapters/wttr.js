/**
 * wttr.in Adapter — Weather
 *
 * Terminal-friendly weather data from wttr.in.
 * Docs: https://wttr.in/:help
 * Auth: None
 *
 * invoke({ city? })
 *   city: location name (default: "Allahabad")
 */

const API_BASE = "https://wttr.in";

async function invoke(params = {}) {
  const { city = "Allahabad" } = params;
  const url = `${API_BASE}/${encodeURIComponent(city)}?format=j1`;

  const res = await fetch(url);

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`wttr.in API ${res.status}: ${err}`);
  }

  const data = await res.json();
  const cc = data.current_condition?.[0] || {};

  const current = {
    temp_C: cc.temp_C,
    feels_like: cc.FeelsLikeC,
    humidity: cc.humidity,
    wind_kmph: cc.windspeedKmph,
    description: (cc.weatherDesc?.[0]?.value || "").trim()
  };

  const forecast = (data.weather || []).slice(0, 3).map(day => ({
    date: day.date,
    maxtemp: day.maxtempC,
    mintemp: day.mintempC,
    description: (day.hourly?.[4]?.weatherDesc?.[0]?.value || "").trim()
  }));

  return { city, current, forecast };
}

function describe() {
  return {
    name: "wttr.in — Weather",
    params: {
      city: "string (optional) — city/location name (default: 'Allahabad')"
    },
    example: { city: "Mumbai" }
  };
}

module.exports = { invoke, describe };
