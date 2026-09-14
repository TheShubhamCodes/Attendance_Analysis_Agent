Attendance Analysis Agent

An AI-powered college attendance management and analysis platform designed to help educational institutions manage attendance, monitor students, identify attendance risks, and support timely interventions.

🚀 Overview

The Attendance Analysis Agent combines attendance management, analytics, role-based access control, Excel-based attendance uploads, OD/Leave management, and an AI-powered database assistant into a single platform.

The system is designed for multiple users including:

Admin
Dean
HOD
Faculty
Mentor
Student
Parent
Examination Section

Each role gets access only to the features and data relevant to its responsibilities.

✨ Key Features
📊 Attendance Management
Manual attendance marking
Department, section, year, semester, date, period, subject, and faculty selection
Present/Absent tracking
Subject-wise attendance
Student-wise attendance
Attendance percentage calculation
Raw and adjusted attendance tracking
📁 Excel Attendance Upload

Faculty can upload attendance using Excel files.

The system validates:

Registration number
Student name
Department
Section
Year
Semester
Attendance status
Duplicate records
Existing attendance sessions
Required fields and file structure

All-or-nothing validation:
If even one record is invalid, the complete upload is rejected. No partial attendance is inserted.

🤖 Attendance Analysis Agent

The built-in AI agent allows authorized users to ask natural-language questions about stored college data.

Examples:

Show Rohan Verma
What is his attendance?
Show students below 75%
Which students are at risk?
Show attendance trends
Which students need intervention?
Give me a summary of my assigned students

The agent works only with authorized data available in the system and should not invent information.

🎯 At-Risk Student Detection

The system can identify students who may require attention based on factors such as:

Low attendance percentage
Attendance shortage
Declining attendance trends
Projected attendance
Improvement or deterioration over time
👨‍🏫 Mentor Management

Mentors can monitor their assigned students through:

My Students
Attendance Overview
At-Risk Students
Attendance Trends
Interventions
Reports
Database-grounded Agent

Mentors cannot mark or upload attendance unless explicitly granted that permission.

📝 OD / Approved Leave

Students can submit:

On-Duty requests
Approved Leave requests

Workflow:

Student
   ↓
Submit Request
   ↓
Faculty / HOD Review
   ↓
Approve / Reject
   ↓
Attendance Adjustment

Approved OD/Leave does not modify the original attendance record. Instead, it is used when calculating adjusted attendance.

🕒 Timetable

The system provides a view-only timetable for authorized users.

Timetable access is role-based:

Role	Access
Admin	All sections
HOD	Department sections
Faculty	Authorized sections
Mentor	Authorized sections
Student	Own section
Parent	Linked child's section

The timetable is independent of attendance marking and is not used to automatically determine the subject, period, or attendance availability.

👥 Role-Based Access

The backend enforces permissions for each role.

For example:

Students can access their own information.
Parents can access linked children's information.
Mentors can access assigned students.
Faculty can access authorized students.
HODs can access department-level information.
Admin manages the overall system.
⚙️ User Settings

Each user has:

Dark Mode
Notifications ON/OFF
Change Password
Profile
Logout

Settings are stored per user.

📈 Reports & Analytics

The platform can provide:

Student attendance reports
Subject-wise attendance
Section-level statistics
Attendance shortage reports
At-risk student reports
Attendance trends
Mentor intervention reports
OD/Leave information
🏗️ System Architecture
                    ┌─────────────────────┐
                    │      Frontend       │
                    │  Web Application    │
                    └──────────┬──────────┘
                               │
                               ▼
                    ┌─────────────────────┐
                    │      Backend        │
                    │ APIs + Auth + RBAC  │
                    └──────────┬──────────┘
                               │
             ┌─────────────────┼─────────────────┐
             ▼                 ▼                 ▼
      ┌─────────────┐   ┌─────────────┐   ┌─────────────┐
      │ Attendance  │   │ OD / Leave  │   │   Users &   │
      │ Management  │   │ Management  │   │   Roles     │
      └─────────────┘   └─────────────┘   └─────────────┘
             │                 │                 │
             └─────────────────┼─────────────────┘
                               ▼
                    ┌─────────────────────┐
                    │      Database       │
                    │  Source of Truth    │
                    └──────────┬──────────┘
                               │
                               ▼
                    ┌─────────────────────┐
                    │  Attendance Agent   │
                    │ Natural Language QA  │
                    └─────────────────────┘
