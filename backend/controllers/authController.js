import jwt from "jsonwebtoken";

export const createToken = (user) => {
  if (!user || !user.id) {
    throw new Error("User ID is required to create a token");
  }

  return jwt.sign(
    { id: user.id },
    process.env.JWT_SECRET,
    {
      expiresIn: process.env.JWT_EXPIRE || "7d",
    }
  );
};