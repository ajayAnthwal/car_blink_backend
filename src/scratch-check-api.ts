import { connectDatabase } from './config/database.config';
import { AssignmentService } from './modules/executive/sub-modules/lead-assignment/assignment.service';

async function test() {
  await connectDatabase();
  const assignmentService = new AssignmentService();
  const leads = await assignmentService.getAllLeads({ page: 1, limit: 50, status: 'PENDING,QUOTED' });
  console.log(JSON.stringify(leads, null, 2));
  process.exit(0);
}

test();
