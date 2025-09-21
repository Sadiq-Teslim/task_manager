const mongoose = require('mongoose');

const TaskSchema = new mongoose.Schema({
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }, // LINK TO USER
    title: { type: String, required: true },
    description: { type: String, default: '' },
    dueDate: { type: Date },
    priority: {
        type: String,
        enum: ['low', 'medium', 'high'],
        default: 'medium'
    },
    status: {
        type: String,
        enum: ['todo', 'inprogress', 'review', 'done'],
        default: 'todo'
    }
}, { timestamps: true });

module.exports = mongoose.model('Task', TaskSchema);