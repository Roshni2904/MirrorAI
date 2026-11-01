const mongoose = require("mongoose");

const reminderSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true
    },

    time: {
        type: String,
        required: true
    },

    date: {
        type: String,
        required: true
    }
});

const Reminder = mongoose.model("Reminder", reminderSchema);

module.exports = Reminder;