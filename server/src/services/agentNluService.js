const prisma = require('../config/db');
const tools = require('./agentToolsService');
const mentorService = require('./mentorService');

// In-memory conversation state keyed by `${userId}:${sessionId}`
const sessionMemory = new Map();

function getSessionContext(userId, sessionId = 'default') {
  const key = `${userId}:${sessionId}`;
  if (!sessionMemory.has(key)) {
    sessionMemory.set(key, {
      activeStudent: null, // { studentId, name, registrationNumber }
      activeSection: null,
      lastQuery: null,     // { section, semester, year, subject, minAttendance, maxAttendance, atRiskOnly, sortBy, sortOrder, limit, fields }
      history: [],
    });
  }
  return sessionMemory.get(key);
}

function clearSessionContext(userId, sessionId = 'default') {
  const key = `${userId}:${sessionId}`;
  sessionMemory.delete(key);
}

/**
 * Enhanced Entity Extractor for Open-Ended Database Queries
 */
function extractEntities(text) {
  const normalized = text.trim();
  const lower = normalized.toLowerCase();

  // Registration Number pattern (e.g. 23CSE101, 241FA04326, REG63_001)
  let registrationNumber = null;
  const ignoredRegWords = new Set([
    'REGISTRATION', 'REGISTERED', 'REGISTER', 'SECTION', 'STUDENTS', 'STUDENT',
    'ATTENDANCE', 'PERCENTAGE', 'STATUS', 'SEMESTER', 'SUBJECT', 'COURSE'
  ]);

  const parenMatch = normalized.match(/\(([a-z0-9_\-]+)\)/i);
  if (parenMatch && parenMatch[1].length >= 4) {
    const cand = parenMatch[1].trim().toUpperCase();
    if (/^[0-9A-Z_\-]+$/.test(cand) && !ignoredRegWords.has(cand)) {
      registrationNumber = cand;
    }
  }

  if (!registrationNumber) {
    const regNoMatch = normalized.match(/\b([0-9]{2,4}[A-Z]{1,5}[0-9A-Z]{1,8}|[A-Z]{2,6}[0-9]{2,8}|REG[0-9_][0-9A-Z_]*)\b/i);
    if (regNoMatch) {
      const cand = regNoMatch[1].toUpperCase();
      const isCourse = ['CS301', 'CS302', 'CS303', 'CS305', 'MA301'].includes(cand);
      if (!ignoredRegWords.has(cand) && (!isCourse || /\b(student|reg|roll|id)\s+/i.test(normalized))) {
        registrationNumber = cand;
      }
    }
  }

  // Section pattern: Section A, Sec B, A section, from Section A, Section = A, etc.
  let section = null;
  const secMatch1 = lower.match(/\b(?:section|sec\.?)\s*([a-d])\b/i);
  const secMatch2 = lower.match(/\b([a-d])\s*(?:section|sec)\b/i);
  const secMatch3 = lower.match(/\bfrom\s+([a-d])\s+section\b/i);
  const secMatch4 = lower.match(/\bin\s+section\s+([a-d])\b/i);
  if (secMatch1) section = secMatch1[1].toUpperCase();
  else if (secMatch2) section = secMatch2[1].toUpperCase();
  else if (secMatch3) section = secMatch3[1].toUpperCase();
  else if (secMatch4) section = secMatch4[1].toUpperCase();

  // Semester pattern: "semester 5", "5th sem", "sem 5"
  let semester = null;
  const semMatch1 = lower.match(/\b(?:semester|sem\.?)\s*(\d+)\b/i);
  const semMatch2 = lower.match(/\b(\d+)(?:st|nd|rd|th)?\s*sem(?:ester)?\b/i);
  if (semMatch1) semester = parseInt(semMatch1[1], 10);
  else if (semMatch2) semester = parseInt(semMatch2[1], 10);

  // Year pattern: "year 3", "3rd year"
  let year = null;
  const yrMatch1 = lower.match(/\b(?:year|yr\.?)\s*(\d+)\b/i);
  const yrMatch2 = lower.match(/\b(\d+)(?:st|nd|rd|th)?\s*year\b/i);
  if (yrMatch1) year = parseInt(yrMatch1[1], 10);
  else if (yrMatch2) year = parseInt(yrMatch2[1], 10);

  // Attendance ranges & thresholds
  let minAttendance = null;
  let maxAttendance = null;
  let atRiskOnly = false;

  // Range: "between 70 and 80%" or "from 70% to 80%"
  const rangeMatch = lower.match(/\b(?:between|from)\s+(\d{1,3})\s*(?:%|\s*percent)?\s*(?:and|to|-)\s*(\d{1,3})\s*%/i);
  if (rangeMatch) {
    minAttendance = parseFloat(rangeMatch[1]);
    maxAttendance = parseFloat(rangeMatch[2]);
  } else {
    // Above: "above 85%", "> 85%", "greater than 85%", "more than 85%", "over 85%"
    const aboveMatch = lower.match(/\b(?:above|>|greater than|more than|over|exceeding)\s*(\d{1,3})\s*%/i);
    if (aboveMatch) {
      minAttendance = parseFloat(aboveMatch[1]);
    }

    // Below: "below 75%", "< 75%", "less than 75%", "under 75%", "falling below 75%"
    const belowMatch = lower.match(/\b(?:below|<|less than|under|falling below)\s*(\d{1,3})\s*%/i);
    if (belowMatch) {
      maxAttendance = parseFloat(belowMatch[1]);
    }
  }

  // Check for at-risk / defaulter keywords
  if (/\b(at risk|defaulter|poor attendance|shortage|critical)\b/i.test(lower)) {
    atRiskOnly = true;
    if (maxAttendance === null) maxAttendance = 75;
  }

  // Single percentage fallback
  const singlePctMatch = lower.match(/\b([0-9]{2})\s*%/);
  const threshold = singlePctMatch ? parseInt(singlePctMatch[1], 10) : null;

  // Subject extraction (CN, DBMS, OS, Cloud, Math, etc.)
  let subject = null;
  const knownSubjects = [
    { code: 'CS301', aliases: ['computer networks', 'networks', 'cn', 'cs301'] },
    { code: 'CS303', aliases: ['database management systems', 'databases', 'database', 'dbms', 'cs303'] },
    { code: 'CS302', aliases: ['operating systems', 'os', 'cs302'] },
    { code: 'CS305', aliases: ['cloud computing architecture', 'cloud computing', 'cloud', 'cca', 'cs305'] },
    { code: 'MA301', aliases: ['discrete mathematics', 'discrete math', 'maths', 'math', 'ma301'] },
  ];

  for (const item of knownSubjects) {
    for (const alias of item.aliases) {
      const regex = new RegExp(`\\b(?:in|for|of)?\\s*${alias}\\b`, 'i');
      if (regex.test(lower)) {
        subject = item.code;
        break;
      }
    }
    if (subject) break;
  }

  // Sort directives
  let sortBy = null;
  let sortOrder = 'asc';

  if (/(highest|top|best|maximum|most)\s+(attendance|percentage)/i.test(lower) || /highest attendance first/i.test(lower)) {
    sortBy = 'attendance';
    sortOrder = 'desc';
  } else if (/(lowest|worst|minimum|least|bottom)\s+(attendance|percentage)/i.test(lower) || /from lowest attendance to highest/i.test(lower) || /from lowest to highest/i.test(lower) || /lowest attendance first/i.test(lower)) {
    sortBy = 'attendance';
    sortOrder = 'asc';
  } else if (/(sorted|ordered|order)\s+by\s+attendance/i.test(lower) || /with their attendance/i.test(lower)) {
    sortBy = 'attendance';
    sortOrder = 'asc';
  } else if (/(sorted|ordered|order)\s+by\s+name/i.test(lower) || /alphabetical/i.test(lower)) {
    sortBy = 'name';
    sortOrder = 'asc';
  } else if (/(sorted|ordered|order)\s+by\s+(registration|reg)/i.test(lower)) {
    sortBy = 'registrationNumber';
    sortOrder = 'asc';
  }

  // Limit (e.g. top 10, top 5)
  let limit = null;
  const limitMatch = lower.match(/\b(?:top|first|best|lowest|bottom)\s+(\d+)\b/i);
  if (limitMatch) {
    limit = parseInt(limitMatch[1], 10);
  }

  // Requested fields
  const fields = ['name', 'registrationNumber', 'section', 'attendance', 'status'];
  if (/\b(semester|sem)\b/i.test(lower)) {
    if (!fields.includes('semester')) fields.push('semester');
  }

  // Pronouns
  const hasThirdPersonPronoun = /\b(he|him|his|she|her|they|them|their)\b/i.test(lower);
  const hasFirstPersonPronoun = /\b(my|me|i|myself)\b/i.test(normalized);
  const hasChildReference = /\b(child|ward|son|daughter|kid)\b/i.test(normalized);

  return {
    registrationNumber,
    section,
    semester,
    year,
    minAttendance,
    maxAttendance,
    atRiskOnly,
    threshold,
    subject,
    sortBy,
    sortOrder,
    limit,
    fields,
    hasThirdPersonPronoun,
    hasFirstPersonPronoun,
    hasChildReference,
  };
}

/**
 * NLU Intent Classifier
 */
