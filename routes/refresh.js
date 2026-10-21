const router = require('express').Router();
const { refreshAccessToken } = require('../controller/refreshTokenController');

router.get('/', refreshAccessToken);

module.exports = router;