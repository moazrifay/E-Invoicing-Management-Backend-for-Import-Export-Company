const router = require('express').Router();
const { logout } = require('../controller/logOutController');

router.post('/', logout);

module.exports = router;