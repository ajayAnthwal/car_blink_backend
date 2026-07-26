require('ts-node').register();
const mongoose = require('mongoose');
const { PartnerModel } = require('./src/modules/partner/partner.model');
const { ReviewModel } = require('./src/modules/review/review.model');

async function check() {
  await mongoose.connect('mongodb://localhost:27017/carblink');

  const partners = await PartnerModel.find({}, 'businessName rating totalReviews');
  console.log('PARTNERS:');
  console.log(partners);

  const reviews = await ReviewModel.find({}, 'rating partnerId customerId bookingId');
  console.log('\nREVIEWS:');
  console.log(reviews);

  process.exit(0);
}
check();
