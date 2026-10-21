const router = require('express').Router();
const { register } = require('../controller/registerController');

router.post('/', register);

module.exports = router;