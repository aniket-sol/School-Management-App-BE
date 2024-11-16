const express = require("express");
const bodyParser = require("body-parser");
const mongoose = require("mongoose");
const cors = require("cors");
const dotenv = require("dotenv");
dotenv.config();
//Importing routes
const studentRoute = require("./routes/studentRoute");
const teacherRoute = require("./routes/teacherRoute");
const classRoute = require("./routes/classRoute");
const authRoute = require("./routes/authRoute");

const app = express();
// app.use(cors());
app.use(cors({
  origin: '*', // Allow only this origin
  methods: ['GET', 'POST', 'PUT', 'DELETE'], // Specify allowed HTTP methods
  credentials: true // Include credentials if needed
}));
app.use(bodyParser.json());

//All Routes 
app.use('/api/student', studentRoute);
app.use('/api/teacher', teacherRoute);
app.use('/api/class', classRoute);
app.use('/api/auth', authRoute);

// Connect to database MongoDB
mongoose.connect(process.env.MONGODB_URI).then(() => console.log('Database is successfully connected'))
  .catch(err => console.log(err));

//Starting our server
const PORT = process.env.PORT || 8000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    }
);