const User = require('../models/User');
const generateToken = require('../utils/generateToken');
const bcrypt = require('bcryptjs');

// @desc Register User or Admin
// @route POST /api/auth/register
const registerUser = async (req, res) => {
  const { name, email, password, role } = req.body;

  const userExists = await User.findOne({ email });
  if (userExists)
    return res.status(400).json({ message: 'User already exists' });

  // Only allow specific emails to be admins (optional condition)
  const isAdmin =
    role === 'admin' && email === 'admin@example.com' ? 'admin' : 'user';

  const user = await User.create({ name, email, password, role: isAdmin });

  if (user) {
    generateToken(res, user._id);
    res.status(201).json({
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
    });
  } else {
    res.status(400).json({ message: 'Invalid user data' });
  }
};

// @desc Login User or Admin
// @route POST /api/auth/login
const loginUser = async (req, res) => {
  const { email, password } = req.body;
  const user = await User.findOne({ email });
  if (user && (await user.matchPassword(password))) {
    generateToken(res, user._id);
    res.json({
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
    });
  } else {
    res.status(401).json({ message: 'Invalid email or password' });
  }
};

// @desc Logout User or Admin
// @route POST /api/auth/logout
const logoutUser = (req, res) => {
  res.cookie('jwt', '', { httpOnly: true, expires: new Date(0) });
  res.json({ message: 'Logged out successfully' });
};

const loginAdmin = async (req, res) => {
  console.log('Admin Login Attempt');
  const { email, password } = req.body;

  const admin = await User.findOne({ email, role: 'admin' });

  if (!admin) {
    console.log('Admin not found');
    return res.status(401).json({ message: 'Admin not found' });
  }

  console.log('Entered Password:', password);
  console.log('Stored Hashed Password:', admin.password);

  // 🔹 Use bcrypt to compare passwords
  const isMatch = await bcrypt.compare(password, admin.password);
  console.log('Password Match:', isMatch);

  if (isMatch) {
    generateToken(res, admin._id);
    return res.json({
      _id: admin._id,
      name: admin.name,
      email: admin.email,
      role: admin.role,
    });
  } else {
    console.log('Password did not match!');
    return res.status(401).json({ message: 'Invalid admin credentials' });
  }
};

const registerAdmin = async (req, res) => {
  const { name, email, password } = req.body;

  // Restrict admin creation
  if (email !== 'admin@example.com') {
    return res
      .status(403)
      .json({ message: 'Unauthorized to register as admin' });
  }

  const userExists = await User.findOne({ email });

  if (userExists) {
    return res.status(400).json({ message: 'Admin already exists' });
  }

  // 🔹 Hash the password before saving
  const hashedPassword = await bcrypt.hash(password, 10);
  console.log('Hashed Password:', hashedPassword); // Debugging

  const admin = await User.create({
    name,
    email,
    password: hashedPassword, // Save the hashed password
    role: 'admin',
  });

  if (admin) {
    generateToken(res, admin._id);
    res.status(201).json({
      _id: admin._id,
      name: admin.name,
      email: admin.email,
      role: admin.role,
    });
  } else {
    res.status(400).json({ message: 'Invalid admin data' });
  }
};

module.exports = {
  registerUser,
  loginUser,
  logoutUser,
  loginAdmin,
  registerAdmin,
};

// module.exports = { registerUser, loginUser, logoutUser };
