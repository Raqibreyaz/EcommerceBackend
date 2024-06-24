import { ApiError } from '../utils/ApiError.js'
import { catchAsyncError } from '../utils/catchAsyncError.js'
import userModel from '../models/user.models.js'
import { cartModel } from '../models/CartAndOrder.models.js'
import { assignJwtToken } from '../utils/assignJwtToken.js'
import { deleteFromCloudinary, uploadOnCloudinary } from '../utils/cloudinary.js'

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

// except new address and avatar
const editUserProfile = catchAsyncError(async (req, res, next) => {

    const userId = req.user.id
    const { addresses, fullname, email, phoneNo, oldPassword, newPassword } = req.body

    const user = await userModel.findById(userId)

    if (!await user.comparePassword(oldPassword)) {
        throw new ApiError(400, "password not valid")
    }

    if (!fullname || !addresses || !email || !phoneNo)
        throw new ApiError(400, "provide all necessary fields")

    const toUpdate = { fullname, email, phoneNo, addresses }
    if (newPassword)
        toUpdate.password = newPassword

    await userModel.findByIdAndUpdate(userId, {
        $set: toUpdate
    })

    res.status(200).json({
        success: true,
        message: 'user profile updated successfully'
    })
}
)

// only for avatar
const changeUserAvatar = catchAsyncError(async (req, res, next) => {

    if (!req.files || req.files.avatar) {
        throw new ApiError(400, "provide an avatar")
    }
    const cloudinaryResponse = await uploadOnCloudinary(req.files.avatar.path)

    const user = await userModel.findById(req.user.id)

    await deleteFromCloudinary(user.avatar.public_id)

    user.avatar = {
        url: cloudinaryResponse.url,
        public_id: cloudinaryResponse.public_id
    }

    await user.save()

    console.log(user);

    res.status(200).json({
        success: true,
        message: "user avatar updated successfully"
    })
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

// adding a new address
const addNewAddress = catchAsyncError(async (req, res, next) => {

    const { address } = req.body

    const userId = req.user.id

    const updatedUser = await userModel.findByIdAndUpdate(userId, {
        $set: { address }
    }, { new: true })

    console.log(updatedUser);

    res.status(200).json({
        success: true,
        message: "user address saved successfully"
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
    logoutUser,
    editUserProfile,
    changeUserAvatar,
    addNewAddress
}