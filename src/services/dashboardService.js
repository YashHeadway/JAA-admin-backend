import { Member } from '../models/Member.js';
import { Event } from '../models/Event.js';
import { Complaint } from '../models/Complaint.js';
import { Post } from '../models/Post.js';
import { Committee } from '../models/Committee.js';

export class DashboardService {
  static async getDashboardStats() {
    const [
      totalMembers,
      pendingMembers,
      upcomingEventsCount,
      newComplaintsCount,
      complaintDocs,
      committeeDocs,
      postDocs,
    ] = await Promise.all([
      // 1. Members count: total members count & new member requests (pending members count)
      Member.countDocuments({}),
      Member.countDocuments({ status: 'pending' }),

      // 2. Upcoming events count & new complaints count
      Event.countDocuments({ isActive: { $ne: false } }),
      Complaint.countDocuments({
        status: { $in: ['New', 'new', 'Open', 'open', 'Pending', 'pending'] },
      }),

      // 3. Recent complaints (5 latest complaints, newest first)
      Complaint.find({}).sort({ id: -1, createdAt: -1, _id: -1 }).limit(5),

      // 4. Committee members (5 latest positions, newest first)
      Committee.find({}).sort({ id: -1, createdAt: -1, _id: -1 }).limit(5),

      // 5. Recent posts (5 latest posts, newest first)
      Post.find({}).sort({ id: -1, createdAt: -1, _id: -1 }).limit(5),
    ]);

    // 1: members (total members count, new member request that means pending members count)
    const members = {
      totalMembers,
      newMemberRequests: pendingMembers,
    };

    // 3: recent complaints table list
    const recentComplaints = complaintDocs.map((c) => {
      const complaintIdStr =
        c.complaintNumber ||
        (c.complaintId ? `CMP-${c.complaintId}` : (c.id ? `CMP-${c.id}` : 'CMP-001'));
      const complainantName = (
        c.complaintBy?.name ||
        c.member?.name ||
        c.complaintBy?.business ||
        c.member?.business ||
        'Member'
      ).trim();
      const complaintTypeStr = (c.complaintType || 'Payment Dispute').trim();

      return {
        complaintId: complaintIdStr,
        complaintBy: complainantName,
        complaintType: complaintTypeStr,
      };
    });

    // 4: committee member table list
    const committeeMembers = committeeDocs.map((comm) => {
      const memberList = Array.isArray(comm.members) ? comm.members : [];
      const memberCount = memberList.length || comm.totalMembers || (comm.fullName ? 1 : 0);
      const positionName = (comm.position || comm.role || 'Member').trim();

      return {
        positionName,
        totalCounts: memberCount,
      };
    });

    // 5: Recent Post
    const recentPosts = postDocs.map((p) => {
      const postTitle = (p.title || p.description || 'Post').trim();
      let postedByName = 'JAA Admin';

      if (p.postedBy) {
        const role = String(p.postedBy.role || 'admin').toLowerCase();
        if (role === 'member') {
          postedByName = p.postedBy.member?.name || p.member?.name || 'Member';
        } else {
          postedByName = p.postedBy.admin?.name || 'JAA Admin';
        }
      } else if (p.member?.name) {
        postedByName = p.member.name;
      }

      return {
        post: postTitle,
        postedBy: postedByName,
      };
    });

    return {
      members,
      upcomingEvents: upcomingEventsCount,
      newComplaints: newComplaintsCount,
      recentComplaints,
      committeeMembers,
      recentPosts,
    };
  }
}
