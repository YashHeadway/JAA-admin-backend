import mongoose from 'mongoose';
import { env } from '../src/config/env.js';
import { Member } from '../src/models/Member.js';

async function test() {
  await mongoose.connect(env.MONGO_URI);

  const m18 = await Member.findOne({ id: 18 });
  console.log('Member 18 toJSON():');
  console.log(JSON.stringify(m18, null, 2));

  await mongoose.disconnect();
}

test().catch(console.error);

