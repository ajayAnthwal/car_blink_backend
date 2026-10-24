import mongoose from 'mongoose';
import { connectDatabase } from '../../config/database.config';
import { StateModel } from '../../modules/master-data/models/state.model';
import { CityModel } from '../../modules/master-data/models/city.model';
import { logger } from '../../config/logger.config';

const STATE_DATA: { name: string; code?: string; cities: string[] }[] = [
  {
    name: 'Andaman and Nicobar Islands',
    code: 'AN',
    cities: ['Port Blair', 'Diglipur', 'Mayabunder', 'Rangat', 'Car Nicobar']
  },
  {
    name: 'Andhra Pradesh',
    code: 'AP',
    cities: [
      'Visakhapatnam', 'Vijayawada', 'Guntur', 'Nellore', 'Kurnool', 'Kakinada',
      'Rajahmundry', 'Kadapa', 'Tirupati', 'Anantapur', 'Vizianagaram', 'Eluru',
      'Ongole', 'Nandyal', 'Machilipatnam', 'Adoni', 'Tenali', 'Proddatur', 'Chittoor'
    ]
  },
  {
    name: 'Arunachal Pradesh',
    code: 'AR',
    cities: ['Itanagar', 'Naharlagun', 'Pasighat', 'Namsai', 'Tawang', 'Ziro']
  },
  {
    name: 'Assam',
    code: 'AS',
    cities: [
      'Guwahati', 'Silchar', 'Dibrugarh', 'Jorhat', 'Nagaon', 'Tinsukia',
      'Tezpur', 'Bongaigaon', 'Karimganj', 'Sivasagar'
    ]
  },
  {
    name: 'Bihar',
    code: 'BR',
    cities: [
      'Patna', 'Gaya', 'Bhagalpur', 'Muzaffarpur', 'Purnia', 'Darbhanga',
      'Bihar Sharif', 'Arrah', 'Begusarai', 'Katihar', 'Munger', 'Chhapra',
      'Danapur', 'Bettiah', 'Saharsa', 'Hajipur', 'Sasaram', 'Dehri', 'Siwan'
    ]
  },
  {
    name: 'Chandigarh',
    code: 'CH',
    cities: ['Chandigarh', 'Manimajra']
  },
  {
    name: 'Chhattisgarh',
    code: 'CG',
    cities: [
      'Raipur', 'Bhilai', 'Bilaspur', 'Korba', 'Rajnandgaon', 'Durg',
      'Jagdalpur', 'Raigarh', 'Ambikapur', 'Dhamtari'
    ]
  },
  {
    name: 'Dadra and Nagar Haveli and Daman and Diu',
    code: 'DN',
    cities: ['Daman', 'Diu', 'Silvassa']
  },
  {
    name: 'Delhi',
    code: 'DL',
    cities: [
      'South Delhi', 'New Delhi', 'Central Delhi', 'North Delhi', 'North West Delhi',
      'West Delhi', 'South West Delhi', 'South East Delhi', 'East Delhi',
      'North East Delhi', 'Shahdara', 'Dwarka', 'Rohini', 'Saket', 'Connaught Place',
      'Vasant Kunj', 'Lajpat Nagar', 'Karol Bagh', 'Pitampura', 'Janakpuri'
    ]
  },
  {
    name: 'Goa',
    code: 'GA',
    cities: ['Panaji', 'Margao', 'Vasco da Gama', 'Mapusa', 'Ponda']
  },
  {
    name: 'Gujarat',
    code: 'GJ',
    cities: [
      'Ahmedabad', 'Surat', 'Vadodara', 'Rajkot', 'Bhavnagar', 'Jamnagar',
      'Junagadh', 'Gandhinagar', 'Anand', 'Navsari', 'Morbi', 'Nadiad',
      'Surendranagar', 'Bharuch', 'Mehsana', 'Bhuj', 'Porbandar', 'Valsad', 'Vapi'
    ]
  },
  {
    name: 'Haryana',
    code: 'HR',
    cities: [
      'Gurugram', 'Faridabad', 'Panipat', 'Ambala', 'Yamunanagar', 'Rohtak',
      'Hisar', 'Karnal', 'Sonipat', 'Panchkula', 'Sirsa', 'Bhiwani', 'Bahadurgarh',
      'Jind', 'Thanesar', 'Kaithal', 'Rewari', 'Palwal', 'Manesar'
    ]
  },
  {
    name: 'Himachal Pradesh',
    code: 'HP',
    cities: ['Shimla', 'Dharamshala', 'Solan', 'Mandi', 'Kullu', 'Baddi', 'Manali', 'Una']
  },
  {
    name: 'Jammu and Kashmir',
    code: 'JK',
    cities: ['Srinagar', 'Jammu', 'Anantnag', 'Baramulla', 'Udhampur', 'Sopore', 'Kathua']
  },
  {
    name: 'Jharkhand',
    code: 'JH',
    cities: [
      'Ranchi', 'Jamshedpur', 'Dhanbad', 'Bokaro Steel City', 'Deoghar',
      'Hazaribagh', 'Giridih', 'Ramgarh', 'Medininagar'
    ]
  },
  {
    name: 'Karnataka',
    code: 'KA',
    cities: [
      'Bengaluru', 'Mysuru', 'Hubballi-Dharwad', 'Mangaluru', 'Belagavi',
      'Kalaburagi', 'Davanagere', 'Ballari', 'Vijayapura', 'Shivamogga',
      'Tumakuru', 'Raichur', 'Bidar', 'Hosapete', 'Udupi', 'Hassan'
    ]
  },
  {
    name: 'Kerala',
    code: 'KL',
    cities: [
      'Thiruvananthapuram', 'Kochi', 'Kozhikode', 'Kollam', 'Thrissur',
      'Kannur', 'Alappuzha', 'Kottayam', 'Palakkad', 'Malappuram', 'Guruvayur'
    ]
  },
  {
    name: 'Ladakh',
    code: 'LA',
    cities: ['Leh', 'Kargil']
  },
  {
    name: 'Lakshadweep',
    code: 'LD',
    cities: ['Kavaratti', 'Agatti']
  },
  {
    name: 'Madhya Pradesh',
    code: 'MP',
    cities: [
      'Bhopal', 'Indore', 'Jabalpur', 'Gwalior', 'Ujjain', 'Sagar', 'Dewas',
      'Satna', 'Ratlam', 'Rewa', 'Singrauli', 'Burhanpur', 'Khandwa', 'Pithampur'
    ]
  },
  {
    name: 'Maharashtra',
    code: 'MH',
    cities: [
      'Mumbai', 'Pune', 'Nagpur', 'Thane', 'Pimpri-Chinchwad', 'Nashik',
      'Kalyan-Dombivli', 'Vasai-Virar', 'Chhatrapati Sambhajinagar (Aurangabad)',
      'Navi Mumbai', 'Solapur', 'Mira-Bhayandar', 'Bhiwandi', 'Amravati',
      'Nanded', 'Kolhapur', 'Akola', 'Panvel', 'Ulhasnagar', 'Jalgaon'
    ]
  },
  {
    name: 'Manipur',
    code: 'MN',
    cities: ['Imphal', 'Churachandpur', 'Thoubal']
  },
  {
    name: 'Meghalaya',
    code: 'ML',
    cities: ['Shillong', 'Tura', 'Jowai']
  },
  {
    name: 'Mizoram',
    code: 'MZ',
    cities: ['Aizawl', 'Lunglei', 'Champhai']
  },
  {
    name: 'Nagaland',
    code: 'NL',
    cities: ['Dimapur', 'Kohima', 'Mokokchung']
  },
  {
    name: 'Odisha',
    code: 'OD',
    cities: [
      'Bhubaneswar', 'Cuttack', 'Rourkela', 'Berhampur', 'Sambalpur',
      'Puri', 'Balasore', 'Bhadrak', 'Baripada', 'Jharsuguda'
    ]
  },
  {
    name: 'Puducherry',
    code: 'PY',
    cities: ['Puducherry', 'Ozhukarai', 'Karaikal', 'Mahe']
  },
  {
    name: 'Punjab',
    code: 'PB',
    cities: [
      'Ludhiana', 'Amritsar', 'Jalandhar', 'Patiala', 'Bathinda',
      'Mohali (SAS Nagar)', 'Hoshiarpur', 'Batala', 'Pathankot', 'Moga'
    ]
  },
  {
    name: 'Rajasthan',
    code: 'RJ',
    cities: [
      'Jaipur', 'Jodhpur', 'Kota', 'Bikaner', 'Ajmer', 'Udaipur', 'Bhilwara',
      'Alwar', 'Bharatpur', 'Sikar', 'Pali', 'Sri Ganganagar', 'Bhiwadi'
    ]
  },
  {
    name: 'Sikkim',
    code: 'SK',
    cities: ['Gangtok', 'Namchi', 'Geyzing']
  },
  {
    name: 'Tamil Nadu',
    code: 'TN',
    cities: [
      'Chennai', 'Coimbatore', 'Madurai', 'Tiruchirappalli', 'Salem', 'Tiruppur',
      'Erode', 'Tirunelveli', 'Vellore', 'Thoothukudi', 'Dindigul', 'Thanjavur',
      'Hosur', 'Nagercoil', 'Kanchipuram'
    ]
  },
  {
    name: 'Telangana',
    code: 'TS',
    cities: [
      'Hyderabad', 'Warangal', 'Nizamabad', 'Khammam', 'Karimnagar',
      'Ramagundam', 'Mahbubnagar', 'Nalgonda', 'Suryapet', 'Siddipet'
    ]
  },
  {
    name: 'Tripura',
    code: 'TR',
    cities: ['Agartala', 'Dharmanagar', 'Udaipur']
  },
  {
    name: 'Uttar Pradesh',
    code: 'UP',
    cities: [
      'Noida', 'Greater Noida', 'Ghaziabad', 'Lucknow', 'Kanpur', 'Agra',
      'Meerut', 'Varanasi', 'Prayagraj (Allahabad)', 'Bareilly', 'Aligarh',
      'Moradabad', 'Saharanpur', 'Gorakhpur', 'Firozabad', 'Jhansi', 'Mathura', 'Ayodhya'
    ]
  },
  {
    name: 'Uttarakhand',
    code: 'UK',
    cities: ['Dehradun', 'Haridwar', 'Roorkee', 'Haldwani', 'Rudrapur', 'Rishikesh', 'Nainital']
  },
  {
    name: 'West Bengal',
    code: 'WB',
    cities: [
      'Kolkata', 'Howrah', 'Asansol', 'Siliguri', 'Durgapur', 'Bardhaman',
      'Malda', 'Kharagpur', 'Haldia', 'Darjeeling'
    ]
  }
];

