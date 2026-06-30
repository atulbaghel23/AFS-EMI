const { MongoClient } = require('mongodb');
async function run() {
  const uri = 'mongodb://project_emi:mFZZI94FVjWn4tdR@ac-pilur9b-shard-00-00.egu1mey.mongodb.net:27017,ac-pilur9b-shard-00-01.egu1mey.mongodb.net:27017,ac-pilur9b-shard-00-02.egu1mey.mongodb.net:27017/mydatabase?ssl=true&replicaSet=atlas-5ihvjw-shard-0&authSource=admin&retryWrites=true&w=majority';
  const client = new MongoClient(uri);
  await client.connect();
  const db = client.db('mydatabase');
  const count = await db.collection('customers').countDocuments();
  console.log('CUSTOMER COUNT: ' + count);
  const sample = await db.collection('customers').find().limit(1).toArray();
  console.log('SAMPLE: ' + JSON.stringify(sample, null, 2));
  await client.close();
}
run().catch(console.dir);
