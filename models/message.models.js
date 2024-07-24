import mongoose from "mongoose";

const messageSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "user",
        required: true
    },
    subject: {
        type: String,
        required: true,
        minLength: [10, "subject must be at least 10 characters"],
        maxLength: [100, "subject must under 100 characters"]
    },
    description: {
        type: String,
        required: true,
        minLength: [50, "description must be at least 50 characters"],
        maxLength:[200,"description must be undex 200 characters"]
    },
}, { timestamps: true })

export default mongoose.model('message', messageSchema)