import mongoose from "mongoose";

// review --> a single review of a user to a product

const reviewSchema = new mongoose.Schema({
    productId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'product',
        index: true,
        required: true
    },
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'user',
        required: true
    },
    oneWord: {
        type: String,
        required: true,
        maxLength: [10, "one word contains at most 10 characters"],
        trim: true
    },
    review: {
        type: String,
        required: true,
        minlength: [10, "review must be at least of 10 characters"]
    },
    rating: {
        type: Number,
        required: true,
        // for fetching reviews as per rating
        index: true
    }
}, { timestamps: true })

export default mongoose.model('review', reviewSchema)