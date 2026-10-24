const fs = require('fs');
const path = require('path');

const filePath = path.resolve('..', 'car_blink_dashboard', 'features', 'admin', 'hooks', 'useAdminQueries.ts');
let content = fs.readFileSync(filePath, 'utf8');

// 1. Add imports if missing
if (!content.includes('getStates')) {
  content = content.replace(
    '  getCities,',
    '  getStates,\n  createState,\n  updateState,\n  deleteState,\n  getCities,\n  updateCity,\n  getLocationHierarchy,'
  );
}

// 2. Add State hooks
const stateHooks = `export const useMasterDataStates = (params?: { page?: number; limit?: number; search?: string; isActive?: string }) => {
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

export const useLocationHierarchy = () => {
  return useQuery({
    queryKey: ["admin", "masterData", "hierarchy"],
    queryFn: async () => {
      const res = await getLocationHierarchy();
      return res?.data || res || [];
    }
  });
};
`;

if (!content.includes('useMasterDataStates')) {
  content = content.replace(
    'export const useMasterDataCities',
    stateHooks + '\nexport const useMasterDataCities'
  );
}

fs.writeFileSync(filePath, content, 'utf8');
console.log('✓ Successfully patched useAdminQueries.ts');
