import mongoose, { trusted } from "mongoose";
import mongoosePaginate from "mongoose-paginate-v2";
import { validate } from "uuid";

const imageSchema = new mongoose.Schema({
    url: {
        type: String,
        required: true
    },
    public_id: {
        type: String,
        required: true
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

const stockSchema = new mongoose.Schema({
    size: String,
    color: String,
    stock: Number
}, { _id: false })

const productSchema = new mongoose.Schema({

    product_name: {
        type: String,
        required: true,
        unique: true
    },
    price: {
        type: Number,
        required: true,
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
        required: true
    },
    thumbnail: {
        type: imageSchema,
        required: true,
    },
    colors: {
        type: [colorSchema],
        validate: {
            validator: function (v) {
                return v.length > 0
            },
            message: "at least one color is required"
        },
    },
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
    stocks: {
        type: [stockSchema],
        required: true,
        validate: {
            validator: (stocksArray) => {
                return stocksArray.length > 0
            }

        }
    },
    rating: {
        type: Number,
        default: 4,
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