import mongoose from 'mongoose';
import { Committee } from '../models/Committee.js';
import { Member } from '../models/Member.js';
import { getNextSequence } from '../models/Counter.js';
import { getPagination, formatPaginationMeta } from '../utils/pagination.js';
import { ApiError } from '../utils/apiError.js';
import { buildIdQuery } from '../utils/queryHelper.js';

export class CommitteeService {
  /**
   * Look up member from Member collection by numeric id, membershipId, or _id
   */
  static async findMember(memberId) {
    if (memberId === undefined || memberId === null || memberId === '') return null;
    const conditions = [];
    if (!isNaN(Number(memberId))) {
      conditions.push({ id: Number(memberId) });
    }
    if (mongoose.Types.ObjectId.isValid(memberId)) {
      conditions.push({ _id: memberId });
    }
    if (typeof memberId === 'string' && memberId.trim()) {
      conditions.push({ membershipId: memberId.trim() });
    }
    if (conditions.length === 0) return null;
    return await Member.findOne({ $or: conditions });
  }

  /**
   * Helper to validate and enrich members array using real Member foreign keys
   */
  static async normalizeMembers(membersArray, data = null) {
    let sourceList = [];

    if (Array.isArray(membersArray) && membersArray.length > 0) {
      sourceList = membersArray;
    } else if (data) {
      const candidate = data.memberId ?? data.memberIds ?? data.members;
      if (candidate !== undefined && candidate !== null && candidate !== '') {
        if (Array.isArray(candidate)) {
          sourceList = candidate.map((m) => (typeof m === 'object' && m !== null ? m : { memberId: m }));
        } else if (typeof candidate === 'string') {
          const trimmed = candidate.trim();
          if (trimmed.startsWith('[') || trimmed.startsWith('{')) {
            try {
              const parsed = JSON.parse(trimmed);
              sourceList = Array.isArray(parsed)
                ? parsed.map((m) => (typeof m === 'object' && m !== null ? m : { memberId: m }))
                : [parsed];
            } catch {
              sourceList = trimmed.split(',').map((s) => ({ memberId: s.trim() }));
            }
          } else if (trimmed.includes(',')) {
            sourceList = trimmed.split(',').map((s) => ({ memberId: s.trim() }));
          } else {
            sourceList = [{ memberId: trimmed }];
          }
        } else if (typeof candidate === 'number') {
          sourceList = [{ memberId: candidate }];
        } else if (typeof candidate === 'object') {
          sourceList = [candidate];
        }
      } else if (data.fullName) {
        sourceList = [{ memberId: data.id || 1, name: data.fullName }];
      }
    }

    if (sourceList.length === 0) {
      return [];
    }

    const resolved = [];
    const seen = new Set();

    for (const item of sourceList) {
      if (!item) continue;
      const rawId = item.memberId !== undefined ? item.memberId : (item.id !== undefined ? item.id : null);
      if (rawId === null || rawId === undefined || rawId === '') {
        continue;
      }

      // Validate real foreign key in Member collection
      const realMember = await this.findMember(rawId);
      if (!realMember) {
        // Skip orphaned or deleted member IDs so member assignments always succeed
        continue;
      }

      const canonicalId = realMember.id;
      if (seen.has(canonicalId)) {
        continue; // Avoid duplicates in the same committee position
      }
      seen.add(canonicalId);

      resolved.push({
        memberId: canonicalId,
        name: realMember.name,
      });
    }

    return resolved;
  }

  /**
   * Populate/refresh member details in committee doc from latest Member collection data
   */
  static async populateCommitteeMembers(item) {
    if (!item) return item;
    const doc = item.toObject ? item.toObject() : { ...item };
    if (Array.isArray(doc.members) && doc.members.length > 0) {
      const refreshedMembers = [];
      for (const m of doc.members) {
        if (m.memberId) {
          const realMember = await this.findMember(m.memberId);
          if (realMember) {
            refreshedMembers.push({
              memberId: realMember.id,
              name: realMember.name,
            });
            continue;
          }
        }
        refreshedMembers.push({
          memberId: m.memberId,
          name: m.name,
        });
      }
      doc.members = refreshedMembers;
    }
    return doc;
  }

