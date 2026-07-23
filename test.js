require('dotenv').config();
const mongoose = require('mongoose');
async function test() {
  await mongoose.connect(process.env.MONGODB_URI);
  const BookingModel = mongoose.connection.model('Booking', new mongoose.Schema({status: String, cityId: mongoose.Schema.Types.ObjectId, serviceId: mongoose.Schema.Types.ObjectId})); 
  const PartnerModel = mongoose.connection.model('Partner', new mongoose.Schema({userId: mongoose.Schema.Types.ObjectId, cityId: mongoose.Schema.Types.ObjectId, servicesOffered: [mongoose.Schema.Types.ObjectId]})); 
  
  const partner = await PartnerModel.findOne({userId: new mongoose.Types.ObjectId('6a619c8ff50e4e016e1f6c8f')}); 
  console.log('Partner city:', partner.cityId, 'services:', partner.servicesOffered); 
  
  const b = await BookingModel.find({status: 'PENDING', cityId: partner.cityId, serviceId: {$in: partner.servicesOffered}}); 
  console.log('Matches:', b.length); 
  process.exit(0);
}
test();
