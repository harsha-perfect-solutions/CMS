const http = require('http');
const jwt = require('jsonwebtoken');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET || 'edusuite_super_secret_key_change_me_in_production';

function request(options, data = null) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => (body += chunk));
      res.on('end', () => {
        let parsed;
        try {
          parsed = JSON.parse(body);
        } catch {
          parsed = body;
        }
        resolve({ status: res.statusCode, data: parsed });
      });
    });
    req.on('error', reject);
    if (data) req.write(typeof data === 'string' ? data : JSON.stringify(data));
    req.end();
  });
}

async function runTests() {
  console.log('=== STARTING ANITS FACULTY TIMETABLE STANDARDIZATION VERIFICATION ===\n');

  // 1. Resolve Dr. Ravi Kumar
  const ravi = await prisma.faculty.findFirst({
    where: { name: { contains: 'Ravi', mode: 'insensitive' } },
  });
  if (!ravi) throw new Error('Dr. Ravi Kumar not found in database!');
  console.log(`Found Faculty: ${ravi.name} (ID: ${ravi.id}, Department: ${ravi.department})`);

  // Resolve another faculty (Faculty B)
  const facultyB = await prisma.faculty.findFirst({
    where: { id: { not: ravi.id } },
  });
  console.log(`Found Faculty B: ${facultyB.name} (ID: ${facultyB.id})`);

  // Create JWT for Dr. Ravi Kumar
  const tokenRavi = jwt.sign(
    { id: ravi.id, email: ravi.email, role: 'faculty', department: ravi.department },
    JWT_SECRET,
    { expiresIn: '1h' }
  );

  // 2. Test GET /api/faculty/my-timetable for Dr. Ravi Kumar
  console.log('\n--- Test 1: Fetching personal timetable for Dr. Ravi Kumar ---');
  const res1 = await request({
    hostname: 'localhost',
    port: 5000,
    path: '/api/faculty/my-timetable',
    method: 'GET',
    headers: { Authorization: `Bearer ${tokenRavi}` },
  });

  console.log(`HTTP Status: ${res1.status}`);
  if (res1.status !== 200) {
    throw new Error(`Expected 200, got ${res1.status}: ${JSON.stringify(res1.data)}`);
  }

  const data = res1.data;
  console.log(`Faculty Name: ${data.faculty?.name}`);
  console.log(`Department: ${data.faculty?.department}`);
  console.log(`Academic Year: ${data.academicYear}`);
  console.log(`Weekly Classes: ${data.teachingLoad?.weeklyClasses}`);
  console.log(`Theory Hours: ${data.teachingLoad?.theoryHours}`);
  console.log(`Lab Hours: ${data.teachingLoad?.labHours}`);
  console.log(`Total Load: ${data.teachingLoad?.totalHours}`);
  console.log(`Total Subjects: ${data.teachingLoad?.totalSubjects}`);
  console.log(`Total Sections: ${data.teachingLoad?.totalSections}`);
  console.log(`Weekly Grid Slots count: ${data.weeklyGrid?.length}`);
  console.log(`Today Schedule items: ${data.todaySchedule?.length}`);

  // Assertions
  if (data.faculty?.name !== ravi.name) throw new Error(`Faculty name mismatch! Got: ${data.faculty?.name}`);
  if (data.teachingLoad?.weeklyClasses !== 14) throw new Error(`Expected 14 weekly classes, got ${data.teachingLoad?.weeklyClasses}`);
  if (data.teachingLoad?.theoryHours !== 10) throw new Error(`Expected 10 theory hours, got ${data.teachingLoad?.theoryHours}`);
  if (data.teachingLoad?.labHours !== 4) throw new Error(`Expected 4 lab hours, got ${data.teachingLoad?.labHours}`);
  if (data.teachingLoad?.totalSubjects !== 4) throw new Error(`Expected 4 subjects, got ${data.teachingLoad?.totalSubjects}`);
  if (data.teachingLoad?.totalSections !== 2) throw new Error(`Expected 2 sections, got ${data.teachingLoad?.totalSections}`);
  if (data.weeklyGrid?.length !== 14) throw new Error(`Expected 14 weekly grid slots, got ${data.weeklyGrid?.length}`);

  // Check sample weekly slot fields
  const slotSample = data.weeklyGrid[0];
  console.log('\nSample Weekly Grid slot:', slotSample);
  if (!slotSample.code || !slotSample.subject || !slotSample.section || !slotSample.room || !slotSample.periodNumber) {
    throw new Error('Weekly slot missing required fields: code, subject, section, room, periodNumber');
  }

  // Check today's schedule has attendanceSubmitted flag
  if (data.todaySchedule?.length > 0) {
    const todaySample = data.todaySchedule[0];
    console.log('\nSample Today Schedule slot:', todaySample);
    if (todaySample.attendanceSubmitted === undefined) {
      throw new Error('todaySchedule slot missing attendanceSubmitted property!');
    }
  }

  console.log('✓ Test 1 Passed: Faculty Personal Timetable values derived dynamically from MasterTimetable.');

  // 3. Test Security: Faculty A trying to inspect Faculty B via ?facultyId=
  console.log('\n--- Test 2: Security - Cross-faculty access block ---');
  const resSecurity = await request({
    hostname: 'localhost',
    port: 5000,
    path: `/api/faculty/my-timetable?facultyId=${facultyB.id}`,
    method: 'GET',
    headers: { Authorization: `Bearer ${tokenRavi}` },
  });

  console.log(`Cross-faculty request status: ${resSecurity.status}`);
  if (resSecurity.status !== 403) {
    throw new Error(`Expected 403 Forbidden for cross-faculty query, got ${resSecurity.status}`);
  }
  console.log('✓ Test 2 Passed: Cross-faculty inspection blocked with 403 Forbidden.');

  // 4. Test Institution Timetable compatibility (Super Admin / HOD)
  console.log('\n--- Test 3: Master Timetable institution-wide compatibility ---');
  const tokenAdmin = jwt.sign(
    { id: 'admin-1', role: 'super_admin' },
    JWT_SECRET,
    { expiresIn: '1h' }
  );
  const resAdmin = await request({
    hostname: 'localhost',
    port: 5000,
    path: '/api/academics/timetable?branch=CSE&semester=5&section=Section%20A',
    method: 'GET',
    headers: { Authorization: `Bearer ${tokenAdmin}` },
  });
  console.log(`Admin MasterTimetable status: ${resAdmin.status}, schedule length: ${resAdmin.data?.schedule?.length}`);
  if (resAdmin.status !== 200 || !Array.isArray(resAdmin.data?.schedule)) {
    throw new Error('Super Admin MasterTimetable endpoint failed or broke!');
  }
  console.log('✓ Test 3 Passed: Institutional MasterTimetable remains intact.');

  // 5. Test Student Timetable compatibility
  console.log('\n--- Test 4: Student Timetable compatibility ---');
  const student = await prisma.student.findFirst({
    where: { department: 'CSE', semester: 5 },
  });
  if (student) {
    const tokenStudent = jwt.sign(
      { id: student.id, email: student.email, role: 'student' },
      JWT_SECRET,
      { expiresIn: '1h' }
    );
    const resStudent = await request({
      hostname: 'localhost',
      port: 5000,
      path: '/api/students/my-timetable',
      method: 'GET',
      headers: { Authorization: `Bearer ${tokenStudent}` },
    });
    console.log(`Student timetable status: ${resStudent.status}`);
    if (resStudent.status !== 200) {
      throw new Error(`Student timetable endpoint failed with status ${resStudent.status}`);
    }
    console.log('✓ Test 4 Passed: Student Timetable remains fully operational.');
  }

  console.log('\n=== ALL STANDARDIZATION TESTS COMPLETED SUCCESSFULLY! ===');
}

runTests()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('\n❌ Test Failure:', err);
    process.exit(1);
  });
