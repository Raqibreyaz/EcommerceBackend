import mongoose from "mongoose"

const cartSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'user',
        index: true,
        required: true
    },
    products: [
        {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'product'
        }
    ],
})

const orderSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'user',
        index: true
    },
    products: [
        {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'product'
        }
    ],
    deliveredAt: {
        type: Date
    },
    totalPrice: {
        type: Number
    },
    totalDiscount: {
        type: Number
    },
    totalAmount: {
        type: Number,
    },
    deliveryStatus: {
        type: String,
        enum: ['delivered', 'pending', 'cancelled']
    }
}, { timestamps: true });

const cartModel = mongoose.model('cart', cartSchema)
const orderModel = mongoose.model('order', orderSchema)

export {
    cartModel,
    orderModel
}