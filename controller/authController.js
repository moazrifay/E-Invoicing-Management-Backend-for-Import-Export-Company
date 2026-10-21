const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { findUserByTaxId } = require('../model/userModel');
const {saveRefreshToken} = require('../model/tokenModel');

const TAX_ID_REGEX = /^\d{9}$/;

const login = async (req, res) => {
  try {
    const { taxId, password } = req.body;

    if (!taxId || !password) {
      return res.status(400).json({
        success: false,
        message: 'برجاء إدخال السجل الضريبي وكلمة السر'
      });
    }

    if (!TAX_ID_REGEX.test(taxId)) {
      return res.status(400).json({
        success: false,
        message: 'رقم السجل الضريبي غير صحيح، يجب أن يتكون من 9 أرقام بالضبط'
      });
    }

    const user = await findUserByTaxId(taxId);
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'السجل الضريبي أو كلمة السر غير صحيحة'
      });
    }

    const isPasswordValid = await bcrypt.compare(password, user.password_hash);
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'السجل الضريبي أو كلمة السر غير صحيحة'
      });
    }

    const refreshToken = jwt.sign(
      { id: user.id, email: user.email, taxId: user.tax_id },
      process.env.REFRESH_TOKEN_SECRET,
      { expiresIn: '7d' }
    );

    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    await saveRefreshToken(user.id, refreshToken, expiresAt);

    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 1000 * 60 * 60 * 24 * 7,
    });

    res.status(200).json({
      success: true,
      message: 'تم تسجيل الدخول بنجاح',
      user: {
        id: user.id,
        fullName: user.full_name,
        email: user.email,
        taxId: user.tax_id
      }
    });

  } catch (error) {
    console.error('Login Error:', error);
    res.status(500).json({ success: false, message: 'حدث خطأ في السيرفر أثناء تسجيل الدخول' });
  }
};

module.exports = { login };
