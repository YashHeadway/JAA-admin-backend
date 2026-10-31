import mongoose from 'mongoose';
import { env } from '../src/config/env.js';
import { Member } from '../src/models/Member.js';
import { Lead } from '../src/models/Lead.js';
import { MemberService } from '../src/services/memberService.js';

async function migrateAndSeed() {
  await mongoose.connect(env.MONGO_URI);
  console.log('Connected to DB');

  // 1. Find or create Raju Gathiyawala in Member collection
  let raju = await Member.findOne({ email: 'raju@gmail.com' });
  if (!raju) {
    console.log('Creating Raju Gathiyawala in Members...');
    raju = await MemberService.createMember({
      name: 'Raju Gathiyawala',
      mobile: '9988776655',
      email: 'raju@gmail.com',
      business: 'Raju Jewellers',
      businessType: 'B2C',
      city: 'Ahmedabad',
      pincode: '380009',
      address: 'Science City Road, Ahmedabad',
      status: 'approved',
      joinedOn: '31-10-2026',
    });
  } else {
    raju.name = 'Raju Gathiyawala';
    raju.mobile = '9988776655';
    raju.business = 'Raju Jewellers';
    raju.businessType = 'B2C';
    raju.city = 'Ahmedabad';
    raju.pincode = '380009';
    raju.address = 'Science City Road, Ahmedabad';
    raju.status = 'approved';
    await raju.save();
  }

  console.log(`Raju Gathiyawala Member ID: ${raju._id.toString()} (numeric id: ${raju.id})`);

  // 2. Find Member Rajesh Mehta (id: 1) or testt (id: 18)
  const rajesh = (await Member.findOne({ id: 1 })) || raju;

  // 3. Update existing Lead 1 (or create if not present)
  let lead1 = await Lead.findOne({ id: 1 });
  if (lead1) {
    lead1.memberId = raju._id;
    lead1.title = 'Gold Worker Required';
    lead1.description = 'Need an experienced gold worker for jewellery manufacturing.';
    lead1.image = 'https://yourdomain.com/uploads/gold-worker.jpg';
    lead1.status = 'ACTIVE';
    lead1.leadName = 'Gold Worker Required';
    lead1.name = 'Gold Worker Required';
    lead1.businessName = raju.business;
    lead1.mobile = raju.mobile;
    lead1.email = raju.email;
    lead1.businessType = raju.businessType;
    lead1.city = raju.city;
    lead1.pincode = raju.pincode || '380009';
    lead1.address = raju.address;
    lead1.createdAt = new Date('2026-10-31T10:00:00.000Z');
    lead1.updatedAt = new Date('2026-10-31T10:00:00.000Z');
    await lead1.save();
    console.log(`Updated Lead #1 (_id: ${lead1._id.toString()}) linked to Raju Gathiyawala`);
  }

  // 4. Update other leads to be linked to original members
  const otherLeads = await Lead.find({ id: { $ne: 1 } });
  for (const ol of otherLeads) {
    ol.memberId = rajesh._id;
    if (!ol.title || ol.title === ol.leadName) {
      ol.title = 'Experienced Jewellery Designer Required';
      ol.description = 'Seeking skilled CAD jewellery designer for custom bridal ornaments.';
      ol.image = 'https://yourdomain.com/uploads/jewellery-designer.jpg';
    }
    ol.status = 'ACTIVE';
    ol.businessName = rajesh.business;
    ol.mobile = rajesh.mobile;
    ol.email = rajesh.email;
    ol.businessType = rajesh.businessType || 'Retailer';
    ol.city = rajesh.city || 'Ahmedabad';
    ol.pincode = rajesh.pincode || '380009';
    ol.address = rajesh.address || 'Ahmedabad';
    await ol.save();
    console.log(`Updated Lead #${ol.id} (_id: ${ol._id.toString()}) linked to Member #${rajesh.id}`);
  }

  console.log('Migration & seeding finished successfully');
  await mongoose.disconnect();
}

migrateAndSeed().catch(console.error);

