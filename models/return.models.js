import mongoose from 'mongoose'
import { validate } from 'uuid'
import { imageSchema } from './product.models.js'

const returnSchema = new mongoose.Schema({
    productId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'product',
        required: true
    },
    color: {
        type: String,
        required: true
    },
    size: {
        type: String,
        required: true
    },
    quantity: {
        type: Number,
        required: true,
        min: 1
    },
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'user',
        required: true
    },
    refundAmount: {
        type: Number,
        required: true,
    },
    orderId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'order',
        required: true
    },
    images: {
        // {url,public_id}
        type: [imageSchema],
        validate: {
            validator: (images) => {
                return images.length >= 3 && images.length <= 5
            },
            message: "only 3 to 5 images are required"
        }
    },
    reason: {
        type: String,
        required: true,
        minLength: [25, "you must fully describe your reason"]
    },
    toReplace: {
        type: Boolean,
        default: false
    },
    pickupAddress: {
        state: String,
        city: String,
        pincode: Number,
        house_no: String,
    },
    status: {
        type: String,
        enum: ['pending', 'approved', 'rejected'],
        default: 'pending'
    }
}, { timestamps: true })

export default mongoose.model('return', returnSchema)