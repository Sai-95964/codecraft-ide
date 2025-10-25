const mongoose = require('mongoose');

async function run() {
  await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/codecraft');
  const result = await mongoose.connection.collection('users').updateMany(
    { $or: [{ username: { $exists: false } }, { username: null }] },
    [
      {
        $set: {
          username: '$email'
        }
      }
    ]
  );
  console.log('Updated users:', result.modifiedCount);
  await mongoose.disconnect();
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
