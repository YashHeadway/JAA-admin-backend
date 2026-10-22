import { Member } from '../models/Member.js';
import { Event } from '../models/Event.js';
import { Lead } from '../models/Lead.js';
import { Complaint } from '../models/Complaint.js';
import { Group } from '../models/Group.js';
import { Post } from '../models/Post.js';

export class DashboardService {
  static async getDashboardStats() {
    const [
      totalMembers,
      pendingApprovals,
      approvedMembers,
      rejectedMembers,
      totalEvents,
      activeEvents,
      totalLeads,
      totalComplaints,
      unresolvedComplaints,
      totalGroups,
      totalPosts,
      recentComplaints,
      upcomingEvents,
      recentLeads,
    ] = await Promise.all([
      Member.countDocuments({}),
      Member.countDocuments({ status: 'pending' }),
      Member.countDocuments({ status: 'approved' }),
      Member.countDocuments({ status: 'rejected' }),
      Event.countDocuments({}),
      Event.countDocuments({ isActive: true }),
      Lead.countDocuments({}),
      Complaint.countDocuments({}),
      Complaint.countDocuments({ status: { $nin: ['Resolved', 'Closed'] } }),
      Group.countDocuments({}),
      Post.countDocuments({}),
      Complaint.find({}).sort({ id: -1 }).limit(5),
      Event.find({}).sort({ id: -1 }).limit(4),
      Lead.find({}).sort({ id: -1 }).limit(5),
    ]);

    const memberCounts = {
      all: totalMembers,
      pending: pendingApprovals,
      approved: approvedMembers,
      rejected: rejectedMembers,
    };

    return {
      members: memberCounts,
      stats: {
        totalMembers,
        pendingApprovals,
        approvedMembers,
        rejectedMembers,
        totalEvents,
        activeEvents,
        totalLeads,
        totalComplaints,
        unresolvedComplaints,
        totalGroups,
        totalPosts,
      },
      recentComplaints,
      upcomingEvents,
      recentLeads,
    };
  }
}
