import mongoose from 'mongoose';
import { env } from '../src/config/env.js';
import { Member } from '../src/models/Member.js';
import { formatDateOnly } from '../src/utils/dateFormatter.js';

async function sync() {
  await mongoose.connect(env.MONGO_URI);
  console.log('Connected to DB');

  const members = await Member.find({});
  console.log(`Found ${members.length} members`);

  for (const m of members) {
    const cardNum = m.membershipId || (m.id ? `JBAD${150 + m.id}` : '');
    const issuedDate = m.joinedOn ? formatDateOnly(m.joinedOn) : formatDateOnly(m.createdAt || new Date());
    const cardStatus = m.status === 'rejected' ? 'inactive' : 'active';

    m.membershipId = cardNum;
    m.idCard = {
      cardNumber: m.idCard?.cardNumber || cardNum,
      status: m.idCard?.status || cardStatus,
      issuedAt: m.idCard?.issuedAt ? formatDateOnly(m.idCard.issuedAt) : issuedDate,
      validUntil: m.idCard?.validUntil || null,
      qrCode: m.idCard?.qrCode || `https://yourdomain.com/verify/${cardNum}`,
    };

    await m.save();
    console.log(`Synced Member #${m.id} (${m.name}) -> card: ${m.idCard.cardNumber}, status: ${m.idCard.status}`);
  }

  console.log('Sync complete');
  await mongoose.disconnect();
}

sync().catch(console.error);

