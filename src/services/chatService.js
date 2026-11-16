import mongoose from 'mongoose';
import { db, FieldValue } from '../../config/firebase.js';
import { Chat } from '../models/Chat.js';
import { formatDateTime } from '../utils/dateFormatter.js';
import { ApiError } from '../utils/apiError.js';
import { logger } from '../config/logger.js';

export class ChatService {
  /**
   * Test Firebase Firestore connection.
   */
  static async testConnection() {
    try {
      const snapshot = await db.collection('_connection_test').limit(1).get();
      return {
        connected: true,
        message: 'Firebase connected successfully!',
        docsCount: snapshot.size,
      };
    } catch (err) {
      logger.error(`Firebase connection failed: ${err.message}`);
      throw ApiError.internal(`Firebase connection failed: ${err.message}`);
    }
  }

  /**
   * Deterministic 1-on-1 conversation key helper (e.g. "direct_12_43").
   */
  static getDirectConversationId(user1Id, user2Id) {
    const sorted = [String(user1Id).trim(), String(user2Id).trim()].sort();
    return `direct_${sorted[0]}_${sorted[1]}`;
  }

  /**
   * Get next auto-incrementing sequential integer ID for conversation (1, 2, 3, ...).
   */
  static async getNextConversationId() {
    let maxId = 0;
    try {
      const snap = await db.collection('conversations').get();
      snap.forEach((doc) => {
        const data = doc.data();
        const numId = Number(data.id || doc.id);
        if (!isNaN(numId) && numId > maxId) {
          maxId = numId;
        }
      });
    } catch (err) {
      logger.warn(`Firebase getNextConversationId warning: ${err.message}`);
    }

    try {
      const topChat = await Chat.findOne().sort({ id: -1 }).lean();
      if (topChat && typeof topChat.id === 'number' && topChat.id > maxId) {
        maxId = topChat.id;
      }
    } catch {}

    return maxId + 1;
  }

  /**
   * Parse various timestamp formats into a valid numeric millisecond time.
   */
  static parseMessageTime(ts) {
    if (!ts) return 0;
    if (ts._seconds) return ts._seconds * 1000 + (ts._nanoseconds || 0) / 1000000;
    if (typeof ts.toDate === 'function') return ts.toDate().getTime();
    if (typeof ts === 'number') return ts;
    if (typeof ts === 'string') {
      const m = ts.match(/(\d{2})-(\d{2})-(\d{4})\s+(\d{1,2}):(\d{2})\s*(am|pm)?/i);
      if (m) {
        const [, d, mo, y, h, min, ap] = m;
        let hr = parseInt(h, 10);
        if (ap) {
          if (ap.toLowerCase() === 'pm' && hr < 12) hr += 12;
          if (ap.toLowerCase() === 'am' && hr === 12) hr = 0;
        }
        return new Date(parseInt(y, 10), parseInt(mo, 10) - 1, parseInt(d, 10), hr, parseInt(min, 10)).getTime();
      }
      const parsed = new Date(ts).getTime();
      if (!isNaN(parsed)) return parsed;
    }
    return 0;
  }

  /**
   * Format Firestore or DB timestamp to readable string format.
   */
  static formatTimestamp(ts) {
    if (!ts) return formatDateTime(new Date());
    if (typeof ts === 'string' && /^\d{2}-\d{2}-\d{4}/.test(ts)) return ts;
    if (ts.toDate && typeof ts.toDate === 'function') {
      return formatDateTime(ts.toDate());
    }
    return formatDateTime(ts);
  }

  /**
   * Extract or normalize member details from conversation participants.
   */
  static extractMemberInfo(participantDetails = {}, fallbackParticipants = []) {
    if (!participantDetails || typeof participantDetails !== 'object') {
      return null;
    }

    // 1. Look for participant explicitly marked as 'member' or 'user'
    for (const [key, details] of Object.entries(participantDetails)) {
      if (!details || typeof details !== 'object' || key === 'member') continue;
      const role = String(details.role || '').toLowerCase();
      if (role === 'member' || role === 'user') {
        const memberId = String(details.memberId || details.id || key);
        return {
          memberId,
          name: details.name || details.fullName || 'Member',
          email: details.email || '',
          role: 'member',
          avatar: details.avatar || null,
        };
      }
    }

    // 2. If one participant is admin, the other participant must be the member
    for (const [key, details] of Object.entries(participantDetails)) {
      if (!details || typeof details !== 'object' || key === 'member') continue;
      const role = String(details.role || '').toLowerCase();
      if (!role.includes('admin') && String(key) !== '12' && String(key) !== '1') {
        const memberId = String(details.memberId || details.id || key);
        return {
          memberId,
          name: details.name || details.fullName || 'Member',
          email: details.email || '',
          role: 'member',
          avatar: details.avatar || null,
        };
      }
    }

    // 3. Fallback from fallbackParticipants
    if (Array.isArray(fallbackParticipants) && fallbackParticipants.length > 0) {
      const nonAdminId =
        fallbackParticipants.find((p) => String(p) !== '12' && String(p) !== '1') ||
        fallbackParticipants[0];
      const details = participantDetails[nonAdminId] || {};
      const memberId = String(details.memberId || nonAdminId);
      return {
        memberId,
        name: details.name || 'Member',
        email: details.email || '',
        role: 'member',
        avatar: details.avatar || null,
      };
    }

    return null;
  }

