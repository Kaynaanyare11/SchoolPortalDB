require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const crypto = require('crypto');

const app = express();
const PORT = process.env.PORT || 5000;


// Middleware
app.use(cors());
app.use(express.json());

// MongoDB Connection
const mongoURI = process.env.DB

mongoose.connect(mongoURI)
  .then(() => console.log('Connected to MongoDB SchoolDB'))
  .catch(err => console.error('MongoDB Connection Error:', err));

// Student Schema
const studentSchema = new mongoose.Schema({
  studentId: { type: String, required: true, unique: true },
  fullName: String,
  phone: String,
  parentPhone: String,
  monthlyFee: Number,
  balance: { type: Number, default: 0 },
  paymentStatus: { type: String, default: 'Pending' }, 
  examinationAccess: { type: Boolean, default: false }, 
  passwordHash: { type: String, default: null }, 
  createdAt: { type: Date, default: Date.now }
});

const Student = mongoose.model('Student', studentSchema);

// Admin Helper
const ADMIN_USER = { username: 'admin', password: 'admin123' };

// Utility: Hash Password
const hashPassword = (password) => {
  return crypto.createHash('sha256').update(password).digest('hex');
};

// --- ROUTES ---

// 1. Login Route
app.post('/api/login', async (req, res) => {
  const { id, password, role } = req.body;

  try {
    if (role === 'admin') {
      if (id === ADMIN_USER.username && password === ADMIN_USER.password) {
        return res.json({ success: true, user: { role: 'admin', fullName: 'System Admin' } });
      }
      return res.status(401).json({ success: false, message: 'Invalid Admin credentials' });
    } else {
      const student = await Student.findOne({ studentId: id });
      if (!student) return res.status(404).json({ success: false, message: 'Student ID not found' });

      if (!student.passwordHash) {
        return res.json({ success: true, needsSetup: true, student: { _id: student._id, studentId: student.studentId } });
      }

      const inputHash = hashPassword(password);
      if (inputHash === student.passwordHash) {
        return res.json({ success: true, user: { role: 'student', ...student._doc } });
      }
      return res.status(401).json({ success: false, message: 'Incorrect password' });
    }
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// 2. Setup Student Password
app.post('/api/students/setup', async (req, res) => {
  const { firestoreId, password } = req.body;
  try {
    const passwordHash = hashPassword(password);
    await Student.findByIdAndUpdate(firestoreId, { passwordHash });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Password setup failed' });
  }
});

// 3. Get All Students (Admin)
app.get('/api/students', async (req, res) => {
  try {
    const students = await Student.find().sort({ studentId: -1 });
    res.json(students);
  } catch (err) {
    res.status(500).json({ message: 'Error fetching students' });
  }
});

// 4. Add Student (Admin)
app.post('/api/students', async (req, res) => {
  try {
    const lastStudent = await Student.findOne().sort({ studentId: -1 });
    let nextIdNumber = 1001;
    if (lastStudent && lastStudent.studentId) {
      nextIdNumber = parseInt(lastStudent.studentId) + 1;
    }
    
    const studentId = nextIdNumber.toString();
    const fee = req.body.monthlyFee || 0;
    
    // Explicitly set the initial state based on whether there is a fee/balance
    const newStudent = new Student({ 
      ...req.body, 
      studentId,
      balance: fee,
      paymentStatus: fee > 0 ? 'Pending' : 'Paid',
      examinationAccess: fee > 0 ? false : true
    });
    
    await newStudent.save();
    res.json(newStudent);
  } catch (err) {
    res.status(500).json({ message: 'Error adding student' });
  }
});

// 5. Update Payment (Admin)
app.patch('/api/students/:id/pay', async (req, res) => {
  try {
    const student = await Student.findByIdAndUpdate(req.params.id, {
      balance: 0,
      paymentStatus: 'Paid',
      examinationAccess: true
    }, { new: true });
    res.json(student);
  } catch (err) {
    res.status(500).json({ message: 'Payment update failed' });
  }
});

app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));







// const express = require('express');
// const mongoose = require('mongoose');
// const cors = require('cors');
// const crypto = require('crypto');

// const app = express();
// const PORT = 5000;

// // Middleware
// app.use(cors());
// app.use(express.json());

// // MongoDB Connection
// const mongoURI = 'mongodb+srv://employeepaymentuser:i8PQeZX1bVovuUPi@cluster0.wgnqycb.mongodb.net/SchoolDB';

// mongoose.connect(mongoURI)
//   .then(() => console.log('Connected to MongoDB SchoolDB'))
//   .catch(err => console.error('MongoDB Connection Error:', err));

// // Student Schema - Updated for Flexible Fees & History
// const studentSchema = new mongoose.Schema({
//   studentId: { type: String, required: true, unique: true },
//   fullName: String,
//   phone: String,
//   parentPhone: String,
//   monthlyFee: Number, // Standard recurring fee
//   balance: { type: Number, default: 0 },
//   history: [{
//     date: { type: Date, default: Date.now },
//     type: { type: String, enum: ['Payment', 'Charge'] },
//     amount: Number,
//     note: String
//   }],
//   passwordHash: { type: String, default: null }, 
//   createdAt: { type: Date, default: Date.now }
// });

// const Student = mongoose.model('Student', studentSchema);

// // Admin Helper
// const ADMIN_USER = { username: 'admin', password: 'admin123' };

// const hashPassword = (password) => {
//   return crypto.createHash('sha256').update(password).digest('hex');
// };

// // --- ROUTES ---

// app.post('/api/login', async (req, res) => {
//   const { id, password, role } = req.body;
//   try {
//     if (role === 'admin') {
//       if (id === ADMIN_USER.username && password === ADMIN_USER.password) {
//         return res.json({ success: true, user: { role: 'admin', fullName: 'System Admin' } });
//       }
//       return res.status(401).json({ success: false, message: 'Invalid Admin credentials' });
//     } else {
//       const student = await Student.findOne({ studentId: id });
//       if (!student) return res.status(404).json({ success: false, message: 'Student ID not found' });
//       if (!student.passwordHash) {
//         return res.json({ success: true, needsSetup: true, student: { _id: student._id, studentId: student.studentId } });
//       }
//       if (hashPassword(password) === student.passwordHash) {
//         return res.json({ success: true, user: { role: 'student', ...student._doc } });
//       }
//       return res.status(401).json({ success: false, message: 'Incorrect password' });
//     }
//   } catch (err) {
//     res.status(500).json({ success: false, message: 'Server error' });
//   }
// });

// app.post('/api/students/setup', async (req, res) => {
//   const { firestoreId, password } = req.body;
//   try {
//     const passwordHash = hashPassword(password);
//     await Student.findByIdAndUpdate(firestoreId, { passwordHash });
//     res.json({ success: true });
//   } catch (err) {
//     res.status(500).json({ success: false, message: 'Password setup failed' });
//   }
// });

// app.get('/api/students', async (req, res) => {
//   try {
//     const students = await Student.find().sort({ createdAt: -1 });
//     res.json(students);
//   } catch (err) {
//     res.status(500).json({ message: 'Error fetching students' });
//   }
// });

// app.post('/api/students', async (req, res) => {
//   try {
//     const lastStudent = await Student.findOne().sort({ studentId: -1 });
//     let nextIdNumber = 1001;
//     if (lastStudent && lastStudent.studentId) {
//       nextIdNumber = parseInt(lastStudent.studentId) + 1;
//     }
//     const studentId = nextIdNumber.toString();
//     const fee = parseFloat(req.body.monthlyFee) || 0;
    
//     const newStudent = new Student({ 
//       ...req.body, 
//       studentId,
//       monthlyFee: fee,
//       balance: fee, // Initial month fee
//       history: [{ type: 'Charge', amount: fee, note: 'Initial Registration Fee' }]
//     });
    
//     await newStudent.save();
//     res.json(newStudent);
//   } catch (err) {
//     res.status(500).json({ message: 'Error adding student' });
//   }
// });

// // Record Partial or Full Payment
// app.patch('/api/students/:id/pay', async (req, res) => {
//   try {
//     const { amount, note } = req.body;
//     const payAmount = parseFloat(amount);
//     if (isNaN(payAmount) || payAmount <= 0) return res.status(400).json({ message: "Invalid amount" });

//     const student = await Student.findById(req.params.id);
//     if (!student) return res.status(404).json({ message: "Student not found" });

//     student.balance = Math.max(0, student.balance - payAmount);
//     student.history.push({
//       type: 'Payment',
//       amount: payAmount,
//       date: new Date(),
//       note: note || 'Monthly Installment'
//     });

//     await student.save();
//     res.json(student);
//   } catch (err) {
//     res.status(500).json({ message: 'Payment update failed' });
//   }
// });

// // Add Extra Charge (New Month or Misc)
// app.patch('/api/students/:id/charge', async (req, res) => {
//   try {
//     const { amount, note } = req.body;
//     const chargeAmount = parseFloat(amount);
//     if (isNaN(chargeAmount) || chargeAmount <= 0) return res.status(400).json({ message: "Invalid amount" });

//     const student = await Student.findById(req.params.id);
//     if (!student) return res.status(404).json({ message: "Student not found" });

//     student.balance += chargeAmount;
//     student.history.push({
//       type: 'Charge',
//       amount: chargeAmount,
//       date: new Date(),
//       note: note || 'Monthly Tuition Fee'
//     });

//     await student.save();
//     res.json(student);
//   } catch (err) {
//     res.status(500).json({ message: 'Charge failed' });
//   }
// });

// app.delete('/api/students/:id', async (req, res) => {
//   try {
//     await Student.findByIdAndDelete(req.params.id);
//     res.json({ success: true });
//   } catch (err) {
//     res.status(500).json({ message: 'Delete failed' });
//   }
// });

// app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));






