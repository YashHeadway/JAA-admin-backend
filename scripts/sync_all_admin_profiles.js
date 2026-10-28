import { connectDB } from '../src/config/db.js';
import { AdminProfileService } from '../src/services/adminProfileService.js';
import { AdminUser } from '../src/models/AdminUser.js';
import { AdminProfile } from '../src/models/AdminProfile.js';
import mongoose from 'mongoose';

async function main() {
  await connectDB();
  console.log('--- Running syncExistingAdminProfiles() ---');
  await AdminProfileService.syncExistingAdminProfiles();

  const allAdmins = await AdminUser.find({});
  console.log(`Total AdminUsers in DB: ${allAdmins.length}`);

  const allProfiles = await AdminProfile.find({});
  console.log(`Total AdminProfiles in DB after sync: ${allProfiles.length}`);

  allProfiles.forEach((p, idx) => {
    console.log(`Profile #${idx + 1}: id=${p.id}, _id=${p._id}, email=${p.email}, name="${p.name}", phone="${p.phone}", role="${p.role}", avatar=${p.avatar}`);
  });

  const formattedProfiles = await AdminProfileService.getAllProfiles();
  console.log('\n--- Output from AdminProfileService.getAllProfiles() ---');
  console.log(JSON.stringify(formattedProfiles, null, 2));

  await mongoose.disconnect();
}

main().catch(console.error);