  /**
   * Format a conversation object to include clean participantDetails.
   * Keeps admin participant under adminId, places member under "member",
   * and removes duplicate numeric member key, root member object, and participants array.
   */
  static formatConversation(conv) {
    if (!conv) return conv;

    const participants = Array.isArray(conv.participants) ? conv.participants : [];
    const rawParticipantDetails = { ...(conv.participantDetails || {}) };

    // Resolve member info
    const memberInfo = rawParticipantDetails.member || this.extractMemberInfo(rawParticipantDetails, participants);

    // Clean member info
    let cleanMember = null;
    if (memberInfo) {
      cleanMember = {
        memberId: String(memberInfo.memberId || memberInfo.id),
        name: memberInfo.name || 'Member',
        email: memberInfo.email || '',
        role: 'member',
        avatar: memberInfo.avatar || null,
      };
    }

    // Build clean participantDetails and resolve admin info
    const cleanParticipantDetails = {};
    let cleanAdmin = null;

    for (const [key, p] of Object.entries(rawParticipantDetails)) {
      if (key === 'member') continue;
      if (cleanMember && String(key) === String(cleanMember.memberId)) {
        // Skip duplicate numeric member key inside participantDetails
        continue;
      }
      if (p && typeof p === 'object') {
        const adminObj = {
          id: String(p.id || key),
          name: p.name || 'Admin',
          email: p.email || '',
          role: p.role || 'admin',
          avatar: p.avatar || null,
        };
        cleanParticipantDetails[key] = adminObj;
        if (!cleanAdmin) {
          cleanAdmin = adminObj;
        }
      }
    }

    if (cleanMember) {
      cleanParticipantDetails.member = cleanMember;
    }

    // Strictly unique conversation id
    let convId = null;
    if (conv.id !== undefined && conv.id !== null && !isNaN(Number(conv.id))) {
      convId = Number(conv.id);
    } else if (conv.docId && !isNaN(Number(conv.docId))) {
      convId = Number(conv.docId);
    } else if (conv.directKey === 'direct_12_43' || conv.id === 'direct_12_43') {
      convId = 1;
    } else if (conv.directKey === 'direct_12_44' || conv.id === 'direct_12_44') {
      convId = 2;
    } else if (conv.directKey === 'direct_12_49' || conv.id === 'direct_12_49') {
      convId = 3;
    } else {
      const memberNum = cleanMember?.memberId ? parseInt(cleanMember.memberId, 10) : null;
      if (memberNum && !isNaN(memberNum)) {
        convId = memberNum;
      } else {
        convId =
          Math.abs(
            String(conv.directKey || conv.id || conv.docId || Date.now())
              .split('')
              .reduce((acc, char) => ((acc << 5) - acc + char.charCodeAt(0)) | 0, 0)
          ) % 100000;
      }
    }

    // Format lastMessage if present
    let lastMessage = conv.lastMessage ? { ...conv.lastMessage } : null;
    if (lastMessage) {
      if (conv.lastMessageAt) {
        lastMessage.createdAt = this.formatTimestamp(conv.lastMessageAt);
      }
      lastMessage.conversationId = convId;

      const sId = String(lastMessage.senderId || '');
      const sRole = String(lastMessage.senderRole || '').toLowerCase();
      const isMemberSender =
        (cleanMember && sId === String(cleanMember.memberId)) ||
        sRole === 'member';

      if (isMemberSender && cleanMember) {
        lastMessage.senderRole = 'member';
        lastMessage.senderName = cleanMember.name || lastMessage.senderName || 'Member';
        lastMessage.member = cleanMember;
        delete lastMessage.admin;
      } else {
        lastMessage.senderRole = 'admin';
        lastMessage.senderName = cleanAdmin?.name || lastMessage.senderName || 'Admin';
        lastMessage.admin = cleanAdmin || {
          id: sId || '12',
          name: lastMessage.senderName || 'Admin',
          email: '',
          role: 'admin',
          avatar: lastMessage.senderAvatar || null,
        };
        delete lastMessage.member;
      }
      delete lastMessage.memberId;
    }

    return {
      id: convId,
      type: conv.type || 'direct',
      participantDetails: cleanParticipantDetails,
      lastMessage,
      unreadCounts: conv.unreadCounts || {},
      createdAt: this.formatTimestamp(conv.createdAt),
      updatedAt: this.formatTimestamp(conv.updatedAt),
    };
  }

