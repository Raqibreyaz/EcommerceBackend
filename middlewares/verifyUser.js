import mongoose from "mongoose";
import productModel from "../models/product.models.js";
import { ApiError } from "../utils/ApiError.js";
import jwt from 'jsonwebtoken'

// if token is valid then return the decoded token otherwise throws error
const validateToken = (token) => {

    if (!token)
        return false
    try {
        let decodedToken = jwt.verify(token, process.env.JWT_SECRET_KEY)
        return decodedToken;
    } catch (error) {
        return false
    }

}

const verifyUser = (req, res, next) => {

    let user = validateToken(req.cookies.userToken)

    if (!user)
        return next(new ApiError(400, "user is not authenticated for this action"))
    req.user = user;

    return next()
}

const verifyAdmin = (req, res, next) => {
    req.cookies.userToken = req.cookies.adminToken
    verifyUser(req, res, next)
}

const verifySeller = (req, res, next) => {
    req.cookies.userToken = req.cookies.sellerToken
    verifyUser(req, res, next)
}

// either admin or the seller should be verified
const verifyAdminOrSeller = (req, res, next) => {
    req.cookies.userToken = req.cookies.sellerToken || req.cookies.adminToken
    verifyUser(req, res, next)
}

const verifyCustomer = (req, res, next) => {
    req.cookies.userToken = req.cookies.customerToken || req.cookies.adminToken || req.cookies.sellerToken
    verifyUser(req, res, next)
}

// either admin or the owner of the product should be verified
const verifyAdminOrOwner = async (req, res, next) => {

    let user = validateToken(req.cookies.adminToken)

    if (!user) {

        const productId = req.params.id
        const product = await productModel.findOne({ _id: productId })

        user = validateToken(req.cookies.sellerToken)

        if (!user.id)
            return next(new ApiError(400, "user is not authenticated for this action"))

        let ownerId = mongoose.Types.ObjectId(user.id)

        if (product.owner !== ownerId)
            return next(new ApiError(400, "user not authorized for this action"))

        req.product = product;
    }

    req.user = user

    return next()
}

export {
    verifyAdmin,
    verifyCustomer,
    verifySeller,
    verifyAdminOrSeller,
    verifyAdminOrOwner
}