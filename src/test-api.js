const axios = require('axios');

(async () => {
  try {
    // 1. Login
    console.log("Logging in...");
    const loginRes = await axios.post('http://localhost:8000/api/auth/login', {
      identifier: 'admin@carblink.com',
      password: 'password123'
    });
    const token = loginRes.data.data.accessToken;
    console.log("Got token");

    // 2. PUT Settings
    console.log("Updating platformCommissionRate to 12...");
    const updateRes = await axios.put('http://localhost:8000/api/super-admin/settings', {
      platformCommissionRate: 12,
      tdsRate: 5
    }, {
      headers: { Authorization: `Bearer ${token}` }
    });
    console.log("Update Response:", updateRes.data);

    // 3. GET Settings Again
    const getRes = await axios.get('http://localhost:8000/api/super-admin/settings', {
      headers: { Authorization: `Bearer ${token}` }
    });
    console.log("New Settings:", getRes.data.data);

  } catch (err) {
    console.error(err.response ? err.response.data : err.message);
  }
})();
