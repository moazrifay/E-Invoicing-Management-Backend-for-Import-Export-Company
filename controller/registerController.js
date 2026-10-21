const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { findUserByEmail, findUserByTaxId, createUser } = require('../model/userModel');
const {saveRefreshToken} = require('../model/tokenModel');


const TAX_ID_REGEX = /^\d{9}$/;


const register = async (req, res) => {
  try {
    const { fullName, email, taxId, password } = req.body;

    // A. Validate that all required fields are present.
    if (!fullName || !email || !taxId || !password) {
      return res.status(400).json({
        success: false,
        message: 'برجاء إدخال كافة البيانات (الاسم، الإيميل، السجل الضريبي، كلمة السر)'
      });
    }

    if (!TAX_ID_REGEX.test(taxId)) {
      return res.status(400).json({
        success: false,
        message: 'رقم السجل الضريبي يجب أن يتكون من 9 أرقام بالضبط'
      });
    }

    // C. Ensure the email address is not already registered.
    const existingUser = await findUserByEmail(email);
    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: 'البريد الإلكتروني مُسجل بالفعل'
      });
    }

    // D. Hash the password before saving it to PostgreSQL.
    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = await createUser({
      fullName,
      email,
      taxId,
      hashedPassword
    });

    // E. Generate the refresh token.
    const refreshToken = jwt.sign(
      { id: newUser.id, email: newUser.email, taxId: newUser.tax_id },
      process.env.REFRESH_TOKEN_SECRET,
      { expiresIn: '7d' }
    );
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    await saveRefreshToken(newUser.id,refreshToken,expiresAt);

    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 1000 * 60 * 60 * 24 * 7,
    });
    res.status(201).json({
      success: true,
      message: 'تم تسجيل الحساب بنجاح',
      user: {
        id: newUser.id,
        fullName: newUser.full_name,
        email: newUser.email,
        taxId: newUser.tax_id
      },
    });

  } catch (error) {
    console.error('Registration Error:', error);
    res.status(500).json({ success: false, message: 'حدث خطأ في السيرفر أثناء التسجيل' });
  }
};

module.exports = { register };