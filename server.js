require('dotenv').config();
const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');

const registrationRoutes = require('./routes/regsteration');
const loginRoutes = require('./routes/login');
const logoutRoutes = require('./routes/logout');
const refreshRoutes = require('./routes/refresh');
const invoiceRoutes = require('./routes/invoicingAccounting');

const app = express();
const port = Number(process.env.PORT) || 3000;
const clientUrl = process.env.CLIENT_URL;

app.use(cors({
  origin: clientUrl || false,
  credentials: true
}));
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());

app.get('/health', (req, res) => {
  res.status(200).json({ success: true, message: 'Server is running' });
});

app.use('/api/auth/register', registrationRoutes);
app.use('/api/auth/login', loginRoutes);
app.use('/api/auth/logout', logoutRoutes);
app.use('/api/auth/refresh', refreshRoutes);
app.use('/api/', invoiceRoutes);

app.use((req, res) => {
  res.status(404).json({ success: false, message: 'المسار غير موجود' });
});

app.use((error, req, res, next) => {
  console.error('Unhandled Server Error:', error);
  if (error.code === 'LIMIT_FILE_SIZE' || error.code === 'LIMIT_FILE_COUNT') {
    return res.status(413).json({
      success: false,
      message: 'Uploaded files exceed the allowed size or count.',
    });
  }

  if (error instanceof require('multer').MulterError) {
    return res.status(400).json({
      success: false,
      message: 'The uploaded file is invalid.',
    });
  }

  res.status(500).json({
    success: false,
    message: 'An unexpected server error occurred.',
  });
});

if (require.main === module) {
  app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
  });
}

module.exports = app;