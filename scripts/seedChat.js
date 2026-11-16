import { connectDB } from '../src/config/db.js';
import { db, FieldValue } from '../config/firebase.js';
import { Chat } from '../src/models/Chat.js';
import { Member } from '../src/models/Member.js';
import { AdminUser } from '../src/models/AdminUser.js';

const seedChats = async () => {
  try {
    console.log('🔄 Connecting to MongoDB and Firebase...');
    await connectDB();

    const admin = {
      id: '12',
      name: 'Yash Soni',
      email: 'yashranpura3@gmail.com',
      role: 'admin',
      avatar: '/uploads/yash-image-1793436873733.jpeg',
    };

    const member1 = {
      memberId: '43',
      name: 'Yash Ranpura',
      email: 'yashranpura3@gmail.com',
      role: 'member',
      avatar: '/uploads/yash-passportsize-1793775598420.jpeg',
    };

    const member2 = {
      memberId: '44',
      name: 'Sanket Narwade',
      email: 'sanket@gmail.com',
      role: 'member',
      avatar: null,
    };

    const member3 = {
      memberId: '49',
      name: 'Darshan Patel',
      email: 'darshan@gmail.com',
      role: 'member',
      avatar: null,
    };

    const conversations = [
      {
        id: 1,
        directKey: 'direct_12_43',
        type: 'direct',
        participants: ['12', '43'],
        participantDetails: {
          '12': admin,
          member: member1,
        },
        unreadCounts: {
          '12': 0,
          '43': 0,
        },
        createdAt: '16-11-2026 11:20 am',
        updatedAt: '16-11-2026 11:20 am',
        lastMessage: {
          id: 'msg_direct_12_43_4',
          conversationId: 1,
          text: 'Your digital ID card is already active in your portal. The physical card will be dispatched this week.',
          senderId: '12',
          senderName: 'Yash Soni',
          senderRole: 'admin',
          messageType: 'text',
          createdAt: '16-11-2026 11:20 am',
          member: member1,
        },
        messages: [
          {
            id: 'msg_direct_12_43_1',
            conversationId: 1,
            senderId: '43',
            senderName: 'Yash Ranpura',
            senderAvatar: null,
            receiverId: '12',
            text: 'Hello Admin, I have submitted my membership renewal documents. Please verify.',
            mediaUrl: null,
            messageType: 'text',
            isRead: true,
            createdAt: '16-11-2026 11:20 am',
            senderRole: 'member',
            member: member1,
          },
          {
            id: 'msg_direct_12_43_2',
            conversationId: 1,
            senderId: '12',
            senderName: 'Yash Soni',
            senderAvatar: null,
            receiverId: '43',
            text: 'Hello Yash Ranpura, we received your documents. Your membership JBAD193 has been verified and approved.',
            mediaUrl: null,
            messageType: 'text',
            isRead: true,
            createdAt: '16-11-2026 11:20 am',
            senderRole: 'admin',
            member: member1,
          },
          {
            id: 'msg_direct_12_43_3',
            conversationId: 1,
            senderId: '43',
            senderName: 'Yash Ranpura',
            senderAvatar: null,
            receiverId: '12',
            text: 'Thank you so much! When will the new ID card be issued?',
            mediaUrl: null,
            messageType: 'text',
            isRead: true,
            createdAt: '16-11-2026 11:20 am',
            senderRole: 'member',
            member: member1,
          },
          {
            id: 'msg_direct_12_43_4',
            conversationId: 1,
            senderId: '12',
            senderName: 'Yash Soni',
            senderAvatar: null,
            receiverId: '43',
            text: 'Your digital ID card is already active in your portal. The physical card will be dispatched this week.',
            mediaUrl: null,
            messageType: 'text',
            isRead: true,
            createdAt: '16-11-2026 11:20 am',
            senderRole: 'admin',
            member: member1,
          },
        ],
      },
      {
        id: 2,
        directKey: 'direct_12_44',
        type: 'direct',
        participants: ['12', '44'],
        participantDetails: {
          '12': admin,
          member: member2,
        },
        unreadCounts: {
          '12': 0,
          '44': 0,
        },
        createdAt: '16-11-2026 10:30 am',
        updatedAt: '16-11-2026 10:30 am',
        lastMessage: {
          id: 'msg_direct_12_44_3',
          conversationId: 2,
          text: 'Great, booking our exhibition stall right away. Thanks for the quick update!',
          senderId: '44',
          senderName: 'Sanket Narwade',
          senderRole: 'member',
          messageType: 'text',
          createdAt: '16-11-2026 10:30 am',
          member: member2,
        },
        messages: [
          {
            id: 'msg_direct_12_44_1',
            conversationId: 2,
            senderId: '44',
            senderName: 'Sanket Narwade',
            senderAvatar: null,
            receiverId: '12',
            text: 'Good morning! Are there any stall passes still available for the upcoming Jewellery Expo 2026?',
            mediaUrl: null,
            messageType: 'text',
            isRead: true,
            createdAt: '16-11-2026 10:15 am',
            senderRole: 'member',
            member: member2,
          },
          {
            id: 'msg_direct_12_44_2',
            conversationId: 2,
            senderId: '12',
            senderName: 'Yash Soni',
            senderAvatar: null,
            receiverId: '44',
            text: 'Good morning Sanket. Yes, stall registration is active under the Events tab. You can register directly.',
            mediaUrl: null,
            messageType: 'text',
            isRead: true,
            createdAt: '16-11-2026 10:25 am',
            senderRole: 'admin',
            member: member2,
          },
          {
            id: 'msg_direct_12_44_3',
            conversationId: 2,
            senderId: '44',
            senderName: 'Sanket Narwade',
            senderAvatar: null,
            receiverId: '12',
            text: 'Great, booking our exhibition stall right away. Thanks for the quick update!',
            mediaUrl: null,
            messageType: 'text',
            isRead: true,
            createdAt: '16-11-2026 10:30 am',
            senderRole: 'member',
            member: member2,
          },
        ],
      },
      {
        id: 3,
        directKey: 'direct_12_49',
        type: 'direct',
        participants: ['12', '49'],
        participantDetails: {
          '12': admin,
          member: member3,
        },
        unreadCounts: {
          '12': 0,
          '49': 0,
        },
        createdAt: '16-11-2026 11:05 am',
        updatedAt: '16-11-2026 11:05 am',
        lastMessage: {
          id: 'msg_direct_12_49_2',
          conversationId: 3,
          text: 'Noted Admin. I will review the agenda items and attend on time.',
          senderId: '49',
          senderName: 'Darshan Patel',
          senderRole: 'member',
          messageType: 'text',
          createdAt: '16-11-2026 11:05 am',
          member: member3,
        },
        messages: [
          {
            id: 'msg_direct_12_49_1',
            conversationId: 3,
            senderId: '12',
            senderName: 'Yash Soni',
            senderAvatar: null,
            receiverId: '49',
            text: 'Hello Darshan, this is a reminder regarding the Committee General Meeting this Friday at 4:00 PM.',
            mediaUrl: null,
            messageType: 'text',
            isRead: true,
            createdAt: '16-11-2026 10:55 am',
            senderRole: 'admin',
            member: member3,
          },
          {
            id: 'msg_direct_12_49_2',
            conversationId: 3,
            senderId: '49',
            senderName: 'Darshan Patel',
            senderAvatar: null,
            receiverId: '12',
            text: 'Noted Admin. I will review the agenda items and attend on time.',
            mediaUrl: null,
            messageType: 'text',
            isRead: true,
            createdAt: '16-11-2026 11:05 am',
            senderRole: 'member',
            member: member3,
          },
        ],
      },
    ];

    console.log(`💬 Seeding ${conversations.length} exact conversations into MongoDB and Firebase...`);

    for (const c of conversations) {
      // 1. Save in MongoDB
      await Chat.findOneAndUpdate(
        { id: c.id },
        c,
        { upsert: true, returnDocument: 'after' }
      );
      // Also upsert by directKey if needed
      await Chat.findOneAndUpdate(
        { directKey: c.directKey },
        c,
        { upsert: true, returnDocument: 'after' }
      );
      console.log(`✅ MongoDB: Saved conversation ID ${c.id} (${c.directKey}) with ${c.messages.length} messages.`);

      // 2. Save in Firebase Firestore
      try {
        const convRef = db.collection('conversations').doc(String(c.id));
        await convRef.set({
          id: c.id,
          directKey: c.directKey,
          type: c.type,
          participants: c.participants,
          participantDetails: c.participantDetails,
          lastMessage: c.lastMessage,
          unreadCounts: c.unreadCounts,
          createdAt: c.createdAt,
          updatedAt: c.updatedAt,
        });

        for (const m of c.messages) {
          await convRef.collection('messages').doc(m.id).set(m);
        }

        // Also duplicate to directKey doc for fallback
        const directRef = db.collection('conversations').doc(c.directKey);
        await directRef.set({
          id: c.id,
          directKey: c.directKey,
          type: c.type,
          participants: c.participants,
          participantDetails: c.participantDetails,
          lastMessage: c.lastMessage,
          unreadCounts: c.unreadCounts,
          createdAt: c.createdAt,
          updatedAt: c.updatedAt,
        });
        for (const m of c.messages) {
          await directRef.collection('messages').doc(m.id).set(m);
        }

        console.log(`🔥 Firebase: Saved conversation ID ${c.id} (${c.directKey}) with ${c.messages.length} messages.`);
      } catch (fbErr) {
        console.warn(`⚠️ Firebase error for ${c.id}:`, fbErr.message);
      }
    }

    console.log('🎉 Seeding completed successfully!');
    process.exit(0);
  } catch (err) {
    console.error('❌ Error seeding chats:', err);
    process.exit(1);
  }
};

seedChats();
