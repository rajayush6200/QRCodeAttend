const mongoose = require('mongoose');
const dotenv = require('dotenv');

dotenv.config();

const User = require('./src/models/User');
const Institution = require('./src/models/Institution');
const Department = require('./src/models/Department');
const Course = require('./src/models/Course');

const seedDatabase = async () => {
  try {
    console.log('Connecting to MongoDB...', process.env.MONGODB_URI);
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected!');

    // Clear existing for a clean slate
    await User.deleteMany({});
    await Institution.deleteMany({});
    await Department.deleteMany({});
    await Course.deleteMany({});
    console.log('Cleared existing data.');

    // Pre-generate IDs to solve circular dependency
    const institutionId = new mongoose.Types.ObjectId();
    const adminId = new mongoose.Types.ObjectId();

    // 1. Create Super Admin (plain-text passwords — Mongoose pre-save hook hashes them)
    const admin = await User.create({
      _id: adminId,
      name: 'System Admin',
      email: 'admin@qrcodeattend.com',
      passwordHash: 'Admin@1234',
      role: 'admin',
      institutionId: institutionId,
      isActive: true,
      isEmailVerified: true
    });
    console.log('Created Admin:', admin.email);

    // 2. Create Institution
    const institution = await Institution.create({
      _id: institutionId,
      name: 'Global Institute of Technology',
      code: 'GIT',
      adminId: admin._id,
      address: {
        street: '123 Tech Park',
        city: 'Metropolis',
        state: 'NY',
        country: 'USA',
        zipCode: '10001'
      },
      contactEmail: 'contact@git.edu',
      isActive: true
    });
    console.log('Created Institution:', institution.name);

    // 3. Create Department
    const department = await Department.create({
      institutionId: institution._id,
      name: 'Computer Science',
      code: 'CS',
      headOfDepartment: admin._id
    });
    console.log('Created Department:', department.name);

    // 4. Create Faculty
    const faculty = await User.create({
      name: 'Dr. John Doe',
      email: 'faculty@git.edu',
      passwordHash: 'Faculty@1234',
      role: 'faculty',
      institutionId: institution._id,
      departmentId: department._id,
      employeeId: 'FAC001',
      isActive: true,
      isEmailVerified: true
    });
    console.log('Created Faculty:', faculty.email);

    // Update Dept HOD
    department.headOfDepartment = faculty._id;
    await department.save();

    // 5. Create Student
    const student = await User.create({
      name: 'Alice Smith',
      email: 'student@git.edu',
      passwordHash: 'Student@1234',
      role: 'student',
      institutionId: institution._id,
      departmentId: department._id,
      enrollmentNumber: 'ENG2026001',
      isActive: true,
      isEmailVerified: true
    });
    console.log('Created Student:', student.email);

    // 6. Create Course
    const course = await Course.create({
      institutionId: institution._id,
      departmentId: department._id,
      name: 'Data Structures and Algorithms',
      code: 'CS301',
      description: 'Core DSA course',
      credits: 4,
      facultyIds: [faculty._id],
      studentIds: [student._id],
      isActive: true
    });
    console.log('Created Course:', course.name);

    console.log('\n--- SEEDING COMPLETE ---');
    console.log('Admin Login: admin@qrcodeattend.com / Admin@1234');
    console.log('Faculty Login: faculty@git.edu / Faculty@1234');
    console.log('Student Login: student@git.edu / Student@1234');

    process.exit(0);
  } catch (err) {
    console.error('Seeding failed:', err);
    process.exit(1);
  }
};

seedDatabase();
