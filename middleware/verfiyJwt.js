const jwt = require("jsonwebtoken");

const verifyToken = (req, res, next) => {
  const secret = process.env.ACCESS_TOKEN_SECRET;
  const authHeader = req.headers.authorization;

  if (!secret) {
    return next(new Error("ACCESS_TOKEN_SECRET is not configured."));
  }

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({
      success: false,
      message: "A Bearer access token is required.",
    });
  }

  const token = authHeader.slice("Bearer ".length).trim();
  if (!token) {
    return res.status(401).json({
      success: false,
      message: "A Bearer access token is required.",
    });
  }

  jwt.verify(token, secret, { algorithms: ["HS256"] }, (err, decoded) => {
    if (err) {
      return res.status(403).json({
        success: false,
        message: "The access token is invalid or expired.",
      });
    }

    if (!decoded || typeof decoded !== "object" || !decoded.id) {
      return res.status(403).json({
        success: false,
        message: "The access token payload is invalid.",
      });
    }

    req.user = decoded;
    next();
  });
};

module.exports = verifyToken;
