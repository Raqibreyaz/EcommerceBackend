import mongoose from 'mongoose'
import { validate } from 'uuid'

const returnSchema = new mongoose.Schema({
    // product id is the _id of the product in the products array
    productId: {
        type: mongoose.Schema.Types.ObjectId,
        required: true
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
        type: [String],
        required: true,
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