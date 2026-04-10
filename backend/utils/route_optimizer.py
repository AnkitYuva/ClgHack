import math

def haversine(lat1, lon1, lat2, lon2):
    """Calculate real-world distance in km between two coordinates."""
    R = 6371
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = math.sin(dlat/2)**2 + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlon/2)**2
    return R * 2 * math.asin(math.sqrt(a))

def optimize_route(start, bins):
    """Nearest-neighbor greedy route optimizer."""
    current = {"lat": start["lat"], "lng": start["lng"]}
    remaining = list(bins)
    ordered = []

    while remaining:
        nearest = min(remaining, key=lambda b: haversine(current["lat"], current["lng"], b["lat"], b["lng"]))
        ordered.append(nearest)
        current = {"lat": nearest["lat"], "lng": nearest["lng"]}
        remaining.remove(nearest)

    return ordered
