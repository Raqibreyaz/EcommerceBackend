import express from 'express'
import { fetchReviews, createReview, editReview } from '../controllers/review.controllers.js'
import { verifyCustomer } from '../middlewares/verifyUser.js'

const router = express.Router()

router.route('/get-review').get(fetchReviews)

// taking the review id as taking product id can make problem if user have reviewed multiple times
router.route('/edit-review/:id').put(verifyCustomer, editReview)

router.route('/add-review').post(verifyCustomer, createReview)

export default router