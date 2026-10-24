const fs = require('fs');
const path = require('path');

const servicesPath = path.resolve('..', 'car_blink_dashboard', 'lib', 'services.ts');
let content = fs.readFileSync(servicesPath, 'utf8');

const injection = `
// ==========================================
// LOCATION & GEOGRAPHIC HIERARCHY APIs
// ==========================================

export const getStates = async (params?: { page?: number; limit?: number; search?: string; isActive?: string }) => {
  const query = new URLSearchParams();
  if (params?.page) query.append("page", String(params.page));
  if (params?.limit) query.append("limit", String(params.limit));
  if (params?.search) query.append("search", params.search);
  if (params?.isActive) query.append("isActive", params.isActive);
  const qStr = query.toString();
  const response = await apiClient.get(\`/states\${qStr ? \`?\${qStr}\` : ""}\`);
  return response.data;
};

export const getStateById = async (id: string) => {
  const response = await apiClient.get(\`/states/\${id}\`);
  return response.data;
};

export const createState = async (data: { name: string; code?: string; country?: string; isActive?: boolean }) => {
  const response = await apiClient.post("/states", data);
  return response.data;
};

export const updateState = async (id: string, data: Partial<{ name: string; code?: string; country?: string; isActive?: boolean }>) => {
  const response = await apiClient.patch(\`/states/\${id}\`, data);
  return response.data;
};

export const deleteState = async (id: string, deleteLinkedCities?: boolean) => {
  const response = await apiClient.delete(\`/states/\${id}\${deleteLinkedCities ? "?deleteLinkedCities=true" : ""}\`);
  return response.data;
};

export const getLocationHierarchy = async () => {
  const response = await apiClient.get("/hierarchy");
  return response.data;
};
`;

if (!content.includes('export const getStates')) {
  content = content.replace(
    '// MASTER DATA APIs (Super Admin Only)',
    injection.trim() + '\n\n// MASTER DATA APIs (Super Admin Only)'
  );
  fs.writeFileSync(servicesPath, content, 'utf8');
  console.log('✓ Successfully exported getStates, createState, updateState, deleteState, getLocationHierarchy in services.ts');
} else {
  console.log('Already exported');
}
