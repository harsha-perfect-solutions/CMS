# ANITS ERP — Exam Notifications First-Class Module Walkthrough

**Module:** Super Admin & HOD Exam Notifications (`/anits/exam-notifications`)  
**Institution:** Anil Neerukonda Institute of Technology and Sciences (ANITS)  
**Backend:** Express.js REST API + Standalone PostgreSQL via Prisma ORM  
**Date:** September 22, 2026  

---

## 1. Overview of Changes

The **Exam Notifications** module is now integrated as a first-class citizen in the **ANITS ERP** portal:
1. **Sidebar Navigation (`AnitsSidebar`)**:
   - Added directly below **Attendance** and above **Classes & Cohorts** for Super Admin (`ANITS_ADMIN`).
   - Added below **Attendance** and above **Reports** for HOD.
   - Highlights cleanly when active on `/anits/exam-notifications`.
   - Includes real-time **Unread Notification Badge** displaying count of unread notifications from PostgreSQL.
2. **Dashboard Cockpit Integration (`anits.dashboard.tsx`)**:
   - Added quick-action **Exam Notifications** button in the top action bar alongside "Refresh", "Master Timetable", and "Open Full Attendance Ledger".
3. **Dedicated Management Page (`/anits/exam-notifications`)**:
   - Header with Title: `EXAM NOTIFICATIONS`, Subtitle: `"Publish and manage examination notifications across ANITS."`
   - Actions: `+ Create Exam Notification` modal trigger, `Refresh` (re-queries PostgreSQL), and `Export` (CSV export).
   - Dynamic PostgreSQL Summary Cards:
     - **Total Notifications**: Aggregated count of notification batches.
     - **Published**: Count of active dispatched announcements.
     - **Scheduled**: Count of scheduled/upcoming exam sessions.
     - **Unread / Pending Attention**: Total unread recipient count awaiting student/faculty review.
4. **Create Exam Notification Modal**:
   - 10 Authoritative Types:
     - *Exam Schedule Published*
     - *Exam Date Changed*
     - *Exam Time Changed*
     - *Exam Venue Changed*
     - *Hall Ticket Available*
     - *Exam Reminder*
     - *Exam Eligibility Alert*
     - *Exam Postponed*
     - *Exam Cancelled*
     - *Results Published*
   - Dynamic Title & Message templates populated automatically upon Type selection.
   - Fields: Title, Message, Academic Year (`2026-27`), Semester (`1` to `8`), Department (dropdown for Super Admin; locked to authenticated department for HOD), Section (`A`, `B`, `C`, `D`, `ALL`), Course / Subject (filtered dynamically from PostgreSQL matching department & semester), Exam Date, Exam Time, Venue, Priority (`Urgent`, `High`, `Medium`, `Low`), Recipient Scope (`Entire Institution`, `Department`, `Semester`, `Section`, `Course`, `Students`, `Faculty`, `HOD`).
   - **Live Recipient Forecast Preview**: Queries `/api/notifications/exam/preview-recipients` in real-time, showing total recipient count, student breakdown, faculty breakdown, and HOD breakdown before dispatch.
5. **PostgreSQL-Backed Exam Notification History**:
   - Interactive table with filters: Search (title, course, sender), Type, Department, Semester, Status, Scope, and Date.
   - Columns: Date, Title (with priority badges), Type, Department, Semester, Course, Target Scope, Recipients count, Status badge, Read Rate (% with visual progress bar), Actions (`View Details` dossier modal, `Cancel Notification` with audit logging).
6. **Notification Bell & Real-Time Sync**:
   - Top-right bell in `AnitsHeader` and sidebar badge listen to `exam-notification-refresh` window events and instantly update without page reload.

---

## 2. Network & Access Links

| Portal / Page | Localhost Link | Network (LAN) Link |
| :--- | :--- | :--- |
| **ANITS Exam Notifications** | [http://localhost:8080/anits/exam-notifications](http://localhost:8080/anits/exam-notifications) | [http://192.168.1.108:8080/anits/exam-notifications](http://192.168.1.108:8080/anits/exam-notifications) |
| **ANITS Main Dashboard** | [http://localhost:8080/anits/dashboard](http://localhost:8080/anits/dashboard) | [http://192.168.1.108:8080/anits/dashboard](http://192.168.1.108:8080/anits/dashboard) |
| **ANITS Portal Login** | [http://localhost:8080/anits/login](http://localhost:8080/anits/login) | [http://192.168.1.108:8080/anits/login](http://192.168.1.108:8080/anits/login) |
| **Backend REST API** | [http://localhost:5000/](http://localhost:5000/) | [http://192.168.1.108:5000/](http://192.168.1.108:5000/) |

---

## 3. Demo Role Credentials

- **Super Admin**: `admin@cms.com` / `admin123`
  - Possesses institution-wide scope and authority across all departments.
- **HOD (CSE)**: `hod.cse@anits.edu.in` / `hod123`
  - Locked strictly to CSE department (attempts to broadcast cross-department or institution-wide return HTTP 403 Forbidden).
- **Faculty**: `faculty.cse@anits.edu.in` / `faculty123`
  - Receives assigned exam duties and course schedule alerts.
- **Student**: `student.cse@anits.edu.in` / `student123`
  - Receives cohort exam timetables, venue updates, and hall tickets.

---

## 4. Verification Results

All 14 integration test checks passed:
1. Super Admin context resolution.
2. HOD context resolution (CSE).
3. Student context resolution (CSE).
4. PostgreSQL Meta options retrieval (8 departments, courses).
5. Dynamic Recipient Preview (CSE Sem 5 -> students, faculty, HOD).
6. Security enforcement: HOD institution-wide broadcast blocked (403 Forbidden).
7. Security enforcement: HOD cross-department notice blocked (403 Forbidden).
8. Super Admin published canonical notice: atomic PostgreSQL insert.
9. Verified database records in table `Notification`.
10. Notice delivered to student cohort members.
11. Mark as read verified (`readAt` timestamp stored).
12. Aggregated history verified (Total, Read, Unread, Status).
13. Batch recall verified (`status = 'Cancelled'`).
14. AuditLog verification: recorded `EXAM_NOTIFICATION_PUBLISHED` and `EXAM_NOTIFICATION_CANCELLED`.
