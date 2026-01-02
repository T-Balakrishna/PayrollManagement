const { OAuth2Client } = require("google-auth-library");
const jwt = require("jsonwebtoken");
const db = require("../models");

const GoogleAuth = db.GoogleAuth; // Use GoogleAuth model
const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

const googleLogin = async (req, res) => {
  try {
    const { token } = req.body;

    // Verify Google Token
    const ticket = await client.verifyIdToken({
      idToken: token,
      audience: process.env.GOOGLE_CLIENT_ID
    });

    const payload = ticket.getPayload();
    const { sub, email, given_name, family_name, picture } = payload;
    console.log("Google Payload:", payload);

    // Check if user exists in GoogleAuth table
    let googleUser = await GoogleAuth.findOne({ where: { email } });

    if (!googleUser) {
      googleUser = await GoogleAuth.create({
        googleId: sub,
        email,
        firstName: given_name,
        lastName: family_name,
        profilePic: picture,
        lastLogin: new Date()
      });
    } else {
      googleUser.lastLogin = new Date();
      await googleUser.save();
    }

    // Generate JWT
    const jwtToken = jwt.sign(
      { id: googleUser.id, email: googleUser.email },
      process.env.JWT_SECRET || "secret",
      { expiresIn: "7d" }
    );

    return res.status(200).json({
      message: "Google login successful",
      token: jwtToken,
      user: googleUser
    });

  } catch (err) {
    console.error(err);
    return res.status(500).json({ msg: "Google login failed", error: err.message });
  }
};

module.exports = { googleLogin };
