const express = require('express');
const {
  registerUser,
  loginUser,
  logoutUser,
  loginAdmin,
  registerAdmin,
} = require('../controllers/authController');

const router = express.Router();

router.post('/register', registerUser);
router.post('/login', loginUser);
router.post('/logout', logoutUser);
router.post('/admin/login', loginAdmin); // Admin login route
router.post('/admin/register', registerAdmin); // 🔹 New route for admin registration

module.exports = router;
