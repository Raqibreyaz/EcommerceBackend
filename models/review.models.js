import mongoose from "mongoose";

// review --> a single review of a user to a product

const reviewSchema = new mongoose.Schema({
    productId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'product',
        index: true
    },
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'user'
    },
    oneWord: {
        type: String,
        required: true
    },
    review: {
        type: String,
        required: true,
        minlength: [10, "review must be at least of 10 characters"]
    },
    rating: {
        type: Number,
        required: true
    }
})

export default mongoose.model('review', reviewSchema)