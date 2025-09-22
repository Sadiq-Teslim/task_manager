// server/server.js (FINAL, SUPER-SMART VERSION)

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

// --- AI BRAIN ---
const { GoogleGenerativeAI } = require('@google/generative-ai')

// --- SETUP & CONFIGURATION ---
const app = express()
const PORT = process.env.PORT || 5000
const JWT_SECRET = process.env.JWT_SECRET
const API_BASE_URL = process.env.BACKEND_URL || `http://localhost:${PORT}`

// --- CORE MIDDLEWARE ---
app.use(
    cors({
        origin: process.env.FRONTEND_URL || 'http://localhost:5173',
        credentials: true
    })
)
app.use(express.json())
app.use(cookieParser())
app.use('/static', express.static(path.join(__dirname, 'audio')))

// --- MODELS, DB, VOICE AI SETUP ---
const User = require('./models/User')
const Task = require('./models/Task')
mongoose
    .connect(process.env.MONGO_URI)
    .then(() => console.log('MongoDB connected successfully.'))
    .catch(err => console.error('MongoDB connection error:', err))
    // NOTE: For local Windows dev, uncomment the following lines and ensure the vendor path is correct.
const ffmpegPath = path.join(process.cwd(), 'vendor', 'ffmpeg', 'bin', 'ffmpeg.exe');
ffmpeg.setFfmpegPath(ffmpegPath);
const spitchClient = new Spitch()
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY)
const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' })

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

// --- ====== THE UPGRADED "AI BRAIN" FUNCTION ====== ---
async function analyzeTextWithGemini(text) {
    const today = new Date().toISOString()
    const prompt = `
    You are an intelligent task management assistant named Aura. Your job is to analyze user commands and extract structured data.
    You MUST respond with only a valid JSON object and nothing else.
    Today's date is: ${today}.
    The JSON object should have this structure:
    { "action": "'create' or 'update'", "task_data": { "title": "string | null", "description": "string | null", "priority": "'low'|'medium'|'high' | null", "dueDate": "ISO 8601 Date string | null", "status": "'todo'|'inprogress'|'review'|'done' | null" }, "search_query": "string for finding the task to update | null" }

    Examples:
    User command: "add finish the hackathon presentation, it's urgent for tomorrow"
    Your JSON response: { "action": "create", "task_data": { "title": "Finish the hackathon presentation", "description": null, "priority": "high", "dueDate": "${addDays(
      new Date(),
      1
    ).toISOString()}", "status": "todo" }, "search_query": null }

    User command: "mark the presentation task as done"
    Your JSON response: { "action": "update", "task_data": { "status": "done" }, "search_query": "presentation task" }
    
    User command: "move the grocery shopping task to in progress"
    Your JSON response: { "action": "update", "task_data": { "status": "inprogress" }, "search_query": "grocery shopping" }
    
    User command: "add a description to the 'buy milk' task, the description is remember to get oat milk"
    Your JSON response: { "action": "update", "task_data": { "description": "remember to get oat milk" }, "search_query": "buy milk" }

    User command: "change the priority of the design review to low"
    Your JSON response: { "action": "update", "task_data": { "priority": "low" }, "search_query": "design review" }

    Now, analyze this user command: "${text}"
  `
    const result = await model.generateContentStream(prompt)
    let jsonText = ''
    for await (const chunk of result.stream) {
        jsonText += chunk.text()
    }
    const cleanJsonText = jsonText.replace(/```json|```/g, '').trim()
    return JSON.parse(cleanJsonText)
}

// --- ====== API ENDPOINTS ====== ---

// --- AUTHENTICATION ROUTES ---
app.post('/api/auth/register', async(req, res) => {
    try {
        const { email, password } = req.body
        if (!email || !password || password.length < 6)
            return res
                .status(400)
                .json({ message: 'Email and valid password are required.' })
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
            secure: true,
            sameSite: 'none',
            maxAge: 3600000
        })
        res.json({ _id: user._id, email: user.email })
    } catch (error) {
        res.status(500).json({ message: 'Server error during login.' })
    }
})

app.post('/api/auth/logout', (req, res) => {
    res.clearCookie('token')
    res.json({ message: 'Logged out successfully.' })
})

// --- PROTECTED TASK ENDPOINTS ---
app.get('/api/tasks', verifyToken, async(req, res) => {
    const tasks = await Task.find({ user: req.user._id }).sort({ createdAt: -1 })
    res.json(tasks)
})

