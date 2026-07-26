const mongoose = require('mongoose');

async function listUsers() {
  try {
    await mongoose.connect('mongodb+srv://techwebsofficial_db_user:techwebs%401234%23@cluster0.oxv4zfb.mongodb.net/carblink?retryWrites=true&w=majority');
    
    const db = mongoose.connection.db;
    const users = await db.collection('users').find({}).toArray();
    
    const roles = {};
    users.forEach(user => {
      if (!roles[user.role]) {
        roles[user.role] = [];
      }
      roles[user.role].push({
        name: user.fullName || 'N/A',
        email: user.email || 'N/A',
        phone: user.phone || 'N/A'
      });
    });
    
    console.log(JSON.stringify(roles, null, 2));
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    process.exit(0);
  }
}

listUsers();
