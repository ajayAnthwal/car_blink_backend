import { z } from 'zod';

export const createRsaSchema = z.object({
  vehicleId: z.string().min(1, 'Vehicle ID is required'),
  issueType: z.string().min(1, 'Issue type is required'),
  location: z.object({
    lat: z.number({ required_error: 'Latitude is required' }),
    lng: z.number({ required_error: 'Longitude is required' }),
  }),
});
