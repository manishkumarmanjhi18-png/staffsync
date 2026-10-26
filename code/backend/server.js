import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

dotenv.config();
const app = express();
app.use(cors());
app.use(express.json());
const SECRET = process.env.JWT_SECRET || 'staffsync_secret';

// ---------- Models ----------
const { Schema, model } = mongoose;
const ref = (m) => ({ type: Schema.Types.ObjectId, ref: m });

const User = model('User', new Schema({
  name: String,
  email: { type: String, unique: true, lowercase: true },
  password: String,
  role: { type: String, enum: ['hr', 'manager', 'employee'], default: 'employee' },
  department: String,
  position: String,
  phone: String,
}, { timestamps: true }));

const Leave = model('Leave', new Schema({
  user: ref('User'), from: String, to: String, reason: String,
  status: { type: String, default: 'Pending' },
}, { timestamps: true }));

const attSchema = new Schema({ user: ref('User'), date: String, status: { type: String, default: 'Present' } }, { timestamps: true });
attSchema.index({ user: 1, date: 1 }, { unique: true });
const Attendance = model('Attendance', attSchema);

const Announcement = model('Announcement', new Schema({ title: String, body: String, author: ref('User') }, { timestamps: true }));
const Training = model('Training', new Schema({ title: String, description: String, date: String, createdBy: ref('User') }, { timestamps: true }));

// ---------- Auth middleware ----------
const auth = (...roles) => (req, res, next) => {
  try {
    const token = (req.headers.authorization || '').split(' ')[1];
    req.user = jwt.verify(token, SECRET);
    if (roles.length && !roles.includes(req.user.role)) return res.status(403).json({ message: 'You are not allowed to do this' });
    next();
  } catch {
    res.status(401).json({ message: 'Please log in again' });
  }
};
const wrap = (fn) => (req, res) => fn(req, res).catch((e) => res.status(400).json({ message: e.message }));
const safe = (u) => { const o = u.toObject(); delete o.password; return o; };

// ---------- Auth ----------
app.post('/api/login', wrap(async (req, res) => {
  const user = await User.findOne({ email: req.body.email?.toLowerCase() });
  if (!user || !(await bcrypt.compare(req.body.password || '', user.password)))
    return res.status(400).json({ message: 'Wrong email or password' });
  const token = jwt.sign({ id: user._id, role: user.role }, SECRET, { expiresIn: '1d' });
  res.json({ token, user: safe(user) });
}));

app.get('/api/me', auth(), wrap(async (req, res) => res.json(safe(await User.findById(req.user.id)))));
app.put('/api/me', auth(), wrap(async (req, res) => {
  const { name, phone, department, position } = req.body;
  res.json(safe(await User.findByIdAndUpdate(req.user.id, { name, phone, department, position }, { new: true })));
}));

// ---------- Employees (HR manages, managers can view) ----------
app.get('/api/employees', auth('hr', 'manager'), wrap(async (req, res) => res.json(await User.find().select('-password').sort('-createdAt'))));
app.post('/api/employees', auth('hr'), wrap(async (req, res) => {
  const { password, ...rest } = req.body;
  const user = await User.create({ ...rest, password: await bcrypt.hash(password || 'welcome123', 10) });
  res.json(safe(user));
}));
app.delete('/api/employees/:id', auth('hr'), wrap(async (req, res) => {
  await User.findByIdAndDelete(req.params.id); res.json({ ok: true });
}));

// ---------- Leaves ----------
app.get('/api/leaves', auth(), wrap(async (req, res) => {
  const filter = req.user.role === 'employee' ? { user: req.user.id } : {};
  res.json(await Leave.find(filter).populate('user', 'name role').sort('-createdAt'));
}));
app.post('/api/leaves', auth(), wrap(async (req, res) => {
  const { from, to, reason } = req.body;
  if (!from || !to) throw new Error('Choose both dates');
  res.json(await Leave.create({ from, to, reason, user: req.user.id }));
}));
app.put('/api/leaves/:id', auth('hr', 'manager'), wrap(async (req, res) => {
  res.json(await Leave.findByIdAndUpdate(req.params.id, { status: req.body.status }, { new: true }));
}));

// ---------- Attendance ----------
app.get('/api/attendance', auth(), wrap(async (req, res) => {
  const filter = req.user.role === 'hr' ? {} : { user: req.user.id };
  res.json(await Attendance.find(filter).populate('user', 'name').sort('-date'));
}));
app.post('/api/attendance', auth(), wrap(async (req, res) => {
  const date = new Date().toISOString().slice(0, 10);
  try { res.json(await Attendance.create({ user: req.user.id, date })); }
  catch { throw new Error('You already marked attendance today'); }
}));

// ---------- Announcements ----------
app.get('/api/announcements', auth(), wrap(async (req, res) => res.json(await Announcement.find().populate('author', 'name').sort('-createdAt'))));
app.post('/api/announcements', auth('hr'), wrap(async (req, res) => res.json(await Announcement.create({ ...req.body, author: req.user.id }))));
app.delete('/api/announcements/:id', auth('hr'), wrap(async (req, res) => { await Announcement.findByIdAndDelete(req.params.id); res.json({ ok: true }); }));

// ---------- Training (managers create, everyone views) ----------
app.get('/api/training', auth(), wrap(async (req, res) => res.json(await Training.find().populate('createdBy', 'name').sort('date'))));
app.post('/api/training', auth('manager'), wrap(async (req, res) => res.json(await Training.create({ ...req.body, createdBy: req.user.id }))));
app.delete('/api/training/:id', auth('manager'), wrap(async (req, res) => { await Training.findByIdAndDelete(req.params.id); res.json({ ok: true }); }));

// ---------- Start + demo accounts ----------
async function seed() {
  if (await User.countDocuments()) return;
  const mk = (name, email, role, department, position) => ({ name, email, role, department, position, password: bcrypt.hashSync('password123', 10) });
  await User.insertMany([
    mk('Hira HR', 'hr@staffsync.com', 'hr', 'Human Resources', 'HR Lead'),
    mk('Manav Manager', 'manager@staffsync.com', 'manager', 'Engineering', 'Team Manager'),
    mk('Esha Employee', 'employee@staffsync.com', 'employee', 'Engineering', 'Developer'),
  ]);
  console.log('Demo users created (password: password123)');
}

mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/staffsync').then(async () => {
  await seed();
  app.listen(process.env.PORT || 5000, () => console.log('StaffSync API running on port ' + (process.env.PORT || 5000)));
}).catch((e) => console.error('MongoDB connection failed:', e.message));
