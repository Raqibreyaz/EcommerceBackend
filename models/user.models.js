import mongoose from "mongoose";
import bcrypt from 'bcrypt'
import jwt from 'jsonwebtoken'
import { validate } from "uuid";

const addressSchema = new mongoose.Schema({
    state: String,
    city: String,
    pincode: Number,
    house_no: String,
})

const userSchema = new mongoose.Schema({
    fullname: {
        type: String,
        required: true,
        trim: true
    },
    email: {
        type: String,
        lowercase: true,
        trim: true,
        required: true,
        unique: true,
    },
    phoneNo: {
        type: String,
        required: true
    },
    avatar: {
        url: {
            type: String,
            required: true
        },
        public_id: {
            type: String,
            required: true
        }
    },
    password: {
        type: String,
        required: true,
        minLength: [8, "password must be at least 8 characters"]
    },
    cart: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'cart'
    },
    wishlist: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "wishlist"
    },
    role: {
        type: String,
        enum: ['customer', 'seller', 'admin', 'delivery boy'],
        default: 'customer',
        index: true
    },
    addresses: {
        type: [addressSchema],
        required: true,
        validate: {
            validator: (v) => (
                v.length >= 1
            ),
            message: "address is required"
        }
    },

})

userSchema.pre('save', async function (next) {
    if (this.isModified('password')) {
        this.password = await bcrypt.hash(this.password, 10)
    }

    return next()
}
)

userSchema.methods.comparePassword = async function (password) {
    return await bcrypt.compare(password, this.password)
}

userSchema.methods.generateToken = function () {
    return jwt.sign({ id: this._id }, process.env.JWT_SECRET_KEY, { expiresIn: process.env.JWT_EXPIRY })
}

export default mongoose.model('user', userSchema)