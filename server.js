require("dotenv").config();

const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const User = require("./models/user");
const Reminder = require("./models/reminder");
const Schedule = require("./models/schedule");
const app = express();

app.use(cors());
app.use(express.json());

// MongoDB connection
mongoose.connect(process.env.MONGO_URI)
    .then(() => {
        console.log("MongoDB Connected");
    })
    .catch((error) => {
        console.log("MongoDB Connection Error:", error.message);
    });

// Test route
app.get("/", (req, res) => {
    res.json({
        message: "Smart Mirror Backend is Running"
    });
});
// REGISTER API
// LOGIN API
app.post("/api/login", async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({
                message: "Email and password are required"
            });
        }

        const user = await User.findOne({
            email: email.toLowerCase()
        });

        if (!user) {
            return res.status(401).json({
                message: "Invalid email or password"
            });
        }

        const isMatch = await bcrypt.compare(
            password,
            user.password
        );

        if (!isMatch) {
            return res.status(401).json({
                message: "Invalid email or password"
            });
        }

        res.status(200).json({
            message: "Login successful",
            user: {
                id: user._id,
                name: user.name,
                email: user.email
            }
        });

    } catch (error) {
        console.error("Login Error:", error);
        res.status(500).json({
            message: "Login failed"
        });
    }
});
app.post("/api/users", async (req, res) => {
    try {
        const { name, email, password } = req.body;

        if (!name || !email || !password) {
            return res.status(400).json({
                message: "All fields are required"
            });
        }

        const existingUser = await User.findOne({
            email: email.toLowerCase()
        });

        if (existingUser) {
            return res.status(409).json({
                message: "Email already registered"
            });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const newUser = new User({
            name,
            email: email.toLowerCase(),
            password: hashedPassword
        });

        await newUser.save();

        res.status(201).json({
            message: "Registration successful",
            user: {
                id: newUser._id,
                name: newUser.name,
                email: newUser.email
            }
        });

    } catch (error) {
        console.error("Registration Error:", error);
        res.status(500).json({
            message: "Registration failed"
        });
    }
});
app.post("/api/reminders", async (req, res) => {
    try {
        const reminder = new Reminder({
            title: req.body.title,
            time: req.body.time,
            date: req.body.date
        });

        const savedReminder = await reminder.save();

        res.status(201).json(savedReminder);
    } catch (error) {
        res.status(500).json({
            message: error.message
        });
    }
});
app.get("/api/reminders", async (req, res) => {
    try {
        const reminders = await Reminder.find();

        res.json(reminders);
    } catch (error) {
        res.status(500).json({
            message: error.message
        });
    }
});
app.put("/api/reminders/:id", async (req, res) => {
    try {
        const updatedReminder = await Reminder.findByIdAndUpdate(
            req.params.id,
            {
                title: req.body.title,
                time: req.body.time,
                date: req.body.date
            },
            { new: true }
        );

        res.json(updatedReminder);
    } catch (error) {
        res.status(500).json({
            message: error.message
        });
    }
});
app.delete("/api/reminders/:id", async (req, res) => {
    try {
        const deletedReminder = await Reminder.findByIdAndDelete(
            req.params.id
        );

        res.json({
            message: "Reminder deleted successfully",
            reminder: deletedReminder
        });
    } catch (error) {
        res.status(500).json({
            message: error.message
        });
    }
});
app.post("/api/schedules", async (req, res) => {
    try {
        const schedule = new Schedule({
            title: req.body.title,
            time: req.body.time,
            date: req.body.date
        });

        const savedSchedule = await schedule.save();

        res.status(201).json(savedSchedule);
    } catch (error) {
        res.status(500).json({
            message: error.message
        });
    }
});
app.get("/api/schedules", async (req, res) => {
    try {
        const schedules = await Schedule.find();

        res.json(schedules);
    } catch (error) {
        res.status(500).json({
            message: error.message
        });
    }
});
// Schedule PUT
app.put("/api/schedules/:id", async (req, res) => {
    try {
        const updatedSchedule = await Schedule.findByIdAndUpdate(
            req.params.id,
            {
                title: req.body.title,
                time: req.body.time,
                date: req.body.date
            },
            { new: true }
        );

        res.json(updatedSchedule);
    } catch (error) {
        res.status(500).json({
            message: error.message
        });
    }
});
// Schedule DELETE
app.delete("/api/schedules/:id", async (req, res) => {
    try {
        const deletedSchedule = await Schedule.findByIdAndDelete(
            req.params.id
        );

        res.json({
            message: "Schedule deleted successfully",
            schedule: deletedSchedule
        });
    } catch (error) {
        res.status(500).json({
            message: error.message
        });
    }
});
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});