export const seedStatesAndCities = async (): Promise<void> => {
  try {
    await connectDatabase();
    logger.info('Connected to database for seeding states and cities.');

    // Drop legacy unique index on name if present so compound { name: 1, state: 1 } is used
    try {
      await CityModel.collection.dropIndex('name_1');
      logger.info('Dropped legacy name_1 index on cities collection');
    } catch (e: any) {
      // index might not exist or already dropped
    }

    for (const stateItem of STATE_DATA) {
      // 1. Upsert State
      const stateDoc = await StateModel.findOneAndUpdate(
        { name: stateItem.name },
        {
          $set: {
            name: stateItem.name,
            code: stateItem.code,
            country: 'India',
            isActive: true,
          }
        },
        { upsert: true, new: true }
      );

      // 2. Upsert Cities linked to this State
      for (const cityName of stateItem.cities) {
        await CityModel.findOneAndUpdate(
          { name: cityName, state: stateItem.name },
          {
            $set: {
              name: cityName,
              state: stateItem.name,
              stateId: stateDoc._id,
              isActive: true,
            }
          },
          { upsert: true, new: true }
        );
      }
      logger.info(`Seeded state: ${stateItem.name} (${stateItem.cities.length} cities)`);
    }

    // Link any existing legacy cities with missing stateId
    const legacyCities = await CityModel.find({ stateId: { $exists: false } });
    for (const legacy of legacyCities) {
      const matchState = await StateModel.findOne({
        name: { $regex: `^${legacy.state}$`, $options: 'i' }
      });
      if (matchState) {
        legacy.stateId = matchState._id as any;
        await legacy.save();
      }
    }

    logger.info('States and Cities hierarchy seeding completed successfully.');
    await mongoose.disconnect();
    logger.info('Disconnected from database.');
  } catch (error) {
    logger.error('Error seeding states and cities:', error);
    throw error;
  }
};

if (require.main === module) {
  seedStatesAndCities()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}
