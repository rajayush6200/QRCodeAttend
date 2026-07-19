const { MongoMemoryServer } = require('mongodb-memory-server');

async function start() {
  console.log('Starting MongoDB Memory Server...');
  const mongod = await MongoMemoryServer.create();
  const uri = mongod.getUri();
  
  process.env.MONGODB_URI = uri;
  console.log(`✅ In-Memory MongoDB running at: ${uri}`);
  
  // Require and start the actual server
  require('./server.js');
}

start().catch(err => {
  console.error('Failed to start MongoDB Memory Server:', err);
  process.exit(1);
});
