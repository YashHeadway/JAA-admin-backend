import mongoose from 'mongoose';
import { AdminProfile } from '../src/models/AdminProfile.js';
import { AdminUser } from '../src/models/AdminUser.js';
import { User } from '../src/models/User.js';

async function seedAdminProfile() {
  await mongoose.connect('mongodb://127.0.0.1:27017/JAA_Backend');
  console.log('Connected to MongoDB');

  const profileData = {
    fullName: 'Harvey Specter',
    dateOfBirth: '2000-07-31',
    gender: 'Male',
    mobile: '+91988774455',
    email: 'admin@gmail.com',
    address: 'The Exhibition Center, Science Road',
    city: 'Ahmedabad',
    pincode: '380009',
    profilePhoto: 'https://example.com/uploads/profile.jpg',
  };

  let profile = await AdminProfile.findOne({ email: 'admin@gmail.com' });
  if (!profile) {
    profile = await AdminProfile.create({
      id: 1,
      userId: 1,
      ...profileData,
    });
    console.log('Created AdminProfile:', profile.toJSON());
  } else {
    Object.assign(profile, profileData);
    await profile.save();
    console.log('Updated AdminProfile:', profile.toJSON());
  }

  await AdminUser.updateMany(
    { email: 'admin@gmail.com' },
    {
      $set: {
        fullName: profileData.fullName,
        name: profileData.fullName,
        dateOfBirth: profileData.dateOfBirth,
        dob: profileData.dateOfBirth,
        gender: profileData.gender,
        mobile: profileData.mobile,
        address: profileData.address,
        city: profileData.city,
        pincode: profileData.pincode,
        profilePhoto: profileData.profilePhoto,
        avatar: profileData.profilePhoto,
      },
    }
  );
  console.log('Synced to AdminUser');

  await User.updateMany(
    { email: 'admin@gmail.com' },
    {
      $set: {
        fullName: profileData.fullName,
        name: profileData.fullName,
        dateOfBirth: profileData.dateOfBirth,
        dob: profileData.dateOfBirth,
        gender: profileData.gender,
        mobile: profileData.mobile,
        address: profileData.address,
        city: profileData.city,
        pincode: profileData.pincode,
        profilePhoto: profileData.profilePhoto,
        avatar: profileData.profilePhoto,
      },
    }
  );
  console.log('Synced to User');

  await mongoose.disconnect();
  console.log('Seed completed successfully!');
}

seedAdminProfile().catch((err) => {
  console.error('Seed error:', err);
  process.exit(1);
});
