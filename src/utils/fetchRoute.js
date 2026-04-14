export async function fetchRoute(from, to) {
  const url = `https://router.project-osrm.org/route/v1/driving/${from.lng},${from.lat};${to.lng},${to.lat}?overview=full&geometries=geojson&steps=true`;

  try {
    const res = await fetch(url);
    const data = await res.json();

    if (!data.routes?.length) return null;

    const route = data.routes[0];
    return {
      coordinates: route.geometry.coordinates.map(([lng, lat]) => [lat, lng]),
      steps: route.legs[0].steps.map((step) => ({
        instruction: step.maneuver.type,
        name: step.name,
        distance: step.distance,
        duration: step.duration,
        location: step.maneuver.location,
      })),
      totalDistance: route.distance,
      totalDuration: route.duration,
      eta: Math.ceil(route.duration / 60),
    };
  } catch (err) {
    console.error('Route fetch error:', err);
    return null;
  }
}
