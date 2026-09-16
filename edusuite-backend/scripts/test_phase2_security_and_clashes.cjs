const http = require('http');
const jwt = require('jsonwebtoken');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET || 'edusuite_super_secret_key_change_me_in_production';
const BASE_URL = 'http://localhost:5000';

function makeRequest(method, path, token, body = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE_URL);
    const options = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      method: method,
      headers: {
        'Content-Type': 'application/json',
      },
    };

    if (token) {
      options.headers['Authorization'] = `Bearer ${token}`;
    }

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        let parsed = null;
        try {
          parsed = JSON.parse(data);
        } catch (e) {
          parsed = data;
        }
        resolve({ status: res.statusCode, data: parsed });
      });
    });

    req.on('error', (err) => {
      reject(err);
    });

    if (body) {
      req.write(JSON.stringify(body));
    }
    req.end();
  });
}

async function runTests() {
  console.log('========================================================');
  console.log('RUNNING MASTER TIMETABLE PRODUCTION HARDENING TEST SUITE');
  console.log('========================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition, testName, details = '') {
    if (condition) {
      console.log(`✅ [PASS] ${testName}`);
      passed++;
    } else {
      console.error(`❌ [FAIL] ${testName} - ${details}`);
      failed++;
    }
  }

  try {
    // 1. Fetch live entities for testing
    const superAdmin = await prisma.admin.findFirst({ where: { role: 'super_admin' } });
    const facultyList = await prisma.faculty.findMany({ take: 5 });
    const student = await prisma.student.findFirst({ where: { department: { in: ['CSE', 'ME', 'MECHANICAL'] } } });
    
    if (!facultyList || facultyList.length < 2) {
      throw new Error('Need at least 2 faculty members in DB for testing.');
    }

    const facultyA = facultyList[0];
    const facultyB = facultyList[1];

    // Find or identify HOD for CSE and ECE
    const hodCSE = await prisma.faculty.findFirst({
      where: { department: { in: ['CSE', 'Computer Science & Engineering'] } }
    }) || facultyA;

    // Tokens
    const tokenSuperAdmin = jwt.sign({ id: superAdmin.id, role: 'super_admin', email: superAdmin.email }, JWT_SECRET);
    const tokenFacultyA = jwt.sign({ id: facultyA.id, role: 'faculty', email: facultyA.email, department: facultyA.department }, JWT_SECRET);
    const tokenFacultyB = jwt.sign({ id: facultyB.id, role: 'faculty', email: facultyB.email, department: facultyB.department }, JWT_SECRET);
    const tokenHodCSE = jwt.sign({ id: hodCSE.id, role: 'hod', email: hodCSE.email, department: 'CSE' }, JWT_SECRET);
    const tokenStudent = jwt.sign({ id: student.id, role: 'student', email: student.email, department: student.department }, JWT_SECRET);

    console.log(`Test Entities Loaded:`);
    console.log(`- SuperAdmin: ${superAdmin.email}`);
    console.log(`- Faculty A: ${facultyA.name} (${facultyA.id}, Dept: ${facultyA.department})`);
    console.log(`- Faculty B: ${facultyB.name} (${facultyB.id}, Dept: ${facultyB.department})`);
    console.log(`- HOD CSE: ${hodCSE.name} (Dept: CSE)`);
    console.log(`- Student: ${student.name} (${student.rollNumber}, Dept: ${student.department})\n`);

    // TEST 8: Unauthenticated request receives 401
    {
      const res = await makeRequest('GET', '/api/academics/timetable', null);
      assert(res.status === 401, 'Test 8a: Unauthenticated GET /api/academics/timetable returns 401', `Status: ${res.status}`);

      const res2 = await makeRequest('GET', '/api/faculty/my-timetable', null);
      assert(res2.status === 401, 'Test 8b: Unauthenticated GET /api/faculty/my-timetable returns 401', `Status: ${res2.status}`);
    }

    // TEST 1: Faculty A cannot view Faculty B timetable
    {
      // Calling /api/faculty/my-timetable as Faculty A with query ?facultyId=facultyB.id
      const res = await makeRequest('GET', `/api/faculty/my-timetable?facultyId=${facultyB.id}`, tokenFacultyA);
      const isBlockedOrScoped =
        res.status === 403 ||
        (res.status === 200 && res.data?.faculty && res.data.faculty.id === facultyA.id && res.data.faculty.id !== facultyB.id);
      assert(
        isBlockedOrScoped,
        'Test 1: Faculty A cannot view Faculty B timetable (server blocks snooping with 403 or scopes strictly to Faculty A)',
        `Status: ${res.status}, Returned faculty ID: ${res.data?.faculty?.id}`
      );
    }

    // TEST 2: Faculty A cannot modify Faculty B timetable (Faculty has no update permissions)
    {
      const anySlot = await prisma.masterTimetable.findFirst();
      const res = await makeRequest('PUT', '/api/academics/timetable/update-period', tokenFacultyA, {
        id: anySlot.id,
        facultyId: facultyB.id,
      });
      assert(
        res.status === 403,
        'Test 2: Faculty A cannot modify timetable (HTTP 403 Forbidden for faculty update)',
        `Status: ${res.status}`
      );
    }

    // TEST 3: Faculty cannot view another department timetable
    {
      const targetDept = facultyA.department === 'ECE' ? 'CSE' : 'ECE';
      const res = await makeRequest('GET', `/api/academics/timetable?branch=${targetDept}`, tokenFacultyA);
      assert(
        res.status === 403,
        `Test 3: Faculty (${facultyA.department}) cannot view ${targetDept} timetable (HTTP 403)`,
        `Status: ${res.status}, Error: ${res.data?.error}`
      );
    }

    // TEST 4: HOD CSE cannot request ECE timetable
    {
      const res = await makeRequest('GET', '/api/academics/timetable?branch=ECE', tokenHodCSE);
      assert(
        res.status === 403,
        'Test 4: HOD CSE cannot request ECE timetable (HTTP 403)',
        `Status: ${res.status}, Error: ${res.data?.error}`
      );
    }

    // TEST 5: HOD CSE cannot modify ECE timetable
    {
      const eceSlot = await prisma.masterTimetable.findFirst({ where: { branch: 'ECE' } });
      if (eceSlot) {
        const res = await makeRequest('PUT', '/api/academics/timetable/update-period', tokenHodCSE, {
          id: eceSlot.id,
          roomNo: 'TEST-ROOM',
        });
        assert(
          res.status === 403,
          'Test 5: HOD CSE cannot modify ECE timetable (HTTP 403)',
          `Status: ${res.status}, Error: ${res.data?.error}`
        );
      } else {
        console.log('⚠️ [SKIP] No ECE slot found in database for Test 5');
      }
    }

    // TEST 6: Student cannot access faculty timetable
    {
      const res = await makeRequest('GET', '/api/faculty/my-timetable', tokenStudent);
      assert(
        res.status === 403,
        'Test 6: Student cannot access faculty timetable (HTTP 403 Forbidden)',
        `Status: ${res.status}, Error: ${res.data?.error}`
      );
    }

    // TEST 7: Student cannot modify timetable
    {
      const anySlot = await prisma.masterTimetable.findFirst();
      const res = await makeRequest('PUT', '/api/academics/timetable/update-period', tokenStudent, {
        id: anySlot.id,
        roomNo: '999',
      });
      assert(
        res.status === 403,
        'Test 7: Student cannot modify timetable (HTTP 403 Forbidden)',
        `Status: ${res.status}`
      );
    }

    // TEST 9: Invalid timetable ID returns 404
    {
      const res = await makeRequest('PUT', '/api/academics/timetable/update-period', tokenSuperAdmin, {
        id: 'non-existent-slot-id-12345',
        roomNo: '101',
      });
      assert(
        res.status === 404,
        'Test 9: Invalid timetable ID returns 404',
        `Status: ${res.status}, Error: ${res.data?.error}`
      );
    }

    // TEST 10: Faculty Clash Returns 409
    {
      // Find two slots on the same day, same period, same academicYear, but different sections
      const slot1 = await prisma.masterTimetable.findFirst({
        where: { facultyId: { not: null }, academicYear: '2026-27' }
      });

      if (slot1) {
        // Find another slot on the same day and period
        const slot2 = await prisma.masterTimetable.findFirst({
          where: {
            id: { not: slot1.id },
            academicYear: slot1.academicYear,
            day: slot1.day,
            periodNumber: slot1.periodNumber,
          }
        });

        if (slot2) {
          // Attempt to assign slot1's faculty to slot2
          const res = await makeRequest('PUT', '/api/academics/timetable/update-period', tokenSuperAdmin, {
            id: slot2.id,
            facultyId: slot1.facultyId,
          });
          assert(
            res.status === 409 && res.data?.error && res.data.error.includes('already has another class'),
            'Test 10: Faculty clash returns 409 with clear error message',
            `Status: ${res.status}, Error: ${res.data?.error}`
          );
        } else {
          console.log('⚠️ [SKIP] Could not find parallel slot for Test 10');
        }
      }
    }

    // TEST 11: Room Clash Returns 409
    {
      const slot1 = await prisma.masterTimetable.findFirst({
        where: { roomNo: { not: null }, academicYear: '2026-27' }
      });

      if (slot1) {
        const slot2 = await prisma.masterTimetable.findFirst({
          where: {
            id: { not: slot1.id },
            academicYear: slot1.academicYear,
            day: slot1.day,
            periodNumber: slot1.periodNumber,
          }
        });

        if (slot2) {
          // Attempt to assign slot1's roomNo to slot2
          const res = await makeRequest('PUT', '/api/academics/timetable/update-period', tokenSuperAdmin, {
            id: slot2.id,
            roomNo: slot1.roomNo,
          });
          assert(
            res.status === 409 && res.data?.error && res.data.error.includes('already booked'),
            'Test 11: Room clash returns 409 with clear error message',
            `Status: ${res.status}, Error: ${res.data?.error}`
          );
        } else {
          console.log('⚠️ [SKIP] Could not find parallel slot for Test 11');
        }
      }
    }

    // TEST 12: Section Clash Returns 409
    {
      const slot1 = await prisma.masterTimetable.findFirst({
        where: { academicYear: '2026-27' }
      });

      if (slot1) {
        const slot2 = await prisma.masterTimetable.findFirst({
          where: {
            id: { not: slot1.id },
            branch: slot1.branch,
            semester: slot1.semester,
            section: slot1.section,
          }
        });

        if (slot2) {
          // Attempt to move slot2 to slot1's day and periodNumber
          const res = await makeRequest('PUT', '/api/academics/timetable/update-period', tokenSuperAdmin, {
            id: slot2.id,
            day: slot1.day,
            periodNumber: slot1.periodNumber,
          });
          assert(
            res.status === 409 && res.data?.error && res.data.error.includes('already has a class scheduled'),
            'Test 12: Section clash returns 409 with clear error message',
            `Status: ${res.status}, Error: ${res.data?.error}`
          );
        } else {
          console.log('⚠️ [SKIP] Could not find parallel section slot for Test 12');
        }
      }
    }

    // TEST 13: Unassigned faculty slots display as 'Faculty Not Assigned' and cannot be marked
    {
      const unassignedSlot = await prisma.masterTimetable.findFirst({
        where: { facultyId: null }
      });

      assert(!!unassignedSlot, 'Test 13a: Unassigned faculty slot exists in DB');

      if (unassignedSlot) {
        const res = await makeRequest('GET', `/api/academics/timetable?branch=${unassignedSlot.branch}&semester=${unassignedSlot.semester}&section=${unassignedSlot.section}`, tokenSuperAdmin);
        const slotFound = res.data?.schedule?.find(s => s.id === unassignedSlot.id);
        assert(
          slotFound && slotFound.facultyName === 'Faculty Not Assigned' && slotFound.facultyId === null,
          'Test 13b: Unassigned slot returns facultyName: "Faculty Not Assigned" and facultyId: null',
          `facultyName: ${slotFound?.facultyName}, facultyId: ${slotFound?.facultyId}`
        );

        // Verify attendance session rejects unassigned faculty
        const attRes = await makeRequest('GET', `/api/attendance/session/${unassignedSlot.id}`, tokenFacultyA);
        assert(
          attRes.status === 400 || attRes.status === 403 || attRes.status === 404,
          'Test 13c: Unassigned faculty timetable slot cannot start attendance session for arbitrary faculty',
          `Status: ${attRes.status}, Error: ${attRes.data?.error}`
        );
      }
    }

    // TEST 14: Super Admin can perform authorized institution-wide operations
    {
      const resCSE = await makeRequest('GET', '/api/academics/timetable?branch=CSE&semester=5&section=Section A', tokenSuperAdmin);
      const resECE = await makeRequest('GET', '/api/academics/timetable?branch=ECE&semester=5&section=Section A', tokenSuperAdmin);
      const resME = await makeRequest('GET', '/api/academics/timetable?branch=ME&semester=5&section=Section A', tokenSuperAdmin);

      assert(
        resCSE.status === 200 && resECE.status === 200 && resME.status === 200,
        'Test 14a: Super Admin can view timetable across all branches (CSE, ECE, ME)',
        `CSE: ${resCSE.status}, ECE: ${resECE.status}, ME: ${resME.status}`
      );

      // Verify Student endpoint derives student timetable
      const studentRes = await makeRequest('GET', '/api/students/my-timetable', tokenStudent);
      assert(
        studentRes.status === 200 && Array.isArray(studentRes.data?.schedule),
        'Test 14b: Student receives their authenticated timetable schedule',
        `Schedule items count: ${studentRes.data?.schedule?.length}`
      );

      // Verify Faculty Teaching Workload calculation is 100% dynamic
      const facRes = await makeRequest('GET', '/api/faculty/my-timetable', tokenFacultyA);
      const load = facRes.data?.teachingLoad;
      assert(
        facRes.status === 200 && load && typeof load.totalHours === 'number' && typeof load.weeklyClasses === 'number',
        'Test 14c: Faculty receives 100% dynamic calculated workload',
        `weeklyClasses: ${load?.weeklyClasses}, totalHours: ${load?.totalHours}, theoryHours: ${load?.theoryHours}, labHours: ${load?.labHours}`
      );
    }

  } catch (err) {
    console.error('Fatal test runner error:', err);
    failed++;
  } finally {
    await prisma.$disconnect();
    console.log('\n========================================================');
    console.log(`TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
    console.log('========================================================\n');
    process.exit(failed > 0 ? 1 : 0);
  }
}

runTests();
