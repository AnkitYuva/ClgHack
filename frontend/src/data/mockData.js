export const stats = {
  totalBins: 24,
  fullBins: 7,
  overflowBins: 2,
  activeAlerts: 6,
  recycledToday: "1.2T",
  efficiencyScore: 87,
};

export const bins = [
  { id: "BIN-001", name: "Block A – Main Entrance",  level: 92, status: "Full",     type: "Recyclable", lat: 13.0707, lng: 77.5993, lastUpdated: "2 min ago" },
  { id: "BIN-002", name: "Block B – Corridor",       level: 48, status: "Medium",   type: "Biodegradable", lat: 13.0710, lng: 77.5997, lastUpdated: "5 min ago" },
  { id: "BIN-003", name: "Food Court",               level: 98, status: "Overflow", type: "Biodegradable", lat: 13.0715, lng: 77.6001, lastUpdated: "1 min ago" },
  { id: "BIN-004", name: "Parking Lot – North",      level: 33, status: "Low",      type: "Recyclable", lat: 13.0720, lng: 77.5990, lastUpdated: "10 min ago" },
  { id: "BIN-005", name: "Lab Block – Entrance",     level: 78, status: "High",     type: "Hazardous",  lat: 13.0705, lng: 77.5988, lastUpdated: "3 min ago" },
  { id: "BIN-006", name: "Admin Block",              level: 15, status: "Low",      type: "Recyclable", lat: 13.0700, lng: 77.5985, lastUpdated: "15 min ago" },
  { id: "BIN-007", name: "Sports Ground",            level: 61, status: "Medium",   type: "Biodegradable", lat: 13.0725, lng: 77.6005, lastUpdated: "7 min ago" },
  { id: "BIN-008", name: "Library",                  level: 87, status: "Full",     type: "Recyclable", lat: 13.0712, lng: 77.5978, lastUpdated: "4 min ago" },
];

export const alerts = [
  { id: 1, message: "Block A bin exceeded 90% capacity", priority: "high",     time: "2 min ago",  bin: "BIN-001" },
  { id: 2, message: "Food Court bin OVERFLOW detected",  priority: "critical", time: "1 min ago",  bin: "BIN-003" },
  { id: 3, message: "Hazardous waste identified – Lab Block", priority: "high", time: "3 min ago", bin: "BIN-005" },
  { id: 4, message: "Library bin nearing full capacity", priority: "medium",   time: "4 min ago",  bin: "BIN-008" },
  { id: 5, message: "Route optimization suggested for Zone A", priority: "info", time: "5 min ago", bin: "" },
];

export const wasteCategories = [
  { name: "Recyclable",    value: 42, color: "#06b6d4" },
  { name: "Biodegradable", value: 35, color: "#22c55e" },
  { name: "Hazardous",     value: 23, color: "#ef4444" },
];

export const weeklyData = [
  { day: "Mon", biodegradable: 40, recyclable: 30, hazardous: 10 },
  { day: "Tue", biodegradable: 55, recyclable: 42, hazardous: 8  },
  { day: "Wed", biodegradable: 35, recyclable: 60, hazardous: 15 },
  { day: "Thu", biodegradable: 70, recyclable: 38, hazardous: 5  },
  { day: "Fri", biodegradable: 62, recyclable: 50, hazardous: 12 },
  { day: "Sat", biodegradable: 48, recyclable: 45, hazardous: 9  },
  { day: "Sun", biodegradable: 30, recyclable: 28, hazardous: 4  },
];

export const routeBins = [
  { id: "START",   name: "Depot / Truck Start",    level: 0,  lat: 13.0698, lng: 77.5982, priority: "start"    },
  { id: "BIN-003", name: "Food Court",             level: 98, lat: 13.0715, lng: 77.6001, priority: "critical" },
  { id: "BIN-001", name: "Block A – Main Entrance",level: 92, lat: 13.0707, lng: 77.5993, priority: "high"     },
  { id: "BIN-008", name: "Library",                level: 87, lat: 13.0712, lng: 77.5978, priority: "high"     },
  { id: "BIN-005", name: "Lab Block – Entrance",   level: 78, lat: 13.0705, lng: 77.5988, priority: "medium"   },
  { id: "END",     name: "Recycling Center",        level: 0,  lat: 13.0730, lng: 77.6010, priority: "end"      },
];
