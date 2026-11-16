import { asyncHandler } from '../utils/asyncHandler.js';
import { ChatService } from '../services/chatService.js';
import { ApiError } from '../utils/apiError.js';

/**
 * Firebase Firestore connection test endpoint.
 */
export const testFirebaseConnection = asyncHandler(async (req, res) => {
  const result = await ChatService.testConnection();
  return res.status(200).json({
    success: true,
    message: result.message,
    data: result,
  });
});

/**
 * Get all conversations for the currently authenticated user/admin.
 * Supports filtering via query params: ?id=1, ?memberId=43, ?search=Yash
 * Supports pagination via query params: ?page=1, ?limit=15
 */
export const getConversations = asyncHandler(async (req, res) => {
  const currentUserId =
    req.user?.id ||
    req.user?._id ||
    req.admin?.id ||
    req.admin?._id ||
    req.query?.userId ||
    '12';

  const isAdmin =
    req.user?.role === 'admin' ||
    req.user?.role === 'Admin' ||
    req.user?.role === 'superadmin' ||
    !!req.admin ||
    String(currentUserId) === '12' ||
    String(currentUserId) === '1' ||
    (req.baseUrl && req.baseUrl.includes('admin'));

  const { search, memberId, id } = req.query;
  const page = parseInt(req.query.page, 10) || 1;
  const limit = parseInt(req.query.limit || req.query.item_per_page, 10) || 15;

  const result = await ChatService.getUserConversations(currentUserId, {
    isAdmin,
    search,
    memberId,
    id,
    page,
    limit,
  });

  return res.status(200).json({
    success: true,
    pagination: result.pagination,
    data: result.conversations,
  });
});

/**
 * Get conversation by ID (e.g. GET /api/admin/chat/1 or GET /api/chat/1).
 * Returns conversation details along with its messages list.
 */
export const getConversationById = asyncHandler(async (req, res) => {
  const id = req.params.id || req.params.conversationId;
  const conversation = await ChatService.getConversationById(id);

  return res.status(200).json({
    success: true,
    data: conversation,
  });
});

/**
 * Start or get a 1-on-1 conversation with another member/user.
 */
export const startConversation = asyncHandler(async (req, res) => {
  const currentUserId = req.user?.id || req.user?._id || req.admin?.id || req.admin?._id || req.body?.senderId || '12';

  const { receiverId, receiverName, receiverAvatar, initialMessage } = req.body;
  if (!receiverId) {
    throw ApiError.badRequest('receiverId is required');
  }

  const senderRole = req.user?.role || req.admin?.role || (String(currentUserId) === '12' || String(currentUserId) === '1' ? 'admin' : 'member');

  const conversation = await ChatService.getOrCreateConversation({
    senderId: currentUserId,
    receiverId,
    senderInfo: {
      name: req.user?.name || req.user?.fullName || req.admin?.name || (senderRole === 'admin' ? 'Yash Soni' : 'Member'),
      avatar: req.user?.avatar || req.user?.profilePhoto || (senderRole === 'admin' ? '/uploads/yash-image-1793436873733.jpeg' : null),
      role: senderRole,
      email: req.user?.email || req.admin?.email || (senderRole === 'admin' ? 'yashranpura3@gmail.com' : ''),
    },
    receiverInfo: {
      name: receiverName,
      avatar: receiverAvatar,
      role: req.body.receiverRole || (String(receiverId) === '12' || String(receiverId) === '1' ? 'admin' : 'member'),
      email: req.body.receiverEmail || '',
    },
  });

  // If initial message provided, send it
  if (initialMessage && initialMessage.trim()) {
    await ChatService.sendMessage({
      conversationId: conversation.id,
      senderId: currentUserId,
      receiverId,
      senderName: req.user?.name || req.admin?.name || 'Member',
      senderAvatar: req.user?.avatar || null,
      text: initialMessage.trim(),
    });
  }

  return res.status(201).json({
    success: true,
    message: 'Conversation ready',
    data: conversation,
  });
});

/**
 * Get message history for a conversation.
 */
export const getMessages = asyncHandler(async (req, res) => {
  const conversationId = req.params.conversationId || req.params.id;
  const { limit, before } = req.query;

  const messages = await ChatService.getMessages(conversationId, { limit, before });
  return res.status(200).json({
    success: true,
    data: messages,
    total: messages.length,
  });
});

/**
 * Send a message in a conversation.
 */
