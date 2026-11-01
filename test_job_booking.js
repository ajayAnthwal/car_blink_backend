const mongoose = require('mongoose');
require('dotenv').config();

(async () => {
  await mongoose.connect(process.env.MONGODB_URI);
  require('./src/modules/customer/sub-modules/booking/booking.model');
  require('./src/modules/partner/sub-modules/bidding/bid.model');
  const { JobModel } = require('./src/modules/partner/sub-modules/jobs/job.model');
  const job = await JobModel.findById('6ae734b631515db9b28f380e')
    .populate({
      path: 'bookingId',
      populate: [
        { path: 'vehicleId' },
        { path: 'serviceId' },
        { path: 'cityId' },
        { path: 'acceptedBidId', select: 'quotedAmount originalQuotedAmount notes status' }
      ]
    })
    .populate('bidId', 'quotedAmount originalQuotedAmount notes status')
    .lean();

  console.log('--- JOB BOOKING ID ---');
  console.log('bookingId.pricing:', job.bookingId?.pricing);
  console.log('bookingId.acceptedQuoteAmount:', job.bookingId?.acceptedQuoteAmount);
  console.log('bookingId.acceptedBidId:', job.bookingId?.acceptedBidId);
  console.log('job.bidId:', job.bidId);
  console.log('job.finalAmount:', job.finalAmount);
  console.log('bookingId.finalAmount:', job.bookingId?.finalAmount);
  process.exit(0);
})();

