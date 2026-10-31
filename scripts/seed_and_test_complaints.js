import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import { env } from '../src/config/env.js';

const BASE_URL = `http://localhost:${env.PORT}${env.API_PREFIX}`;

async function run() {
  console.log('===========================================================');
  console.log('🧪 SEEDING & VERIFYING 2 COMPLAINT FLOWS (3 OF EACH TYPE)');
  console.log('===========================================================');

  await mongoose.connect(env.MONGO_URI);

  let passed = 0;
  let total = 0;

  function assert(condition, testName, details = '') {
    total++;
    if (condition) {
      console.log(`✅ [PASS] ${testName}`);
      passed++;
    } else {
      console.error(`❌ [FAIL] ${testName} - ${details}`);
    }
  }

  // Generate Admin JWT Token
  const token = jwt.sign(
    { id: 3, email: 'yash@gmail.com', role: 'Admin' },
    env.JWT_SECRET,
    { expiresIn: '1d' }
  );
  const authHeaders = {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  };

  const option1Created = [];
  const option2Created = [];

  // =========================================================================
  // OPTION 1: MEMBER TO MEMBER COMPLAINTS (3 Records)
  // =========================================================================

  // Option 1 - Record 1: Rajesh Mehta (id: 1) against Yash Soni (id: 2)
  {
    const payload = {
      complaintAgainst: 'Member',
      complaintBy: {
        memberId: 1,
      },
      targetMemberId: 2,
      complaintType: 'Payment Dispute',
      priority: 'High',
      status: 'In Progress',
      hasPreviousInteraction: true,
      preferredResolution: 'Immediate clearance of pending RTGS payment.',
      complaintDetails: {
        incidentDate: '2026-10-12',
        incidentTime: '15:30',
        location: 'Manek Chowk, Ahmedabad',
        priority: 'High',
        proofAvailable: true,
        amountInvolved: 750000,
      },
      description: {
        issueSummary: 'Payment pending for 100g 24K gold bullion supply',
        detailedDescription: 'Gold bullion delivery was completed on 12-10-2026. Payment cheque was bounced upon presentation.',
      },
      media: [
        { url: '/uploads/invoice-101.pdf', type: 'Document' },
        { url: '/uploads/delivery-challan-101.jpg', type: 'Photo' },
      ],
      resolutionNotes: 'Hearing scheduled with committee on Monday.',
    };

    const res = await fetch(`${BASE_URL}/complaints`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify(payload),
    });
    const body = await res.json();

    assert(
      res.status === 201 &&
        body.success === true &&
        body.data?.complaintAgainst === 'Member' &&
        body.data?.complaintBy?.memberObjectId &&
        body.data?.targetMember?.memberObjectId &&
        body.data?.targetMember?.memberId === 2,
      'Test 1: Option 1 (Member to Member #1) created with ObjectId details',
      `Status: ${res.status}, msg: ${body.message}, targetMember: ${JSON.stringify(body.data?.targetMember)}`
    );
    if (body.data?.complaintId) option1Created.push(body.data.complaintId);
  }

  // Option 1 - Record 2: Suresh Shah (id: 14) against Yash Soni (id: 11)
  {
    const payload = {
      complaintAgainst: 'Member',
      complaintBy: {
        memberId: 14,
      },
      targetMemberId: 11,
      complaintType: 'Quality & Purity Dispute',
      priority: 'Medium',
      status: 'Open',
      hasPreviousInteraction: false,
      preferredResolution: 'Replacement with certified hallmarked stock or refund.',
      complaintDetails: {
        incidentDate: '2026-10-18',
        incidentTime: '11:00',
        location: 'C.G. Road, Ahmedabad',
        priority: 'Medium',
        proofAvailable: true,
        amountInvolved: 320000,
      },
      description: {
        issueSummary: 'Hallmark purity mismatch in diamond studs shipment',
        detailedDescription: 'The delivered diamond earrings were billed as 18K but purity test report shows 14K gold alloy.',
      },
      media: [
        { url: '/uploads/purity-report.pdf', type: 'Document' },
      ],
    };

    const res = await fetch(`${BASE_URL}/complaints`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify(payload),
    });
    const body = await res.json();

    assert(
      res.status === 201 &&
        body.success === true &&
        body.data?.complaintAgainst === 'Member' &&
        body.data?.targetMember?.memberObjectId &&
        body.data?.targetMember?.memberId === 11,
      'Test 2: Option 1 (Member to Member #2) created with ObjectId details',
      `Status: ${res.status}, msg: ${body.message}`
    );
    if (body.data?.complaintId) option1Created.push(body.data.complaintId);
  }

  // Option 1 - Record 3: Yash Soni (id: 2) against Rajesh Mehta (id: 1)
  {
    const payload = {
      complaintAgainst: 'Member',
      complaintBy: {
        memberId: 2,
      },
      targetMemberId: 1,
      complaintType: 'Delivery Delay & Stock Shortage',
      priority: 'Low',
      status: 'Under Review',
      hasPreviousInteraction: true,
      preferredResolution: 'Compensation for revenue loss during festival rush.',
      complaintDetails: {
        incidentDate: '2026-10-24',
        incidentTime: '17:45',
        location: 'Navrangpura, Ahmedabad',
        priority: 'Low',
        proofAvailable: true,
        amountInvolved: 185000,
      },
      description: {
        issueSummary: 'Consignment delivery delayed by over 3 weeks',
        detailedDescription: 'Diwali festival stock delivery was committed for 1st October but goods were received on 24th October causing revenue loss.',
      },
      media: [
        { url: '/uploads/purchase-order.jpg', type: 'Photo' },
      ],
    };

    const res = await fetch(`${BASE_URL}/complaints`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify(payload),
    });
    const body = await res.json();

    assert(
      res.status === 201 &&
        body.success === true &&
        body.data?.complaintAgainst === 'Member' &&
        body.data?.targetMember?.memberObjectId &&
        body.data?.targetMember?.memberId === 1,
      'Test 3: Option 1 (Member to Member #3) created with ObjectId details',
      `Status: ${res.status}, msg: ${body.message}`
    );
    if (body.data?.complaintId) option1Created.push(body.data.complaintId);
  }

  // =========================================================================
  // OPTION 2: MEMBER TO ANOTHER PERSON (3 Records)
  // =========================================================================

  // Option 2 - Record 1: Rajesh Mehta (id: 1) against Prakash Sharma (Full person details)
  {
    const payload = {
      complaintAgainst: 'Other',
      complaintBy: {
        memberId: 1,
      },
      againstPerson: {
        name: 'Prakash Sharma',
        mobile: '9824012345',
        email: 'prakash.sharma@sharmatraders.in',
        gstNumber: '24AABCS5544K1Z2',
        address: 'Shop 12, New Cloth Market, Raipur, Ahmedabad',
        company: 'Sharma Gold Refineries',
      },
      complaintType: 'Fraud & Breach of Trust',
      priority: 'High',
      status: 'Open',
      hasPreviousInteraction: false,
      preferredResolution: 'Full recovery of raw scrap gold or cash compensation.',
      complaintDetails: {
        incidentDate: '2026-10-20',
        incidentTime: '14:00',
        location: 'Raipur, Ahmedabad',
        priority: 'High',
        proofAvailable: true,
        amountInvolved: 1200000,
      },
      description: {
        issueSummary: 'Advance transfer made for gold refining but refiner absconded',
        detailedDescription: 'Sent raw scrap gold for refining with 50% advance. The refinery shop has remained closed for 10 days.',
      },
      media: [
        { url: '/uploads/bank-transfer-receipt.pdf', type: 'Document' },
      ],
    };

    const res = await fetch(`${BASE_URL}/complaints`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify(payload),
    });
    const body = await res.json();

    assert(
      res.status === 201 &&
        body.success === true &&
        body.data?.complaintAgainst === 'Other' &&
        body.data?.againstPerson?.name === 'Prakash Sharma' &&
        body.data?.againstPerson?.mobile === '9824012345' &&
        body.data?.againstPerson?.gstNumber === '24AABCS5544K1Z2' &&
        body.data?.targetMember === null,
      'Test 4: Option 2 (Member to Another Person #1) created with required name, mobile & optional fields',
      `Status: ${res.status}, msg: ${body.message}, againstPerson: ${JSON.stringify(body.data?.againstPerson)}`
    );
    if (body.data?.complaintId) option2Created.push(body.data.complaintId);
  }

  // Option 2 - Record 2: Suresh Shah (id: 14) against Vikram Verma (with null email & gstNumber)
  {
    const payload = {
      complaintAgainst: 'Other',
      complaintBy: {
        memberId: 14,
      },
      againstPerson: {
        name: 'Vikram Verma',
        mobile: '9712098765',
        email: null,
        gstNumber: null,
        address: 'Ring Road, Surat, Gujarat',
        company: 'Verma Gems Cutting & Polishing',
      },
      complaintType: 'Damaged Rough Diamonds',
      priority: 'Medium',
      status: 'In Progress',
      hasPreviousInteraction: true,
      preferredResolution: 'Payment of market value for ruined gemstone pieces.',
      complaintDetails: {
        incidentDate: '2026-10-22',
        incidentTime: '16:30',
        location: 'Surat Diamond Market',
        priority: 'Medium',
        proofAvailable: true,
        amountInvolved: 450000,
      },
      description: {
        issueSummary: 'Raw rough diamonds chipped during polishing',
        detailedDescription: 'Third-party polishing contractor damaged 3 certified rough stones during polishing process and refuses compensation.',
      },
      media: [
        { url: '/uploads/damaged-diamond-photo.jpg', type: 'Photo' },
      ],
    };

    const res = await fetch(`${BASE_URL}/complaints`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify(payload),
    });
    const body = await res.json();

    assert(
      res.status === 201 &&
        body.success === true &&
        body.data?.complaintAgainst === 'Other' &&
        body.data?.againstPerson?.name === 'Vikram Verma' &&
        body.data?.againstPerson?.mobile === '9712098765' &&
        body.data?.againstPerson?.email === null &&
        body.data?.againstPerson?.gstNumber === null,
      'Test 5: Option 2 (Member to Another Person #2) created with null email & gstNumber',
      `Status: ${res.status}, msg: ${body.message}`
    );
    if (body.data?.complaintId) option2Created.push(body.data.complaintId);
  }

  // Option 2 - Record 3: Yash Soni (id: 11) against Anil Singhania (direct flat fields in body)
  {
    const payload = {
      complaintAgainst: 'Other',
      complainantId: 11,
      name: 'Anil Singhania',
      mobile: '9909088776',
      email: 'singhania.bullion@gmail.com',
      gstNumber: '24AAECS9988P1Z8',
      address: 'Zaveri Bazaar, Mumbai (Ashram Road, Ahmedabad Branch)',
      company: 'Singhania Bullion Logistics',
      complaintType: 'Dishonoured Cheque / Payment Issue',
      priority: 'High',
      status: 'Under Review',
      hasPreviousInteraction: true,
      preferredResolution: 'Immediate bank transfer replacement of cheque amount with penalty.',
      complaintDetails: {
        incidentDate: '2026-10-25',
        incidentTime: '12:15',
        location: 'Ashram Road, Ahmedabad',
        priority: 'High',
        proofAvailable: true,
        amountInvolved: 890000,
      },
      description: {
        issueSummary: 'Returned cheque dishonoured for silver bar consignment',
        detailedDescription: 'External bullion broker issued post-dated cheque for silver consignment which returned dishonoured due to funds insufficient.',
      },
      media: [
        { url: '/uploads/bounced-cheque.jpg', type: 'Photo' },
        { url: '/uploads/bank-return-memo.pdf', type: 'Document' },
      ],
    };

    const res = await fetch(`${BASE_URL}/complaints`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify(payload),
    });
    const body = await res.json();

    assert(
      res.status === 201 &&
        body.success === true &&
        body.data?.complaintAgainst === 'Other' &&
        body.data?.againstPerson?.name === 'Anil Singhania' &&
        body.data?.againstPerson?.mobile === '9909088776' &&
        body.data?.againstPerson?.company === 'Singhania Bullion Logistics',
      'Test 6: Option 2 (Member to Another Person #3) created via direct flat body fields',
      `Status: ${res.status}, msg: ${body.message}`
    );
    if (body.data?.complaintId) option2Created.push(body.data.complaintId);
  }

  // =========================================================================
  // NEGATIVE TESTS (Validation of required fields in Option 2)
  // =========================================================================
  {
    // Missing mobile number in Option 2
    const invalidPayload = {
      complaintAgainst: 'Other',
      againstPerson: {
        name: 'Incomplete Person',
        // mobile missing!
      },
      description: { issueSummary: 'Test error' },
    };

    const res = await fetch(`${BASE_URL}/complaints`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify(invalidPayload),
    });
    const body = await res.json();

    assert(
      res.status === 422 && body.success === false && JSON.stringify(body.errors).includes('mobile'),
      'Test 7: Option 2 missing mobile returns 422 validation error',
      `Status: ${res.status}, errors: ${JSON.stringify(body.errors)}`
    );
  }

  {
    // Missing name in Option 2
    const invalidPayload = {
      complaintAgainst: 'Other',
      againstPerson: {
        mobile: '9876543210',
        // name missing!
      },
      description: { issueSummary: 'Test error' },
    };

    const res = await fetch(`${BASE_URL}/complaints`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify(invalidPayload),
    });
    const body = await res.json();

    assert(
      res.status === 422 && body.success === false && JSON.stringify(body.errors).includes('name'),
      'Test 8: Option 2 missing name returns 422 validation error',
      `Status: ${res.status}, errors: ${JSON.stringify(body.errors)}`
    );
  }

  // =========================================================================
  // VERIFY LISTING & DETAILS ENDPOINTS
  // =========================================================================
  {
    const res = await fetch(`${BASE_URL}/complaints?limit=20`, { headers: authHeaders });
    const body = await res.json();

    const items = body.data || [];
    const againstMemberItems = items.filter((c) => c.complaintAgainst === 'Member');
    const againstOtherItems = items.filter((c) => c.complaintAgainst === 'Other');

    assert(
      res.status === 200 &&
        againstMemberItems.length >= 3 &&
        againstOtherItems.length >= 3 &&
        body.summary?.againstMember >= 3 &&
        body.summary?.againstOther >= 3,
      'Test 9: GET /api/complaints lists both types with summary counts >= 3',
      `Total: ${items.length}, AgainstMember: ${againstMemberItems.length}, AgainstOther: ${againstOtherItems.length}`
    );
  }

  // Verify GET /api/complaints/:id for Option 1
  if (option1Created.length > 0) {
    const id = option1Created[0];
    const res = await fetch(`${BASE_URL}/complaints/${id}`, { headers: authHeaders });
    const body = await res.json();

    assert(
      res.status === 200 &&
        body.data?.complaintAgainst === 'Member' &&
        body.data?.targetMember?._id &&
        body.data?.complaintBy?._id,
      `Test 10: GET /api/complaints/${id} (Option 1) returns member ObjectId details`,
      `targetMember ObjectId: ${body.data?.targetMember?._id}`
    );
  }

  // Verify GET /api/complaints/:id for Option 2
  if (option2Created.length > 0) {
    const id = option2Created[0];
    const res = await fetch(`${BASE_URL}/complaints/${id}`, { headers: authHeaders });
    const body = await res.json();

    assert(
      res.status === 200 &&
        body.data?.complaintAgainst === 'Other' &&
        body.data?.againstPerson?.name &&
        body.data?.againstPerson?.mobile &&
        body.data?.targetMember === null,
      `Test 11: GET /api/complaints/${id} (Option 2) returns againstPerson details and targetMember=null`,
      `againstPerson: ${JSON.stringify(body.data?.againstPerson)}`
    );
  }

  await mongoose.disconnect();

  console.log('===========================================================');
  console.log(`🏁 COMPLAINT TESTS RESULT: ${passed}/${total} TESTS PASSED`);
  console.log('===========================================================');

  if (passed === total) {
    process.exit(0);
  } else {
    process.exit(1);
  }
}

run().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});