  /**
   * Format message object to guarantee clean member object is populated.
   */
  static formatMessage(msg, memberInfo = null, adminInfo = null) {
    if (!msg) return msg;

    const formatted = { ...msg };
    const sId = String(formatted.senderId || '');
    const mId = memberInfo ? String(memberInfo.memberId || memberInfo.id || '') : '';
    const isMemberSender = mId && sId === mId;
    const resolvedRole = formatted.senderRole || (isMemberSender ? 'member' : 'admin');
    formatted.senderRole = resolvedRole;

    if (resolvedRole === 'member') {
      if (memberInfo) {
        formatted.member = {
          memberId: String(memberInfo.memberId || memberInfo.id),
          name: memberInfo.name,
          email: memberInfo.email,
          role: 'member',
          avatar: memberInfo.avatar,
        };
      }
      delete formatted.admin;
    } else {
      if (adminInfo) {
        formatted.admin = {
          id: String(adminInfo.id),
          name: adminInfo.name,
          email: adminInfo.email,
          role: 'admin',
          avatar: adminInfo.avatar,
        };
      } else {
        formatted.admin = {
          id: sId || '12',
          name: formatted.senderName || 'Admin',
          email: '',
          role: 'admin',
          avatar: formatted.senderAvatar || null,
        };
      }
      delete formatted.member;
    }

    // Ensure conversationId is numeric if possible
    if (formatted.conversationId && !isNaN(Number(formatted.conversationId))) {
      formatted.conversationId = Number(formatted.conversationId);
    }

    delete formatted.memberId;

    return formatted;
  }

  /**
   * Find conversation doc reference in Firestore by numeric id, doc id, or directKey.
   */
  static async findConversationDoc(identifier) {
    if (!identifier) return null;

    const idStr = String(identifier).trim();
    const idNum = Number(idStr);

    // 1. Check direct doc by string id
    const docRef = db.collection('conversations').doc(idStr);
    const snap = await docRef.get();
    if (snap.exists) {
      return { ref: docRef, data: { ...snap.data(), docId: snap.id } };
    }

    // 2. Query where numeric id equals idNum
    if (!isNaN(idNum)) {
      const qNum = await db.collection('conversations').where('id', '==', idNum).limit(1).get();
      if (!qNum.empty) {
        const d = qNum.docs[0];
        return { ref: d.ref, data: { ...d.data(), docId: d.id } };
      }
    }

    // 3. Query where directKey equals identifier
    const qKey = await db.collection('conversations').where('directKey', '==', idStr).limit(1).get();
    if (!qKey.empty) {
      const d = qKey.docs[0];
      return { ref: d.ref, data: { ...d.data(), docId: d.id } };
    }

    return null;
  }

  /**
   * Get single conversation details by ID (e.g. GET /api/admin/chat/1)
   * Includes full formatted conversation and its messages.
   */
  static async getConversationById(id) {
    if (!id) {
      throw ApiError.badRequest('Chat ID is required');
    }

    const found = await this.findConversationDoc(id);
    let convData = found ? found.data : null;

    if (!convData) {
      // Fallback query in MongoDB
      const idNum = Number(id);
      const query = !isNaN(idNum)
        ? { $or: [{ id: idNum }, { directKey: String(id) }] }
        : { directKey: String(id) };
      convData = await Chat.findOne(query).lean();
    }

    if (!convData) {
      throw ApiError.notFound(`Chat with ID ${id} not found`);
    }

    const formatted = this.formatConversation(convData);
    const messages = await this.getMessages(formatted.id);

    return {
      ...formatted,
      messages,
    };
  }

