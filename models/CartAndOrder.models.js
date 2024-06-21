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
            product: {
                type: mongoose.Schema.Types.ObjectId,
                ref: "product"
            },
            // chosen quantity
            quantity: {
                type: Number,
                default: 1
            },
            // chosen size
            size: {
                type: String,
                required:true
            },
            // chosen color
            color: {
                type: String,
                required:true
            },
            // corresponding image
            image: {
                type: String,
                required:true
            }
        }
    ]
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
        enum: ['delivered', 'pending', 'cancelled', 'returned'],
        default: 'pending'
    }
}, { timestamps: true });

const cartModel = mongoose.model('cart', cartSchema)
const orderModel = mongoose.model('order', orderSchema)

export {
    cartModel,
    orderModel
}