export const sendMessage = asyncHandler(async (req, res) => {
  const currentUserId =
    req.user?.id ||
    req.user?._id ||
    req.admin?.id ||
    req.admin?._id ||
    req.body?.senderId ||
    '12';

  const { conversationId, receiverId, text, message, messageType } = req.body;

  // Handle uploaded media attachment if present (string, array of objects, array of strings, or req.file/req.files)
  let rawMedia = req.body.mediaUrl || req.body.media || null;
  let mediaUrl = null;

  if (typeof rawMedia === 'string' && rawMedia.trim()) {
    mediaUrl = rawMedia.trim();
  } else if (Array.isArray(rawMedia) && rawMedia.length > 0) {
    const first = rawMedia[0];
    if (typeof first === 'string') {
      mediaUrl = first;
    } else if (typeof first === 'object' && first !== null) {
      mediaUrl = first.url || first.path || null;
    }
  } else if (typeof rawMedia === 'object' && rawMedia !== null) {
    mediaUrl = rawMedia.url || rawMedia.path || null;
  }

  if (req.file) {
    mediaUrl = req.file.filename ? `/uploads/${req.file.filename}` : (req.file.path || req.file.url);
  } else if (req.files && Array.isArray(req.files) && req.files.length > 0) {
    const f = req.files[0];
    mediaUrl = f.filename ? `/uploads/${f.filename}` : (f.path || f.url);
  }

  const content = text || message || '';

  // Auto detect messageType if media is present
  let resolvedMessageType = messageType || 'text';
  if (mediaUrl) {
    const ext = (mediaUrl.split('?')[0].split('.').pop() || '').toLowerCase();
    const mime = (req.file?.mimetype || req.files?.[0]?.mimetype || '').toLowerCase();
    if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp'].includes(ext) || mime.startsWith('image/')) {
      resolvedMessageType = 'image';
    } else if (['mp4', 'webm', 'mov', 'avi', 'mkv', '3gp'].includes(ext) || mime.startsWith('video/')) {
      resolvedMessageType = 'video';
    } else if (['mp3', 'wav', 'ogg', 'm4a', 'aac'].includes(ext) || mime.startsWith('audio/')) {
      resolvedMessageType = 'audio';
    } else {
      resolvedMessageType = 'file';
    }
  }

  const senderRole = req.user?.role || req.admin?.role || (String(currentUserId) === '12' || String(currentUserId) === '1' ? 'admin' : 'member');

  const sentMessage = await ChatService.sendMessage({
    conversationId: conversationId || req.params.conversationId || req.params.id,
    senderId: currentUserId,
    receiverId,
    senderName: req.user?.name || req.user?.fullName || req.admin?.name || (senderRole === 'admin' ? 'Admin' : 'Member'),
    senderAvatar: req.user?.avatar || req.user?.profilePhoto || null,
    senderRole,
    text: content,
    mediaUrl,
    messageType: resolvedMessageType,
  });

  return res.status(201).json({
    success: true,
    message: 'Message sent successfully',
    data: sentMessage,
  });
});

/**
 * Mark messages in a conversation as read.
 */
export const markAsRead = asyncHandler(async (req, res) => {
  const currentUserId = req.user?.id || req.user?._id || req.admin?.id || req.admin?._id || req.body?.userId || '12';
  const conversationId = req.params.conversationId || req.params.id;

  const result = await ChatService.markMessagesAsRead(conversationId, currentUserId);
  return res.status(200).json(result);
});

/**
 * Delete a conversation.
 */
export const deleteConversation = asyncHandler(async (req, res) => {
  const conversationId = req.params.conversationId || req.params.id;
  const result = await ChatService.deleteConversation(conversationId);
  return res.status(200).json(result);
});

/**
 * Edit a message in a conversation.
 */
export const editMessage = asyncHandler(async (req, res) => {
  const conversationId = req.params.conversationId || req.body?.conversationId || req.query?.conversationId;
  const messageId = req.params.messageId || req.params.id || req.body?.messageId;
  const text = req.body?.text || req.body?.newText || req.body?.message;

  const result = await ChatService.editMessage(conversationId, messageId, text);
  return res.status(200).json(result);
});

/**
 * Delete a message from a conversation.
 */
export const deleteMessage = asyncHandler(async (req, res) => {
  const conversationId = req.params.conversationId || req.body?.conversationId || req.query?.conversationId;
  const messageId = req.params.messageId || req.params.id || req.body?.messageId;

  const result = await ChatService.deleteMessage(conversationId, messageId);
  return res.status(200).json(result);
});
