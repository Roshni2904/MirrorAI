const mongoose = require("mongoose");

const scheduleSchema = new mongoose.Schema({
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

const Schedule = mongoose.model("Schedule", scheduleSchema);

module.exports = Schedule;