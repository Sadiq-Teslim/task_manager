// server/server.js (Final Version - Simplified Security)

// --- CORE DEPENDENCIES ---
require('dotenv').config()
const express = require('express')
const mongoose = require('mongoose')
const cors = require('cors')
const cookieParser = require('cookie-parser')
const jwt = require('jsonwebtoken')
const bcrypt = require('bcryptjs')

// --- VOICE & FILE HANDLING ---
const fs = require('fs')
const path = require('path')
const ffmpeg = require('fluent-ffmpeg')
const { Spitch } = require('spitch')
const { addDays } = require('date-fns')

// --- SETUP & CONFIGURATION ---
const app = express()
const PORT = process.env.PORT || 5000
const JWT_SECRET = process.env.JWT_SECRET

// --- CORE MIDDLEWARE ---
app.use(cors({ origin: 'http://localhost:5173', credentials: true }))
app.use(express.json())
app.use(cookieParser())
app.use('/static', express.static(path.join(__dirname, 'audio')))

// --- MODELS & DB CONNECTION ---
const User = require('./models/User')
const Task = require('./models/Task')
mongoose
    .connect(process.env.MONGO_URI)
    .then(() => console.log('MongoDB connected successfully.'))
    .catch(err => console.error('MongoDB connection error:', err))

// --- VOICE AI SETUP ---
const ffmpegPath = path.join(
    process.cwd(),
    'vendor',
    'ffmpeg',
    'bin',
    'ffmpeg.exe'
)
ffmpeg.setFfmpegPath(ffmpegPath)
const spitchClient = new Spitch()

// --- AUTHENTICATION MIDDLEWARE ---
const verifyToken = (req, res, next) => {
    const token = req.cookies.token
    if (!token)
        return res.status(401).json({ message: 'Access Denied. Please log in.' })

    try {
        const decoded = jwt.verify(token, JWT_SECRET)
        req.user = decoded
        next()
    } catch (ex) {
        res
            .status(400)
            .clearCookie('token')
            .json({ message: 'Invalid Token. Please log in again.' })
    }
}

// --- ====== API ENDPOINTS ====== ---

// --- AUTHENTICATION ROUTES ---

app.post('/api/auth/register', async(req, res) => {
    try {
        const { email, password } = req.body
        if (!email || !password)
            return res
                .status(400)
                .json({ message: 'Email and password are required.' })
        if (password.length < 6)
            return res
                .status(400)
                .json({ message: 'Password must be at least 6 characters.' })
        let user = await User.findOne({ email })
        if (user)
            return res
                .status(400)
                .json({ message: 'User with this email already exists.' })
        const salt = await bcrypt.genSalt(10)
        const hashedPassword = await bcrypt.hash(password, salt)
        user = new User({ email, password: hashedPassword })
        await user.save()
        res.status(201).json({ message: 'User created successfully.' })
    } catch (error) {
        res.status(500).json({ message: 'Server error during registration.' })
    }
})

app.post('/api/auth/login', async(req, res) => {
    try {
        const { email, password } = req.body
        const user = await User.findOne({ email })
        if (!user) return res.status(400).json({ message: 'Invalid credentials.' })
        const validPassword = await bcrypt.compare(password, user.password)
        if (!validPassword)
            return res.status(400).json({ message: 'Invalid credentials.' })
        const token = jwt.sign({ _id: user._id, email: user.email }, JWT_SECRET, {
            expiresIn: '1h'
        })
        res.cookie('token', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            maxAge: 3600000
        })
        res.json({ _id: user._id, email: user.email })
    } catch (error) {
        res.status(500).json({ message: 'Server error during login.' })
    }
})

app.post('/api/auth/logout', (req, res) => {
    // Does not need verifyToken, just needs to clear cookie
    res.clearCookie('token')
    res.json({ message: 'Logged out successfully.' })
})

// --- PROTECTED TASK ENDPOINTS (Require Auth Token) ---

app.get('/api/tasks', verifyToken, async(req, res) => {
    const tasks = await Task.find({ user: req.user._id }).sort({ createdAt: -1 })
    res.json(tasks)
})