  static async getCommittee({ search = '', position = '', page = 1, limit = 20 } = {}) {
    const filter = {};

    if (position && position !== 'all' && position !== 'All') {
      filter.position = new RegExp(`^${position.trim()}$`, 'i');
    }

    if (search && search.trim()) {
      const reg = new RegExp(search.trim(), 'i');
      filter.$or = [
        { position: reg },
        { 'members.name': reg },
        { fullName: reg },
      ];
    }

    const { skip, limit: parsedLimit, page: parsedPage } = getPagination({ page, limit }, 20);

    const [items, total] = await Promise.all([
      Committee.find(filter).sort({ id: -1 }).skip(skip).limit(parsedLimit),
      Committee.countDocuments(filter),
    ]);

    const enrichedItems = await Promise.all(items.map((item) => this.populateCommitteeMembers(item)));
    const pagination = formatPaginationMeta(total, parsedPage, parsedLimit);

    return {
      data: enrichedItems,
      pagination,
    };
  }

  static async getCommitteeById(id) {
    const item = await Committee.findOne(buildIdQuery(id));
    if (!item) {
      throw ApiError.notFound(`Committee with ID '${id}' was not found`);
    }
    return await this.populateCommitteeMembers(item);
  }

  static async createCommittee(data) {
    let id = await getNextSequence('committees');

    const members = await this.normalizeMembers(data.members, data);

    const buildPayload = (assignedId) => ({
      id: assignedId,
      position: data.position ? data.position.trim() : 'Committee Member',
      members,
      totalMembers: members.length,
      ...(data.fullName ? { fullName: data.fullName } : {}),
      ...(data.dateOfBirth ? { dateOfBirth: data.dateOfBirth } : {}),
      ...(data.gender ? { gender: data.gender } : {}),
      ...(data.mobile ? { mobile: data.mobile } : {}),
      ...(data.email ? { email: data.email } : {}),
      ...(data.address ? { address: data.address } : {}),
      ...(data.role ? { role: data.role } : {}),
      ...(data.businessName ? { businessName: data.businessName } : {}),
      ...(data.businessType ? { businessType: data.businessType } : {}),
      ...(data.gstNumber ? { gstNumber: data.gstNumber } : {}),
    });

    try {
      const newCommittee = await Committee.create(buildPayload(id));
      return await this.populateCommitteeMembers(newCommittee);
    } catch (err) {
      if (err.code === 11000) {
        id = await getNextSequence('committees');
        const retry = await Committee.create(buildPayload(id));
        return await this.populateCommitteeMembers(retry);
      }
      throw err;
    }
  }

  static async updateCommittee(id, updates) {
    const existing = await Committee.findOne(buildIdQuery(id));
    if (!existing) {
      throw ApiError.notFound(`Committee with ID '${id}' was not found`);
    }

    const updateDoc = {};

    if (updates.position !== undefined) {
      updateDoc.position = updates.position.trim();
    }

    if (updates.members !== undefined || updates.memberId !== undefined || updates.memberIds !== undefined) {
      const normalized = await this.normalizeMembers(updates.members, updates);
      updateDoc.members = normalized;
      updateDoc.totalMembers = normalized.length;
    }

    if (Array.isArray(updates.addMembers) && updates.addMembers.length > 0) {
      const newMembers = await this.normalizeMembers(updates.addMembers);
      const current = updateDoc.members || existing.members || [];
      const merged = [...current, ...newMembers];
      updateDoc.members = merged;
      updateDoc.totalMembers = merged.length;
    }

    const updated = await Committee.findOneAndUpdate(
      buildIdQuery(id),
      { $set: updateDoc },
      { returnDocument: 'after' }
    );

    return await this.populateCommitteeMembers(updated);
  }

  static async deleteCommittee(id) {
    const deleted = await Committee.findOneAndDelete(buildIdQuery(id));
    if (!deleted) {
      throw ApiError.notFound(`Committee with ID '${id}' was not found`);
    }
    return deleted;
  }

  /**
   * Cascade remove a member from all committee positions when deleted, rejected, or inactive
   */
  static async removeMemberFromAllCommittees(memberId) {
    const numId = Number(memberId);
    if (isNaN(numId) || numId <= 0) return;

    const affectedCommittees = await Committee.find({ 'members.memberId': numId });

    for (const comm of affectedCommittees) {
      comm.members = (comm.members || []).filter((m) => Number(m.memberId) !== numId);
      comm.totalMembers = comm.members.length;
      await comm.save();
    }
  }
}
