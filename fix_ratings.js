require('ts-node').register();
const mongoose = require('mongoose');
const { PartnerModel } = require('./src/modules/partner/partner.model');
const { ReviewModel } = require('./src/modules/review/review.model');
require('dotenv').config();

async function fixRatings() {
  await mongoose.connect(process.env.MONGODB_URI);
  
  const partners = await PartnerModel.find({});
  for (const partner of partners) {
    const stats = await ReviewModel.aggregate([
      { $match: { partnerId: partner._id } },
      {
        $group: {
          _id: '$partnerId',
          averageRating: { $avg: '$rating' },
          totalReviews: { $sum: 1 },
        },
      },
    ]);
    
    if (stats.length > 0) {
      partner.rating = Number(stats[0].averageRating.toFixed(2));
      partner.totalReviews = stats[0].totalReviews;
    } else {
      partner.rating = 0;
      partner.totalReviews = 0;
    }
    await partner.save();
    console.log(`Updated partner ${partner.businessName} - Rating: ${partner.rating}, Reviews: ${partner.totalReviews}`);
  }
  
  process.exit(0);
}
fixRatings();
