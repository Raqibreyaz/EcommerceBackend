import mongoose from "mongoose";
import mongoosePaginate from "mongoose-paginate-v2";
import { validate } from "uuid";

const colorSchema = new mongoose.Schema({
    color: {
        type: String,
        unique: true
    },
    images: [
        {
            image: {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'image'
            },
            is_main: {
                type: Boolean,
                default: false
            }
        }
    ]
})

const productSchema = new mongoose.Schema({

    product_name: {
        type: String,
        required: true,
        index: true,
        unique: true
    },
    price: {
        type: Number,
        required: true,
        index: true
    },
    isReturnable: {
        type: Boolean,
        default: true
    },
    returnPolicy: {
        type: String,
        required: true
    },
    totalStocks: {
        type: Number,
        required: true
    },
    discount: {
        type: Number,
        default: 0,
        index: true
    },
    description: {
        type: String,
        required: true,
        minLength: [10, "description must be at least of 10 characters"]
    },
    category: {
        type: String,
        required: true,
        index: true
    },
    keyHighlights: {
        type: [String],
        required: true,
        validate: {
            validator: function (v) {
                return v.length >= 1
            },
            message: "at least 1 key highlight is required"
        }
    },
    owner: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'user',
        index: true
    },
    thumbnail: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'image',
    },
    colors: [colorSchema],
    sizes: {
        type: [String],
        uppercase: true,
        required: true,
        validate: {
            validator: function (v) {
                return v.length === new Set(v).size
            },
            message: "sizes must be unique"
        },
    },
    stocks: [
        {
            size: String,
            color: String,
            stock: Number
        }
    ],
    rating: {
        type: Number,
        default: 4,
        index: true,
        min: 0,
        max: 5
    },
    details: {
        type: String,
        required: true,
        minLength: [10, "details must be at least of 10 characters"]
    },
    reviews: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'review'
    },
},
    { timestamps: true })

productSchema.plugin(mongoosePaginate)

export default mongoose.model('product', productSchema)