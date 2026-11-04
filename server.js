require("dotenv").config();

const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const User = require("./models/user");
const Reminder = require("./models/reminder");
const Schedule = require("./models/schedule");
const auth = require("./middleware/auth");
const app = express();
const jwt = require("jsonwebtoken");
const History = require("./models/history");

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

        console.log("Login email:", email.trim().toLowerCase());
console.log("User found:", !!user);

if (user) {
    console.log("Password hash exists:", !!user.password);
}

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

       const token = jwt.sign(
    { id: user._id.toString() },
    process.env.JWT_SECRET,
    { expiresIn: "7d" }
);

res.status(200).json({
    message: "Login successful",
    token: token,
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

        const normalizedEmail = email.trim().toLowerCase();

        const existingUser = await User.findOne({
            email: normalizedEmail
        });

        if (existingUser) {
            return res.status(409).json({
                message: "Email already registered"
            });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const newUser = new User({
            name: name.trim(),
            email: normalizedEmail,
            password: hashedPassword
        });

        await newUser.save();

        const token = jwt.sign(
            { id: newUser._id.toString() },
            process.env.JWT_SECRET,
            { expiresIn: "7d" }
        );

        res.status(201).json({
            message: "Registration successful",
            token,
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

// REMINDER APIs - USER WISE

// Create Reminder
app.post("/api/reminders", auth, async (req, res) => {
    try {
        const reminder = new Reminder({
            userId: req.user.id,
            title: req.body.title,
            time: req.body.time,
            date: req.body.date
        });

        const savedReminder = await reminder.save();
        res.status(201).json(savedReminder);

    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Get Logged-in User's Reminders
app.get("/api/reminders", auth, async (req, res) => {
    try {
        const reminders = await Reminder.find({
            userId: req.user.id
        });

        res.json(reminders);

    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Update Reminder
app.put("/api/reminders/:id", auth, async (req, res) => {
    try {
        const updatedReminder = await Reminder.findOneAndUpdate(
            {
                _id: req.params.id,
                userId: req.user.id
            },
            {
                title: req.body.title,
                time: req.body.time,
                date: req.body.date
            },
            { new: true, runValidators: true }
        );

        if (!updatedReminder) {
            return res.status(404).json({
                message: "Reminder not found"
            });
        }

        res.json(updatedReminder);

    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Delete Reminder
app.delete("/api/reminders/:id", auth, async (req, res) => {
    try {
        const deletedReminder = await Reminder.findOneAndDelete({
            _id: req.params.id,
            userId: req.user.id
        });

        if (!deletedReminder) {
            return res.status(404).json({
                message: "Reminder not found"
            });
        }

        res.json({
            message: "Reminder deleted successfully",
            reminder: deletedReminder
        });

    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});


// SCHEDULE APIs - USER WISE

// Create Schedule
app.post("/api/schedules", auth, async (req, res) => {
    try {
        const schedule = new Schedule({
            userId: req.user.id,
            title: req.body.title,
            time: req.body.time,
            date: req.body.date
        });

        const savedSchedule = await schedule.save();
        res.status(201).json(savedSchedule);

    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Get Logged-in User's Schedules
app.get("/api/schedules", auth, async (req, res) => {
    try {
        const schedules = await Schedule.find({
            userId: req.user.id
        });

        res.json(schedules);

    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Update Schedule
app.put("/api/schedules/:id", auth, async (req, res) => {
    try {
        const updatedSchedule = await Schedule.findOneAndUpdate(
            {
                _id: req.params.id,
                userId: req.user.id
            },
            {
                title: req.body.title,
                time: req.body.time,
                date: req.body.date
            },
            { new: true, runValidators: true }
        );

        if (!updatedSchedule) {
            return res.status(404).json({
                message: "Schedule not found"
            });
        }

        res.json(updatedSchedule);

    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Delete Schedule
app.delete("/api/schedules/:id", auth, async (req, res) => {
    try {
        const deletedSchedule = await Schedule.findOneAndDelete({
            _id: req.params.id,
            userId: req.user.id
        });

        if (!deletedSchedule) {
            return res.status(404).json({
                message: "Schedule not found"
            });
        }

        res.json({
            message: "Schedule deleted successfully",
            schedule: deletedSchedule
        });

    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// SAVE HISTORY
app.post("/api/history", auth, async (req, res) => {
    try {
        const { type, detail, time } = req.body;

        if (!type) {
            return res.status(400).json({
                message: "History type is required"
            });
        }

        const history = new History({
            userId: req.user.id,
            type,
            detail: detail || "",
            time: time || ""
        });

        await history.save();

        res.status(201).json({
            message: "History saved successfully",
            history
        });

    } catch (error) {
        console.error("Save history error:", error);
        res.status(500).json({
            message: "Could not save history"
        });
    }
});


// GET HISTORY
app.get("/api/history", auth, async (req, res) => {
    try {
        const histories = await History.find({
            userId: req.user.id
        }).sort({ createdAt: -1 });

        res.status(200).json({
            history: histories
        });

    } catch (error) {
        console.error("Get history error:", error);
        res.status(500).json({
            message: "Could not fetch history"
        });
    }
});


// DELETE HISTORY
app.delete("/api/history", auth, async (req, res) => {
    try {
        await History.deleteMany({
            userId: req.user.id
        });

        res.status(200).json({
            message: "History deleted successfully"
        });

    } catch (error) {
        console.error("Delete history error:", error);
        res.status(500).json({
            message: "Could not delete history"
        });
    }
});

// LIVE WEATHER API
app.get("/api/weather", async (req, res) => {
    try {
        const city = req.query.city || "Nagpur";

        const apiKey = process.env.OPENWEATHER_API_KEY;

        const response = await fetch(
            `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(city)}&appid=${apiKey}&units=metric`
        );

        const data = await response.json();

        if (!response.ok) {
            return res.status(response.status).json({
                message: data.message || "Weather API error"
            });
        }

        res.json({
            city: data.name,
            temperature: data.main.temp,
            condition: data.weather[0].description,
            humidity: data.main.humidity,
            windSpeed: data.wind.speed
        });

    } catch (error) {
        console.error("Weather error:", error);
        res.status(500).json({
            message: "Unable to fetch weather"
        });
    }
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});