const express = require("express");
const router = express.Router();
const Class = require("../models/Class");
const Student = require("../models/Student")
const { authenticate } = require("../controllers/auth");
const mongoose = require('mongoose');

// Add New Class
router.post("/", authenticate(['admin']), async (req, res) => {
    try {
        const { name, year, studentFees, teacher } = req.body;

        // Get the authenticated user's ID from the middleware
        const userId = req.user.userId; // Ensure this is the correct path for the user ID

        // Checking if an existing class is present or not
        const existingClass = await Class.findOne({ name });
        if (existingClass) {
            return res.status(400).json({ message: "Class with this name already exists." });
        }

        // If no existing class is present, create a new class
        const newClass = new Class({
            user: userId, // Assigning the userId to the user field
            name,
            year,
            studentFees,
            teacher,
            students: [], // Initialize with an empty array or handle as needed
        });

        await newClass.save();

        res.status(201).json(newClass);
    } catch (err) {
        console.error('Error saving class:', err.message); // Log the error message
        res.status(400).json({ message: err.message });
    }
});

//Fetch all classes information
router.get("/", async (req, res) => {
   try {
       const classes = await Class.find().populate("teacher students");
       res.json(classes);
   } catch (err) {
        res.status(500).json({message: err.message });
   } 
});

// Get class by Object ID
router.get('/:id', authenticate(['admin']), async (req, res) => {
    try {
        const classId = req.params.id;
        const classInfo = await Class.findById(classId);

        if (classInfo) {
            res.json(classInfo);
        } else {
            res.status(404).json({ message: 'Class with the provided ID not found' });
        }
    } catch (err) {
        res.status(500).json({ message: `Error retrieving class: ${err.message}` });
    }
});

// Update the class information
router.put("/:name", authenticate(['admin']), async (req, res) => {
    try {
        const updateClass = await Class.findOneAndUpdate({ name: req.params.name }, req.body, {new: true});
        if (!updateClass) {
            return res.status(404).json({ message: "Class not found" });
        }
        res.json(updateClass);
    } catch (err) {
        res.status(400).json({message: err.message });
    }
});

// Delete a class information by ID
router.delete("/:id", authenticate(['admin']), async (req, res) => {
    try {
        const deletedClass = await Class.findByIdAndDelete(req.params.id);
        if (!deletedClass) {
            return res.status(404).json({ message: "Class not found" });
        }
        res.json({ message: "Class Deleted" });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Add a student to a class
router.put('/:classId/add-student', authenticate(['admin']), async (req, res) => {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const { studentId } = req.body;
        const classId = req.params.classId;

        console.log(`Received request to add student ${studentId} to class ${classId}`);

        // Fetch the class
        const classInfo = await Class.findById(classId).session(session);
        if (!classInfo) {
            console.log(`Class not found: ${classId}`);
            return res.status(404).json({ message: "Class not found" });
        }
        console.log(`Class found: ${classInfo.name}`);

        // Fetch the student
        const student = await Student.findById(studentId).session(session);
        if (!student) {
            console.log(`Student not found: ${studentId}`);
            return res.status(404).json({ message: "Student not found" });
        }
        console.log(`Student found: ${student.name}`);

        // Update the student's class
        student.class = classId; // Assuming class is the field that stores classId
        await student.save({ session });
        console.log(`Updated student ${student.name} with class ${classId}`);

        // Add the student to the class's student list
        classInfo.students.push(student._id);
        await classInfo.save({ session });
        console.log(`Added student ${student.name} to class ${classInfo.name}`);

        // Commit the transaction
        await session.commitTransaction();
        session.endSession();

        res.json({ message: "Student added to class successfully", class: classInfo });
    } catch (err) {
        await session.abortTransaction();
        session.endSession();
        console.error(`Error adding student to class: ${err.message}`);
        res.status(400).json({ message: err.message });
    }
});

// Assigning a student to a class
router.put('/:classId/assign-student', authenticate(['admin']), async (req, res) => {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const { studentId } = req.body;
        const classId = req.params.classId;

        console.log(`Received request to assign student ${studentId} to class ${classId}`);

        // Fetch the class
        const classInfo = await Class.findById(classId).session(session);
        if (!classInfo) {
            console.log(`Class not found: ${classId}`);
            return res.status(404).json({ message: "Class not found" });
        }
        console.log(`Class found: ${classInfo.name}`);

        // Fetch the student
        const student = await Student.findById(studentId).session(session);
        if (!student) {
            console.log(`Student not found: ${studentId}`);
            return res.status(404).json({ message: "Student not found" });
        }
        console.log(`Student found: ${student.name}`);

        // Check if the student is already assigned to a class
        if (student.class.includes(classId)) {
            console.log(`Student ${student.name} is already assigned to this class.`);
            return res.status(400).json({ message: "Student is already assigned to this class." });
        }

        // Update the student's class
        student.class.push(classId); // Add classId to the student's classes
        await student.save({ session });
        console.log(`Updated student ${student.name} with class ${classId}`);

        // Add the student to the class's student list
        classInfo.students.push(student._id);
        await classInfo.save({ session });
        console.log(`Added student ${student.name} to class ${classInfo.name}`);

        // Commit the transaction
        await session.commitTransaction();
        session.endSession();

        res.json({ message: "Student assigned to class successfully", class: classInfo });
    } catch (err) {
        await session.abortTransaction();
        session.endSession();
        console.error(`Error assigning student to class: ${err.message}`);
        res.status(400).json({ message: err.message });
    }
});

router.get('/analytics/:name', authenticate(), async (req, res) => {
    try {
        const classInfo = await Class.findOne({ name: req.params.name }).populate('students teacher');
        if (!classInfo) {
            return res.status(404).json({ message: "Requested Class not found" });
        }

        // Calculate male/female distribution
        const maleStudents = classInfo.students.filter(student => student.gender === 'Male').length;
        const femaleStudents = classInfo.students.filter(student => student.gender === 'Female').length;

        res.json({
            classDetail: classInfo,
            maleStudents,
            femaleStudents,
        });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

module.exports = router;