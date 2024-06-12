import mongoose from 'mongoose'

const returnSchema = new mongoose.Schema({
    productId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'product',
        required: true
    },
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'user',
        required: true
    },
    images: [String],
    reason: {
        type: String,
        required: true,
        minLength: [25, "you must fully describe your reason"]
    },
    toExchange: {
        type: Boolean,
        default: false
    },
    pickupAddress: {
        state: String,
        city: String,
        pincode: Number,
        house_no: String,
    }
}, { timestamps: true })

export default mongoose.model('return', returnSchema)