const express = require("express");
const router = express.Router();
const { signup, login, authenticate } = require("../controllers/auth");

// Signup Route
router.post("/signup", signup);

// Login Route
router.post("/login", login);

// Example of a protected route
router.get("/protected", authenticate(['admin', 'teacher']), (req, res) => {
    res.json({ message: "You have access to this protected route" });
});

module.exports = router;