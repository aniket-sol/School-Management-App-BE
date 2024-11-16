const express = require("express");
const router = express.Router();
const Student = require("../models/Student");
const Class = require("../models/Class");
const mongoose = require("mongoose");
const { authenticate } = require("../controllers/auth");

// Get all students information
router.get('/', authenticate(), async (req, res) => {
  try {
    const allStudents = await Student.find().populate("class");
    res.json(allStudents);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Add new student
router.post('/', authenticate(['student']), async (req, res) => {
  try {
    const { name, gender, dob, contactDetails, feesPaid, class: studentClass } = req.body;

    // Get the authenticated user's ID from the middleware
    const userId = req.user.userId;

    // Create a new student with the user reference
    const newStudent = new Student({
      name,
      gender,
      dob,
      contactDetails,
      feesPaid,
      class: studentClass,
      user: userId // Assigning the userId to the user field
    });
    console.log(newStudent);

    await newStudent.save();
    res.status(201).json(newStudent);
  } catch (err) {
    console.error('Error saving student:', err.message); // Log the message
    res.status(400).json({ message: err.message });
  }
});

// Fetch specific student information by user id
router.get('/:id', authenticate(), async (req, res) => {
  try {
    const userId = req.params.id; // Extract userId from the request parameters

    const student = await Student.findOne({ user: userId }).populate("class");
    if (!student) {
      return res.status(404).json({ message: "Student id doesn't match with any Student, try with correct id" });
    }
    res.json(student);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Fetch specific student information by studentId
router.get('/student/:studentId', authenticate(), async (req, res) => {
  try {
    const studentId = req.params.studentId; // Extract studentId from the request parameters

    const student = await Student.findById(studentId).populate("class");
    if (!student) {
      return res.status(404).json({ message: "Student ID doesn't match with any student, try with the correct ID" });
    }
    res.json(student);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Update student information by userId
router.put('/:id', authenticate(['admin', 'student']), async (req, res) => {
  try {
    const userId = req.params.id; // Extract userId from the request parameters
    const { class: className, ...studentData } = req.body;

    // Check if a class name is already provided
    if (className) {
      const classInfo = await Class.findOne({ name: className });
      if (!classInfo) {
        return res.status(404).json({ message: "Class not found" });
      }
      studentData.class = classInfo._id;
    }

    // Log the data being updated
    console.log('Updating student with data:', { userId, studentData });

    // Find the student by userId and update
    const updatedStudent = await Student.findOneAndUpdate({ user: userId }, studentData, { new: true });
    if (!updatedStudent) {
      return res.status(404).json({ message: "Student id doesn't match with any Student, try with correct id" });
    }

    // Log the updated student data
    console.log('Updated student data:', updatedStudent);

    res.json(updatedStudent);
  } catch (err) {
    console.error('Error updating student:', err); // Log the error for debugging
    res.status(400).json({ message: err.message });
  }
});

// Assign class to student
router.put('/:id/assign-class', authenticate(['admin']), async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { class: className } = req.body;
    const classInfo = await Class.findOne({ name: className.trim() }).session(session);

    if (!classInfo) {
      return res.status(404).json({ message: "Class not found" });
    }

    // Update the student to assign the class
    const updatedStudent = await Student.findByIdAndUpdate(
      req.params.id,
      { class: classInfo._id },
      { new: true, session }
    );

    // Add the student to the class's student list
    classInfo.students.push(updatedStudent._id);
    await classInfo.save({ session });

    // Commit the transaction
    await session.commitTransaction();
    session.endSession();

    // Populate class and teacher details for the updated student
    const populatedStudent = await Student.findById(updatedStudent._id).populate({
      path: "class",
      populate: {
        path: "teacher"
      }
    });

    res.json(populatedStudent);
  } catch (err) {
    await session.abortTransaction();
    session.endSession();
    res.status(400).json({ message: err.message });
  }
});

// Delete student information by id
router.delete('/:id', authenticate(['admin']), async (req, res) => {
  try {
    const deletedStudent = await Student.findByIdAndDelete(req.params.id);
    if (!deletedStudent) {
      return res.status(404).json({ message: "Student id doesn't match with any Student, try with correct id" });
    }
    res.json({ message: "Student information deleted" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