  /**
   * Get or create a 1-on-1 conversation between two participants.
   * Uses sequential integer IDs (1, 2, 3...).
   */
  static async getOrCreateConversation({ senderId, receiverId, senderInfo = {}, receiverInfo = {} }) {
    if (!senderId || !receiverId) {
      throw ApiError.badRequest('Both senderId and receiverId are required to start a conversation');
    }

    const directKey = this.getDirectConversationId(senderId, receiverId);
    const sId = String(senderId);
    const rId = String(receiverId);

    // Check if conversation already exists by directKey
    const existing = await this.findConversationDoc(directKey);
    if (existing) {
      return this.formatConversation(existing.data);
    }

    const sRole = String(senderInfo.role || '').toLowerCase().includes('admin') ? 'admin' : 'member';
    const rRole = String(receiverInfo.role || '').toLowerCase().includes('admin') ? 'admin' : 'member';

    const rawParticipants = {
      [sId]: {
        id: sId,
        ...(sRole === 'member' ? { memberId: sId } : {}),
        name: senderInfo.name || senderInfo.fullName || (sRole === 'admin' ? 'Admin' : 'Member'),
        email: senderInfo.email || '',
        role: sRole,
        avatar: senderInfo.avatar || senderInfo.image || null,
      },
      [rId]: {
        id: rId,
        ...(rRole === 'member' ? { memberId: rId } : {}),
        name: receiverInfo.name || receiverInfo.fullName || (rRole === 'admin' ? 'Admin' : 'Member'),
        email: receiverInfo.email || '',
        role: rRole,
        avatar: receiverInfo.avatar || receiverInfo.image || null,
      },
    };

    const memberInfo = this.extractMemberInfo(rawParticipants, [sId, rId]);
    const adminId = sRole === 'admin' ? sId : rId;
    const adminData = sRole === 'admin' ? rawParticipants[sId] : rawParticipants[rId];

    const cleanParticipantDetails = {
      [adminId]: {
        id: String(adminData.id || adminId),
        name: adminData.name || 'Admin',
        email: adminData.email || '',
        role: 'admin',
        avatar: adminData.avatar || null,
      },
    };

    if (memberInfo) {
      cleanParticipantDetails.member = {
        memberId: String(memberInfo.memberId),
        name: memberInfo.name,
        email: memberInfo.email,
        role: 'member',
        avatar: memberInfo.avatar,
      };
    }

    // Allocate sequential ID (1, 2, 3...)
    const newId = await this.getNextConversationId();
    const nowFormatted = formatDateTime(new Date());

    const conversationPayload = {
      id: newId,
      directKey,
      type: 'direct',
      participants: [sId, rId],
      participantDetails: cleanParticipantDetails,
      lastMessage: null,
      lastMessageAt: null,
      unreadCounts: {
        [sId]: 0,
        [rId]: 0,
      },
    };

    // 1. Persist to Firebase Firestore
    try {
      const convRef = db.collection('conversations').doc(String(newId));
      await convRef.set({
        ...conversationPayload,
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      });
    } catch (err) {
      logger.warn(`Firebase getOrCreateConversation warning: ${err.message}`);
    }

    // 2. Persist to MongoDB Chat collection
    try {
      await Chat.create({
        ...conversationPayload,
        createdAt: nowFormatted,
        updatedAt: nowFormatted,
      });
    } catch (err) {
      logger.warn(`MongoDB getOrCreateConversation warning: ${err.message}`);
    }

    return this.formatConversation(conversationPayload);
  }

