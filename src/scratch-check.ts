import { connectDatabase } from './config/database.config';
import { BookingModel } from './modules/customer/sub-modules/booking/booking.model';
import { AssignmentModel } from './modules/executive/sub-modules/lead-assignment/assignment.model';
import { BidModel } from './modules/partner/sub-modules/bidding/bid.model';

async function test() {
  await connectDatabase();
  const bookings = await BookingModel.find({});
  console.log('Total bookings:', bookings.length);
  for (const b of bookings) {
    console.log(`Booking ${b._id} - status: ${b.status}`);
  }
  
  const assignments = await AssignmentModel.find({});
  console.log('Total assignments:', assignments.length);
  
  const bids = await BidModel.find({});
  console.log('Total bids:', bids.length);
  
  process.exit(0);
}

test();
