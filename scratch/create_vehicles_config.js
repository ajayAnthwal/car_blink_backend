const fs = require('fs');
const path = require('path');

const filePath = 'c:/Users/ajay anthwal/Desktop/car_blink/config/vehicles.config.ts';

const content = `export const MAKES = [
  "Maruti Suzuki", "Hyundai", "Tata", "Mahindra", "Kia", 
  "Toyota", "Honda", "MG", "Skoda", "Volkswagen", 
  "Renault", "Nissan", "Ford", "Jeep", "Citroen", 
  "BMW", "Mercedes", "Land Rover", "Audi"
];

export const CAR_MODELS_MAP: Record<string, string[]> = {
  "Maruti Suzuki": [
    "Alto", "Alto 800", "Alto K10", "S-Presso", "Celerio", "WagonR", "Swift", 
    "Dzire", "Ignis", "Baleno", "Fronx", "Brezza", "Grand Vitara", "Invicto", 
    "Ertiga", "XL6", "Eeco", "Omni", "Zen", "Ritz", "Ciaz", "S-Cross", "Gypsy", 
    "Esteem", "Jimny", "Other"
  ],
  "Hyundai": [
    "Eon", "Santro", "Grand i10", "Grand i10 Nios", "i10", "i20", "i20 N Line", 
    "Aura", "Xcent", "Accent", "Verna", "Elantra", "Sonata", "Venue", 
    "Venue N Line", "Creta", "Creta N Line", "Alcazar", "Tucson", "Santa Fe", 
    "Ioniq 5", "Kona Electric", "Other"
  ],
  "Tata": [
    "Tiago", "Tiago EV", "Tigor", "Altroz", "Punch", "Punch EV", 
    "Nexon", "Nexon EV", "Curvv", "Curvv EV", "Harrier", "Harrier EV", 
    "Safari", "Nano", "Indica", "Indica Vista", "Indigo", "Indigo CS", 
    "Manza", "Zest", "Bolt", "Sumo", "Sumo Gold", "Safari Storme", 
    "Hexa", "Aria", "Venture", "Winger (passenger/commercial)", 
    "Magic", "Nano GenX", "Other"
  ],
  "Mahindra": [
    "XUV700", "XUV300", "XUV400", "Scorpio", "Scorpio-N", "Scorpio Classic", 
    "Thar", "Thar Roxx", "Bolero", "Bolero Neo", "Bolero Neo+", "Marazzo", 
    "Alturas G4", "KUV100", "TUV300", "Xylo", "Quanto", "NuvoSport", "Verito", 
    "Verito Vibe", "Logan", "Armada", "Commander", "Marshal", "Other"
  ],
  "Kia": [
    "Seltos", "Sonet", "Carens", "Carnival", "EV6", "EV9", "Other"
  ],
  "Toyota": [
    "Glanza", "Urban Cruiser", "Urban Cruiser Hyryder", "Innova", 
    "Innova Crysta", "Innova Hycross", "Fortuner", "Fortuner Legender", 
    "Hilux", "Camry", "Vellfire", "Land Cruiser", "Yaris", "Etios", 
    "Etios Liva", "Corolla Altis", "Qualis", "Other"
  ],
  "Honda": [
    "Brio", "Amaze", "Jazz", "WR-V", "City", "City e:HEV", "Elevate", 
    "BR-V", "CR-V", "Civic", "Accord", "Mobilio", "Other"
  ],
  "MG": [
    "Astor", "Hector", "Hector Plus", "Gloster", "ZS EV", "Comet EV", 
    "Windsor EV", "Other"
  ],
  "Skoda": [
    "Slavia", "Kushaq", "Kodiaq", "Superb", "Octavia", "Rapid", 
    "Fabia", "Yeti", "Laura", "Other"
  ],
  "Volkswagen": [
    "Taigun", "Virtus", "Tiguan", "Polo", "Vento", "Ameo", 
    "Jetta", "Passat", "T-Roc", "Touareg", "Other"
  ],
  "Renault": [
    "Kwid", "Kiger", "Triber", "Duster", "Captur", "Lodgy", 
    "Scala", "Pulse", "Fluence", "Other"
  ],
  "Nissan": [
    "Magnite", "Kicks", "Terrano", "Micra", "Sunny", "Evalia", 
    "Teana", "X-Trail", "Other"
  ],
  "Ford": [
    "Figo", "Aspire", "Freestyle", "EcoSport", "Endeavour", 
    "Mustang", "Fiesta", "Ikon", "Escort", "Fusion", "Other"
  ],
  "Jeep": [
    "Compass", "Meridian", "Wrangler", "Grand Cherokee", "Other"
  ],
  "Citroen": [
    "C3", "eC3", "C3 Aircross", "C5 Aircross", "Basalt", "Other"
  ],
  "BMW": [
    "X1", "X3", "X5", "X7", "3 Series", "5 Series", "7 Series", "Z4", "Other"
  ],
  "Mercedes": [
    "A-Class", "C-Class", "E-Class", "S-Class", "GLA", "GLC", "GLE", "GLS", "Other"
  ],
  "Land Rover": [
    "Range Rover", "Range Rover Sport", "Range Rover Evoque", "Discovery", "Discovery Sport", "Defender", "Other"
  ],
  "Audi": [
    "A3", "A4", "A6", "A8", "Q3", "Q5", "Q7", "Q8", "e-tron", "Other"
  ]
};
`;

fs.writeFileSync(filePath, content, 'utf8');
console.log('Created vehicles.config.ts successfully');
