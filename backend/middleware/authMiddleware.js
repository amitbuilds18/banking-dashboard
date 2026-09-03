import jwt from "jsonwebtoken";

export default function protect(req, res, next) {
  try {
    const authHeader = req.headers.authorization;

    // ❌ No token
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ error: "No token" });
    }

    // ✅ Extract token
    const token = authHeader.split(" ")[1];

    // ❌ Token missing after split
    if (!token) {
      return res.status(401).json({ error: "No token found" });
    }

    // ✅ Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // ✅ Attach user
    req.user = decoded;

    next();

  } catch (err) {
    console.error("Auth Error:", err.message);
    res.status(401).json({ error: "Invalid token" });
  }
}