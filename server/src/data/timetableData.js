/**
 * Official View-Only Academic Timetable Data
 * Visual Source of Truth: Original Section A & Section B College Routines
 *
 * Strictly View-Only: Decoupled completely from attendance.
 */

const PERIODS = [
  { periodNumber: 1, periodId: 'P1', timeSlot: '8:15–9:05', startTime: '08:15', endTime: '09:05', isBreak: false },
  { periodNumber: 2, periodId: 'P2', timeSlot: '9:05–9:55', startTime: '09:05', endTime: '09:55', isBreak: false },
  { periodNumber: 3, periodId: 'P3', timeSlot: '9:55–10:45', startTime: '09:55', endTime: '10:45', isBreak: false },
  { periodNumber: 0, periodId: 'BREAK1', timeSlot: '10:45–11:00', startTime: '10:45', endTime: '11:00', isBreak: true, label: 'Morning Break' },
  { periodNumber: 4, periodId: 'P4', timeSlot: '11:00–11:50', startTime: '11:00', endTime: '11:50', isBreak: false },
  { periodNumber: 5, periodId: 'P5', timeSlot: '11:50–12:40', startTime: '11:50', endTime: '12:40', isBreak: false },
  { periodNumber: 0, periodId: 'BREAK2', timeSlot: '12:40–1:30', startTime: '12:40', endTime: '13:30', isBreak: true, label: 'Lunch Break' },
  { periodNumber: 6, periodId: 'P6', timeSlot: '1:30–2:20', startTime: '13:30', endTime: '14:20', isBreak: false },
  { periodNumber: 7, periodId: 'P7', timeSlot: '2:20–3:10', startTime: '14:20', endTime: '15:10', isBreak: false },
  { periodNumber: 8, periodId: 'P8', timeSlot: '3:10–4:00', startTime: '15:10', endTime: '16:00', isBreak: false },
];

const DAYS = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'];

const SUBJECT_CATALOG = {
  ML: { code: 'ML', name: 'Machine Learning', defaultType: 'Theory' },
  CN: { code: 'CN', name: 'Computer Networks', defaultType: 'Theory' },
  CV: { code: 'CV', name: 'Computer Vision', defaultType: 'Theory' },
  OT: { code: 'OT', name: 'Optimization Techniques', defaultType: 'Theory' },
  CE: { code: 'CE', name: 'Cloud & Edge Computing', defaultType: 'Theory' },
  CC: { code: 'CC', name: 'Cloud Computing', defaultType: 'Theory' },
  DAV: { code: 'DAV', name: 'Data Analytics and Visualization', defaultType: 'Theory' },
  'PC LAB': { code: 'PC LAB', name: 'Professional Communication / PC Lab', defaultType: 'Practical' },
  COUN: { code: 'COUN', name: 'Counseling & Mentoring', defaultType: 'Activity' },
  TRAINING: { code: 'TRAINING', name: 'Placement & Technical Training', defaultType: 'Activity' },
  LIB: { code: 'LIB', name: 'Library & Research', defaultType: 'Activity' },
  NPTEL: { code: 'NPTEL', name: 'NPTEL / MOOC Online Course', defaultType: 'Activity' },
  PROJECT: { code: 'PROJECT', name: 'Experiential Learning / Self Learning / Project', defaultType: 'Activity' },
  'NO REGULAR CLASS': { code: 'NO REGULAR CLASS', name: 'No Regular Class', defaultType: 'Free' },
};

function createSlot(code, type, room = null, options = {}) {
  const meta = SUBJECT_CATALOG[code] || { name: code, defaultType: type || 'Theory' };
  return {
    code,
    name: meta.name,
    type: type || meta.defaultType, // "Lecture", "Tutorial", "Practical", "Activity", "Break", "Free"
    room: room || null,
    isBreak: false,
    ...options,
  };
}

const BREAK_MORNING = {
  code: 'BREAK',
  name: 'Morning Break',
  type: 'Break',
  room: null,
  isBreak: true,
};

const BREAK_LUNCH = {
  code: 'BREAK',
  name: 'Lunch Break',
  type: 'Break',
  room: null,
  isBreak: true,
};

const PROJECT_SLOT = createSlot(
  'PROJECT',
  'Activity',
  null,
  { label: 'EXPERIENTIAL LEARNING / SELF LEARNING / PROJECT' }
);

