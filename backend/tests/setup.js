const { MongoMemoryServer } = require('mongodb-memory-server');

let mongoServer;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const mongoUri = mongoServer.getUri();
  process.env.DATABASE_URL = mongoUri;
});

afterAll(async () => {
  if (mongoServer) {
    await mongoServer.stop();
  }
});
