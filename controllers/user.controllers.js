import { ApiError } from '../utils/ApiError.js'
import { catchAsyncError } from '../utils/catchAsyncError.js'
import userModel from '../models/user.models.js'
import { cartModel } from '../models/CartAndOrder.models.js'
import { assignJwtToken } from '../utils/assignJwtToken.js'
import productModel from '../models/product.models.js'
import { uploadOnCloudinary } from '../utils/cloudinary.js'

const registerUser = catchAsyncError(async (req, res, next) => {

    let { fullname, email, password, phoneNo, address, role = 'customer' } = req.body

    let avatar = req.file

    address = JSON.parse(address)

    if (await userModel.findOne({ email }))
        throw new ApiError(400, "user already exists")

    const cloudinaryResponse = await uploadOnCloudinary(avatar.path)

    const response = await userModel.find({ role: 'admin' })

    if (!response.length)
        role = 'admin'

    // create the user 
    const user = await userModel.create({
        fullname,
        email,
        phoneNo,
        password,
        addresses: [address],
        role,
        avatar: {
            url: cloudinaryResponse.url,
            public_id: cloudinaryResponse.public_id
        }
    })

    // create and give cart to the user
    const cart = await cartModel.create({ userId: user._id })
    user.cart = cart._id;

    await user.save()

    assignJwtToken(user, res, "user created successfully")
}
)

const loginUser = catchAsyncError(async (req, res, next) => {

    const { email, password } = req.body;

    if (!email || !password)
        throw new ApiError(400, "fill full form")

    const user = await userModel.findOne({ email })

    if (!user)
        throw new ApiError(404, "user does not exist")

    let checkPassword = await user.comparePassword(password)

    if (!checkPassword)
        throw new ApiError(400, "invalid credentials")

    assignJwtToken(user, res, "user logged in successfully")
}
)

const fetchUser = catchAsyncError(async (req, res, next) => {
    const userId = req.user.id
    const user = await userModel.findById(userId).select("-password")

    if (!user)
        throw new ApiError(404, "user does not exist")

    res.status(200).json({
        success: true,
        message: '',
        user
    })
}
)

const logoutUser = catchAsyncError(async (req, res, next) => {

    let token = `${req.user.role}Token`

    res.status(200).cookie(token, '', { expires: new Date(Date.now()), httpOnly: true }).json({
        success: true,
        message: "user logged out successfully"
    })
}
)

export {
    registerUser,
    loginUser,
    fetchUser,
    logoutUser
}