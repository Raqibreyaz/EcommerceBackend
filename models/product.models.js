import mongoose, { trusted } from "mongoose";
import mongoosePaginate from "mongoose-paginate-v2";
import { validate } from "uuid";

const imageSchema = new mongoose.Schema({
    url: {
        type: String,
        required:true
    },
    public_id: {
        type: String,
        required:true
    }
})

const colorSchema = new mongoose.Schema({
    color: {
        type: String,
        unique: true
    },
    images: [
        {
            image: imageSchema,
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
        index: true,
        min: 0
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
        required: true,
        min: 0
    },
    discount: {
        type: Number,
        default: 0,
        index: true,
        min: 0
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
    thumbnail: imageSchema,
    colors: [colorSchema],
    sizes: {
        type: [String],
        uppercase: true,
        required: true,
        // sizes must be unique
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
    reviews: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'review'
    }],
},
    { timestamps: true })

productSchema.plugin(mongoosePaginate)

export default mongoose.model('product', productSchema)