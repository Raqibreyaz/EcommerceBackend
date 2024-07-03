import express from 'express'
import { fetchReviews, createReview, editReview } from '../controllers/review.controllers.js'
import { verifyCustomer } from '../middlewares/verifyUser.js'

const router = express.Router()

// getting reviews of a specific product
router.route('/get-reviews/:id').get(fetchReviews)

// taking the review id as taking product id can make problem if user have reviewed multiple times
router.route('/edit-review/:id').put(verifyCustomer, editReview)

// take product id so that review will be for that specific product
router.route('/add-review/:id').post(verifyCustomer, createReview)

export default router