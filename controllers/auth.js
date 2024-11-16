const jwt = require('jsonwebtoken');
const User = require('../models/User');
const bcrypt = require('bcryptjs');

// JWT Secret
const JWT_SECRET = process.env.JWT_SECRET_KEY;

// Signup
exports.signup = async (req, res) => {
    // console.log(req.body);
    const { username, password, role } = req.body;

    // const hashedPassword = await bcrypt.hash(password, 10);
    const user = new User({ 
        username, 
        password, // Save the hashed password
        role 
    });

    console.log(user);
    try {
        await user.save();

        // Generate a JWT token for the new user
        const token = jwt.sign({ userId: user._id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '12h' });

        // Respond with the token
        res.status(201).json({ message: 'Signup successful', token });
    } catch (err) {
        // console.log(err);
        res.status(400).json({ err: 'Signup failed', details: err.message });
    }
};

// Login
exports.login = async (req, res) => {
    // console.log("called");
    const { username, password } = req.body;

    try {
        const user = await User.findOne({ username });
        if (!user || !(await bcrypt.compare(password, user.password))) {
            return res.status(400).json({ error: 'Invalid credentials' });
        }

        const token = jwt.sign({ userId: user._id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '12h' });
        res.json({ token });
    } catch (error) {
        console.log(error);
        res.status(500).json({ error: 'Login failed', details: error.message });
    }
};

// Middleware to protect routes
exports.authenticate = (roles = []) => {
    return (req, res, next) => {
        const token = req.headers.authorization?.split(' ')[1];
        if (!token) return res.status(401).json({ error: 'Unauthorized' });

        jwt.verify(token, process.env.JWT_SECRET, (error, user) => {
            if (error || (roles.length && !roles.includes(user.role))) {
                return res.status(403).json({ error: 'Forbidden' });
            }

            req.user = user; // This should have user info now
            console.log('Authenticated user:', req.user); // Log the authenticated user
            next();
        });
    };
};

