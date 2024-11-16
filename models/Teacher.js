const mongoose = require("mongoose");

const teacherSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    name: {
        type: String,
        required: true
    },
    gender: {
        type: String,
        enum: ['Male', 'Female'],
        required: true
    },
    dob: {
        type: Date,
        required: true
    },
    contactDetails: {
        type: String,
        required: true
    },
    salary: {
        type: Number,
        required: true
    },
    assignedClass: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Class'
    }
});

module.exports = mongoose.model('Teacher', teacherSchema);