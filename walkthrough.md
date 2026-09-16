# EduSuite Pro — Feature Walkthrough & Verification Report
**Feature:** Complete Personal Faculty Leave Workspace  
**Module:** Faculty → Leave (`/faculty/leave`)  
**Backend:** Express.js REST API + Standalone PostgreSQL via Prisma ORM  
**Date:** September 11, 2026  

---

## 1. Executive Summary

We have converted the **Faculty → Leave** page into a complete, production-grade **Personal Faculty Leave Workspace**.

The previous placeholder view that displayed static mock numbers (`Casual Leave: 8 / 12 Days`, `Sick Leave: 12 / 15 Days`, `Duty Leave: 2 Remaining`, `Pending Approvals: 2 Requests`, mock request ID `LV-2026-001`, and hardcoded reviewer `Dr. Rajesh Sharma`) has been eliminated. The page is now driven strictly by live PostgreSQL data, authenticated JWT sessions, and the institutional `ApprovalRequest` workflow.

### Complete Architecture & Workflow:
```
Authenticated Faculty (faculty@cms.com, Dr. Ravi Kumar)
        ↓ [JWT Bearer Auth - req.userId]
Faculty Profile Resolution & Read-Only Department (Computer Science & Engineering)
        ↓
Real Leave Balances & Quotas (FacultyLeaveBalance model in PostgreSQL)
        ↓
[ + Apply for Leave ] Modal
        ↓
Client & Server Validations (Dates, Leave Quotas, Overlapping Requests)
        ↓
Live MasterTimetable Conflict Check (flags conflicting teaching sessions)
        ↓
Atomic Database Transaction (FacultyLeave + ApprovalRequest + AuditLog)
        ↓
HOD & Institutional Approval Workflow / Self-Withdrawal by Faculty
        ↓
Real-Time Dynamic Update of Quotas, Timeline, and Upcoming Leave
```

---

## 2. Key Changes & Features Implemented

### A. Database Schema (`edusuite-backend/prisma/schema.prisma`)
1. **`model FacultyLeave`**:
   - Fields: `id`, `requestNumber` (e.g. `LV-2026-001`), `facultyId`, `academicYear`, `department`, `leaveType`, `startDate`, `endDate`, `days`, `isHalfDay`, `halfDaySession`, `reason`, `emergencyContact`, `additionalNotes`, `attachmentName`, `status` (`SUBMITTED`, `HOD_REVIEW`, `APPROVED`, `REJECTED`, `WITHDRAWN`, `CANCELLED`), `rejectionReason`, `approvedBy`, `approvedAt`, `timetableConflicts` (JSON), `createdAt`, `updatedAt`.
   - Relations: linked directly to `Faculty` and `ApprovalRequest`.
2. **`model FacultyLeaveBalance`**:
   - Fields: `id`, `facultyId`, `academicYear`, `leaveType` (Casual, Sick, Earned, Duty), `entitlement`, `used`, `pending`, `createdAt`, `updatedAt`.
   - Linked to `Faculty` with compound unique constraint `@@unique([facultyId, academicYear, leaveType])`.
3. **`model ApprovalRequest`**:
   - Added optional relation `facultyLeaveId` / `facultyLeave` to seamlessly link institutional approval records.

### B. Backend REST APIs (`/api/faculty/leave`)
1. **`GET /api/faculty/leave/workspace`**:
   - Resolves authenticated faculty strictly from `req.userId` (ignores any client-supplied `facultyId` or `departmentId`).
   - Retrieves faculty's read-only department, academic year (`2026-27`), quota balances, request history, stats, and active timeline.
2. **`GET /api/faculty/leave/check-conflicts`**:
   - Inspects `MasterTimetable` for the faculty member during the requested date range.
   - Returns date, day, course code, course name, section, period number, room, and time of any conflicting teaching sessions.
3. **`POST /api/faculty/leave`**:
   - Validates date ranges (start <= end).
   - Prevents overlapping active requests (returns **HTTP 409 Conflict**).
   - Validates available balance (`entitlement - used - pending >= requestedDays`, returns **HTTP 422 Unprocessable Entity** if insufficient).
   - Executes atomic transaction: creates `FacultyLeave`, creates `ApprovalRequest` (`FACULTY_LEAVE` workflow), and increments `pending` in `FacultyLeaveBalance`.
   - Records audit log (`LEAVE_REQUEST_CREATED`).
