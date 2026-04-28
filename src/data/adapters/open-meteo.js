/**
 * Open-Meteo Adapter — Weather Forecast
 *
 * Free weather API, no auth required.
 * Supports city geocoding or direct lat/lon.
 *
 * invoke({ latitude?, longitude?, city? })
 *   Default: Prayagraj (26.85, 80.91)
 */

const FORECAST_BASE = "https://api.open-meteo.com/v1/forecast";
const GEOCODE_BASE = "https://geocoding-api.open-meteo.com/v1/search";

async function invoke(params = {}) {
  let { latitude = 26.85, longitude = 80.91, city } = params;

  if (city) {
    const geoRes = await fetch(`${GEOCODE_BASE}?name=${encodeURIComponent(city)}&count=1`);
    if (!geoRes.ok) throw new Error(`Geocoding ${geoRes.status}: ${await geoRes.text()}`);
    const geoData = await geoRes.json();
    if (!geoData.results?.length) throw new Error(`City not found: ${city}`);
    latitude = geoData.results[0].latitude;
    longitude = geoData.results[0].longitude;
    city = geoData.results[0].name;
  }

  const url = `${FORECAST_BASE}?latitude=${latitude}&longitude=${longitude}` +
    `&current=temperature_2m,wind_speed_10m,relative_humidity_2m,weather_code` +
    `&daily=temperature_2m_max,temperature_2m_min,precipitation_sum` +
    `&timezone=Asia/Kolkata&forecast_days=3`;

  const res = await fetch(url);
  if (!res.ok) throw new Error(`Open-Meteo ${res.status}: ${await res.text()}`);
  const data = await res.json();

  const forecast = (data.daily?.time || []).map((date, i) => ({
    date,
    max: data.daily.temperature_2m_max[i],
    min: data.daily.temperature_2m_min[i],
    precipitation: data.daily.precipitation_sum[i]
  }));

  return {
    city: city || `${latitude},${longitude}`,
    current: {
      temp: data.current?.temperature_2m,
      wind: data.current?.wind_speed_10m,
      humidity: data.current?.relative_humidity_2m,
      weather_code: data.current?.weather_code
    },
    forecast
  };
}

function describe() {
  return {
    name: "Open-Meteo Weather Forecast",
    params: {
      city: "string — city name (optional, geocoded automatically)",
      latitude: "number — default 26.85 (Prayagraj)",
      longitude: "number — default 80.91 (Prayagraj)"
    },
    example: { city: "Mumbai" }
  };
}

module.exports = { invoke, describe };