🔐 Security & Authorization

The application follows role-based authorization principles.

Important security requirements include:

Backend-enforced permissions
Secure password hashing
No plaintext passwords
Session authentication
Protected API routes
User-specific data access
Student/parent relationship validation
Mentor-student assignment validation
Audit logging for important changes
No unrestricted database access for the AI agent
🧪 Demo & Production Data

The project can maintain separate demo and production data.

Demo Environment
    ↓
Seed / Restore Demo Data

Production Environment
    ↓
Real College Data

Demo data should not automatically recreate itself every time the production application starts.

A database backup can also be maintained so previously used demo data can be restored when required.

🛠️ Tech Stack

Update this section according to the technologies actually used in the project.

Frontend

React
JavaScript
HTML
CSS

Backend

Node.js
Express.js

Database

MongoDB

AI

LLM-based attendance analysis agent
Controlled backend APIs/tools for database access

Other

Excel processing
REST APIs
Role-Based Access Control
Authentication & Authorization
📂 Project Structure

Example structure:

attendance-analysis-agent/
│
├── frontend/
│   ├── src/
│   ├── components/
│   ├── pages/
│   └── services/
│
├── backend/
│   ├── controllers/
│   ├── routes/
│   ├── models/
│   ├── middleware/
│   ├── services/
│   └── utils/
│
├── database/
│   ├── schema/
│   └── demo-seed/
│
├── uploads/
│
├── README.md
├── package.json
└── .gitignore
🚀 Getting Started
1. Clone the repository
git clone <repository-url>
cd attendance-analysis-agent
2. Install dependencies
npm install

If frontend and backend have separate dependencies:

cd frontend
npm install

cd ../backend
npm install
3. Configure environment variables

Create a .env file:

PORT=5000
DATABASE_URL=your_database_url
JWT_SECRET=your_secret
AI_API_KEY=your_ai_api_key

Never commit .env files or API keys to GitHub.

4. Start the application
npm run dev

Or start frontend and backend separately according to the project configuration.

📌 Attendance Upload Flow
Faculty
   ↓
Upload Attendance
   ↓
Select Academic Details
   ↓
Upload Excel
   ↓
Validate Entire File
   ↓
 ┌───────────────┐
 │ Any Error?    │
 └───────┬───────┘
         │
    Yes  │  No
     ↓   │   ↓
 Reject  │ Preview
 Entire  │   ↓
 Upload  │ Confirm
         │   ↓
         │ Import
         │   ↓
         │ Attendance Saved
🧠 Agent Data Flow
User Question
      ↓
Authentication
      ↓
Role & Permission Check
      ↓
Intent Detection
      ↓
Controlled Backend Tool/API
      ↓
Database Query
      ↓
Result Validation
      ↓
Natural Language Response

The agent should prioritize exact registration-number searches before broader searches.

For example:

"Show Rohan Verma (241FA04326)"

should perform an exact student lookup using:

241FA04326

rather than returning a complete attendance list.

📋 Current Development Principles
Database is the source of truth.
No hallucinated student or attendance information.
Backend authorization is mandatory.
No partial Excel imports.
Timetable remains independent from attendance logic.
Raw attendance records are preserved.
Approved OD/Leave affects adjusted attendance only.
Production data and demo data should remain separate.
Existing functionality should not be removed when new features are added.
🔮 Future Improvements

Possible future enhancements include:

Advanced attendance forecasting
Automated intervention recommendations
Email/SMS/WhatsApp notifications
Parent communication workflows
Attendance shortage prediction
Advanced analytics dashboards
Institution-wide analytics
Automated report generation
Multi-department support
Cloud deployment and monitoring
📄 License

This project is currently developed as an academic/portfolio project.

Add your preferred license here, such as MIT License, before publishing it as an open-source project.

👨‍💻 Author

Shubham Kumar

B.Tech CSE
Vignan University
