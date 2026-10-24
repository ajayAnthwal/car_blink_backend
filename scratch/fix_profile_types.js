const fs = require('fs');
const path = require('path');

const profileFormPath = path.resolve('..', 'car_blink_dashboard', 'features', 'users', 'components', 'ProfileForm.tsx');
let content = fs.readFileSync(profileFormPath, 'utf8');

const targetSection = `  // Build clean unified list of city options
  const cityOptionsMap = new Map<string, { value: string; label: string }>();
  backendMatchingCities.forEach((c: any) => {
    cityOptionsMap.set(c.name.toLowerCase(), { value: c._id, label: c.name });
  });
  stateMasterCities.forEach((cityName: string) => {
    if (!cityOptionsMap.has(cityName.toLowerCase())) {
      // For cities not yet in backend DB, value is city name
      cityOptionsMap.set(cityName.toLowerCase(), { value: cityName, label: cityName });
    }
  });
  const filteredCities = Array.from(cityOptionsMap.values()).sort((a, b) => a.label.localeCompare(b.label));`;

const fixedSection = `  // Build clean unified list of city options
  const cityOptionsDict: Record<string, { value: string; label: string }> = {};
  backendMatchingCities.forEach((c: any) => {
    if (c && c.name) {
      cityOptionsDict[c.name.toLowerCase()] = { value: String(c._id || c.name), label: c.name };
    }
  });
  stateMasterCities.forEach((cityName: string) => {
    if (cityName && !cityOptionsDict[cityName.toLowerCase()]) {
      cityOptionsDict[cityName.toLowerCase()] = { value: cityName, label: cityName };
    }
  });
  const filteredCities: { value: string; label: string }[] = Object.keys(cityOptionsDict)
    .map((k) => cityOptionsDict[k])
    .sort((a, b) => a.label.localeCompare(b.label));`;

if (content.includes(targetSection)) {
  content = content.replace(targetSection, fixedSection);
  fs.writeFileSync(profileFormPath, content, 'utf8');
  console.log('✓ Successfully fixed ProfileForm.tsx types');
} else {
  console.error('Target section not found');
}
