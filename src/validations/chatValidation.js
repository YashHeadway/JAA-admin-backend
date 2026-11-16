import { z } from 'zod';

export const startConversationSchema = z.object({
  receiverId: z.union([z.string().min(1), z.number()]),
  receiverName: z.string().trim().optional(),
  receiverAvatar: z.string().trim().nullable().optional(),
  initialMessage: z.string().trim().optional(),
}).passthrough();

export const sendMessageSchema = z.object({
  conversationId: z.union([z.string().trim().min(1), z.number()]).optional(),
  receiverId: z.union([z.string().min(1), z.number()]).optional(),
  text: z.string().trim().optional(),
  message: z.string().trim().optional(),
  mediaUrl: z.union([z.string().trim().nullable(), z.array(z.any()), z.record(z.any())]).optional(),
  media: z.union([z.string().trim().nullable(), z.array(z.any()), z.record(z.any())]).optional(),
  messageType: z.preprocess(
    (val) => (typeof val === 'string' ? val.trim().toLowerCase() : val),
    z.string().optional().default('text')
  ),
}).passthrough().refine(
  (data) => {
    const hasText = Boolean((data.text && String(data.text).trim()) || (data.message && String(data.message).trim()));
    const hasMediaUrl = Array.isArray(data.mediaUrl) ? data.mediaUrl.length > 0 : Boolean(data.mediaUrl);
    const hasMedia = Array.isArray(data.media) ? data.media.length > 0 : Boolean(data.media);
    return hasText || hasMediaUrl || hasMedia;
  },
  { message: 'Message text or media file is required', path: ['text'] }
);

export const getMessagesQuerySchema = z.object({
  limit: z.preprocess((val) => (val ? Number(val) : 50), z.number().min(1).max(100).optional().default(50)),
  before: z.string().optional(),
}).passthrough();

export const getConversationsQuerySchema = z.object({
  page: z.preprocess((val) => (val ? Number(val) : 1), z.number().int().min(1).optional().default(1)),
  limit: z.preprocess((val) => (val ? Number(val) : 15), z.number().int().min(1).max(100).optional().default(15)),
  item_per_page: z.preprocess((val) => (val ? Number(val) : undefined), z.number().int().min(1).max(100).optional()),
  search: z.string().trim().optional(),
  memberId: z.union([z.string().trim(), z.number()]).optional(),
  id: z.union([z.string().trim(), z.number()]).optional(),
}).passthrough();