function classifyIntent(text, role, context, entities = {}) {
  const lower = text.toLowerCase().trim();

  // 1. Help & Capabilities
  if (/^(help|hi|hello|hey|what can you do|who are you|options)\b/i.test(lower)) {
    return { type: 'HELP' };
  }

  // 2. Clear / Reset
  if (/^(clear|reset|start over|new chat)\b/i.test(lower)) {
    return { type: 'CLEAR_SESSION' };
  }

  // 3. Reports
  if (/report/i.test(lower) && /(generate|export|create|download)/i.test(lower)) {
    return { type: 'REPORT_GENERATE' };
  }

  // 4. Faculty & Staff (HOD specific)
  if (/(faculty|staff|teacher|professor|hod|lecturer)/i.test(lower) && !/(student|students)/i.test(lower)) {
    return { type: 'FACULTY_SEARCH' };
  }

  // 5. Section Comparison
  if (/(compare|versus|vs)\b/i.test(lower) && /(section|sec)/i.test(lower)) {
    return { type: 'SECTION_COMPARE' };
  }

  // 6. First-Person / Student Self Intents & Parent Ward Intents
  if (
    role === 'STUDENT' ||
    (role === 'PARENT' && /(child|ward|son|daughter)/i.test(lower)) ||
    (!['MENTOR', 'FACULTY', 'STAFF', 'HOD', 'ADMIN'].includes(role) && /\b(my|child|ward)\b/i.test(lower))
  ) {
    if (/(lowest|worst|minimum)\s+(subject|course)/i.test(lower) || /which subject has (my|the) lowest/i.test(lower) || /subject needing improvement/i.test(lower)) {
      return { type: role === 'PARENT' ? 'CHILD_LOWEST_SUBJECT' : 'SELF_LOWEST_SUBJECT' };
    }
    if (/(below 75|under 75|deficit|shortage)/i.test(lower) && /subject/i.test(lower)) {
      return { type: role === 'PARENT' ? 'CHILD_BELOW_75' : 'SELF_BELOW_75' };
    }
    if (/(how many classes|classes needed|attend to reach|need to attend|classes.*75%|can i reach 75)/i.test(lower)) {
      return { type: role === 'PARENT' ? 'CHILD_TARGET' : 'SELF_TARGET' };
    }
    if (/(trend|trajectory|improv|declin|progress)/i.test(lower)) {
      return { type: role === 'PARENT' ? 'CHILD_TREND' : 'SELF_TREND' };
    }
    if (/(at risk|why am i at risk|safe|danger)/i.test(lower)) {
      return { type: role === 'PARENT' ? 'CHILD_RISK' : 'SELF_RISK' };
    }
    if (/(subject-wise|subject wise|subjects|course-wise|all subjects)/i.test(lower)) {
      return { type: role === 'PARENT' ? 'CHILD_SUBJECTS' : 'SELF_SUBJECTS' };
    }
    if (/(profile|details|who am i|registered subjects)/i.test(lower) && !/section/i.test(lower)) {
      return { type: role === 'PARENT' ? 'CHILD_PROFILE' : 'SELF_PROFILE' };
    }
    if (/\b(my attendance|child('s)? attendance|how is my attendance|check my attendance)\b/i.test(lower)) {
      return { type: role === 'PARENT' ? 'CHILD_ATTENDANCE' : 'SELF_ATTENDANCE' };
    }
  }

  // 7. Multi-Turn Follow-Ups (Inheriting context.lastQuery)
  if (context.lastQuery) {
    // "Now show only those below 75%" / "and below 75%" / "only below 75%"
    if (/^(now\s+)?(show\s+)?(only\s+)?(those\s+)?(below|<|less than|under)\s*\d+%/i.test(lower) || /^(now\s+)?(show\s+)?only\s+(those\s+)?at\s*risk/i.test(lower)) {
      return { type: 'FOLLOW_UP_FILTER' };
    }
    // "Sort them by attendance" / "Sort by attendance" / "Highest first" / "Lowest first"
    if (/^(sort\s+(them\s+)?by|highest\s+first|lowest\s+first)/i.test(lower)) {
      return { type: 'FOLLOW_UP_SORT' };
    }
    // "Show their registration numbers too" / "include registration numbers" / "show with semester"
    if (/^(show|include|add)\s+(their\s+)?(reg|registration|semester)/i.test(lower) || /registration numbers? too/i.test(lower)) {
      return { type: 'FOLLOW_UP_FIELDS' };
    }
    // "How many are there?" / "How many are they?"
    if (/^how many (are there|are they|of them)\b/i.test(lower)) {
      return { type: 'FOLLOW_UP_COUNT' };
    }
  }

  // 8. Follow-up resolution using conversation context (Pronouns for single student)
  if (context.activeStudent) {
    if (/(his|her|he|she|this student)\b/i.test(lower)) {
      if (/(how many classes|classes needed|reach 75)/i.test(lower)) return { type: 'STUDENT_TARGET' };
      if (/(subject-wise|subject wise|subjects)/i.test(lower)) return { type: 'STUDENT_SUBJECTS' };
      if (/(lowest|worst)/i.test(lower)) return { type: 'STUDENT_LOWEST_SUBJECT' };
      if (/(at risk|risk)/i.test(lower)) return { type: 'STUDENT_RISK' };
      if (/(trend|trajectory|improv)/i.test(lower)) return { type: 'STUDENT_TREND' };
      if (/attendance/i.test(lower) || /percentage/i.test(lower)) return { type: 'STUDENT_ATTENDANCE' };
      if (/(detail|profile|info)/i.test(lower)) return { type: 'STUDENT_DETAILS' };
    }
  }

  // 9. Grouped Section Counting
  if (/how many students.*(each|every|per)\s+section/i.test(lower) || /enrolled in each section/i.test(lower) || /student count (in|by) each section/i.test(lower)) {
    return { type: 'GROUP_COUNT_STUDENTS' };
  }

  // OD / Leave Intents (Must precede generic counting)
  if (/(why is|explain).*(adjusted|od|leave).*higher/i.test(lower) || /why is.*adjusted/i.test(lower)) {
    const nameQuery = extractNameOrQuery(text);
    return { type: 'EXPLAIN_ADJUSTED_ATTENDANCE', nameQuery, registrationNumber: entities.registrationNumber };
  }
  if (/(show|list).*pending.*(od|leave|request)/i.test(lower) || /pending.*(od|leave).*requests?/i.test(lower)) {
    return { type: 'LIST_OD_REQUESTS', status: 'PENDING' };
  }
  if (/how many.*(have|has|with).*approved od/i.test(lower) || /count.*approved od/i.test(lower) || /approved (od|leave).*count/i.test(lower)) {
    return { type: 'COUNT_STUDENTS_APPROVED_OD' };
  }
  if (/(below 75.*adjusted.*(above|>=)\s*75|raw.*below.*adjusted.*above|saved by od)/i.test(lower)) {
    return { type: 'STUDENTS_SAVED_BY_OD' };
  }
  if (/(students.*with approved od|who has approved od|list.*approved od)/i.test(lower)) {
    return { type: 'COUNT_STUDENTS_APPROVED_OD' };
  }

  // 10. Counting Questions
  if (
    /^(how many students|how many|number of students|count of students|total students)\b/i.test(lower) ||
    /how many (are|students are)\b/i.test(lower)
  ) {
    return { type: 'COUNT_STUDENTS' };
  }

  // Mentor & Trend Specific Intents
  if (role === 'MENTOR') {
    if (/(who needs|students needing|students requiring)\s+(counselling|intervention|parent communication)/i.test(lower) || /needs counselling/i.test(lower) || /requiring parent communication/i.test(lower)) {
      return { type: 'MENTOR_NEEDS_COUNSELLING' };
    }
    if (/(improved after (counselling|intervention)|students.*improved.*(counselling|intervention))/i.test(lower)) {
      return { type: 'MENTOR_IMPROVED_AFTER_COUNSELLING' };
    }
    if (/(summary of (my )?assigned students|mentor summary|my assigned students summary|summary of my students)/i.test(lower)) {
      return { type: 'MENTOR_SUMMARY' };
    }
  }

  if (/(declining attendance|students.*declining|which students.*declining)/i.test(lower)) {
    return { type: 'STUDENTS_DECLINING_TREND' };
  }
  if (/(improving attendance|students.*improving|which students.*improving)/i.test(lower)) {
    return { type: 'STUDENTS_IMPROVING_TREND' };
  }

  // 11. Extreme (Highest / Lowest Attendance in Section or Cohort)
  if (
    /(who has|which student has)\s+(the\s+)?(highest|maximum|best)\s+attendance/i.test(lower)
  ) {
    return { type: 'EXTREME_STUDENT', extremeType: 'highest' };
  }
  if (
    /(who has|which student has)\s+(the\s+)?(lowest|minimum|worst)\s+attendance/i.test(lower) ||
    /which student has lowest attendance/i.test(lower)
  ) {
    return { type: 'EXTREME_STUDENT', extremeType: 'lowest' };
  }

  // -------------------------------------------------------------
  // CRITICAL INTENT PRIORITY 1, 2, 3: EXACT STUDENT LOOKUP
  // -------------------------------------------------------------
  const nameQuery = extractNameOrQuery(text);
  const regNo = entities.registrationNumber;

  // Check if this is an explicit cohort list query:
  const isExplicitListQuery = /(list of all|all(\s+[a-d])?(\s+section)?\s+students|all students|everyone in|who are the students|who belongs to|students of section|students in section|[a-d]\s+section\s+list|section\s+[a-d]\s+list|student list|enrolled in each section|each section)/i.test(lower);

  // If a registration number or student name is provided, and it's NOT an explicit cohort list:
  if ((regNo || nameQuery) && !isExplicitListQuery) {
    if (/(how many classes|classes needed|reach 75)/i.test(lower)) {
      return { type: 'STUDENT_TARGET', nameQuery, registrationNumber: regNo };
    }
    if (/(subject-wise|subject wise|subjects)/i.test(lower)) {
      return { type: 'STUDENT_SUBJECTS', nameQuery, registrationNumber: regNo };
    }
    if (/(at risk|risk)/i.test(lower) && !/(students below|who is at risk)/i.test(lower)) {
      return { type: 'STUDENT_RISK', nameQuery, registrationNumber: regNo };
    }
    if (/(trend|trajectory)/i.test(lower)) {
      return { type: 'STUDENT_TREND', nameQuery, registrationNumber: regNo };
    }
    if (/attendance\b/i.test(lower) && (/(what is|check|tell me|percentage)/i.test(lower) || /'s\s+attendance/i.test(lower))) {
      return { type: 'STUDENT_ATTENDANCE', nameQuery, registrationNumber: regNo };
    }

    return { type: 'EXACT_STUDENT_LOOKUP', nameQuery, registrationNumber: regNo };
  }

  // 12. Section-wide Attendance Aggregate (e.g. "Show Section A attendance", but NOT "Show Section A students with attendance")
  if (
    /(section|sec)\s+[a-d]\b/i.test(lower) &&
    /attendance/i.test(lower) &&
    !/(students?|everyone|who|list|names|give me all)\b/i.test(lower)
  ) {
    return { type: 'SECTION_ATTENDANCE' };
  }

  // 13. Defaulter List without specific section (e.g. "Show students below 75%", "Which students are at risk?", "List defaulters")
  if (
    !entities.section &&
    /(below 75|under 75|shortage|< 75|<75|at risk|defaulters?)\b/i.test(lower) &&
    (!/(my|child|ward)/i.test(lower) || role === 'MENTOR' || role === 'FACULTY' || role === 'STAFF')
  ) {
    return { type: 'DEFAULTER_LIST' };
  }

  // 14. Explicit Student Listing & Filtering Questions
  if (
    isExplicitListQuery ||
    /(list|show|give me|who are|who belongs to|see everyone|everyone in|students of|students in|student list|all students)\b/i.test(lower) ||
    entities.section ||
    entities.minAttendance !== null ||
    entities.maxAttendance !== null ||
    entities.atRiskOnly
  ) {
    return { type: 'LIST_STUDENTS' };
  }

  return { type: 'UNKNOWN' };
}

function extractNameOrQuery(text) {
  const normalized = text.trim();
  const lower = normalized.toLowerCase();

  // If the query is specifically about self or linked child, do NOT treat it as a third-party student query
  if (/^(what is|show|give me|check|is|has|tell me)?\s*(my|mine|my child|my ward|our child|our ward)('s)?\b/i.test(lower)) {
    return null;
  }
  if (/\b(my attendance|my subject|my risk|my classes|my trend|my profile|my details)\b/i.test(lower)) {
    return null;
  }
  if (/\b(child's attendance|child attendance|child's subject|child risk|child trend|ward's attendance)\b/i.test(lower)) {
    return null;
  }

  // Remove parentheses content if any (e.g. "(241FA04326)") and trailing punctuation
  const cleanText = normalized.replace(/\([^)]*\)/g, ' ').replace(/[?!.]+$/, '').replace(/\s+/g, ' ').trim();
  const cleanLower = cleanText.toLowerCase();

  const stopWords = new Set([
    'my', 'me', 'i', 'my child', 'my ward', 'the', 'his', 'her', 'their', 'them',
    'student', 'students', 'faculty', 'staff', 'section', 'attendance', 'trend',
    'risk', 'subject', 'subjects', 'details', 'report', 'routine', 'timetable',
    'classes', 'attendance trend', 'subject-wise attendance', 'my attendance trend',
    'all students', 'everyone', 'list', 'student list', 'show students', 'show all',
    'all', 'who', 'someone', 'any'
  ]);

  // Pattern 1: "Show attendance for/of <Name>", "Attendance of/for <Name>", "Details of/for <Name>"
  const forOfMatch = cleanText.match(/(?:show|check|view|display|what is|tell me|get)?\s*(?:the\s+)?(?:attendance|details|profile|status|report|risk|trend|information)?\s*(?:for|of)\s+(?:student\s+)?([a-zA-Z\s]{2,35})$/i);
  if (forOfMatch && forOfMatch[1]) {
    const cand = forOfMatch[1].trim();
    const candLower = cand.toLowerCase();
    if (!stopWords.has(candLower) && !/^(all|everyone|section|students?|defaulters?)/i.test(candLower)) {
      return cand;
    }
  }

  // Pattern 2: "Show/Find/Who is/Get details of/About <Name>"
  const actionMatch = cleanText.match(/^(?:show|find|who is|get details of|details of|search for|display|check|about)\s+(?:student\s+)?([a-zA-Z\s]{2,35}?)(?:'s|\s+attendance|\s+details|\s+profile|\s*$)/i);
  if (actionMatch && actionMatch[1]) {
    let cand = actionMatch[1].trim();
    cand = cand.replace(/^(?:attendance|details|profile|status|trend|risk)\s+(?:for|of)\s+/i, '').trim();
    const candLower = cand.toLowerCase();
    if (!stopWords.has(candLower) && !/^(all|everyone|section|students?|defaulters?)/i.test(candLower)) {
      return cand;
    }
  }

  // Pattern 3: "<Name>'s attendance/details/profile"
  const possessiveMatch = cleanText.match(/^([a-zA-Z\s]{2,35})'s\s+(?:attendance|details|profile|subject)/i);
  if (possessiveMatch && possessiveMatch[1]) {
    const cand = possessiveMatch[1].trim();
    if (!stopWords.has(cand.toLowerCase()) && !/^(all|everyone|section|students?)/i.test(cand.toLowerCase())) {
      return cand;
    }
  }

  // Pattern 4: "what is <Name>'s attendance"
  const whatIsMatch = cleanText.match(/^what is\s+([a-zA-Z\s]{2,35}?)'s\s+attendance/i);
  if (whatIsMatch && whatIsMatch[1]) {
    const cand = whatIsMatch[1].trim();
    if (!stopWords.has(cand.toLowerCase())) return cand;
  }

  // Pattern 5: Direct Name like "Rohan Verma" or "Aarav Sharma"
  const nameOnlyMatch = cleanText.match(/^([a-zA-Z]{2,20}\s+[a-zA-Z]{2,20})$/i);
  if (nameOnlyMatch) {
    const cand = nameOnlyMatch[1].trim();
    if (!stopWords.has(cand.toLowerCase())) return cand;
  }

  return null;
}

function extractFacultyQuery(text) {
  const lower = text.toLowerCase().trim();
  // If asking generally: "show faculty", "show faculty details", "faculty list", "show staff details"
  if (/^(show|find|list|view|search|display)?\s*(all\s*)?(department\s*)?(faculty|staff|professors?|teachers?)(\s*details|\s*list|\s*records|\s*information)?$/i.test(lower)) {
    return '';
  }
  const namedMatch = text.match(/(?:named|name|dr\.?|professor|prof\.?)\s+([a-zA-Z\s]{2,25})/i);
  if (namedMatch && namedMatch[1]) {
    return namedMatch[1].trim();
  }
  const cleaned = text.replace(/(show|find|search|details|of|faculty|staff|professor|dr\.?)/gi, '').trim();
  return cleaned.length >= 2 ? cleaned : '';
}

/**
 * Main Agent Processing Pipeline:
 * USER QUESTION
 *   -> UNDERSTAND INTENT & ENTITIES
 *   -> RESOLVE CONTEXT
 *   -> AUTHENTICATE & AUTHORIZE
 *   -> QUERY ACTUAL DATABASE (ZERO HALLUCINATION)
 *   -> ANALYZE / CALCULATE
 *   -> SYNTHESIZE EXPLANATION & STRUCTURED CARD
 */
async function processUserMessage(user, { message, sessionId = 'default' }) {
  const context = getSessionContext(user.id, sessionId);
  const entities = extractEntities(message);
  const lowerMsg = message.toLowerCase().trim();

  // Update history
  context.history.push({ role: 'user', content: message, timestamp: new Date().toISOString() });

  // =========================================================================
  // STRICT BACKEND ROLE ACCESS CONTROL GATES (Zero Information Leaks)
  // =========================================================================

  // GATE 1: Student role security
  if (user.role === 'STUDENT') {
    const ownName = user.studentProfile?.name?.toLowerCase() || '';
    const ownRegNo = user.studentProfile?.registrationNumber?.toLowerCase() || '';

    // 1A. Defaulter / cohort / section access is strictly blocked for students
    if (/(students below|all students|which students|defaulters|students at risk|who needs attention|who is falling|list of all|section\s+[a-d]|all\s+[a-d]\s+section|[a-d]\s+section\s+list|student list|everyone in|who belongs to|how many students|how many are|enrolled in each section|each section)/i.test(lowerMsg)) {
      const response = {
        message: "You don't have permission to access that information. I can only provide information related to your own account.",
        suggestions: getSuggestionsForRole(user.role),
      };
      context.history.push({ role: 'agent', content: response.message, timestamp: new Date().toISOString() });
      return response;
    }

    // 1B. Block searching or querying another student's account
    if (!/\b(my|me|i|myself)\b/i.test(lowerMsg)) {
      const queryTarget = extractNameOrQuery(lowerMsg) || entities.registrationNumber;
      if (queryTarget) {
        const q = queryTarget.toLowerCase().trim();
        const isSelf = (ownName && (ownName.includes(q) || q.includes(ownName))) ||
                       (ownRegNo && (ownRegNo.includes(q) || q.includes(ownRegNo)));
        if (!isSelf) {
          const response = {
            message: "I can only provide attendance information for your own account.",
            suggestions: getSuggestionsForRole(user.role),
          };
          context.history.push({ role: 'agent', content: response.message, timestamp: new Date().toISOString() });
          return response;
        }
      }
    }
  }

  // GATE 2: Parent role security
  if (user.role === 'PARENT') {
    // 2A. Cohort access blocked for parents
    if (/(students below|all students|which students|defaulters|students at risk|who needs attention|who is falling|list of all|section\s+[a-d]|all\s+[a-d]\s+section|[a-d]\s+section\s+list|student list|everyone in|who belongs to|how many students|how many are|enrolled in each section|each section)/i.test(lowerMsg)) {
      const response = {
        message: "You don't have permission to access that information. Parents can only view their linked child's records.",
        suggestions: getSuggestionsForRole(user.role),
      };
      context.history.push({ role: 'agent', content: response.message, timestamp: new Date().toISOString() });
      return response;
    }

    // 2B. Block unlinked student queries
    if (!/\b(child|ward|kid|son|daughter)\b/i.test(lowerMsg)) {
      const queryTarget = extractNameOrQuery(lowerMsg) || entities.registrationNumber;
      if (queryTarget) {
        const q = queryTarget.toLowerCase().trim();
        const linkedStudent = await prisma.student.findUnique({
          where: { id: user.parentProfile?.linkedStudentId },
          select: { name: true, registrationNumber: true },
        });
        const childName = linkedStudent?.name?.toLowerCase() || '';
        const childRegNo = linkedStudent?.registrationNumber?.toLowerCase() || '';
        const isChild = (childName && (childName.includes(q) || q.includes(childName))) ||
                        (childRegNo && (childRegNo.includes(q) || q.includes(childRegNo)));
        if (!isChild) {
          const response = {
            message: "You don't have permission to access that information. Parents can only view their linked child's records.",
            suggestions: getSuggestionsForRole(user.role),
          };
          context.history.push({ role: 'agent', content: response.message, timestamp: new Date().toISOString() });
          return response;
        }
      }
    }
  }

  // GATE 3: Mentor role security (Zero information leaks outside assigned students)
  if (user.role === 'MENTOR') {
    const mentorStaffId = user.staffProfile?.id;
    const { studentIds } = await tools.getMentorAuthorizedStudents(mentorStaffId);

    // 3A. Block department-wide or college-wide general requests
    if (/(all students in (the )?college|all students in (the )?university|all students of college|show all students|all faculty|show all faculty|faculty list|all teachers)/i.test(lowerMsg)) {
      const response = {
        message: "You only have access to your assigned students.",
        suggestions: getSuggestionsForRole(user.role),
      };
      context.history.push({ role: 'agent', content: response.message, timestamp: new Date().toISOString() });
      return response;
    }

    // 3B. Block searching or querying unassigned students by name or registration number
    let queryTarget = extractNameOrQuery(message) || extractNameOrQuery(lowerMsg) || entities.registrationNumber;

    if (queryTarget) {
      const q = queryTarget.toLowerCase().trim();
      const candidateStudent = await prisma.student.findFirst({
        where: {
          OR: [
            { name: { contains: q, mode: 'insensitive' } },
            { registrationNumber: { contains: q, mode: 'insensitive' } },
          ],
          status: 'ACTIVE',
          deletedAt: null,
        },
        select: { id: true, name: true, registrationNumber: true },
      });

      if (candidateStudent && !studentIds.has(candidateStudent.id)) {
        const response = {
          message: "You only have access to your assigned students.",
          suggestions: getSuggestionsForRole(user.role),
        };
        context.history.push({ role: 'agent', content: response.message, timestamp: new Date().toISOString() });
        return response;
      }
    } else {
      // Fallback: Check if message mentions any unassigned student name directly
      const allActiveStudents = await prisma.student.findMany({
        where: { status: 'ACTIVE', deletedAt: null },
        select: { id: true, name: true, registrationNumber: true },
      });
      for (const s of allActiveStudents) {
        if (s.name && s.name.length >= 3 && lowerMsg.includes(s.name.toLowerCase())) {
          if (!studentIds.has(s.id)) {
            const response = {
              message: "You only have access to your assigned students.",
              suggestions: getSuggestionsForRole(user.role),
            };
            context.history.push({ role: 'agent', content: response.message, timestamp: new Date().toISOString() });
            return response;
          }
        }
      }
    }
  }

  const intent = classifyIntent(message, user.role, context, entities);

  let resultPayload = null;

  try {
    switch (intent.type) {
      case 'HELP':
        resultPayload = handleHelp(user);
        break;

      case 'CLEAR_SESSION':
        clearSessionContext(user.id, sessionId);
        resultPayload = {
          message: 'Conversation context has been cleared. How can I assist you today?',
          suggestions: getSuggestionsForRole(user.role),
        };
        break;

      // --- SELF INTENTS (Student) ---
      case 'SELF_ATTENDANCE':
      case 'SELF_PROFILE': {
        const data = await tools.getStudentAttendance(user, { studentId: user.studentProfile?.id });
        if (data.error) {
          resultPayload = { message: data.error };
        } else {
          context.activeStudent = {
            studentId: data.student.studentId,
            name: data.student.name,
            registrationNumber: data.student.registrationNumber,
          };
          resultPayload = formatSelfAttendanceResponse(data);
        }
        break;
      }

      case 'SELF_SUBJECTS': {
        const data = await tools.getStudentAttendance(user, { studentId: user.studentProfile?.id });
        if (data.error) {
          resultPayload = { message: data.error };
        } else {
          resultPayload = formatSubjectWiseResponse(data);
        }
        break;
      }

      case 'SELF_LOWEST_SUBJECT': {
        const data = await tools.getStudentAttendance(user, { studentId: user.studentProfile?.id });
        if (data.error) {
          resultPayload = { message: data.error };
        } else {
          resultPayload = formatLowestSubjectResponse(data);
        }
        break;
      }

      case 'SELF_BELOW_75': {
        const data = await tools.getStudentAttendance(user, { studentId: user.studentProfile?.id });
        if (data.error) {
          resultPayload = { message: data.error };
        } else {
          resultPayload = formatBelowThresholdResponse(data);
        }
        break;
      }

      case 'SELF_RISK': {
        const data = await tools.getStudentAttendance(user, { studentId: user.studentProfile?.id });
        if (data.error) {
          resultPayload = { message: data.error };
        } else {
          resultPayload = formatRiskResponse(data);
        }
        break;
      }

      case 'SELF_TARGET': {
        const targetPct = entities.threshold || tools.DEFAULT_ATTENDANCE_THRESHOLD;
        const data = await tools.calculateTargetClasses(user, {
          studentId: user.studentProfile?.id,
          targetPercentage: targetPct,
        });
        resultPayload = formatTargetResponse(data);
        break;
      }

      case 'SELF_TREND': {
        const data = await tools.getAttendanceTrend(user, { studentId: user.studentProfile?.id });
        resultPayload = formatTrendResponse(data);
        break;
      }

      // --- CHILD INTENTS (Parent) ---
      case 'CHILD_ATTENDANCE':
      case 'CHILD_PROFILE': {
        const data = await tools.getStudentAttendance(user, { studentId: user.parentProfile?.linkedStudentId });
        if (data.error) {
          resultPayload = { message: data.error };
        } else {
          context.activeStudent = {
            studentId: data.student.studentId,
            name: data.student.name,
            registrationNumber: data.student.registrationNumber,
          };
          resultPayload = formatChildAttendanceResponse(data);
        }
        break;
      }

      case 'CHILD_SUBJECTS': {
        const data = await tools.getStudentAttendance(user, { studentId: user.parentProfile?.linkedStudentId });
        resultPayload = formatSubjectWiseResponse(data, true);
        break;
      }

      case 'CHILD_LOWEST_SUBJECT': {
        const data = await tools.getStudentAttendance(user, { studentId: user.parentProfile?.linkedStudentId });
        resultPayload = formatLowestSubjectResponse(data, true);
        break;
      }

      case 'CHILD_BELOW_75': {
        const data = await tools.getStudentAttendance(user, { studentId: user.parentProfile?.linkedStudentId });
        resultPayload = formatBelowThresholdResponse(data, true);
        break;
      }

      case 'CHILD_RISK': {
        const data = await tools.getStudentAttendance(user, { studentId: user.parentProfile?.linkedStudentId });
        resultPayload = formatRiskResponse(data, true);
        break;
      }

      case 'CHILD_TARGET': {
        const targetPct = entities.threshold || tools.DEFAULT_ATTENDANCE_THRESHOLD;
        const data = await tools.calculateTargetClasses(user, {
          studentId: user.parentProfile?.linkedStudentId,
          targetPercentage: targetPct,
        });
        resultPayload = formatTargetResponse(data, true);
        break;
      }

      case 'CHILD_TREND': {
        const data = await tools.getAttendanceTrend(user, { studentId: user.parentProfile?.linkedStudentId });
        resultPayload = formatTrendResponse(data, true);
        break;
      }

      // --- EXACT SINGLE STUDENT LOOKUPS (HOD, Faculty, Pronoun Follow-ups) ---
      case 'EXACT_STUDENT_LOOKUP':
      case 'STUDENT_SEARCH':
      case 'STUDENT_DETAILS': {
        const regNo = intent.registrationNumber || entities.registrationNumber;
        const nameQuery = intent.nameQuery || (context.activeStudent?.name);

        // 1. REGISTRATION NUMBER HAS HIGHEST PRIORITY
        if (regNo) {
          const details = await tools.getStudentByRegistrationNumber(user, regNo);
          if (details.error) {
            resultPayload = {
              message: details.error,
              suggestions: getSuggestionsForRole(user.role),
            };
          } else {
            context.activeStudent = {
              studentId: details.studentId,
              name: details.name,
              registrationNumber: details.registrationNumber,
            };
            resultPayload = formatStudentDetailsResponse(details);
          }
          break;
        }

        // 2. NAME-ONLY SEARCH
        if (nameQuery) {
          const searchResult = await tools.searchStudents(user, { query: nameQuery, section: entities.section });

          if (searchResult.message) {
            resultPayload = {
              message: searchResult.message,
              suggestions: getSuggestionsForRole(user.role),
            };
          } else if (searchResult.count === 0) {
            resultPayload = {
              message: `I couldn't find a student named ${nameQuery} in the available records.`,
              suggestions: getSuggestionsForRole(user.role),
            };
          } else if (searchResult.count === 1) {
            const target = searchResult.students[0];
            context.activeStudent = target;
            const details = await tools.getStudentDetails(user, { studentId: target.studentId });
            resultPayload = formatStudentDetailsResponse(details);
          } else {
            // Multiple ambiguous matches
            resultPayload = {
              message: `I found ${searchResult.count} students matching "${nameQuery}". Which one do you mean?`,
              ambiguousStudents: searchResult.students,
              suggestions: searchResult.students.slice(0, 4).map((s) => `Show ${s.name} (${s.registrationNumber})`),
            };
          }
          break;
        }

        resultPayload = {
          message: "Please specify a student name or registration number.",
          suggestions: getSuggestionsForRole(user.role),
        };
        break;
      }

      case 'STUDENT_ATTENDANCE': {
        let studentId = context.activeStudent?.studentId;
        const regNo = intent.registrationNumber || entities.registrationNumber;
        const nameQuery = intent.nameQuery;

        if (regNo) {
          const details = await tools.getStudentByRegistrationNumber(user, regNo);
          if (details.error) {
            resultPayload = { message: details.error };
            break;
          }
          studentId = details.studentId;
          context.activeStudent = {
            studentId: details.studentId,
            name: details.name,
            registrationNumber: details.registrationNumber,
          };
        } else if (nameQuery) {
          const search = await tools.searchStudents(user, {
            query: nameQuery,
            section: entities.section,
          });
          if (search.message) {
            resultPayload = {
              message: search.message,
              suggestions: getSuggestionsForRole(user.role),
            };
            break;
          } else if (search.count === 1) {
            studentId = search.students[0].studentId;
            context.activeStudent = search.students[0];
          } else if (search.count > 1) {
            resultPayload = {
              message: `I found ${search.count} students matching "${nameQuery}". Which one do you mean?`,
              ambiguousStudents: search.students,
              suggestions: search.students.slice(0, 4).map((s) => `What is ${s.name}'s attendance?`),
            };
            break;
          } else {
            resultPayload = {
              message: `I couldn't find a student named ${nameQuery} in the available records.`,
            };
            break;
          }
        }

        if (!studentId) {
          resultPayload = {
            message: 'Which student would you like attendance details for? Please provide a name or registration number.',
            suggestions: getSuggestionsForRole(user.role),
          };
          break;
        }

        const data = await tools.getStudentAttendance(user, { studentId });
        if (data.error) {
          resultPayload = { message: data.error };
        } else {
          resultPayload = formatStudentAttendanceResponse(data);
        }
        break;
      }

      case 'STUDENT_SUBJECTS': {
        const studentId = context.activeStudent?.studentId;
        if (!studentId) {
          resultPayload = {
            message: 'Please specify which student you would like subject attendance for.',
          };
          break;
        }
        const data = await tools.getStudentAttendance(user, { studentId });
        resultPayload = formatSubjectWiseResponse(data);
        break;
      }

      case 'STUDENT_RISK': {
        const studentId = context.activeStudent?.studentId;
        if (!studentId) {
          resultPayload = {
            message: 'Please specify which student you would like risk evaluation for.',
          };
          break;
        }
        const data = await tools.getStudentAttendance(user, { studentId });
        resultPayload = formatRiskResponse(data);
        break;
      }

      case 'STUDENT_TARGET': {
        const studentId = context.activeStudent?.studentId;
        if (!studentId) {
          resultPayload = {
            message: 'Please specify which student you would like target calculation for.',
          };
          break;
        }
        const targetPct = entities.threshold || tools.DEFAULT_ATTENDANCE_THRESHOLD;
        const data = await tools.calculateTargetClasses(user, { studentId, targetPercentage: targetPct });
        resultPayload = formatTargetResponse(data);
        break;
      }

      case 'STUDENT_TREND': {
        const studentId = context.activeStudent?.studentId;
        if (!studentId) {
          resultPayload = {
            message: 'Please specify which student you would like attendance trend for.',
          };
          break;
        }
        const data = await tools.getAttendanceTrend(user, { studentId });
        resultPayload = formatTrendResponse(data);
        break;
      }

      // --- COHORT / FACULTY / HOD INTENTS ---
      case 'DEFAULTER_LIST': {
        const threshold = entities.threshold || tools.DEFAULT_ATTENDANCE_THRESHOLD;
        const data = await tools.getAtRiskStudents(user, { section: entities.section, threshold });
        if (data.error) {
          resultPayload = { message: data.error };
        } else {
          resultPayload = formatDefaulterListResponse(data, entities.section);
        }
        break;
      }

      case 'SECTION_ATTENDANCE': {
        const sec = entities.section || 'A';
        const data = await tools.getSectionAttendance(user, { section: sec });
        if (data.error) {
          resultPayload = { message: data.error };
        } else {
          context.activeSection = sec;
          resultPayload = formatSectionAttendanceResponse(data);
        }
        break;
      }

      case 'SECTION_COMPARE': {
        const data = await tools.compareSections(user, { sectionA: 'A', sectionB: 'B' });
        if (data.error) {
          resultPayload = { message: data.error };
        } else {
          resultPayload = formatSectionComparisonResponse(data);
        }
        break;
      }

      case 'FACULTY_SEARCH': {
        const query = extractFacultyQuery(message);
        const data = await tools.searchFaculty(user, { query });
        if (data.error) {
          resultPayload = { message: data.error };
        } else {
          resultPayload = formatFacultySearchResponse(data);
        }
        break;
      }

      case 'REPORT_GENERATE': {
        const sec = entities.section || context.activeSection || 'A';
        const data = await tools.generateAttendanceReport(user, { section: sec });
        if (data.error) {
          resultPayload = { message: data.error };
        } else {
          resultPayload = formatReportResponse(data);
        }
        break;
      }

      // --- OD & APPROVED LEAVE INTENTS ---
      case 'EXPLAIN_ADJUSTED_ATTENDANCE': {
        const regNo = intent.registrationNumber || entities.registrationNumber;
        const nameQuery = intent.nameQuery;
        const studentId = context.activeStudent?.studentId;

        const data = await tools.explainAdjustedAttendance(user, {
          studentId,
          registrationNumber: regNo,
          nameQuery,
        });

        if (data.error) {
          resultPayload = { message: data.error };
        } else {
          resultPayload = formatExplainAdjustedResponse(data);
        }
        break;
      }

      case 'LIST_OD_REQUESTS': {
        const data = await tools.listPendingOdRequests(user, {
          section: entities.section,
          status: intent.status || 'PENDING',
        });
        resultPayload = formatPendingOdRequestsResponse(data);
        break;
      }

      case 'COUNT_STUDENTS_APPROVED_OD': {
        const data = await tools.countStudentsWithApprovedOd(user, {
          section: entities.section,
        });
        resultPayload = formatCountApprovedOdResponse(data);
        break;
      }

      case 'STUDENTS_SAVED_BY_OD': {
        const data = await tools.getStudentsSavedByOd(user, {
          section: entities.section,
          threshold: 75,
        });
        resultPayload = formatStudentsSavedByOdResponse(data);
        break;
      }

      // --- OPEN-ENDED LIST / SEARCH / FILTER ---
      case 'LIST_STUDENTS': {
        const queryOptions = {
          section: entities.section || (context.activeSection || null),
          semester: entities.semester,
          year: entities.year,
          subject: entities.subject,
          minAttendance: entities.minAttendance,
          maxAttendance: entities.maxAttendance,
          atRiskOnly: entities.atRiskOnly,
          sortBy: entities.sortBy || 'registrationNumber',
          sortOrder: entities.sortOrder || 'asc',
          limit: entities.limit,
          fields: entities.fields,
        };

        const data = await tools.listStudents(user, queryOptions);
        if (data.error) {
          resultPayload = { message: data.error };
        } else {
          context.lastQuery = {
            ...queryOptions,
            section: data.section,
          };
          if (data.section && data.section !== 'ALL') {
            context.activeSection = data.section;
          }
          resultPayload = formatStudentListResponse(data);
        }
        break;
      }

      // --- GROUPED SECTION COUNT ---
      case 'GROUP_COUNT_STUDENTS': {
        const data = await tools.countStudents(user, { groupBy: 'section' });
        if (data.error) {
          resultPayload = { message: data.error };
        } else {
          resultPayload = formatGroupCountResponse(data);
        }
        break;
      }

      // --- COUNT STUDENTS ---
      case 'COUNT_STUDENTS': {
        const queryOptions = {
          section: entities.section || context.activeSection || null,
          semester: entities.semester,
          year: entities.year,
          subject: entities.subject,
          minAttendance: entities.minAttendance,
          maxAttendance: entities.maxAttendance,
          atRiskOnly: entities.atRiskOnly,
        };

        const data = await tools.countStudents(user, queryOptions);
        if (data.error) {
          resultPayload = { message: data.error };
        } else {
          resultPayload = formatStudentCountResponse(data);
        }
        break;
      }

      // --- EXTREME (HIGHEST / LOWEST ATTENDANCE) ---
      case 'EXTREME_STUDENT': {
        const data = await tools.getTopOrBottomStudents(user, {
          type: intent.extremeType || 'highest',
          section: entities.section || context.activeSection || null,
          subject: entities.subject,
        });
        if (data.error) {
          resultPayload = { message: data.error };
        } else {
          resultPayload = formatExtremeStudentResponse(data);
        }
        break;
      }

      // --- MULTI-TURN FOLLOW-UP: FILTER ---
      case 'FOLLOW_UP_FILTER': {
        const prev = context.lastQuery || {};
        const queryOptions = {
          ...prev,
          minAttendance: entities.minAttendance !== null ? entities.minAttendance : prev.minAttendance,
          maxAttendance: entities.maxAttendance !== null ? entities.maxAttendance : prev.maxAttendance,
          atRiskOnly: entities.atRiskOnly || prev.atRiskOnly,
        };

        const data = await tools.listStudents(user, queryOptions);
        if (data.error) {
          resultPayload = { message: data.error };
        } else {
          context.lastQuery = queryOptions;
          resultPayload = formatStudentListResponse(data, true);
        }
        break;
      }

      // --- MULTI-TURN FOLLOW-UP: SORT ---
      case 'FOLLOW_UP_SORT': {
        const prev = context.lastQuery || {};
        const queryOptions = {
          ...prev,
          sortBy: entities.sortBy || 'attendance',
          sortOrder: entities.sortOrder || 'asc',
        };

        const data = await tools.listStudents(user, queryOptions);
        if (data.error) {
          resultPayload = { message: data.error };
        } else {
          context.lastQuery = queryOptions;
          resultPayload = formatStudentListResponse(data, true);
        }
        break;
      }

      // --- MULTI-TURN FOLLOW-UP: FIELDS ---
      case 'FOLLOW_UP_FIELDS': {
        const prev = context.lastQuery || {};
        const updatedFields = Array.from(new Set([...(prev.fields || []), ...(entities.fields || [])]));
        const queryOptions = {
          ...prev,
          fields: updatedFields,
        };

        const data = await tools.listStudents(user, queryOptions);
        if (data.error) {
          resultPayload = { message: data.error };
        } else {
          context.lastQuery = queryOptions;
          resultPayload = formatStudentListResponse(data, true);
        }
        break;
      }

      // --- MULTI-TURN FOLLOW-UP: COUNT ---
      case 'FOLLOW_UP_COUNT': {
        const prev = context.lastQuery || {};
        const data = await tools.countStudents(user, prev);
        if (data.error) {
          resultPayload = { message: data.error };
        } else {
          resultPayload = formatStudentCountResponse(data);
        }
        break;
      }

      // --- MENTOR INTENTS ---
      case 'MENTOR_NEEDS_COUNSELLING': {
        const mentorStaffId = user.staffProfile?.id;
        const atRisk = await mentorService.getAtRiskStudents(mentorStaffId);
        if (!atRisk || atRisk.length === 0) {
          resultPayload = {
            message: "None of your assigned students currently require urgent counselling or intervention. All are maintaining satisfactory attendance.",
            suggestions: getSuggestionsForRole(user.role),
          };
        } else {
          let msg = `### 📋 Assigned Students Requiring Counselling / Intervention\n\n`;
          msg += `Found **${atRisk.length}** assigned student(s) needing attention:\n\n`;
          atRisk.forEach((s, idx) => {
            msg += `${idx + 1}. **${s.name}** (${s.registrationNumber})\n`;
            msg += `   - **Current Attendance**: ${s.currentAttendance}%\n`;
            msg += `   - **Projected End-Semester**: ${s.projectedAttendance}%\n`;
            msg += `   - **Risk Level**: ${s.riskLevel.replace('_', ' ')} (${s.riskReason || 'Deficit'})\n`;
            msg += `   - **Recommended Action**: ${s.recommendedAction}\n\n`;
          });
          resultPayload = {
            message: msg,
            suggestions: getSuggestionsForRole(user.role),
          };
        }
        break;
      }

      case 'MENTOR_IMPROVED_AFTER_COUNSELLING': {
        const mentorStaffId = user.staffProfile?.id;
        const interventions = await prisma.intervention.findMany({
          where: {
            mentorId: mentorStaffId,
            improvement: { not: null },
          },
          include: { student: true },
          orderBy: { date: 'desc' },
        });

        const positive = interventions.filter((i) => (i.improvement || 0) > 0);
        if (positive.length === 0) {
          resultPayload = {
            message: "No recorded interventions have demonstrated an observed attendance improvement yet. Improvement is tracked by comparing attendance before vs. after intervention.",
            suggestions: getSuggestionsForRole(user.role),
          };
        } else {
          let msg = `### 📈 Students Who Improved After Intervention\n\n`;
          positive.forEach((i, idx) => {
            msg += `${idx + 1}. **${i.student?.name}** (${i.student?.registrationNumber})\n`;
            msg += `   - **Intervention**: ${i.type.replace('_', ' ')} on ${new Date(i.date).toLocaleDateString()}\n`;
            msg += `   - **Attendance Before**: ${i.attendanceBefore}%\n`;
            msg += `   - **Attendance After**: ${i.attendanceAfter}%\n`;
            msg += `   - **Improvement**: **+${i.improvement} percentage points**\n\n`;
          });
          resultPayload = {
            message: msg,
            suggestions: getSuggestionsForRole(user.role),
          };
        }
        break;
      }

      case 'MENTOR_SUMMARY': {
        const mentorStaffId = user.staffProfile?.id;
        const dashboard = await mentorService.getMentorDashboard(mentorStaffId);
        let msg = `### 📊 Summary of Assigned Students\n\n`;
        msg += `- **Total Assigned Students**: ${dashboard.totalAssignedStudents}\n`;
        msg += `- **Students ≥ 75%**: ${dashboard.studentsAbove75}\n`;
        msg += `- **Students Below 75%**: ${dashboard.studentsBelow75}\n`;
        msg += `- **At-Risk Students**: ${dashboard.atRiskStudents}\n`;
        msg += `- **High-Risk Students**: ${dashboard.highRiskStudents}\n`;
        msg += `- **Students Improving**: ${dashboard.studentsImproving}\n`;
        msg += `- **Requiring Intervention**: ${dashboard.studentsNeedingIntervention}\n\n`;
        if (dashboard.totalAssignedStudents === 0) {
          msg += `_No students are currently assigned to you._\n`;
        }
        resultPayload = {
          message: msg,
          suggestions: getSuggestionsForRole(user.role),
        };
        break;
      }

      case 'STUDENTS_DECLINING_TREND': {
        let studentsList = [];
        if (user.role === 'MENTOR') {
          const listRes = await mentorService.getAssignedStudentsList(user.staffProfile?.id);
          const rawStudents = listRes.students || [];
          studentsList = rawStudents.filter((s) => s.trend === 'DECLINING');
        } else if (user.role === 'STAFF' || user.role === 'FACULTY') {
          const { studentIds } = await tools.getFacultyAuthorizedStudents(user.staffProfile?.id);
          for (const sId of studentIds) {
            const tr = await tools.getAttendanceTrend(user, { studentId: sId });
            if (tr?.trend === 'DECLINING') {
              studentsList.push({ name: tr.student.name, registrationNumber: tr.student.registrationNumber, overallPercentage: tr.overallPercentage, slope: tr.slope });
            }
          }
        }
        if (studentsList.length === 0) {
          resultPayload = {
            message: "None of your authorized students currently have a declining attendance trend.",
            suggestions: getSuggestionsForRole(user.role),
          };
        } else {
          let msg = `### 📉 Students with Declining Attendance Trend\n\n`;
          studentsList.forEach((s, idx) => {
            msg += `${idx + 1}. **${s.name}** (${s.registrationNumber}) — Current Attendance: **${s.overallPercentage || s.overallAttendance}%** (Trend: Declining)\n`;
          });
          resultPayload = {
            message: msg,
            suggestions: getSuggestionsForRole(user.role),
          };
        }
        break;
      }

      case 'STUDENTS_IMPROVING_TREND': {
        let studentsList = [];
        if (user.role === 'MENTOR') {
          const listRes = await mentorService.getAssignedStudentsList(user.staffProfile?.id);
          const rawStudents = listRes.students || [];
          studentsList = rawStudents.filter((s) => s.trend === 'IMPROVING');
        } else if (user.role === 'STAFF' || user.role === 'FACULTY') {
          const { studentIds } = await tools.getFacultyAuthorizedStudents(user.staffProfile?.id);
          for (const sId of studentIds) {
            const tr = await tools.getAttendanceTrend(user, { studentId: sId });
            if (tr?.trend === 'IMPROVING') {
              studentsList.push({ name: tr.student.name, registrationNumber: tr.student.registrationNumber, overallPercentage: tr.overallPercentage, slope: tr.slope });
            }
          }
        }
        if (studentsList.length === 0) {
          resultPayload = {
            message: "None of your authorized students currently have an improving attendance trend.",
            suggestions: getSuggestionsForRole(user.role),
          };
        } else {
          let msg = `### 📈 Students with Improving Attendance Trend\n\n`;
          studentsList.forEach((s, idx) => {
            msg += `${idx + 1}. **${s.name}** (${s.registrationNumber}) — Current Attendance: **${s.overallPercentage || s.currentAttendance}%** (Trend: Improving)\n`;
          });
          resultPayload = {
            message: msg,
            suggestions: getSuggestionsForRole(user.role),
          };
        }
        break;
      }

      default: {
        resultPayload = {
          message: "I understand you are asking about university academic attendance. Could you please specify a student name, section (e.g. 'Section A'), or choose one of the suggested inquiries below?",
          suggestions: getSuggestionsForRole(user.role),
        };
        break;
      }
    }
  } catch (err) {
    console.error('Agent processing error:', err);
    resultPayload = {
      message: 'An error occurred while retrieving attendance records. Please try again.',
      suggestions: getSuggestionsForRole(user.role),
    };
  }

  // Record response in context
  context.history.push({ role: 'agent', content: resultPayload.message, timestamp: new Date().toISOString() });

  return {
    ...resultPayload,
    activeStudent: context.activeStudent,
    activeSection: context.activeSection,
  };
}

/**
 * Role-tailored suggestion sets
 */
function getSuggestionsForRole(role) {
  switch (role) {
    case 'HOD':
      return [
        'Show students below 75%',
        'Which students are at risk?',
        'Show Section A attendance',
        'Compare Section A and Section B',
        'Show faculty details',
        'Generate an attendance report for Section A',
      ];
    case 'STAFF':
    case 'FACULTY':
      return [
        'Show my section attendance',
        'Which students are below 75%?',
        'Show students at risk',
        'Which student has the lowest attendance?',
        'Which students are improving?',
      ];
    case 'MENTOR':
      return [
        'Show my students below 75%',
        'Which of my students are at high risk?',
        'Who needs counselling?',
        'Which students have declining attendance?',
        'Which students improved after counselling?',
        'Give me a summary of my assigned students',
      ];
    case 'STUDENT':
      return [
        'What is my attendance?',
        'Show my subject-wise attendance',
        'Which subject has my lowest attendance?',
        'Am I at risk?',
        'How many classes do I need to attend to reach 75%?',
        'Show my attendance trend',
      ];
    case 'PARENT':
      return [
        "What is my child's attendance?",
        "Show my child's subject-wise attendance",
        'Is my child at risk?',
        'Which subject needs improvement?',
        "Show my child's attendance trend",
      ];
    default:
      return ['What is my attendance?', 'Show subjects'];
  }
}

/**
 * Help message handler
 */
function handleHelp(user) {
  const role = user.role;
  let text = `Hello! I am your **AI Attendance Analysis Agent**. I retrieve actual, verified attendance data directly from the university PostgreSQL database and perform mathematical analyses.\n\n`;

  if (role === 'HOD') {
    text += `As **Department Head**, you can ask me to:\n- Search and view any student in your department\n- List students below 75% (defaulters)\n- View and compare Section A and Section B metrics\n- Search department faculty, workloads, and staff records\n- Generate instant section attendance reports`;
  } else if (role === 'STAFF' || role === 'FACULTY') {
    text += `As a **Faculty Member**, you can ask me to:\n- View attendance for students in your assigned classes or counselor mentees\n- Identify which of your students are below 75%\n- Check attendance trends and trajectories\n- Calculate required classes for struggling students`;
  } else if (role === 'MENTOR') {
    text += `As a **Mentor**, you can monitor your assigned students. You can ask me:\n- *"Show my students below 75%"*\n- *"Which of my students are at high risk?"*\n- *"Who needs counselling?"*\n- *"Which students have declining attendance?"*\n- *"Which students improved after counselling?"*\n- *"Give me a summary of my assigned students"*\n- Query any assigned student's attendance, trends, and risk analysis.`;
  } else if (role === 'STUDENT') {
    text += `As a **Student**, I am your personal academic assistant. You can ask me:\n- *"What is my attendance?"*\n- *"Show my subject-wise attendance"*\n- *"Which subject is lowest?"*\n- *"Am I at risk?"*\n- *"How many classes do I need to attend to reach 75%?"*\n- *"Show my attendance trend"*`;
  } else if (role === 'PARENT') {
    text += `As a **Parent**, you can ask me about your linked child's attendance, risk evaluation, subject performance, and required recovery classes.`;
  }

  return {
    message: text,
    suggestions: getSuggestionsForRole(role),
  };
}

/**
 * Response Formatters (Zero Hallucination - Grounded strictly in calculated records)
 */

function formatSelfAttendanceResponse(data) {
  const { overall, student } = data;
  const isSafe = overall.percentage >= overall.threshold;

  let text = `### Attendance Overview for ${student.name} (${student.registrationNumber})\n\n`;
  text += `Your overall attendance is **${overall.percentage}%** (${overall.attendedClasses} attended out of ${overall.totalClasses} conducted classes).\n\n`;

  if (isSafe) {
    text += `> **Status: SAFE (>= ${overall.threshold}%)**\n> You are currently maintaining satisfactory attendance, which is **+${overall.differenceFromThreshold}%** above the university requirement.`;
  } else {
    text += `> **Status: AT RISK (< ${overall.threshold}%)**\n> Your attendance is **${overall.differenceFromThreshold} percentage points below** the required ${overall.threshold}% threshold. Immediate attendance improvement is strongly advised to prevent examination debarment.`;
  }

  return {
    message: text,
    cardType: 'ATTENDANCE_SUMMARY',
    structuredData: {
      student,
      overall,
      subjectsCount: data.subjects.length,
    },
    suggestions: [
      'Show my subject-wise attendance',
      'How many classes do I need to attend to reach 75%?',
      'Which subject has my lowest attendance?',
      'Show my attendance trend',
    ],
  };
}

function formatChildAttendanceResponse(data) {
  const { overall, student } = data;
  const isSafe = overall.percentage >= overall.threshold;

  let text = `### Attendance Overview for ${student.name} (${student.registrationNumber})\n\n`;
  text += `Your child's overall attendance is **${overall.percentage}%** (${overall.attendedClasses} attended out of ${overall.totalClasses} conducted classes in Section ${student.section}).\n\n`;

  if (isSafe) {
    text += `> **Status: SAFE (>= ${overall.threshold}%)**\n> Your child is currently meeting the university requirement by +${overall.differenceFromThreshold}%.`;
  } else {
    text += `> **Status: AT RISK (< ${overall.threshold}%)**\n> Your child is currently **${overall.differenceFromThreshold}% below** the mandatory 75% threshold. Please encourage regular attendance.`;
  }

  return {
    message: text,
    cardType: 'ATTENDANCE_SUMMARY',
    structuredData: { student, overall },
    suggestions: [
      "Show my child's subject-wise attendance",
      'Which subject needs improvement?',
      'Is my child at risk?',
      "Show my child's attendance trend",
    ],
  };
}

function formatSubjectWiseResponse(data, isChild = false) {
  const { student, subjects } = data;
  const pronoun = isChild ? `${student.name}'s` : 'Your';

  let text = `### ${pronoun} Subject-Wise Attendance Breakdown\n\n`;
  text += `| Course Code | Subject Name | Present | Total | Attendance | Status |\n`;
  text += `|:------------|:-------------|:-------:|:-----:|:----------:|:------:|\n`;

  subjects.forEach((s) => {
    const statusBadge = s.status === 'SAFE' ? 'Safe' : s.status === 'HIGH_RISK' ? 'High Risk' : 'Warning';
    text += `| **${s.courseCode}** | ${s.courseName} | ${s.presentClasses} | ${s.totalClasses} | **${s.percentage}%** | ${statusBadge} |\n`;
  });

  const below75 = subjects.filter((s) => s.percentage < 75);
  if (below75.length > 0) {
    text += `\n> **Attention Needed**: ${below75.length} subject(s) currently fall below 75%: ` +
      below75.map((b) => `**${b.courseCode}** (${b.percentage}%)`).join(', ') + '.';
  } else {
    text += `\n> **Great news**: All enrolled subjects currently meet or exceed 75%!`;
  }

  return {
    message: text,
    cardType: 'SUBJECT_TABLE',
    structuredData: { student, subjects },
    suggestions: [
      isChild ? 'Which subject needs improvement?' : 'Which subject has my lowest attendance?',
      isChild ? 'How many classes does my child need to reach 75%?' : 'How many classes do I need to attend to reach 75%?',
      isChild ? "Show my child's attendance trend" : 'Show my attendance trend',
    ],
  };
}

function formatLowestSubjectResponse(data, isChild = false) {
  const { student, lowestSubject } = data;
  if (!lowestSubject) {
    return { message: 'No enrolled subjects found.' };
  }

  const pronoun = isChild ? `${student.name}'s` : 'Your';
  let text = `### Lowest Attendance Subject\n\n`;
  text += `${pronoun} lowest attendance is in **${lowestSubject.courseCode} - ${lowestSubject.courseName}** with **${lowestSubject.percentage}%** (${lowestSubject.presentClasses}/${lowestSubject.totalClasses} classes attended).\n\n`;

  if (lowestSubject.percentage < 75) {
    const deficit = Math.round((75 - lowestSubject.percentage) * 10) / 10;
    text += `> **Deficit**: ${deficit} percentage points below the 75% threshold.\n`;
    text += `> This subject requires prioritized attendance in upcoming sessions.`;
  } else {
    text += `> Even as the lowest subject, it remains above the 75% threshold. Good job!`;
  }

  return {
    message: text,
    cardType: 'SUBJECT_HIGHLIGHT',
    structuredData: { student, subject: lowestSubject },
    suggestions: [
      isChild ? "Show my child's subject-wise attendance" : 'Show my subject-wise attendance',
      isChild ? 'How many classes does my child need to reach 75%?' : 'How many classes do I need to attend to reach 75%?',
    ],
  };
}

function formatBelowThresholdResponse(data, isChild = false) {
  const { student, subjectsBelowThreshold } = data;
  const pronoun = isChild ? `${student.name}` : 'you';

  if (!subjectsBelowThreshold || subjectsBelowThreshold.length === 0) {
    return {
      message: `Excellent! None of the registered subjects are below 75%. All subjects are in safe standing.`,
      suggestions: [isChild ? "Show my child's attendance trend" : 'Show my attendance trend'],
    };
  }

  let text = `### Subjects Below 75% Threshold\n\n`;
  text += `Currently, ${pronoun} ${isChild ? 'is' : 'are'} below 75% in **${subjectsBelowThreshold.length}** subject(s):\n\n`;
  text += `| Subject | Code | Attended | Total | Current % | Shortage |\n`;
  text += `|:--------|:----:|:--------:|:-----:|:---------:|:--------:|\n`;

  subjectsBelowThreshold.forEach((s) => {
    const diff = Math.round((75 - s.percentage) * 10) / 10;
    text += `| ${s.courseName} | **${s.courseCode}** | ${s.presentClasses} | ${s.totalClasses} | **${s.percentage}%** | -${diff}% |\n`;
  });

  text += `\n> **Recommendation**: Focus on attending consecutive sessions for these subjects to climb back above the safe threshold.`;

  return {
    message: text,
    cardType: 'BELOW_THRESHOLD_TABLE',
    structuredData: { student, subjects: subjectsBelowThreshold },
    suggestions: [
      isChild ? 'How many classes does my child need to reach 75%?' : 'How many classes do I need to attend to reach 75%?',
    ],
  };
}

function formatRiskResponse(data, isChild = false) {
  const { student, overall, lowestSubject } = data;
  const pronoun = isChild ? `${student.name}` : 'You';
  const isVerb = isChild ? 'is' : 'are';

  let text = `### Academic Attendance Risk Assessment\n\n`;

  if (overall.percentage >= 75) {
    text += `**${pronoun} ${isVerb} currently SAFE.**\n\n`;
    text += `- **Overall Attendance**: **${overall.percentage}%** (Above the 75% requirement)\n`;
    text += `- **Conducted Classes**: ${overall.totalClasses}\n`;
    text += `- **Attended Classes**: ${overall.attendedClasses}\n\n`;
    text += `> There is currently no danger of examination debarment. Continue maintaining this trajectory!`;
  } else {
    const riskLevel = overall.percentage < 65 ? 'CRITICAL / DETENTION RISK' : 'HIGH RISK / SHORTAGE';
    text += `**${pronoun} ${isVerb} currently AT RISK.**\n\n`;
    text += `- **Current Attendance**: **${overall.percentage}%**\n`;
    text += `- **Required Threshold**: **75%**\n`;
    text += `- **Difference**: **${overall.differenceFromThreshold} percentage points below**\n`;
    text += `- **Risk Level**: **${riskLevel}**\n\n`;

    text += `#### Why ${isChild ? student.name : 'are you'} at risk?\n`;
    text += `1. **Shortage Accumulation**: ${overall.absentClasses} classes missed out of ${overall.totalClasses} total sessions.\n`;
    if (lowestSubject && lowestSubject.percentage < 75) {
      text += `2. **Subject Concentration**: Substantial absences in **${lowestSubject.courseCode}** (${lowestSubject.percentage}%).\n`;
    }
    text += `3. **University Policy**: Students below 75% are ineligible to sit for end-semester examinations without approved condonation.\n\n`;
    text += `> **Action Required**: Attend all upcoming classes without absence to recover your attendance.`;
  }

  return {
    message: text,
    cardType: 'RISK_ASSESSMENT',
    structuredData: { student, overall },
    suggestions: [
      isChild ? 'How many classes does my child need to reach 75%?' : 'How many classes do I need to attend to reach 75%?',
      isChild ? "Show my child's attendance trend" : 'Show my attendance trend',
    ],
  };
}

function formatTargetResponse(data, isChild = false) {
  const { student, currentPercentage, targetPercentage, classesNeeded, alreadyMeetsTarget, safeMarginClasses, presentClasses, totalClasses } = data;

  let text = `### Attendance Target Calculation (Target: ${targetPercentage}%)\n\n`;

  if (alreadyMeetsTarget) {
    text += `**Great news!** Current attendance is **${currentPercentage}%** (${presentClasses}/${totalClasses}), which already meets or exceeds the **${targetPercentage}%** threshold.\n\n`;
    text += `- **Consecutive classes needed**: **0**\n`;
    text += `- **Safe absence margin**: Up to **${safeMarginClasses}** upcoming class(es) can be missed before dropping below ${targetPercentage}%.\n\n`;
    text += `> We recommend attending all scheduled sessions to keep your safety buffer healthy.`;
  } else {
    text += `Current attendance is **${currentPercentage}%** (${presentClasses} attended out of ${totalClasses} total classes).\n\n`;
    text += `- **Target Threshold**: **${targetPercentage}%**\n`;
    text += `- **Required Consecutive Classes**: **${classesNeeded}**\n\n`;
    text += `> **Formula Analysis**:\n`;
    text += `> Attending the next **${classesNeeded}** consecutive classes without any absence will elevate your attendance to **${targetPercentage}%** (${presentClasses + classesNeeded}/${totalClasses + classesNeeded}).`;
  }

  return {
    message: text,
    cardType: 'TARGET_CALCULATION',
    structuredData: data,
    suggestions: [
      isChild ? "Show my child's subject-wise attendance" : 'Show my subject-wise attendance',
      isChild ? "Show my child's attendance trend" : 'Show my attendance trend',
    ],
  };
}

function formatTrendResponse(data, isChild = false) {
  if (data.insufficientData) {
    return {
      message: `There isn't enough historical attendance data to determine a reliable trend (at least 6 recorded sessions required).`,
    };
  }

  const { student, trend, trajectoryChange, firstHalfPercentage, recentPercentage } = data;
  const isImproving = trend === 'IMPROVING';
  const isDeclining = trend === 'DECLINING';

  let text = `### Attendance Trend & Trajectory\n\n`;
  text += `- **Historical Velocity**: **${trend}** (${trajectoryChange >= 0 ? '+' : ''}${trajectoryChange}% change)\n`;
  text += `- **Earlier Sessions**: ${firstHalfPercentage}%\n`;
  text += `- **Recent Sessions**: ${recentPercentage}%\n\n`;

  if (isImproving) {
    text += `> **Positive Recovery**: Attendance trajectory is moving upward (+${trajectoryChange}%). Keep maintaining this positive momentum!`;
  } else if (isDeclining) {
    text += `> **Warning - Negative Velocity**: Attendance has dropped by **${Math.abs(trajectoryChange)} percentage points** in recent sessions. Immediate corrective action is recommended.`;
  } else {
    text += `> **Stable Trajectory**: Attendance has remained steady across earlier and recent periods.`;
  }

  return {
    message: text,
    cardType: 'TREND_CARD',
    structuredData: data,
    suggestions: [
      isChild ? 'How many classes does my child need to reach 75%?' : 'How many classes do I need to attend to reach 75%?',
      isChild ? "Show my child's subject-wise attendance" : 'Show my subject-wise attendance',
    ],
  };
}

function formatStudentDetailsResponse(details) {
  let text = `### Student Details\n\n`;
  text += `**Name:** ${details.name}\n`;
  text += `**Registration Number:** ${details.registrationNumber}\n`;
  text += `**Section:** ${details.section}\n`;
  text += `**Semester:** ${details.semester}\n\n`;
  text += `- **Department**: ${details.department} (${details.departmentCode})\n`;
  if (details.email) text += `- **Email**: ${details.email}\n`;
  text += `- **Mentor / Counselor**: ${details.mentorName} (${details.mentorCabin})\n\n`;

  if (details.attendanceSummary) {
    const a = details.attendanceSummary;
    const rawPct = a.rawPercentage || a.overallPercentage;
    const adjPct = a.adjustedPercentage || a.overallPercentage;
    text += `#### Current Attendance Standing:\n`;
    text += `- **Raw Attendance**: **${rawPct}%** (${a.attendedClasses}/${a.totalClasses} classes)\n`;
    text += `- **Adjusted Attendance**: **${adjPct}%** (${a.attendedClasses}/${a.adjustedTotalClasses || a.totalClasses} effective classes)\n`;
    text += `- **Approved OD**: ${a.approvedOdPeriods || 0} period(s) | **Approved Leave**: ${a.approvedLeavePeriods || 0} period(s)\n`;
    text += `- **Status**: **${adjPct >= 75 ? 'Safe (>= 75%)' : 'At Risk (< 75%)'}**\n`;
  }

  return {
    message: text,
    cardType: 'STUDENT_PROFILE_CARD',
    structuredData: details,
    suggestions: [
      `What is ${details.name}'s attendance?`,
      `Why is ${details.name}'s adjusted attendance higher?`,
      `Show ${details.name}'s subject-wise attendance`,
      `Is ${details.name} at risk?`,
    ],
  };
}

function formatStudentAttendanceResponse(data) {
  const { student, overall, subjects } = data;
  const rawPct = overall.rawPercentage || overall.percentage;
  const adjPct = overall.adjustedPercentage || overall.percentage;
  const approvedOd = overall.approvedOdPeriods || 0;
  const approvedLeave = overall.approvedLeavePeriods || 0;

  let text = `### Attendance Record: ${student.name} (${student.registrationNumber})\n\n`;
  text += `- **Section**: ${student.section} | **Department**: ${student.departmentCode}\n`;
  text += `- **Raw Attendance**: **${rawPct}%** (${overall.attendedClasses} attended / ${overall.totalClasses} total conducted)\n`;
  text += `- **Adjusted Attendance**: **${adjPct}%** (${overall.attendedClasses} attended / ${overall.adjustedTotalClasses || overall.totalClasses} effective conducted)\n`;
  text += `- **Approved On-Duty (OD)**: ${approvedOd} period(s) | **Approved Leave**: ${approvedLeave} period(s)\n`;
  text += `- **Status**: **${adjPct >= 75 ? 'Safe (>= 75%)' : 'At Risk (< 75%)'}**\n\n`;

  text += `| Subject | Code | Present | Total | % | Status |\n`;
  text += `|:--------|:----:|:-------:|:-----:|:--:|:------:|\n`;
  subjects.forEach((s) => {
    text += `| ${s.courseName} | **${s.courseCode}** | ${s.presentClasses} | ${s.totalClasses} | **${s.percentage}%** | ${s.status === 'SAFE' ? 'Safe' : 'At Risk'} |\n`;
  });

  return {
    message: text,
    cardType: 'STUDENT_ATTENDANCE_CARD',
    structuredData: data,
    suggestions: [
      `Why is ${student.name}'s adjusted attendance higher?`,
      `How many classes does ${student.name} need to reach 75%?`,
      `Is ${student.name} at risk?`,
      `Show ${student.name}'s profile`,
    ],
  };
}

function formatExplainAdjustedResponse(data) {
  const { student, rawPercentage, adjustedPercentage, rawPresent, rawTotal, adjustedTotal, approvedOdPeriods, approvedLeavePeriods, approvedRequests } = data;

  let text = `### On-Duty & Adjusted Attendance Explanation\n\n`;
  text += `**${student.name} (${student.registrationNumber})**:\n\n`;

  const totalExemptions = approvedOdPeriods + approvedLeavePeriods;
  if (totalExemptions > 0) {
    text += `${student.name} has **${totalExemptions}** approved ${approvedOdPeriods > 0 ? 'On-Duty' : ''}${approvedOdPeriods > 0 && approvedLeavePeriods > 0 ? ' and ' : ''}${approvedLeavePeriods > 0 ? 'Approved Leave' : ''} period(s), which are excluded from the adjusted attendance calculation.\n\n`;
    text += `- **Raw Attendance**: **${rawPercentage}%** (${rawPresent} Present / ${rawTotal} Conducted)\n`;
    text += `- **Adjusted Attendance**: **${adjustedPercentage}%** (${rawPresent} Present / ${adjustedTotal} Effective Conducted)\n`;
    text += `- **Approved OD**: **${approvedOdPeriods}** period(s)\n`;
    text += `- **Approved Leave**: **${approvedLeavePeriods}** period(s)\n\n`;

    if (approvedRequests && approvedRequests.length > 0) {
      text += `#### Approved Exemption Records:\n`;
      approvedRequests.forEach((req) => {
        const dt = new Date(req.date).toISOString().split('T')[0];
        const pStr = req.periods && req.periods.length > 0 ? req.periods.join(', ') : `${req.startPeriod}-${req.endPeriod}`;
        text += `- **${req.requestType === 'ON_DUTY' ? 'On-Duty' : 'Leave'}**: ${req.eventName || req.reason} on ${dt} (Periods: ${pStr}) - *Status: APPROVED*\n`;
      });
    }
  } else {
    text += `Currently, ${student.name} has **no approved OD or Leave exemptions**. Therefore, Raw Attendance and Adjusted Attendance are both **${rawPercentage}%** (${rawPresent}/${rawTotal} classes).\n`;
  }

  return {
    message: text,
    cardType: 'OD_EXPLANATION_CARD',
    structuredData: data,
    suggestions: [
      `What is ${student.name}'s attendance?`,
      `Show ${student.name}'s profile`,
      'Show all pending OD requests',
    ],
  };
}

function formatPendingOdRequestsResponse(data) {
  const { count, requests } = data;

  if (count === 0) {
    return {
      message: 'There are currently **0 pending OD/Leave requests** in your authorized scope.',
      cardType: 'OD_REQUESTS_LIST',
      structuredData: data,
    };
  }

  let text = `### 📋 Pending OD / Leave Requests (${count})\n\n`;
  text += `| Student | Reg. No | Sec | Type | Date | Periods | Event / Reason |\n`;
  text += `|:--------|:-------:|:---:|:----:|:----:|:-------:|:---------------|\n`;

  requests.forEach((r) => {
    const dt = new Date(r.date).toISOString().split('T')[0];
    const pStr = r.periods && r.periods.length > 0 ? r.periods.join(', ') : `${r.startPeriod}-${r.endPeriod}`;
    text += `| **${r.student.name}** | \`${r.student.registrationNumber}\` | ${r.student.section} | ${r.requestType === 'ON_DUTY' ? 'On-Duty' : 'Leave'} | ${dt} | ${pStr} | ${r.eventName || r.reason} |\n`;
  });

  return {
    message: text,
    cardType: 'OD_REQUESTS_LIST',
    structuredData: data,
  };
}

function formatCountApprovedOdResponse(data) {
  const { count, students, section } = data;
  const secTitle = section && section !== 'All' ? `in Section ${section}` : 'in the university database';

  let text = `### 📊 Approved On-Duty (OD) Summary\n\n`;
  text += `Currently, **${count}** student(s) ${secTitle} have approved On-Duty records:\n\n`;

  if (count > 0) {
    text += `| Student Name | Registration No | Section |\n`;
    text += `|:-------------|:---------------:|:-------:|\n`;
    students.slice(0, 15).forEach((s) => {
      text += `| **${s.name}** | \`${s.registrationNumber}\` | ${s.section} |\n`;
    });
  }

  return {
    message: text,
    cardType: 'COUNT_CARD',
    structuredData: data,
  };
}

function formatStudentsSavedByOdResponse(data) {
  const { count, students, threshold } = data;

  let text = `### 🛡️ Students Saved by Approved OD/Leave (Threshold: ${threshold}%)\n\n`;

  if (count === 0) {
    text += `No students currently have raw attendance below ${threshold}% while having adjusted attendance above ${threshold}%.\n`;
    return {
      message: text,
      cardType: 'SAVED_BY_OD_LIST',
      structuredData: data,
    };
  }

  text += `Found **${count}** student(s) whose **raw attendance is below ${threshold}%**, but whose **adjusted attendance meets or exceeds ${threshold}%** due to approved exemptions:\n\n`;
  text += `| Student Name | Reg. No | Sec | Raw % | Adjusted % | Exempted Periods | Status |\n`;
  text += `|:-------------|:-------:|:---:|:-----:|:----------:|:----------------:|:------:|\n`;

  students.forEach((s) => {
    text += `| **${s.name}** | \`${s.registrationNumber}\` | ${s.section} | **${s.rawPercentage}%** | **${s.adjustedPercentage}%** | ${s.totalExemptions} period(s) | ✅ Saved |\n`;
  });

  return {
    message: text,
    cardType: 'SAVED_BY_OD_LIST',
    structuredData: data,
  };
}

function formatDefaulterListResponse(data, section) {
  const { threshold, totalScanned, atRiskCount, students } = data;
  const secTitle = section && section !== 'ALL' ? `in Section ${section.toUpperCase()}` : 'in Department';

  let text = `### At-Risk Students (< ${threshold}%) ${secTitle}\n\n`;
  text += `Found **${atRiskCount}** at-risk student(s) below ${threshold}% out of ${totalScanned} scanned students:\n\n`;

  if (atRiskCount === 0) {
    text += `> **No defaulters found!** All students in this scope currently meet or exceed ${threshold}%.`;
    return { message: text, cardType: 'DEFAULTER_LIST', structuredData: data };
  }

  text += `| Reg. No | Student Name | Sec | Attended | Total | % | Risk Level |\n`;
  text += `|:--------|:-------------|:---:|:--------:|:-----:|:--:|:----------:|\n`;

  students.slice(0, 15).forEach((s) => {
    const riskBadge = s.status === 'HIGH_RISK' ? '**Critical (< 65%)**' : 'Warning (65-74%)';
    text += `| \`${s.registrationNumber}\` | **${s.name}** | ${s.section} | ${s.presentClasses} | ${s.totalClasses} | **${s.percentage}%** | ${riskBadge} |\n`;
  });

  if (students.length > 15) {
    text += `\n*Showing top 15 lowest attendance students of ${students.length} total at-risk students.*`;
  }

  return {
    message: text,
    cardType: 'DEFAULTER_LIST',
    structuredData: data,
    suggestions: students.slice(0, 3).map((s) => `Show ${s.name} (${s.registrationNumber})`),
  };
}

function formatSectionAttendanceResponse(data) {
  let text = `### Section ${data.section} Attendance Analytics\n\n`;
  text += `- **Total Enrolled Students**: **${data.totalStudents}**\n`;
  text += `- **Average Section Attendance**: **${data.averageAttendance}%**\n`;
  text += `- **Total Classes Conducted**: ~${data.totalSessionsConducted} sessions\n`;
  text += `- **Students Meeting Threshold (>= 75%)**: **${data.safeCount}** (${Math.round((data.safeCount / (data.totalStudents || 1)) * 100)}%)\n`;
  text += `- **Students Below 75%**: **${data.below75Count}** (${data.below65Count} critical below 65%)\n\n`;

  text += `> **Summary**: Section ${data.section} holds an average attendance rate of **${data.averageAttendance}%**.`;

  return {
    message: text,
    cardType: 'SECTION_METRICS',
    structuredData: data,
    suggestions: [
      `Compare Section ${data.section} and Section ${data.section === 'A' ? 'B' : 'A'}`,
      `Show students below 75% in Section ${data.section}`,
      `Generate an attendance report for Section ${data.section}`,
    ],
  };
}

function formatSectionComparisonResponse(data) {
  const { sectionA, sectionB, difference, higherSection, comparisonSummary } = data;

  let text = `### Section Comparison: Section A vs Section B\n\n`;
  text += `| Metric | Section A | Section B | Comparison |\n`;
  text += `|:-------|:---------:|:---------:|:----------:|\n`;
  text += `| **Average Attendance** | **${sectionA.averageAttendance}%** | **${sectionB.averageAttendance}%** | **Section ${higherSection} (+${difference}%)** |\n`;
  text += `| **Total Students** | ${sectionA.totalStudents} | ${sectionB.totalStudents} | - |\n`;
  text += `| **Students Safe (>= 75%)** | ${sectionA.safeCount} | ${sectionB.safeCount} | - |\n`;
  text += `| **Students at Risk (< 75%)** | ${sectionA.below75Count} | ${sectionB.below75Count} | - |\n\n`;

  text += `> ${comparisonSummary}`;

  return {
    message: text,
    cardType: 'SECTION_COMPARISON',
    structuredData: data,
    suggestions: [
      'Show Section A attendance',
      'Show Section B attendance',
      'Show students below 75% in Section A',
    ],
  };
}

function formatFacultySearchResponse(data) {
  let text = `### Department Faculty & Staff Directory (${data.count} found)\n\n`;
  text += `| Employee ID | Name | Designation | Cabin | Classes | Counselor Students |\n`;
  text += `|:------------|:-----|:------------|:------|:-------:|:------------------:|\n`;

  data.faculty.forEach((f) => {
    text += `| \`${f.employeeId}\` | **${f.name}** | ${f.designation} | ${f.cabinLocation} | ${f.assignedClassesCount} | ${f.counselorStudentsCount} |\n`;
  });

  return {
    message: text,
    cardType: 'FACULTY_DIRECTORY',
    structuredData: data,
    suggestions: [
      'Show Section A attendance',
      'Show students below 75%',
    ],
  };
}

function formatReportResponse(data) {
  let text = `### ${data.reportTitle}\n`;
  text += `*Generated on: ${new Date(data.generatedAt).toLocaleString()}*\n\n`;
  text += `- **Section**: ${data.section}\n`;
  text += `- **Total Students**: ${data.metrics.totalStudents}\n`;
  text += `- **Average Attendance**: **${data.metrics.averageAttendance}%**\n`;
  text += `- **At-Risk Defaulters (< 75%)**: **${data.defaultersList.length}**\n\n`;

  if (data.defaultersList.length > 0) {
    text += `#### Defaulters Requiring Immediate Intervention:\n`;
    data.defaultersList.slice(0, 10).forEach((d) => {
      text += `- **${d.name}** (\`${d.registrationNumber}\`): **${d.percentage}%** (${d.presentClasses}/${d.totalClasses})\n`;
    });
  }

  return {
    message: text,
    cardType: 'REPORT_SUMMARY',
    structuredData: data,
    suggestions: [
      'Compare Section A and Section B',
      'Show students below 75%',
    ],
  };
}

function formatStudentListResponse(data, isFollowUp = false) {
  const { students, totalCount, returnedCount, section, subject, filters, sorting, fields } = data;

  if (totalCount === 0) {
    let emptyMsg = `I couldn't find any students`;
    if (section && section !== 'ALL') emptyMsg += ` in **Section ${section}**`;
    if (subject) emptyMsg += ` for **${subject.name} (${subject.code})**`;
    if (filters && typeof filters.minAttendance === 'number' && typeof filters.maxAttendance === 'number') {
      emptyMsg += ` with attendance between **${filters.minAttendance}%** and **${filters.maxAttendance}%**`;
    } else if (filters && typeof filters.maxAttendance === 'number') {
      emptyMsg += ` with attendance below **${filters.maxAttendance}%**`;
    } else if (filters && typeof filters.minAttendance === 'number') {
      emptyMsg += ` with attendance above **${filters.minAttendance}%**`;
    }
    emptyMsg += ` in the available records.`;
    return { message: emptyMsg };
  }

  let title = `### 📋 Student Attendance List`;
  if (section && section !== 'ALL') {
    title = `### 📋 Student List: Section ${section}`;
  }
  if (subject) {
    title += ` — ${subject.name} (${subject.code})`;
  }

  let subheader = `*Found **${totalCount}** student${totalCount === 1 ? '' : 's'}`;
  if (filters && typeof filters.minAttendance === 'number' && typeof filters.maxAttendance === 'number') {
    subheader += ` with attendance between **${filters.minAttendance}%** and **${filters.maxAttendance}%**`;
  } else if (filters && (filters.atRiskOnly || (typeof filters.maxAttendance === 'number' && filters.maxAttendance <= 75))) {
    subheader += ` below the required 75% threshold (At Risk)`;
  } else if (filters && typeof filters.maxAttendance === 'number') {
    subheader += ` with attendance below **${filters.maxAttendance}%**`;
  } else if (filters && typeof filters.minAttendance === 'number') {
    subheader += ` with attendance above **${filters.minAttendance}%**`;
  }
  if (sorting && sorting.sortBy === 'attendance') {
    subheader += ` sorted from ${sorting.sortOrder === 'desc' ? 'highest to lowest' : 'lowest to highest'}`;
  }
  subheader += `.*`;

  // Build Table Headers
  const includeSem = fields && fields.includes('semester');
  const includeSec = !section || section === 'ALL' || (fields && fields.includes('section'));

  let tableHeader = `| # | Student Name | Registration No. |`;
  let tableDivider = `|---|---|---|`;

  if (includeSec) {
    tableHeader += ` Section |`;
    tableDivider += `---|`;
  }
  if (includeSem) {
    tableHeader += ` Semester |`;
    tableDivider += `---|`;
  }

  const attHeader = subject ? `${subject.code} Attendance` : `Overall Attendance`;
  tableHeader += ` ${attHeader} | Status |`;
  tableDivider += `---|---|`;

  // Build Table Rows
  const rows = students.map((s, idx) => {
    let row = `| ${idx + 1} | **${s.name}** | \`${s.registrationNumber}\` |`;
    if (includeSec) row += ` ${s.section} |`;
    if (includeSem) row += ` Sem ${s.semester} |`;
    const statusPill = s.status === 'SAFE' ? '✅ Safe' : s.status === 'HIGH_RISK' ? '🚨 High Risk' : '⚠️ At Risk';
    row += ` **${s.percentage.toFixed(1)}%** | ${statusPill} |`;
    return row;
  });

  const tableMarkdown = [tableHeader, tableDivider, ...rows].join('\n');

  let text = `${title}\n${subheader}\n\n${tableMarkdown}`;

  if (totalCount > returnedCount) {
    text += `\n\n*Displaying top ${returnedCount} of ${totalCount} records.*`;
  }

  const isDefaulter = !!(filters && (filters.atRiskOnly || (typeof filters.maxAttendance === 'number' && filters.maxAttendance <= 75)));
  const atRiskCount = students.filter(s => s.status !== 'SAFE').length;

  return {
    message: text,
    cardType: isDefaulter ? 'DEFAULTER_LIST' : 'STUDENT_LIST',
    structuredData: {
      students,
      totalCount,
      atRiskCount,
      section,
      subject,
      filters,
      sorting,
    },
    suggestions: [
      `How many students in Section ${section || 'A'} are below 75%?`,
      `Who has the lowest attendance in Section ${section || 'A'}?`,
      `Show Section ${section || 'A'} students with highest attendance first`,
    ],
  };
}

function formatStudentCountResponse(data) {
  const { count, section, filters, subject } = data;

  let text = `### 📊 Student Count Result\n\n`;
  if (filters && typeof filters.minAttendance === 'number' && typeof filters.maxAttendance === 'number') {
    text += `There are **${count}** student${count === 1 ? '' : 's'}`;
    if (section && section !== 'ALL') text += ` in **Section ${section}**`;
    if (subject) text += ` for **${subject.name} (${subject.code})**`;
    text += ` with attendance between **${filters.minAttendance}%** and **${filters.maxAttendance}%**.`;
  } else if (filters && (filters.atRiskOnly || (typeof filters.maxAttendance === 'number' && filters.maxAttendance <= 75))) {
    text += `There are **${count}** student${count === 1 ? '' : 's'}`;
    if (section && section !== 'ALL') text += ` in **Section ${section}**`;
    if (subject) text += ` for **${subject.name} (${subject.code})**`;
    text += ` currently below the required 75% threshold (**At Risk**).`;
  } else if (filters && typeof filters.minAttendance === 'number') {
    text += `There are **${count}** student${count === 1 ? '' : 's'}`;
    if (section && section !== 'ALL') text += ` in **Section ${section}**`;
    if (subject) text += ` for **${subject.name} (${subject.code})**`;
    text += ` with attendance above **${filters.minAttendance}%**.`;
  } else if (section && section !== 'ALL') {
    text += `There are currently **${count}** students enrolled in **Section ${section}**.`;
  } else {
    text += `There are **${count}** students matching your query in the database.`;
  }

  return {
    message: text,
    data: { count, section, filters },
    suggestions: [
      `Show Section ${section || 'A'} students`,
      `List Section ${section || 'A'} students below 75%`,
      `Who has the lowest attendance in Section ${section || 'A'}?`,
    ],
  };
}

function formatGroupCountResponse(data) {
  const { breakdown, total } = data;
  let text = `### 📊 Student Enrollment by Section\n\n`;
  text += `*Live enrollment figures retrieved from university database:*\n\n`;
  for (const [sec, cnt] of Object.entries(breakdown)) {
    text += `- **${sec}:** **${cnt}** student${cnt === 1 ? '' : 's'}\n`;
  }
  text += `\n📌 **Total Enrolled Across Sections:** **${total}** students.`;

  return {
    message: text,
    data,
    suggestions: [
      'Show Section A students',
      'Show Section B students',
      'Compare Section A and Section B',
    ],
  };
}

function formatExtremeStudentResponse(data) {
  const { type, students, section, subject } = data;
  if (!students || students.length === 0) {
    return { message: "I couldn't find any student records for that inquiry." };
  }

  const s = students[0];
  const isHighest = type === 'highest';
  const label = isHighest ? 'Highest' : 'Lowest';
  const icon = isHighest ? '🏆' : '⚠️';

  let text = `### ${icon} ${label} Attendance Record`;
  if (section && section !== 'ALL') text += ` (Section ${section})`;
  if (subject) text += ` — ${subject.name} (${subject.code})`;
  text += `\n\n`;

  text += `**${s.name}** (\`${s.registrationNumber}\`, Section ${s.section}) has the **${label.toLowerCase()} attendance** at **${s.percentage.toFixed(1)}%** (${s.presentClasses} present out of ${s.totalClasses} classes).\n\n`;

  if (s.status === 'SAFE') {
    text += `> **Status: Safe (>= 75%)**\n> This student satisfies institutional attendance criteria.`;
  } else {
    text += `> **Status: At Risk (< 75%)**\n> This student is below the university requirement and at risk of attendance shortage.`;
  }

  return {
    message: text,
    data: { student: s, type },
    suggestions: [
      `What is ${s.name}'s attendance?`,
      `How many classes does ${s.name} need to reach 75%?`,
      `Show Section ${section || 'A'} students below 75%`,
    ],
  };
}

module.exports = {
  processUserMessage,
  clearSessionContext,
  getSuggestionsForRole,
};
