import { ApiError } from '../utils/ApiError.js'
import { catchAsyncError } from '../utils/catchAsyncError.js'
import userModel from '../models/user.models.js'
import { cartModel } from '../models/CartAndOrder.models.js'
import { assignJwtToken } from '../utils/assignJwtToken.js'

const registerUser = catchAsyncError(async (req, res, next) => {

    const { fullname, email, password, role } = req.body

    if (await userModel.findOne({ email }))
        throw new ApiError(400, "user already exists")

// create the user 
    const user = await userModel.create({
        fullname,
        email,
        role,
        password
    })

    // create and give cart to the user
    const cart = await cartModel.create({ userId: user._id })
    user.cart = cart.id;

    // save the user
    await user.save()

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

    const { email, password, role } = req.body;

    if (!email || !password || !role)
        throw new ApiError(400, "fill full form")

    const user = await userModel.findOne({ email })

    if (!user)
        throw new ApiError(404, "user does not exist")

    let checkPassword = await user.comparePassword(password)

    if (!checkPassword)
        throw new ApiError(400, "invalid credentials")

    if (user.role !== role)
        throw new ApiError(400, "user with this role does not exist")

    assignJwtToken(user, res, "user logged in successfully")
}
)



export {
    registerUser,
    registerAdmin,
    registerCustomer,
    loginUser
}