// SECTION A SCHEDULE
const SECTION_A_ROUTINE = {
  MONDAY: [
    createSlot('ML', 'Tutorial', 'N-306'),
    createSlot('COUN', 'Activity', 'N-306'),
    createSlot('COUN', 'Activity', 'N-306'),
    BREAK_MORNING,
    createSlot('CV', 'Tutorial'),
    createSlot('CV', 'Tutorial'),
    BREAK_LUNCH,
    createSlot('OT', 'Tutorial', 'N-407'),
    createSlot('OT', 'Tutorial', 'N-407'),
    PROJECT_SLOT,
  ],
  TUESDAY: [
    createSlot('CN', 'Lecture', 'N-306'),
    createSlot('CE', 'Tutorial', 'N-306'),
    createSlot('CE', 'Tutorial', 'N-306'),
    BREAK_MORNING,
    createSlot('CC', 'Lecture', 'N-408'),
    createSlot('CV', 'Lecture', 'N-408'),
    BREAK_LUNCH,
    createSlot('DAV', 'Lecture'),
    createSlot('ML', 'Lecture'),
    PROJECT_SLOT,
  ],
  WEDNESDAY: [
    createSlot('CV', 'Lecture', 'N-507'),
    createSlot('TRAINING', 'Activity', 'N-507'),
    createSlot('TRAINING', 'Activity', 'N-507'),
    BREAK_MORNING,
    createSlot('DAV', 'Lecture'),
    createSlot('CC', 'Lecture'),
    BREAK_LUNCH,
    createSlot('CN', 'Tutorial', 'N-407'),
    createSlot('CN', 'Tutorial', 'N-407'),
    PROJECT_SLOT,
  ],
  THURSDAY: [
    createSlot('CV', 'Practical'),
    createSlot('LIB', 'Activity', 'N-408'),
    createSlot('LIB', 'Activity', 'N-408'),
    BREAK_MORNING,
    createSlot('ML', 'Lecture'),
    createSlot('OT', 'Lecture'),
    BREAK_LUNCH,
    createSlot('NPTEL', 'Activity'),
    createSlot('NPTEL', 'Activity'),
    PROJECT_SLOT,
  ],
  FRIDAY: [
    createSlot('CN', 'Lecture'),
    createSlot('TRAINING', 'Activity'),
    createSlot('TRAINING', 'Activity'),
    BREAK_MORNING,
    createSlot('PC LAB', 'Practical', 'N-505'),
    createSlot('PC LAB', 'Practical', 'N-505'),
    BREAK_LUNCH,
    createSlot('ML', 'Practical'),
    createSlot('ML', 'Practical'),
    PROJECT_SLOT,
  ],
  SATURDAY: [
    createSlot('OT', 'Lecture'),
    createSlot('TRAINING', 'Activity'),
    createSlot('TRAINING', 'Activity'),
    BREAK_MORNING,
    createSlot('CN', 'Practical'),
    createSlot('CN', 'Practical'),
    BREAK_LUNCH,
    createSlot('DAV', 'Practical'),
    createSlot('DAV', 'Practical'),
    PROJECT_SLOT,
  ],
};

// SECTION B SCHEDULE
const SECTION_B_ROUTINE = {
  MONDAY: [
    createSlot('CN', 'Lecture'),
    createSlot('NPTEL', 'Activity'),
    createSlot('NPTEL', 'Activity'),
    BREAK_MORNING,
    createSlot('CN', 'Practical', 'N-415'),
    createSlot('CN', 'Practical', 'N-415'),
    BREAK_LUNCH,
    createSlot('ML', 'Lecture'),
    createSlot('CC', 'Lecture'),
    PROJECT_SLOT,
  ],
  TUESDAY: [
    createSlot('PC LAB', 'Practical', 'N-507'),
    createSlot('DAV', 'Numerical', 'N-507'),
    createSlot('DAV', 'Numerical', 'N-507'),
    BREAK_MORNING,
    createSlot('CN', 'Tutorial'),
    createSlot('CN', 'Tutorial'),
    BREAK_LUNCH,
    createSlot('OT', 'Tutorial'),
    createSlot('OT', 'Tutorial'),
    PROJECT_SLOT,
  ],
  WEDNESDAY: [
    createSlot('DAV', 'Practical', 'N-506'),
    createSlot('ML', 'Lecture', 'N-506'),
    createSlot('ML', 'Lecture', 'N-506'),
    BREAK_MORNING,
    createSlot('CN', 'Lecture'),
    createSlot('CV', 'Lecture'),
    BREAK_LUNCH,
    createSlot('TRAINING', 'Activity', 'N-417'),
    createSlot('TRAINING', 'Activity', 'N-417'),
    PROJECT_SLOT,
  ],
  THURSDAY: [
    createSlot('OT', 'Lecture'),
    createSlot('ML', 'Tutorial'),
    createSlot('ML', 'Tutorial'),
    BREAK_MORNING,
    createSlot('CN', 'Lecture', 'N-415'),
    createSlot('CV', 'Lecture', 'N-415'),
    BREAK_LUNCH,
    createSlot('CE', 'Tutorial'),
    createSlot('CE', 'Tutorial'),
    PROJECT_SLOT,
  ],
  FRIDAY: [
    createSlot('CV', 'Tutorial'),
    createSlot('COUN', 'Activity'),
    createSlot('COUN', 'Activity'),
    BREAK_MORNING,
    createSlot('OT', 'Lecture'),
    createSlot('DAV', 'Lecture'),
    BREAK_LUNCH,
    createSlot('TRAINING', 'Activity', 'N-417'),
    createSlot('TRAINING', 'Activity', 'N-417'),
    PROJECT_SLOT,
  ],
  SATURDAY: [
    createSlot('ML', 'Practical', 'N-506'),
    createSlot('LIB', 'Activity'),
    createSlot('LIB', 'Activity'),
    BREAK_MORNING,
    createSlot('CV', 'Practical', 'N-515'),
    createSlot('CV', 'Practical', 'N-515'),
    BREAK_LUNCH,
    createSlot('NO REGULAR CLASS', 'Free'),
    createSlot('NO REGULAR CLASS', 'Free'),
    PROJECT_SLOT,
  ],
};

const TIMETABLES = {
  A: SECTION_A_ROUTINE,
  B: SECTION_B_ROUTINE,
};

module.exports = {
  PERIODS,
  DAYS,
  SUBJECT_CATALOG,
  TIMETABLES,
};
