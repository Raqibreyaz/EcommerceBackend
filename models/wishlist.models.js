import mongoose from "mongoose";

const wishlistSchema = new mongoose.Schema({
    products: [
        {
            productId: {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'product'
            },
            color: {
                type: String,
                required: true,
            },
            size: {
                type: String,
                required: true
            },
            image: {
                type: String,
                required: true
            },
        }
    ],
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'user',
        index: true,
        required: true
    }
})

export default mongoose.model('wishlist', wishlistSchema)