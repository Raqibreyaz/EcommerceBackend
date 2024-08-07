import mongoose from "mongoose"

const cartSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'user',
        required: true,
        unique: true
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
                required: true
            },
            // chosen color
            color: {
                type: String,
                required: true
            },
            // corresponding image
            image: {
                type: String,
                required: true
            }
        }
    ]
})

const orderSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'user',
    },
    products: [
        {
            product: {
                type: mongoose.Schema.Types.ObjectId,
                ref: "product",
                required: true
            },
            product_name: {
                type: String,
                required: true
            },
            // chosen quantity
            quantity: {
                type: Number,
                required: true
            },
            // chosen size
            size: {
                type: String,
                required: true
            },
            // chosen color
            color: {
                type: String,
                required: true
            },
            price: {
                type: Number,
                required: true
            },
            discount: {
                type: Number,
                required: true
            },
            // corresponding image
            image: {
                type: String,
                required: true
            },
            returnStatus: {
                type: String,
                enum: ['return pending', 'return rejected', 'return approved', 'not requested'],
                default: 'not requested',
            }
        }
    ],
    deliveredAt: {
        type: Date
    },
    totalPrice: {
        type: Number,
        required: true
    },
    totalDiscount: {
        type: Number,
        required: true
    },
    totalAmount: {
        type: Number,
        required: true
    },
    paymentDetails: {
        razorpayOrderId: {
            type: String,
        },
        razorpayPaymentId: {
            type: String,
        },
        paymentMode: {
            type: String,
            enum: ['cash on delivery', 'online'],
            default:'cash on delivery'
        },
        paymentStatus: {
            type: String,
            // pending is for cash on delivery 
            // cancelled is for order cancelletion
            enum: ['pending', 'fulfilled', 'cancelled'],
            default: "pending"
        }
    },
    deliveryAddress: {
        state: String,
        city: String,
        pincode: Number,
        house_no: String,
    },
    deliveryStatus: {
        type: String,
        enum: ['delivered', 'pending', 'cancelled'],
        default: 'pending',
    }
}, { timestamps: true });

orderSchema.pre('save', function (next) {
    if (!this.totalAmount) {
        this.totalAmount = this.totalPrice - this.totalDiscount;
    }
    next();
});

const cartModel = mongoose.model('cart', cartSchema)
const orderModel = mongoose.model('order', orderSchema)

export {
    cartModel,
    orderModel
}