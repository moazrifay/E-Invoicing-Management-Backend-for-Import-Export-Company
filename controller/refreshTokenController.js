const jwt = require('jsonwebtoken');
const { findRefreshToken, deleteRefreshToken } = require('../model/tokenModel');

const refreshAccessToken = async (req, res) => {
  try {
    const refreshToken = req.cookies?.refreshToken;

    if (!refreshToken) {
      return res.status(401).json({
        success: false,
        message: 'غير مصرح، لا يوجد Refresh Token في الكوكي'
      });
    }

    // Check the database record before issuing a new access token.
    const storedToken = await findRefreshToken(refreshToken);
    if (!storedToken) {
      return res.status(403).json({
        success: false,
        message: 'الجلسة غير صالحة أو تم تسجيل الخروج'
      });
    }

    jwt.verify(
      refreshToken,
      process.env.REFRESH_TOKEN_SECRET,
      async (err, decoded) => {
        if (err) {
          await deleteRefreshToken(refreshToken);
          return res.status(403).json({
            success: false,
            message: 'انتهت صلاحية الجلسة أو الـ Refresh Token غير صالح، يرجى إعادة تسجيل الدخول'
          });
        }

        const newAccessToken = jwt.sign(
          { id: decoded.id, email: decoded.email, taxId: decoded.taxId },
          process.env.ACCESS_TOKEN_SECRET,
          { expiresIn: '15m' }
        );

        res.status(200).json({
          success: true,
          accessToken: newAccessToken
        });
      }
    );

  } catch (error) {
    console.error('Refresh Token Error:', error);
    res.status(500).json({ success: false, message: 'حدث خطأ أثناء تجديد التوكن' });
  }
};

module.exports = { refreshAccessToken };