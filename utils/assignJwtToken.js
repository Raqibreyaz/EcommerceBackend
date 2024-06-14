import jwt from 'jsonwebtoken'

export const assignJwtToken = (user, res, message) => {

    let tokenName = `${user.role}Token`

    let token = jwt.sign({ id: user._id,role:user.role }, process.env.JWT_SECRET_KEY, { expiresIn: process.env.JWT_EXPIRY })

    res
        .status(200)
        .cookie(tokenName, token, { expires: new Date(Date.now() + process.env.COOKIE_EXPIRY * 1000 * 86400), httpOnly: true })
        .json({
            success: true,
            message
        })

}
