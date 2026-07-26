const axios = require('axios');
axios.post('http://localhost:8000/api/payment/offline', {
  bookingId: '6a644fbe593da6392f39cf2f',
  amount: 60,
  paymentType: 'ADVANCE'
}).then(res => console.log('SUCCESS:', res.data))
  .catch(err => console.log('ERROR:', err.response?.data || err.message));