import mongoose from 'mongoose';
mongoose.connect('mongodb://127.0.0.1:27017/emi_db').then(async () => {
  const db = mongoose.connection.db;
  const customers = await db.collection('customers').find({}).toArray();
  console.log(JSON.stringify(customers, null, 2));
  process.exit(0);
});