4. **`GET /api/faculty/leave/:id`**:
   - Scoped strictly to the owner faculty (returns **HTTP 403 Forbidden** if accessing another faculty's leave).
5. **`POST /api/faculty/leave/:id/withdraw`**:
   - Allows faculty to withdraw pending requests.
   - Releases pending quota, updates `ApprovalRequest` to `CANCELLED`, and logs audit trail.
6. **Workflow Engine Integration (`/api/approvals/:id/approve` & `reject`)**:
   - When HOD/HR completes approval: marks leave `APPROVED`, increments `used`, and decrements `pending`.
   - On rejection: marks leave `REJECTED`, decrements `pending`, and records reviewer comments.

### C. Frontend Workspace UI (`/faculty/leave`)
1. **Header & Context**:
   - Title changed to **"My Leave & Absence"**.
   - Subtitle: **"Apply for leave, view your leave balance, and track approval status."**
   - Read-only department badge: `Department: Computer Science & Engineering`.
   - Prominent primary action button: **`[ + Apply for Leave ]`**.
   - Functional toolbar: `[Refresh]` (with loading spinner) and `[Export]` (exports CSV of authenticated faculty's leave records).
2. **Dynamic Summary KPI Cards**:
   - Casual Leave (`12 / 12 Days`)
   - Sick Leave (`15 / 15 Days`)
   - Earned Leave (`10 / 10 Days`)
   - Duty Leave (`2 Remaining`)
   - Pending Approvals (`X Requests`)
   - Upcoming Leave (`No upcoming leaves` or date range)
3. **Leave Quota Balances**:
   - Dynamically mapped from `FacultyLeaveBalance` in PostgreSQL.
   - Displays remaining days, used days, pending days, max limit, and progress bar with usage percentage.
4. **My Leave Requests Table & Filters**:
   - Search by Request ID, reason, or leave type.
   - Filters for Leave Type, Status, and Academic Year.
   - Desktop and mobile-responsive card view.
   - `[View]` button to open full Dossier dialog.
   - `[Withdraw]` button for eligible pending requests.
5. **Apply for Leave Modal**:
   - Dynamic leave type selection with live available quota indicator.
   - Start Date and End Date pickers with automatic duration calculation.
   - Half-day option (Morning/Afternoon).
   - **Live Timetable Conflict Warning**: Queries backend in real-time as dates are selected, displaying affected teaching classes (`Date, Day, Period, Subject, Section, Time`).
   - Insufficient balance alert disabling submission if requested days exceed available quota.
   - Emergency contact and reason fields.
   - Double-submission prevention with loading state.
6. **Active Request Timeline**:
   - Dynamic timeline showing the stages of the active request: `Faculty Leave Application`, `HOD Review & Substitute Check`, `HR Verification & Leave Sanction`.
   - Displays actual review actors and remarks from the institutional `ApprovalRequest`.

---

## 3. End-to-End Verification Results

### Automated Test Run (`scratch/test_faculty_leave_e2e.cjs`):
```bash
=== Starting End-to-End Personal Faculty Leave Test ===

1. Logging in as faculty@cms.com...
   Logged in as: Dr. Ravi Kumar

2. Fetching Personal Faculty Leave Workspace...
   Success: true
   Faculty: Dr. Ravi Kumar (FAC-CSE)
   Department (read-only): Computer Science & Engineering
   Academic Year: 2026-27
   Total Requests: 3
   Pending Count: 1
   Leave Balances:
     - Casual Leave: 12 remaining, 0 used, 3 pending (Entitlement: 12)
     - Duty Leave: 2 remaining, 3 used, 0 pending (Entitlement: 5)
     - Earned Leave: 10 remaining, 0 used, 0 pending (Entitlement: 10)
     - Sick Leave: 15 remaining, 0 used, 0 pending (Entitlement: 15)

3. Testing Insufficient Balance (requesting 99 days of Casual Leave)...
   PASSED: HTTP 422 returned as expected: "Insufficient Casual Leave balance."

4. Checking Timetable Conflict endpoint...
   Conflicts found for 2026-09-18: 3
     - [2026-09-18 Friday] Period 1: CS401 (Section A) at 08:45 AM - 09:45 AM
     - [2026-09-18 Friday] Period 2: CS302 (Section A) at 09:45 AM - 10:45 AM
     - [2026-09-18 Friday] Period 5: CS501 (Section B) at 01:30 PM - 02:30 PM

5. Submitting a valid 1-day Casual Leave request for 2026-10-15...
   Created Leave: 350053d5-ec90-4788-a5ae-0f197bc2d808 (Status: HOD_REVIEW)
   Message: Leave request LV-2026-004 submitted successfully!

6. Testing Duplicate/Overlapping Leave Prevention for 2026-10-15...
   PASSED: HTTP 409 returned as expected: "You already have an active leave request overlapping these dates."

7. Verifying pending quota increment in workspace...
   Casual Leave Pending Quota: 4 (Remaining: 12)

8. Withdrawing leave request 350053d5-ec90-4788-a5ae-0f197bc2d808...
   Withdraw Response: Leave request LV-2026-004 has been withdrawn.

9. Verifying pending quota released in workspace...
   Casual Leave Pending Quota: 3 (Remaining: 12)

10. Testing Security - Faculty cannot access or modify unauthorized leave...
   PASSED: Backend strictly derives identity from JWT, ignoring ?facultyId and ?departmentId query parameters!

=== All Tests Passed Successfully! ===
```

### Frontend Production Build:
- Ran `npm run build` in `edusuite-frontend`.
- Output: `.output/server/_ssr/faculty.leave-iIvTFddD.mjs` built in 4.81s.
- **Exit Code: 0** (No TypeScript or linting errors).
