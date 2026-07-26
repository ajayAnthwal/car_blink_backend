const axios = require('axios');
require('dotenv').config({ path: '../.env' });
const mongoose = require('mongoose');

(async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    
    // Find super admin
    const User = mongoose.model('User', new mongoose.Schema({}, { strict: false }));
    const admin = await User.findOne({ email: 'admin@carblink.com' });
    
    // Login to get token
    const loginRes = await axios.post('http://localhost:8000/api/auth/login', {
      identifier: 'admin@carblink.com',
      password: 'password123'
    });
    const token = loginRes.data.data.accessToken;

    console.log("Updating via API to 25...");
    const updateRes = await axios.put('http://localhost:8000/api/super-admin/settings', {
      platformCommissionRate: 25,
      tdsRate: 5
    }, {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    console.log("Update Response:", updateRes.data);

    // Get via API
    const getRes = await axios.get('http://localhost:8000/api/super-admin/settings', {
      headers: { Authorization: `Bearer ${token}` }
    });
    console.log("GET Response:", getRes.data.data);

    process.exit(0);
  } catch (err) {
    console.error(err.response ? err.response.data : err.message);
    process.exit(1);
  }
})();
