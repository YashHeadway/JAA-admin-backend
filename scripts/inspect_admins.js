import { connectDB } from '../src/config/db.js';
import { AdminUser } from '../src/models/AdminUser.js';
import { AdminProfile } from '../src/models/AdminProfile.js';
import mongoose from 'mongoose';

async function main() {
  await connectDB();
  const admins = await AdminUser.find({});
  console.log(`--- Total AdminUsers: ${admins.length} ---`);
  admins.forEach((a) => {
    console.log(`Admin: id=${a.id}, _id=${a._id}, email=${a.email}, name=${a.name || a.fullName}, mobile=${a.mobile}, role=${a.role}`);
  });

  const profiles = await AdminProfile.find({});
  console.log(`--- Total AdminProfiles: ${profiles.length} ---`);
  profiles.forEach((p) => {
    console.log(`Profile: id=${p.id}, _id=${p._id}, email=${p.email}, name=${p.name || p.fullName}, phone=${p.phone || p.mobile}`);
  });

  const { User } = await import('../src/models/User.js');
  const regularAdmins = await User.find({ role: { $regex: /admin/i } });
  console.log(`--- Total Admin role Users in 'users' collection: ${regularAdmins.length} ---`);
  regularAdmins.forEach((u) => {
    console.log(`User-Admin: id=${u.id}, _id=${u._id}, email=${u.email}, name=${u.name}, role=${u.role}`);
  });

  await mongoose.disconnect();
}

main().catch(console.error);