app.patch('/api/tasks/:id', verifyToken, async(req, res) => {
    const task = await Task.findOneAndUpdate({ _id: req.params.id, user: req.user._id },
        req.body, { new: true }
    )
    if (!task)
        return res
            .status(404)
            .json({ message: 'Task not found or you do not have permission.' })
    res.json(task)
})

app.delete('/api/tasks/:id', verifyToken, async(req, res) => {
    const task = await Task.findOneAndDelete({
        _id: req.params.id,
        user: req.user._id
    })
    if (!task)
        return res
            .status(404)
            .json({ message: 'Task not found or you do not have permission.' })
    res.json({ message: 'Task deleted' })
})

// --- PROTECTED VOICE ENDPOINTS ---

app.post('/api/voice-command', verifyToken, async(req, res) => {
    const formidable = await
    import ('formidable')
    const form = formidable.default({})
    form.parse(req, async(err, fields, files) => {
        try {
            if (err) throw new Error('Form parsing error')
            const audioFile = files.audio[0]
            const conversationState = fields.state[0]
            const taskId = fields.taskId ? fields.taskId[0] : null

            const originalPath = audioFile.filepath
            const convertedPath = `${originalPath}.wav`
            await new Promise((resolve, reject) => {
                ffmpeg(originalPath)
                    .toFormat('wav')
                    .on('error', reject)
                    .on('end', resolve)
                    .save(convertedPath)
            })

            const transcriptResult = await spitchClient.speech.transcribe({
                content: fs.createReadStream(convertedPath),
                language: 'en',
                model: 'mansa_v1'
            })
            const text = transcriptResult.text
            fs.unlinkSync(originalPath)
            fs.unlinkSync(convertedPath)

            if (conversationState === 'idle') {
                let taskData = {
                    title: text,
                    priority: 'medium',
                    dueDate: null,
                    user: req.user._id
                }
                if (text.toLowerCase().includes('urgent')) {
                    taskData.priority = 'high'
                    taskData.title = taskData.title.replace(/urgent/gi, '').trim()
                }
                if (text.toLowerCase().includes('tomorrow')) {
                    taskData.dueDate = addDays(new Date(), 1)
                    taskData.title = taskData.title.replace(/for tomorrow/gi, '').trim()
                }
                taskData.title = taskData.title.replace(/^add/i, '').trim()
                const newTask = new Task(taskData)
                await newTask.save()
                res.json({
                    status: 'prompt_description',
                    responseText: `Okay, I've scheduled "${newTask.title}". What are the details?`,
                    taskId: newTask._id
                })
            } else if (conversationState === 'waiting_for_description' && taskId) {
                const task = await Task.findOneAndUpdate({ _id: taskId, user: req.user._id }, { description: text }, { new: true })
                if (!task) return res.status(404).json({ message: 'Task not found.' })
                res.json({
                    status: 'success',
                    responseText: `Got it. I've added the description to "${task.title}".`,
                    updatedTask: task
                })
            }
        } catch (error) {
            console.error('Voice command error:', error)
            res.status(500).json({ error: 'Failed to process voice command.' })
        }
    })
})

app.post('/api/tts', verifyToken, async(req, res) => {
    const { text } = req.body
    const audioDir = path.join(__dirname, 'audio')
    if (!fs.existsSync(audioDir)) fs.mkdirSync(audioDir)
    const filename = `response_${Date.now()}.wav`
    const filepath = path.join(audioDir, filename)
    const ttsResponse = await spitchClient.speech.generate({
        text,
        language: 'en',
        voice: 'lucy'
    })
    const blob = await ttsResponse.blob()
    const buffer = Buffer.from(await blob.arrayBuffer())
    fs.writeFileSync(filepath, buffer)
    const audioUrl = `http://localhost:5000/static/${filename}`
    res.json({ audioUrl })
    setTimeout(() => {
        if (fs.existsSync(filepath)) fs.unlinkSync(filepath)
    }, 20000)
})

// --- START SERVER ---
app.listen(PORT, () => console.log(`Server running on port ${PORT}`))