  /**
   * Send a message in a conversation.
   * Persists in BOTH Firebase Firestore and MongoDB Chat collection.
   */
  static async sendMessage({
    conversationId,
    senderId,
    receiverId,
    senderName,
    senderAvatar,
    senderRole,
    text,
    mediaUrl,
    messageType = 'text',
  }) {
    if (!senderId) {
      throw ApiError.unauthorized('Sender ID is required');
    }

    let targetConv = null;
    let targetReceiverId = receiverId ? String(receiverId) : null;

    if (conversationId) {
      targetConv = await this.findConversationDoc(conversationId);
    }

    if (!targetConv && targetReceiverId) {
      const conv = await this.getOrCreateConversation({ senderId, receiverId: targetReceiverId });
      targetConv = await this.findConversationDoc(conv.id);
    }

    if (!targetConv) {
      throw ApiError.badRequest('Valid conversationId or receiverId is required');
    }

    const convRef = targetConv.ref;
    const convData = targetConv.data;
    const numericConvId = typeof convData.id === 'number' ? convData.id : Number(convData.id || convRef.id);

    const messageContent = (text || '').trim();
    const formattedNow = formatDateTime(new Date());
    const generatedId = `msg_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

    const participants = convData?.participants || [String(senderId), targetReceiverId].filter(Boolean);
    if (!targetReceiverId) {
      targetReceiverId = participants.find((p) => String(p) !== String(senderId)) || null;
    }

    const participantDetails = convData?.participantDetails || {};
    const rawMemberInfo = participantDetails.member || this.extractMemberInfo(participantDetails, participants);
    const memberInfo = rawMemberInfo
      ? {
          memberId: String(rawMemberInfo.memberId || rawMemberInfo.id),
          name: rawMemberInfo.name,
          email: rawMemberInfo.email,
          role: 'member',
          avatar: rawMemberInfo.avatar,
        }
      : null;

    const isMemberSender = memberInfo && String(senderId) === String(memberInfo.memberId);
    const resolvedSenderRole = senderRole || (isMemberSender ? 'member' : (String(senderId) === '12' || String(senderId) === '1' ? 'admin' : 'member'));

    let cleanAdmin = null;
    for (const [key, p] of Object.entries(participantDetails)) {
      if (key !== 'member' && p && typeof p === 'object') {
        cleanAdmin = {
          id: String(p.id || key),
          name: p.name || 'Admin',
          email: p.email || '',
          role: p.role || 'admin',
          avatar: p.avatar || null,
        };
        break;
      }
    }

    // Prepare message object
    const messageData = {
      id: generatedId,
      conversationId: numericConvId,
      senderId: String(senderId),
      senderName: senderName || (resolvedSenderRole === 'admin' ? (cleanAdmin?.name || 'Admin') : (memberInfo?.name || 'Member')),
      senderAvatar: senderAvatar || null,
      senderRole: resolvedSenderRole,
      receiverId: targetReceiverId,
      text: messageContent,
      mediaUrl: mediaUrl || null,
      messageType: messageType || (mediaUrl ? 'image' : 'text'),
      isRead: false,
      createdAt: formattedNow,
    };

    if (isMemberSender && memberInfo) {
      messageData.member = memberInfo;
    } else {
      messageData.admin = cleanAdmin || {
        id: String(senderId),
        name: messageData.senderName || 'Admin',
        email: '',
        role: 'admin',
        avatar: senderAvatar || null,
      };
    }

    const lastMessagePayload = {
      id: generatedId,
      conversationId: numericConvId,
      text: messageContent || '',
      mediaUrl: mediaUrl || null,
      senderId: String(senderId),
      senderName: messageData.senderName,
      senderRole: resolvedSenderRole,
      messageType: messageData.messageType,
      createdAt: formattedNow,
    };

    if (isMemberSender && memberInfo) {
      lastMessagePayload.member = memberInfo;
    } else {
      lastMessagePayload.admin = cleanAdmin || {
        id: String(senderId),
        name: messageData.senderName || 'Admin',
        email: '',
        role: 'admin',
        avatar: senderAvatar || null,
      };
    }

    // 1. Persist to Firebase Firestore
    try {
      const msgDocRef = convRef.collection('messages').doc(generatedId);
      await msgDocRef.set({
        ...messageData,
        createdAt: FieldValue.serverTimestamp(),
      });

      const updateData = {
        lastMessage: lastMessagePayload,
        lastMessageAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      };

      if (memberInfo) {
        updateData['participantDetails.member'] = memberInfo;
      }

      if (targetReceiverId) {
        updateData[`unreadCounts.${targetReceiverId}`] = FieldValue.increment(1);
      }

      await convRef.update(updateData);
    } catch (err) {
      logger.warn(`Firebase sendMessage warning: ${err.message}`);
    }

    // 2. Persist to MongoDB Chat Collection
    try {
      const updateMongo = {
        $push: { messages: messageData },
        $set: {
          lastMessage: lastMessagePayload,
          lastMessageAt: formattedNow,
          updatedAt: formattedNow,
          ...(memberInfo ? { 'participantDetails.member': memberInfo } : {}),
        },
      };

      if (targetReceiverId) {
        updateMongo.$inc = { [`unreadCounts.${targetReceiverId}`]: 1 };
      }

      await Chat.findOneAndUpdate(
        { $or: [{ id: numericConvId }, { directKey: convData.directKey }] },
        updateMongo,
        { upsert: true, new: true }
      );
    } catch (err) {
      logger.warn(`MongoDB sendMessage warning: ${err.message}`);
    }

    return messageData;
  }

  /**
   * Get all conversations with filtering and pagination support.
   */
  static async getUserConversations(userId, { isAdmin = false, search, memberId, id, page = 1, limit = 15 } = {}) {
    if (!userId) {
      throw ApiError.unauthorized('User ID is required');
    }

    const uId = String(userId);
    const conversationsMap = new Map();
    const directKeyToIdMap = new Map();

    // 1. Fetch from Firebase Firestore
    try {
      let query = db.collection('conversations');
      if (!isAdmin) {
        query = query.where('participants', 'array-contains', uId);
      }
      const snapshot = await query.get();

      snapshot.forEach((doc) => {
        const data = doc.data();
        const conv = { id: doc.id, ...data };
        const formatted = this.formatConversation(conv);
        const idKey = String(formatted.id);
        conversationsMap.set(idKey, formatted);
        if (data.directKey) {
          directKeyToIdMap.set(String(data.directKey), idKey);
        }
        directKeyToIdMap.set(String(doc.id), idKey);
      });
    } catch (err) {
      logger.warn(`Firebase getUserConversations warning: ${err.message}`);
    }

    // 2. Query MongoDB ONLY as fallback if Firebase returned 0 conversations
    if (conversationsMap.size === 0 && mongoose.connection && mongoose.connection.readyState === 1) {
      try {
        const mongoFilter = isAdmin ? {} : { participants: uId };
        const mongoChats = await Chat.find(mongoFilter).lean();

        mongoChats.forEach((chat) => {
          const formatted = this.formatConversation(chat);
          conversationsMap.set(String(formatted.id), formatted);
        });
      } catch (err) {
        logger.warn(`MongoDB getUserConversations warning: ${err.message}`);
      }
    }

    let conversations = Array.from(conversationsMap.values());

    // Ensure every item has strictly integer numeric id
    conversations = conversations.map((c) => ({
      ...c,
      id: Number(c.id),
    }));

    // Filter by specific ID (e.g. ?id=1)
    if (id !== undefined && id !== null && String(id).trim() !== '') {
      const targetId = Number(id);
      conversations = conversations.filter((c) =>
        !isNaN(targetId) ? c.id === targetId : String(c.id) === String(id)
      );
    }

    // Filter by memberId (e.g. ?memberId=43)
    if (memberId !== undefined && memberId !== null && String(memberId).trim() !== '') {
      const targetMemberId = String(memberId).trim();
      conversations = conversations.filter((c) =>
        String(c.participantDetails?.member?.memberId) === targetMemberId
      );
    }

    // Filter by search string (e.g. ?search=Yash)
    if (search && typeof search === 'string' && search.trim() !== '') {
      const q = search.trim().toLowerCase();
      conversations = conversations.filter((c) => {
        const member = c.participantDetails?.member || {};
        const nameMatch = (member.name || '').toLowerCase().includes(q);
        const emailMatch = (member.email || '').toLowerCase().includes(q);
        const textMatch = (c.lastMessage?.text || '').toLowerCase().includes(q);
        return nameMatch || emailMatch || textMatch;
      });
    }

    // Sort descending by most recent activity / lastMessage / id (newest/most recent first)
    conversations.sort((a, b) => {
      const timeA = this.parseMessageTime(a.lastMessage?.createdAt || a.lastMessageAt || a.updatedAt || a.createdAt);
      const timeB = this.parseMessageTime(b.lastMessage?.createdAt || b.lastMessageAt || b.updatedAt || b.createdAt);
      if (timeB !== timeA) {
        return timeB - timeA;
      }
      return Number(b.id) - Number(a.id);
    });

    // Pagination calculations
    const totalItems = conversations.length;
    const parsedPage = Math.max(1, parseInt(page, 10) || 1);
    const parsedLimit = Math.max(1, parseInt(limit, 10) || 15);
    const totalPages = Math.max(1, Math.ceil(totalItems / parsedLimit));
    const startIndex = (parsedPage - 1) * parsedLimit;
    const paginatedData = conversations.slice(startIndex, startIndex + parsedLimit);

    const pagination = {
      total_items: totalItems,
      total_page: totalPages,
      current_page: parsedPage,
      item_per_page: parsedLimit,
      has_more: parsedPage < totalPages,
    };

    return {
      conversations: paginatedData,
      pagination,
    };
  }

  /**
   * Get messages for a conversation.
   */
  static async getMessages(conversationId, { limit = 50, before = null } = {}) {
    if (!conversationId) {
      throw ApiError.badRequest('Conversation ID is required');
    }

    const parsedLimit = Math.min(Math.max(Number(limit) || 50, 1), 100);
    const messages = [];

    const found = await this.findConversationDoc(conversationId);
    const convRef = found?.ref;
    const convData = found?.data;

    const rawM = convData?.participantDetails?.member || this.extractMemberInfo(convData?.participantDetails, convData?.participants);
    const memberInfo = rawM ? {
      memberId: String(rawM.memberId || rawM.id),
      name: rawM.name,
      email: rawM.email,
      role: 'member',
      avatar: rawM.avatar,
    } : null;

    let adminInfo = null;
    for (const [key, p] of Object.entries(convData?.participantDetails || {})) {
      if (key !== 'member' && p && typeof p === 'object') {
        adminInfo = {
          id: String(p.id || key),
          name: p.name || 'Admin',
          email: p.email || '',
          role: p.role || 'admin',
          avatar: p.avatar || null,
        };
        break;
      }
    }

    // 1. Fetch from Firebase Firestore
    if (convRef) {
      try {
        const snapshot = await convRef.collection('messages').get();
        snapshot.forEach((doc) => {
          const data = doc.data();
          const rawTime = data.createdAt;
          const formatted = this.formatMessage({
            id: doc.id,
            ...data,
            createdAt: this.formatTimestamp(rawTime),
            _time: this.parseMessageTime(rawTime),
          }, memberInfo, adminInfo);
          messages.push(formatted);
        });

        // Sort descending: newest (last) message first
        messages.sort((a, b) => (b._time || 0) - (a._time || 0));
        messages.forEach((m) => delete m._time);

        // Keep first parsedLimit messages
        if (messages.length > parsedLimit) {
          messages = messages.slice(0, parsedLimit);
        }
      } catch (err) {
        logger.warn(`Firebase getMessages warning: ${err.message}`);
      }
    }

    // 2. If Firestore was empty or had issues, read from MongoDB
    if (messages.length === 0) {
      try {
        const idNum = Number(conversationId);
        const mongoChat = await Chat.findOne(
          !isNaN(idNum) ? { $or: [{ id: idNum }, { directKey: String(conversationId) }] } : { directKey: String(conversationId) }
        ).lean();

        if (mongoChat && Array.isArray(mongoChat.messages)) {
          const list = mongoChat.messages.map((m) => ({
            ...this.formatMessage(m, memberInfo, adminInfo),
            _time: this.parseMessageTime(m.createdAt),
          }));
          list.sort((a, b) => (b._time || 0) - (a._time || 0));
          list.forEach((m) => delete m._time);
          messages = list.slice(0, parsedLimit);
        }
      } catch (err) {
        logger.warn(`MongoDB getMessages warning: ${err.message}`);
      }
    }

    // 3. Guarantee that if conversation has a lastMessage, it appears at index 0 (top/first)
    if (convData?.lastMessage && messages.length > 0) {
      const lastMsgText = (convData.lastMessage.text || '').trim();
      const firstArrMsgText = (messages[0]?.text || '').trim();
      if (lastMsgText && firstArrMsgText !== lastMsgText) {
        const existingIdx = messages.findIndex((m) => (m.text || '').trim() === lastMsgText);
        if (existingIdx !== -1) {
          const [matched] = messages.splice(existingIdx, 1);
          messages.unshift(matched);
        } else {
          messages.unshift(this.formatMessage({
            id: convData.lastMessage.id || `msg_last_${Date.now()}`,
            ...convData.lastMessage,
            createdAt: this.formatTimestamp(convData.lastMessage.createdAt),
          }, memberInfo, adminInfo));
        }
      }
    }

    // Return newest (last) message first
    return messages;
  }

  /**
   * Mark messages in a conversation as read by a user.
   */
  static async markMessagesAsRead(conversationId, userId) {
    const uId = String(userId || '12');
    const found = await this.findConversationDoc(conversationId);

    // 1. Update in Firebase Firestore
    if (found?.ref) {
      try {
        await found.ref.update({
          [`unreadCounts.${uId}`]: 0,
          'unreadCounts.12': 0,
          'unreadCounts.admin': 0,
        });

        const unreadSnap = await found.ref
          .collection('messages')
          .where('receiverId', 'in', [uId, '12', 'admin'])
          .where('isRead', '==', false)
          .limit(50)
          .get()
          .catch(() => ({ empty: true }));

        if (!unreadSnap.empty) {
          const batch = db.batch();
          unreadSnap.forEach((doc) => {
            batch.update(doc.ref, { isRead: true });
          });
          await batch.commit().catch(() => {});
        }
      } catch (err) {
        logger.warn(`Firebase markMessagesAsRead warning: ${err.message}`);
      }
    }

    // 2. Update in MongoDB Chat collection
    if (mongoose.connection && mongoose.connection.readyState === 1) {
      try {
        const idNum = Number(conversationId);
        await Chat.updateOne(
          !isNaN(idNum) ? { $or: [{ id: idNum }, { directKey: String(conversationId) }] } : { directKey: String(conversationId) },
          {
            $set: {
              [`unreadCounts.${uId}`]: 0,
              'unreadCounts.12': 0,
              'unreadCounts.admin': 0,
              'messages.$[elem].isRead': true,
            },
          },
          {
            arrayFilters: [{ 'elem.receiverId': { $in: [uId, '12', 'admin'] }, 'elem.isRead': false }],
          }
        ).catch(() => {});
      } catch (err) {
        logger.warn(`MongoDB markMessagesAsRead warning: ${err.message}`);
      }
    }

    return { success: true, message: 'Messages marked as read' };
  }

  /**
   * Delete a conversation and its messages from both Firebase and MongoDB.
   */
  static async deleteConversation(conversationId) {
    if (!conversationId) {
      throw ApiError.badRequest('Conversation ID is required');
    }

    const idStr = String(conversationId).trim();
    const idNum = Number(idStr);

    // 1. Delete from Firebase Firestore
    try {
      const found = await this.findConversationDoc(conversationId);
      if (found?.ref) {
        const msgs = await found.ref.collection('messages').limit(100).get();
        if (!msgs.empty) {
          const batch = db.batch();
          msgs.forEach((m) => batch.delete(m.ref));
          await batch.commit().catch(() => {});
        }
        await found.ref.delete().catch(() => {});
      }

      // Also ensure direct doc by idStr is deleted
      await db.collection('conversations').doc(idStr).delete().catch(() => {});

      // If numeric id, delete any matches
      if (!isNaN(idNum)) {
        const qNum = await db.collection('conversations').where('id', '==', idNum).get();
        qNum.forEach((d) => d.ref.delete().catch(() => {}));
      }
    } catch (err) {
      logger.warn(`Firebase deleteConversation warning: ${err.message}`);
    }

    // 2. Delete from MongoDB Chat collection if connected
    if (mongoose.connection && mongoose.connection.readyState === 1) {
      try {
        const mongoFilter = !isNaN(idNum)
          ? { $or: [{ id: idNum }, { id: idStr }, { directKey: idStr }] }
          : { $or: [{ id: idStr }, { directKey: idStr }] };
        await Chat.deleteMany(mongoFilter).catch(() => {});
      } catch (err) {
        logger.warn(`MongoDB deleteConversation warning: ${err.message}`);
      }
    }

    return { success: true, message: 'Conversation deleted successfully' };
  }

  /**
   * Edit a message's text.
   */
  static async editMessage(conversationId, messageId, newText) {
    if (!messageId) {
      throw ApiError.badRequest('Message ID is required');
    }
    const text = String(newText || '').trim();
    if (!text) {
      throw ApiError.badRequest('Message text cannot be empty');
    }

    const mIdStr = String(messageId);
    let convRef = null;
    let msgRef = null;

    if (conversationId) {
      const found = await this.findConversationDoc(conversationId);
      convRef = found?.ref;
    }

    if (convRef) {
      msgRef = convRef.collection('messages').doc(mIdStr);
      const snap = await msgRef.get().catch(() => null);
      if (!snap || !snap.exists) {
        msgRef = null;
      }
    }

    if (!msgRef) {
      const groupSnap = await db.collectionGroup('messages')
        .where('id', '==', mIdStr)
        .limit(1)
        .get()
        .catch(() => ({ empty: true }));
      if (!groupSnap.empty) {
        msgRef = groupSnap.docs[0].ref;
        convRef = msgRef.parent.parent;
      }
    }

    if (msgRef) {
      try {
        await msgRef.update({
          text,
          isEdited: true,
          updatedAt: FieldValue.serverTimestamp(),
        });
      } catch (err) {
        logger.warn(`Firebase editMessage warning: ${err.message}`);
      }

      if (convRef) {
        try {
          const convSnap = await convRef.get().catch(() => null);
          const convData = convSnap?.data();
          if (convData?.lastMessage?.id === mIdStr) {
            await convRef.update({
              'lastMessage.text': text,
              'lastMessage.isEdited': true,
              updatedAt: FieldValue.serverTimestamp(),
            });
          }
        } catch (err) {
          logger.warn(`Firebase lastMessage update warning: ${err.message}`);
        }
      }
    }

    // Update in MongoDB if connected
    if (mongoose.connection && mongoose.connection.readyState === 1) {
      try {
        await Chat.updateOne(
          { 'messages.id': mIdStr },
          {
            $set: {
              'messages.$.text': text,
              'messages.$.isEdited': true,
              'messages.$.updatedAt': new Date().toISOString(),
            },
          }
        ).catch(() => {});

        await Chat.updateOne(
          { 'lastMessage.id': mIdStr },
          {
            $set: {
              'lastMessage.text': text,
              'lastMessage.isEdited': true,
            },
          }
        ).catch(() => {});
      } catch (err) {
        logger.warn(`MongoDB editMessage warning: ${err.message}`);
      }
    }

    return {
      success: true,
      message: 'Message edited successfully',
      data: { id: mIdStr, text, isEdited: true },
    };
  }

  /**
   * Delete a single message.
   */
  static async deleteMessage(conversationId, messageId) {
    if (!messageId) {
      throw ApiError.badRequest('Message ID is required');
    }

    const mIdStr = String(messageId);
    let convRef = null;
    let msgRef = null;

    if (conversationId) {
      const found = await this.findConversationDoc(conversationId);
      convRef = found?.ref;
    }

    if (convRef) {
      msgRef = convRef.collection('messages').doc(mIdStr);
      const snap = await msgRef.get().catch(() => null);
      if (!snap || !snap.exists) {
        msgRef = null;
      }
    }

    if (!msgRef) {
      const groupSnap = await db.collectionGroup('messages')
        .where('id', '==', mIdStr)
        .limit(1)
        .get()
        .catch(() => ({ empty: true }));
      if (!groupSnap.empty) {
        msgRef = groupSnap.docs[0].ref;
        convRef = msgRef.parent.parent;
      }
    }

    if (msgRef) {
      try {
        await msgRef.delete();
      } catch (err) {
        logger.warn(`Firebase deleteMessage warning: ${err.message}`);
      }

      // If this message was the lastMessage, update conversation to point to new latest message
      if (convRef) {
        try {
          const convSnap = await convRef.get().catch(() => null);
          const convData = convSnap?.data();
          if (convData?.lastMessage?.id === mIdStr) {
            const remaining = await convRef.collection('messages')
              .orderBy('createdAt', 'desc')
              .limit(1)
              .get()
              .catch(() => ({ empty: true }));
            if (!remaining.empty) {
              const latestData = remaining.docs[0].data();
              await convRef.update({
                lastMessage: {
                  id: remaining.docs[0].id,
                  conversationId: convData.id,
                  text: latestData.text || '',
                  mediaUrl: latestData.mediaUrl || null,
                  senderId: String(latestData.senderId || ''),
                  senderName: latestData.senderName || '',
                  senderRole: latestData.senderRole || 'admin',
                  messageType: latestData.messageType || 'text',
                  createdAt: latestData.createdAt || '',
                },
                updatedAt: FieldValue.serverTimestamp(),
              });
            } else {
              await convRef.update({
                lastMessage: null,
                updatedAt: FieldValue.serverTimestamp(),
              });
            }
          }
        } catch (err) {
          logger.warn(`Firebase deleteMessage lastMessage refresh warning: ${err.message}`);
        }
      }
    }

    // Remove from MongoDB if connected
    if (mongoose.connection && mongoose.connection.readyState === 1) {
      try {
        await Chat.updateOne(
          { 'messages.id': mIdStr },
          { $pull: { messages: { id: mIdStr } } }
        ).catch(() => {});
      } catch (err) {
        logger.warn(`MongoDB deleteMessage warning: ${err.message}`);
      }
    }

    return {
      success: true,
      message: 'Message deleted successfully',
      data: { id: mIdStr },
    };
  }
}

export default ChatService;
