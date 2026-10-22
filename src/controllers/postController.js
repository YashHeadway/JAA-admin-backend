import { asyncHandler } from '../utils/asyncHandler.js';
import { PostService } from '../services/postService.js';

export const getPosts = asyncHandler(async (req, res) => {
  const { search, tab, type, dateRange, page, limit } = req.query;
  const result = await PostService.getPosts({ search, tab, type, dateRange, page, limit });

  return res.status(200).json({
    success: true,
    data: result.data,
    pagination: result.pagination,
  });
});

export const getPostById = asyncHandler(async (req, res) => {
  const post = await PostService.getPostById(req.params.id);
  return res.status(200).json(post);
});

export const createPost = asyncHandler(async (req, res) => {
  const created = await PostService.createPost(req.body);
  return res.status(201).json(created);
});

export const deletePost = asyncHandler(async (req, res) => {
  const deleted = await PostService.deletePost(req.params.id);
  return res.status(200).json(deleted);
});
