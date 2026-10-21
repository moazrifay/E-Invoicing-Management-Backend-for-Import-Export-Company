const {deleteRefreshToken} = require('../model/tokenModel')



const logout = async (req, res) => {
  try {
    const refreshToken = req.cookies?.refreshToken;

    if (refreshToken) {
      // A. Delete the token from the database to revoke it immediately.
      await deleteRefreshToken(refreshToken);
    }

    // B. Clear the token cookie from the user's browser.
    res.clearCookie('refreshToken', {httpOnly:true});

    return res.status(200).json({
      success: true,
      message: 'تم تسجيل الخروج بنجاح'
    });

  } catch (error) {
    console.error('Logout Error:', error);
    return res.status(500).json({
      success: false,
      message: 'حدث خطأ في السيرفر أثناء تسجيل الخروج'
    });
  }
};


module.exports = { logout };