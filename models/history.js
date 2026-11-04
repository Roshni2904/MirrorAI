const mongoose = require("mongoose");

const historySchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    },
    type: {
        type: String,
        required: true
    },
    detail: {
        type: String,
        default: ""
    },
    time: {
        type: String,
        default: ""
    }
}, { timestamps: true });

module.exports = mongoose.model("History", historySchema);