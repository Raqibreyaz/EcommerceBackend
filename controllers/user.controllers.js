import { ApiError } from '../utils/ApiError.js'
import { catchAsyncError } from '../utils/catchAsyncError.js'
import userModel from '../models/user.models.js'
import { cartModel } from '../models/CartAndOrder.models.js'
import { assignJwtToken } from '../utils/assignJwtToken.js'
import { deleteFromCloudinary, uploadOnCloudinary } from '../utils/cloudinary.js'
import { checker, checkArrays } from '../utils/objectAndArrayChecker.js'
import mongoose from 'mongoose'

const registerUser = catchAsyncError(async (req, res, next) => {

    if (!checker({ ...req.body, avatar: req.file }, { role: true }, 6))
        throw new ApiError(400, "please provide full details")

    let { fullname, email, password, phoneNo, address, role = 'customer' } = req.body

    let avatar = req.file

    address = JSON.parse(address)

    if (!checker(address, {}, 4))
        throw new ApiError(400, "address is required!!")

    if (await userModel.findOne({ email }))
        throw new ApiError(400, "user with this email already exists")

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

    // check if all required details are provided
    if (!checker(req.body, { newPassword: true }, 4))
        throw new ApiError(400, "provide all necessary details")

    // take all required details
    const { fullname, email, phoneNo, password, newPassword } = req.body

    // checking password validity
    const user = await userModel.findById(userId)

    const checkPass = await user.comparePassword(password)
    if (!checkPass) {
        throw new ApiError(400, "password not valid")
    }

    const toUpdate = { fullname, email, phoneNo }

    // when new password is given then change password
    if (newPassword)
        toUpdate.password = newPassword

    // update the fields
    for (const key in toUpdate) {
        if (Object.hasOwnProperty.call(toUpdate, key)) {
            const value = toUpdate[key];
            user[key] = value
        }
    }

    // save the updated user
    await user.save()

    res.status(200).json({
        success: true,
        message: 'user profile updated successfully'
    })
}
)

// only for avatar
const changeUserAvatar = catchAsyncError(async (req, res, next) => {

    if (!req.file) {
        throw new ApiError(400, "provide an avatar")
    }

    // upload the provided image to cloudinary
    const cloudinaryResponse = await uploadOnCloudinary(req.file.path)

    // take the user
    const user = await userModel.findById(req.user.id)

    // delete old avatar of the user
    await deleteFromCloudinary(user.avatar.public_id)

    // update the new avatar
    user.avatar = {
        url: cloudinaryResponse.url,
        public_id: cloudinaryResponse.public_id
    }

    // save the updated user
    await user.save()

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

    const user = await userModel.findById(userId)

    let checkUnique = user.addresses.filter((addressObj) => (
        addressObj.house_no === address.house_no
        && addressObj.state === address.state
        && addressObj.city === address.city
        && addressObj.pincode === address.pincode
    ))
    if (checkUnique.length)
        throw new ApiError(400, "address already exists")

    await userModel.findByIdAndUpdate(userId, {
        $push: { addresses: address }
    }, { new: true })

    res.status(200).json({
        success: true,
        message: "user address saved successfully"
    })
}
)

const removeAddress = catchAsyncError(async (req, res, next) => {

    if (!checker(req.params, {}, 1))
        throw new ApiError(400, "provide address id to continue")

    const userId = req.user.id

    const addressId = mongoose.Types.ObjectId.createFromHexString(req.params.id)

    await userModel.findByIdAndUpdate(userId, {
        $pull: {
            addresses: {
                _id: addressId
            }
        }
    })

    res.status(200).json({
        success: true,
        message: 'user address deleted successfully'
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

const fetchProductOwners = catchAsyncError(async (req, res, next) => {
    const productOwners = await userModel.aggregate([
        { $match: { role: { $in: ['admin', 'seller'] } } },
        {
            $project: {
                _id: 1,
                fullname: 1
            }
        }
    ])

    res.status(200).json({
        success: true,
        message: "product owners fetched successfully",
        productOwners
    })
}
)

const fetchProfileDetails = catchAsyncError(async (req, res, next) => {
    // fullname
    // avatar

    // take user id for taking details
    if (!checker(req.params, {}, 1))
        throw new ApiError(400, "please provide owner id for products!")

    const { id } = req.params

    const profileDetails = await userModel.findById(id).select('+fullname +avatar +role')

    if (!profileDetails)
        throw new ApiError(404, "user does not exist")

    res.status(200).json({
        success: true,
        message: "profile details fetched successfully",
        profileDetails
    })
}
)


const fetchSellers = catchAsyncError(async (req, res) => {

    // const sellers = await userModel.findOne({ role: 'seller' }).select('+fullname +avatar +phoneNo +email +address')

    const sellers = await userModel.aggregate([
        { $match: { role: 'seller' } },
        {
            $project: {
                fullname: 1,
                email: 1,
                avatar: 1,
                address: { $arrayElemAt: ['$addresses', 0] },
                phoneNo: 1,
                joinedAt: "$createdAt"
            }
        }
    ])

    res.status(200).json({
        success: true,
        message: "sellers fetched successfully",
        sellers: sellers ? sellers : []
    })
}
)

const findUser = catchAsyncError(async (req, res, next) => {

    if (!checker(req.body, {}, 1))
        throw new ApiError(400, "provide an email to find user")

    const user = await userModel.findOne({ email: req.body.email }).select("fullname role email")

    if (!user)
        throw new ApiError(400, "user does not exist")

    res.status(200).json({
        success: true,
        message: "user found",
        user
    })
}
)

const changeUserRole = catchAsyncError(async (req, res, next) => {

    if (!checker(req.body, {}, 2))
        throw new ApiError(400, "provide necessary details to change role")

    await userModel.findOneAndUpdate({ email: req.body.email }, { role: req.body.role })

    res.status(200).json({
        success: true,
        message: "user role updated successfully"
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
    addNewAddress,
    fetchProductOwners,
    fetchProfileDetails,
    removeAddress,
    fetchSellers,
    findUser,
    changeUserRole
}