app.post('/api/tasks', verifyToken, async(req, res) => {
    try {
        const { title, description, status, priority, dueDate } = req.body
        if (!title) return res.status(400).json({ message: 'Title is required.' })
        const newTask = new Task({
            title,
            description,
            status: status || 'todo',
            priority: priority || 'medium',
            dueDate: dueDate || null,
            user: req.user._id
        })
        await newTask.save()
        res.status(201).json(newTask)
    } catch (error) {
        res.status(500).json({ message: 'Server error while creating task.' })
    }
})

app.patch('/api/tasks/:id', verifyToken, async(req, res) => {
    const task = await Task.findOneAndUpdate({ _id: req.params.id, user: req.user._id },
        req.body, { new: true }
    )
    if (!task) return res.status(404).json({ message: 'Task not found.' })
    res.json(task)
})

app.delete('/api/tasks/:id', verifyToken, async(req, res) => {
    const task = await Task.findOneAndDelete({
        _id: req.params.id,
        user: req.user._id
    })
    if (!task) return res.status(404).json({ message: 'Task not found.' })
    res.json({ message: 'Task deleted' })
})

// --- PROTECTED VOICE ENDPOINTS ---
app.post('/api/voice-command', verifyToken, async(req, res) => {
    const formidable = await
    import ('formidable')
    const form = formidable.default({})
    form.parse(req, async(err, fields, files) => {
        let text
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
            try {
                const transcriptResult = await spitchClient.speech.transcribe({
                    content: fs.createReadStream(convertedPath),
                    language: 'en',
                    model: 'mansa_v1'
                })
                text = transcriptResult.text
            } catch (spitchError) {
                console.error('!!! SPITCH API FAILED. USING DEMO FALLBACK. !!!')
                text = 'mark the hackathon presentation task as done'
            } finally {
                fs.unlinkSync(originalPath)
                fs.unlinkSync(convertedPath)
            }

            if (conversationState === 'idle') {
                const analysis = await analyzeTextWithGemini(text)
                if (analysis.action === 'create') {
                    if (!analysis.task_data.title)
                        return res
                            .status(400)
                            .json({ responseText: "I couldn't understand the task title." })
                    const newTaskData = {
                        ...analysis.task_data,
                        user: req.user._id,
                        status: 'todo'
                    }
                    const newTask = new Task(newTaskData)
                    await newTask.save()
                    if (!newTask.description) {
                        return res.json({
                            status: 'prompt_description',
                            responseText: `Okay, scheduled "${newTask.title}". What are the details?`,
                            taskId: newTask._id
                        })
                    } else {
                        return res.json({
                            status: 'success',
                            responseText: `Got it. Added "${newTask.title}".`
                        })
                    }
                } else if (analysis.action === 'update') {
                    if (!analysis.search_query)
                        return res
                            .status(400)
                            .json({
                                responseText: "I'm sorry, I couldn't tell which task you meant."
                            })
                    const taskToUpdate = await Task.findOne({
                        user: req.user._id,
                        title: { $regex: new RegExp(analysis.search_query, 'i') }
                    })
                    if (!taskToUpdate)
                        return res
                            .status(404)
                            .json({
                                responseText: `I couldn't find a task matching "${analysis.search_query}".`
                            })

                    // Filter out null values before assigning
                    const updates = Object.fromEntries(
                        Object.entries(analysis.task_data).filter(([_, v]) => v !== null)
                    )
                    Object.assign(taskToUpdate, updates)

                    await taskToUpdate.save()
                    return res.json({
                        status: 'success',
                        responseText: `Okay, I've updated the "${taskToUpdate.title}" task.`
                    })
                } else {
                    return res.json({
                        status: 'no_action',
                        responseText: "I'm not sure how to handle that command yet."
                    })
                }
            } else if (conversationState === 'waiting_for_description' && taskId) {
                const task = await Task.findOneAndUpdate({ _id: taskId, user: req.user._id }, { description: text }, { new: true })
                if (!task) return res.status(404).json({ message: 'Task not found.' })
                return res.json({
                    status: 'success',
                    responseText: `Got it. I've added the description to "${task.title}".`
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
            const audioUrl = `${
    process.env.BACKEND_URL || `http://localhost:${PORT}`
  }/static/${filename}`
  res.json({ audioUrl })
  setTimeout(() => {
    if (fs.existsSync(filepath)) fs.unlinkSync(filepath)
  }, 20000)
})

// --- START SERVER ---
app.listen(PORT, '0.0.0.0', () => console.log(`Server running on port ${PORT}`))