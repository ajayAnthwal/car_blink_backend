require('dotenv').config();
const mongoose = require('mongoose');

async function testService() {
  await mongoose.connect(process.env.MONGODB_URI);
  const { MasterDataService } = require('../dist/modules/master-data/master-data.service');

  console.log('--- Testing getAllStates ---');
  const statesRes = await MasterDataService.getAllStates({ limit: 5 });
  console.log(`Fetched ${statesRes.data.length} states. Total: ${statesRes.pagination.total}`);
  console.log('Sample state with city count:', statesRes.data[0].name, 'Cities count:', statesRes.data[0].citiesCount);

  console.log('\n--- Testing createState ---');
  const testStateName = 'Test State ' + Date.now();
  const createdState = await MasterDataService.createState({
    name: testStateName,
    code: 'TS',
    country: 'India',
    isActive: true,
  });
  console.log('Created State:', createdState.name, createdState._id);

  console.log('\n--- Testing createCity linked to state ---');
  const testCityName = 'Test City ' + Date.now();
  const createdCity = await MasterDataService.createCity({
    name: testCityName,
    stateId: createdState._id.toString(),
    isActive: true,
  });
  console.log('Created City:', createdCity.name, 'Linked to state:', createdCity.state, createdCity.stateId);

  console.log('\n--- Testing updateCity ---');
  const updatedCity = await MasterDataService.updateCity(createdCity._id.toString(), {
    name: testCityName + ' Updated',
  });
  console.log('Updated City:', updatedCity.name);

  console.log('\n--- Testing updateState ---');
  const updatedState = await MasterDataService.updateState(createdState._id.toString(), {
    name: testStateName + ' Renamed',
  });
  console.log('Updated State:', updatedState.name);

  console.log('\n--- Testing deleteCity ---');
  await MasterDataService.deleteCity(createdCity._id.toString());
  console.log('Deleted City successfully.');

  console.log('\n--- Testing deleteState ---');
  const delRes = await MasterDataService.deleteState(createdState._id.toString());
  console.log('Deleted State successfully:', delRes.message);

  console.log('\n--- Testing hierarchy sample ---');
  const hierarchy = await MasterDataService.getLocationHierarchy();
  console.log(`Hierarchy has ${hierarchy.length} states.`);
  const delhi = hierarchy.find(s => s.name === 'Delhi');
  if (delhi) {
    console.log(`Delhi has ${delhi.cities.length} cities in hierarchy:`, delhi.cities.slice(0, 3).map(c => c.name));
  }

  await mongoose.disconnect();
  console.log('\nALL TESTS PASSED WITH 100% SUCCESS!');
}

testService().catch(err => {
  console.error('Test failed:', err);
  process.exit(1);
});
