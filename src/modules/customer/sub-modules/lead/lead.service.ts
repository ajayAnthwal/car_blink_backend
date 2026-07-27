import { LeadModel, ILead, LEAD_STATUS } from './lead.model';
import { getPaginationOptions, formatPaginatedResponse, IPaginatedResult } from '../../../../common/utils/pagination.util';
import { NotFoundError } from '../../../../common/errors/NotFoundError';

export class LeadService {
  public static async createLead(data: Partial<ILead>): Promise<ILead> {
    return await LeadModel.create(data);
  }

  public static async getLeads(query: any): Promise<IPaginatedResult<ILead>> {
    const { page, limit, skip } = getPaginationOptions(query);
    const filter: any = {};
    if (query.source) filter.source = query.source;
    if (query.status) filter.status = query.status;

    const [data, total] = await Promise.all([
      LeadModel.find(filter)
        .populate('customerId', 'fullName email phone')
        .populate('serviceIds', 'name')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      LeadModel.countDocuments(filter),
    ]);

    return formatPaginatedResponse(data, total, page, limit);
  }

  public static async updateLeadStatus(id: string, status: LEAD_STATUS): Promise<ILead> {
    const lead = await LeadModel.findByIdAndUpdate(
      id,
      { status },
      { new: true }
    );
    if (!lead) {
      throw new NotFoundError('Lead not found');
    }
    return lead;
  }
}
