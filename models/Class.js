const mongoose = require("mongoose");

const classSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    name: {
        type: String,
        required: true,
        // unique: true,
        trim: true
    },
    year: {
        type: Number,
        required: true,
    },
    teacher: {
        type: mongoose.Schema.Types.ObjectId,
            ref: 'Teacher',
    },
    students: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Student',
    }],
    studentFees: {
        type: Number,
        required: true
    },
});

module.exports = mongoose.model('Class', classSchema);