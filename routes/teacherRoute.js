const express = require("express");
const router = express.Router();
const Teacher = require("../models/Teacher");
const Class = require("../models/Class");
const Student = require("../models/Student");
const mongoose = require("mongoose");
const { authenticate } = require("../controllers/auth");

//Add New teacher
router.post('/', authenticate(['teacher']), async (req, res) => {
    try {
        const { name, gender, dob, contactDetails, salary, assignedClass } = req.body;

        // Get the authenticated user's ID from the middleware
        const userId = req.user.userId; // Ensure you are using the correct path for the user ID in the authentication middleware

        // Create a new teacher with the user reference
        const newTeacher = new Teacher({
            name,
            gender,
            dob,
            contactDetails,
            salary,
            assignedClass, // Assuming `assignedClass` is the class field for teachers
            user: userId // Assigning the userId to the user field
        });

        console.log(newTeacher);

        // Save the new teacher to the database
        await newTeacher.save();

        res.status(201).json(newTeacher);
    } catch (err) {
        console.error('Error saving teacher:', err.message); // Log the message
        res.status(400).json({ message: err.message });
    }
});

// Get all teachers
router.get('/', async (req, res) => {
    try {
        const allTeachers = await Teacher.find().populate({
            path: 'assignedClass',
            populate: {
                path: 'students', // Change 'student' to 'students'
                select: 'name' // Optional: specify which fields to return for students
            }
        });

        res.json(allTeachers);
    } catch (err) {
        console.error('Error fetching teachers:', err.message); // Log the error for debugging
        res.status(500).json({ message: err.message });
    }
});


// Fetch specific teacher information by id
router.get("/:id", authenticate(), async (req, res) => {
    // console.log("called");
    try {
        const userId = req.params.id; // Extract userId from the request parameters
        // console.log(userId);
        const teacher = await Teacher.findOne({ user: userId })
            .populate({
                path: "assignedClass",
                populate: {
                    path: "students", // Populates the 'students' array in the 'assignedClass'
                    model: "Student" // Specifies the model to populate from
                }
            });

        if (!teacher) {
            return res.status(404).json({ message: "Teacher id doesn't match with any Teacher, try with correct id" });
        }
        res.json(teacher);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Update teacher details by id
router.put("/:id", authenticate(['admin', 'teacher']), async (req, res) => {
    try {
        const updateTeacher = await Teacher.findByIdAndUpdate(req.params.id, req.body, { new: true });
        if (!updateTeacher) {
            return res.status(404).json({ message: "Teacher id doesn't match with any Teacher, try with correct id" });
        }
        res.json(updateTeacher);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

// Assigning a class to a teacher
router.put("/:id/assign-class", authenticate(['admin']), async (req, res) => {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const { class: className } = req.body;
        const classInfo = await Class.findOne({ name: className.trim() }).session(session);

        if (!classInfo) {
            return res.status(404).json({ message: "Class not found" });
        }

        // Check if the teacher is already assigned to a class
        const existingTeacher = await Teacher.findById(req.params.id).session(session);
        if (existingTeacher.assignedClass) {
            return res.status(400).json({ message: "Teacher is already assigned to a class." });
        }

        // Update the teacher
        const updatedTeacher = await Teacher.findByIdAndUpdate(
            req.params.id,
            { assignedClass: classInfo._id },
            { new: true, session }
        );

        // Add the teacher to the class
        classInfo.teacher = updatedTeacher._id; // Assign teacher to the class
        await classInfo.save({ session });

        // Commit the transaction
        await session.commitTransaction();
        session.endSession();

        // Populate the class with students and return
        const populatedTeacher = await Teacher.findById(updatedTeacher._id).populate("assignedClass");
        res.json(populatedTeacher);
    } catch (err) {
        await session.abortTransaction();
        session.endSession();
        res.status(400).json({ message: err.message });
    }
});

// Fetch specific teacher information by teacherId
router.get('/teacher/:teacherId', authenticate(), async (req, res) => {
    // console.log("called");
    try {
        const teacherId = req.params.teacherId; // Extract teacherId from the request parameters

        const teacher = await Teacher.findById(teacherId); // Fetch teacher by ID
        if (!teacher) {
            return res.status(404).json({ message: "Teacher ID doesn't match with any teacher, try with the correct ID" });
        }
        res.json(teacher);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Fetch students assigned to the teacher's class
router.get('/:id/class-students', authenticate(), async (req, res) => {
    try {
        const teacher = await Teacher.findById(req.params.id).populate('assignedClass');

        if (!teacher) {
            return res.status(404).json({ message: "Teacher not found" });
        }

        const assignedClass = teacher.assignedClass;

        if (!assignedClass) {
            return res.status(200).json({ students: [] });
        }

        const studentsInClass = await Student.find({ class: assignedClass._id });

        res.json({
            className: assignedClass.name,
            students: studentsInClass,
        });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Delete teacher information by id
router.delete("/:id", authenticate(['admin']), async (req, res) => {
    try {
        const deletedTeacher = await Teacher.findByIdAndDelete(req.params.id);
        if (!deletedTeacher) {
            return res.status(404).json({ message: "Teacher id doesn't match with any Teacher, try with correct id" });
        }
        res.json({ message: "Teacher deleted successfully" });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

module.exports = router;
