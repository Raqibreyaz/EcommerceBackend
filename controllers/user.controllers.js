import { ApiError } from '../utils/ApiError.js'
import { catchAsyncError } from '../utils/catchAsyncError.js'
import userModel from '../models/user.models.js'
import { cartModel } from '../models/CartAndOrder.models.js'
import { assignJwtToken } from '../utils/assignJwtToken.js'
import productModel from '../models/product.models.js'
import { uploadOnCloudinary } from '../utils/cloudinary.js'
import imageModel from '../models/image.models.js'

const registerUser = catchAsyncError(async (req, res, next) => {

    let { fullname, email, password, phoneNo, address, role = 'customer' } = req.body
    let avatar = req.file

    if (await userModel.findOne({ email }))
        throw new ApiError(400, "user already exists")

    const cloudinaryResponse = await uploadOnCloudinary(avatar.path)

    avatar = await imageModel.create({
        url: cloudinaryResponse.url,
        public_id: cloudinaryResponse.public_id
    })


    const response = await userModel.find({ role: 'admin' })

    if (!response.length)
        role = 'admin'

    // create the user 
    const user = await userModel.create({
        fullname,
        email,
        phoneNo,
        password,
        address,
        role,
        avatar: avatar._id
    })

    // create and give cart to the user
    const cart = await cartModel.create({ userId: user._id })
    user.cart = cart.id;

    assignJwtToken(user, res, "user created successfully")
}
)

const registerAdmin = catchAsyncError(async (req, res, next) => {

    const response = await userModel.find({ role: 'admin' })

    if (response.length > 0)
        throw new ApiError(400, "Invalid Request")

    req.body.role = 'admin'
    await registerUser(req, res, next)
}
)

const registerCustomer = catchAsyncError(async (req, res, next) => {
    req.body.role = 'customer'
    await registerUser(req, res, next)
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

    const image = await imageModel.findById(user.avatar).select('-public_id')

    user.avatar = image

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