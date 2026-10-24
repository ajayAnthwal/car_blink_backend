const fs = require('fs');
const path = require('path');

// 1. UPDATE services.ts in car_blink_dashboard
const servicesPath = path.resolve('..', 'car_blink_dashboard', 'lib', 'services.ts');
let servicesContent = fs.readFileSync(servicesPath, 'utf8');

const oldCitiesBlock = `export const getCities = async (page = 1, limit = 5000) => {
  try {
    const response = await apiClient.get(\`/cities?page=\${page}&limit=\${limit}\`);
    return response.data;
  } catch (err) {
    return { data: [] };
  }
};`;

const newCitiesBlock = `// ==========================================
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

export const getCities = async (pageOrParams?: number | { page?: number; limit?: number; search?: string; state?: string; stateId?: string; isActive?: string }, limit = 5000) => {
  try {
    let queryStr = "";
    if (typeof pageOrParams === "object" && pageOrParams !== null) {
      const q = new URLSearchParams();
      if (pageOrParams.page) q.append("page", String(pageOrParams.page));
      if (pageOrParams.limit) q.append("limit", String(pageOrParams.limit));
      if (pageOrParams.search) q.append("search", pageOrParams.search);
      if (pageOrParams.state) q.append("state", pageOrParams.state);
      if (pageOrParams.stateId) q.append("stateId", pageOrParams.stateId);
      if (pageOrParams.isActive) q.append("isActive", pageOrParams.isActive);
      queryStr = q.toString() ? \`?\${q.toString()}\` : "";
    } else {
      const page = typeof pageOrParams === "number" ? pageOrParams : 1;
      queryStr = \`?page=\${page}&limit=\${limit}\`;
    }
    const response = await apiClient.get(\`/cities\${queryStr}\`);
    return response.data;
  } catch (err) {
    return { data: [] };
  }
};

export const getCityById = async (id: string) => {
  const response = await apiClient.get(\`/cities/\${id}\`);
  return response.data;
};

export const getLocationHierarchy = async () => {
  const response = await apiClient.get("/hierarchy");
  return response.data;
};`;

if (servicesContent.includes(oldCitiesBlock)) {
  servicesContent = servicesContent.replace(oldCitiesBlock, newCitiesBlock);
}

const oldCreateCityBlock = `export const createCity = async (data: { name: string; state: string }) => {
  const response = await apiClient.post("/cities", data);
  return response.data;
};

export const updateCity = async (id: string, data: { name?: string; state?: string }) => {
  const response = await apiClient.patch(\`/cities/\${id}\`, data);
  return response.data;
};`;

const newCreateCityBlock = `export const createCity = async (data: { name: string; state?: string; stateId?: string; isActive?: boolean }) => {
  const response = await apiClient.post("/cities", data);
  return response.data;
};

export const updateCity = async (id: string, data: { name?: string; state?: string; stateId?: string; isActive?: boolean }) => {
  const response = await apiClient.patch(\`/cities/\${id}\`, data);
  return response.data;
};`;

if (servicesContent.includes(oldCreateCityBlock)) {
  servicesContent = servicesContent.replace(oldCreateCityBlock, newCreateCityBlock);
}

fs.writeFileSync(servicesPath, servicesContent, 'utf8');
console.log('✓ Successfully updated car_blink_dashboard/lib/services.ts');

// 2. UPDATE useAdminQueries.ts
const adminQueriesPath = path.resolve('..', 'car_blink_dashboard', 'features', 'admin', 'hooks', 'useAdminQueries.ts');
let adminQueriesContent = fs.readFileSync(adminQueriesPath, 'utf8');

// Ensure getStates, createState, updateState, deleteState are imported
if (!adminQueriesContent.includes('getStates')) {
  adminQueriesContent = adminQueriesContent.replace(
    '  getCities,\n  createCity,\n  deleteCity,',
    '  getStates,\n  createState,\n  updateState,\n  deleteState,\n  getCities,\n  createCity,\n  updateCity,\n  deleteCity,\n  getLocationHierarchy,'
  );
}

const oldCitiesHooks = `export const useMasterDataCities = () => {
  return useQuery({
    queryKey: ["admin", "masterData", "cities"],
    queryFn: async () => {
      const res = await getCities();
      return Array.isArray(res?.data) ? res.data : (Array.isArray(res) ? res : []);
    }
  });
};`;

const newCitiesHooks = `export const useMasterDataStates = (params?: { page?: number; limit?: number; search?: string; isActive?: string }) => {
  return useQuery({
    queryKey: ["admin", "masterData", "states", params],
    queryFn: async () => {
      const res = await getStates(params);
      return res?.data || res || [];
    }
  });
};

export const useCreateStateMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: any) => createState(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "masterData", "states"] });
      queryClient.invalidateQueries({ queryKey: ["admin", "masterData", "cities"] });
      queryClient.invalidateQueries({ queryKey: ["admin", "masterData", "hierarchy"] });
    }
  });
};

export const useUpdateStateMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => updateState(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "masterData", "states"] });
      queryClient.invalidateQueries({ queryKey: ["admin", "masterData", "cities"] });
      queryClient.invalidateQueries({ queryKey: ["admin", "masterData", "hierarchy"] });
    }
  });
};

export const useDeleteStateMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, deleteLinkedCities }: { id: string; deleteLinkedCities?: boolean }) => deleteState(id, deleteLinkedCities),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "masterData", "states"] });
      queryClient.invalidateQueries({ queryKey: ["admin", "masterData", "cities"] });
      queryClient.invalidateQueries({ queryKey: ["admin", "masterData", "hierarchy"] });
    }
  });
};

export const useMasterDataCities = (params?: { page?: number; limit?: number; search?: string; state?: string; stateId?: string; isActive?: string }) => {
  return useQuery({
    queryKey: ["admin", "masterData", "cities", params],
    queryFn: async () => {
      const res = await getCities(params);
      return Array.isArray(res?.data) ? res.data : (Array.isArray(res) ? res : []);
    }
  });
};

export const useLocationHierarchy = () => {
  return useQuery({
    queryKey: ["admin", "masterData", "hierarchy"],
    queryFn: async () => {
      const res = await getLocationHierarchy();
      return res?.data || res || [];
    }
  });
};`;

if (adminQueriesContent.includes(oldCitiesHooks)) {
  adminQueriesContent = adminQueriesContent.replace(oldCitiesHooks, newCitiesHooks);
}

// Add useUpdateCityMutation if not present
if (!adminQueriesContent.includes('useUpdateCityMutation')) {
  adminQueriesContent = adminQueriesContent.replace(
    'export const useDeleteCityMutation = () => {',
    `export const useUpdateCityMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => updateCity(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "masterData", "cities"] });
      queryClient.invalidateQueries({ queryKey: ["admin", "masterData", "states"] });
      queryClient.invalidateQueries({ queryKey: ["admin", "masterData", "hierarchy"] });
    }
  });
};

export const useDeleteCityMutation = () => {`
  );
}

fs.writeFileSync(adminQueriesPath, adminQueriesContent, 'utf8');
console.log('✓ Successfully updated car_blink_dashboard/features/admin/hooks/useAdminQueries.ts');
