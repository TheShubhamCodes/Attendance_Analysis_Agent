const prisma = require('../config/db');

const curriculum = [
  // 1st Year - Semester 1
  { courseCode: 'CS101', courseName: 'Programming for Problem Solving', year: 1, semester: 1, credits: 4 },
  { courseCode: 'MA101', courseName: 'Engineering Mathematics - I (Calculus & Linear Algebra)', year: 1, semester: 1, credits: 4 },
  { courseCode: 'PH101', courseName: 'Engineering Physics', year: 1, semester: 1, credits: 3 },
  { courseCode: 'ME101', courseName: 'Basic Mechanical Engineering', year: 1, semester: 1, credits: 3 },
  { courseCode: 'EN101', courseName: 'Technical English & Communication', year: 1, semester: 1, credits: 2 },

  // 1st Year - Semester 2
  { courseCode: 'CS102', courseName: 'Data Structures and Algorithms', year: 1, semester: 2, credits: 4 },
  { courseCode: 'CS104', courseName: 'Object Oriented Programming with C++/Java', year: 1, semester: 2, credits: 4 },
  { courseCode: 'MA102', courseName: 'Engineering Mathematics - II (Differential Equations)', year: 1, semester: 2, credits: 4 },
  { courseCode: 'CY101', courseName: 'Engineering Chemistry', year: 1, semester: 2, credits: 3 },
  { courseCode: 'EE101', courseName: 'Basic Electrical & Electronics Engineering', year: 1, semester: 2, credits: 3 },

  // 2nd Year - Semester 3
  { courseCode: 'CS201', courseName: 'Advanced Data Structures', year: 2, semester: 3, credits: 4 },
  { courseCode: 'CS203', courseName: 'Digital Logic & Computer Organization', year: 2, semester: 3, credits: 4 },
  { courseCode: 'MA201', courseName: 'Discrete Mathematical Structures', year: 2, semester: 3, credits: 4 },
  { courseCode: 'CS205', courseName: 'Object-Oriented Software Development', year: 2, semester: 3, credits: 3 },
  { courseCode: 'CS207', courseName: 'Python Programming for Engineers', year: 2, semester: 3, credits: 3 },

  // 2nd Year - Semester 4
  { courseCode: 'CS202', courseName: 'Design and Analysis of Algorithms', year: 2, semester: 4, credits: 4 },
  { courseCode: 'CS204', courseName: 'Computer Architecture & Microprocessors', year: 2, semester: 4, credits: 4 },
  { courseCode: 'CS206', courseName: 'Theory of Computation & Automata', year: 2, semester: 4, credits: 4 },
  { courseCode: 'CS208', courseName: 'Software Engineering & Agile Methodologies', year: 2, semester: 4, credits: 3 },
  { courseCode: 'MA202', courseName: 'Probability and Statistics for Engineers', year: 2, semester: 4, credits: 3 },

  // 3rd Year - Semester 5
  { courseCode: 'CS301', courseName: 'Computer Networks', year: 3, semester: 5, credits: 4 },
  { courseCode: 'CS302', courseName: 'Operating Systems', year: 3, semester: 5, credits: 4 },
  { courseCode: 'CS303', courseName: 'Database Management Systems', year: 3, semester: 5, credits: 4 },
  { courseCode: 'CS305', courseName: 'Cloud Computing Architecture', year: 3, semester: 5, credits: 3 },
  { courseCode: 'MA301', courseName: 'Discrete Mathematics & Numerical Methods', year: 3, semester: 5, credits: 3 },

  // 3rd Year - Semester 6
  { courseCode: 'CS304', courseName: 'Compiler Design & Language Processors', year: 3, semester: 6, credits: 4 },
  { courseCode: 'CS306', courseName: 'Web Technologies & Full Stack Development', year: 3, semester: 6, credits: 4 },
  { courseCode: 'CS308', courseName: 'Artificial Intelligence & Expert Systems', year: 3, semester: 6, credits: 4 },
  { courseCode: 'CS310', courseName: 'Cryptography & Network Security', year: 3, semester: 6, credits: 3 },
  { courseCode: 'CS312', courseName: 'Distributed Systems', year: 3, semester: 6, credits: 3 },

  // 4th Year - Semester 7
  { courseCode: 'CS401', courseName: 'Machine Learning & Predictive Modeling', year: 4, semester: 7, credits: 4 },
  { courseCode: 'CS403', courseName: 'Information & Cyber Security', year: 4, semester: 7, credits: 4 },
  { courseCode: 'CS405', courseName: 'Big Data Analytics & Processing', year: 4, semester: 7, credits: 3 },
  { courseCode: 'CS407', courseName: 'Internet of Things (IoT) Systems', year: 4, semester: 7, credits: 3 },
  { courseCode: 'CS491', courseName: 'Capstone Major Project - Phase 1', year: 4, semester: 7, credits: 3 },

  // 4th Year - Semester 8
  { courseCode: 'CS402', courseName: 'Deep Learning & Neural Networks', year: 4, semester: 8, credits: 4 },
  { courseCode: 'CS404', courseName: 'Cloud Native DevOps & Microservices', year: 4, semester: 8, credits: 4 },
  { courseCode: 'CS406', courseName: 'Blockchain Technology & Smart Contracts', year: 4, semester: 8, credits: 3 },
  { courseCode: 'CS492', courseName: 'Capstone Major Project - Phase 2', year: 4, semester: 8, credits: 6 },
];

async function seedCurriculum() {
  console.log('Seeding full 4-year (Semesters 1-8) curriculum for CSE department...');

  const cseDept = await prisma.department.findUnique({
    where: { code: 'CSE' },
  });

  if (!cseDept) {
    console.error('CSE department not found! Please ensure department exists.');
    process.exit(1);
  }

  let createdCount = 0;
  let updatedCount = 0;

  for (const c of curriculum) {
    const existing = await prisma.course.findUnique({
      where: { courseCode: c.courseCode },
    });

    if (existing) {
      await prisma.course.update({
        where: { id: existing.id },
        data: {
          courseName: c.courseName,
          year: c.year,
          semester: c.semester,
          credits: c.credits,
          departmentId: cseDept.id,
          academicYear: '2026-2027',
          isActive: true,
        },
      });
      updatedCount++;
    } else {
      await prisma.course.create({
        data: {
          courseCode: c.courseCode,
          courseName: c.courseName,
          year: c.year,
          semester: c.semester,
          credits: c.credits,
          departmentId: cseDept.id,
          academicYear: '2026-2027',
          isActive: true,
        },
      });
      createdCount++;
    }
  }

  console.log(`Curriculum seed complete: ${createdCount} created, ${updatedCount} updated. Total courses in curriculum: ${curriculum.length}`);
}

if (require.main === module) {
  seedCurriculum()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('Error seeding curriculum:', err);
      process.exit(1);
    });
}

module.exports = { seedCurriculum, curriculum };
