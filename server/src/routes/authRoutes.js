const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');

router.post('/login', authController.login);
router.post('/register/student', authController.registerStudent);
router.post('/activate/parent', authController.activateParent);
router.get('/departments', authController.getDepartments);
router.post('/logout', authController.logout);

module.exports = router;
