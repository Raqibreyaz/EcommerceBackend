import mongoose from "mongoose";
import bcrypt from 'bcrypt'
import jwt from 'jsonwebtoken'

const userSchema = new mongoose.Schema({
    fullname: {
        type: String,
        required: true
    },
    email: {
        type: String,
        lowercase: true,
        trim: true,
        required: true,
        unique: true,
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
    orders: [
        {
            type: mongoose.Schema.Types.ObjectId,
            ref: "order"
        }
    ],
    role: {
        type: String,
        enum: ['customer', 'seller', 'admin'],
        default: 'user',
        index: true
    },
    addresses: [
        {
            state: String,
            city: String,
            pincode: Number,
            house_no: String
        }
    ],

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
    return jwt.sign({ id: this._id }, process.env.JWT_SECRET_KEY)
}

export default mongoose.model('user', userSchema)