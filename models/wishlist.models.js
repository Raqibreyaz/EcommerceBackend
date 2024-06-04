import mongoose from "mongoose";

const wishlistSchema = new mongoose.Schema({
    products: [
        {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'product'
        }
    ],
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'user',
        index: true
    }
})

export default mongoose.model('wishlist', wishlistSchema)