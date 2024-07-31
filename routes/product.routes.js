import express from 'express'
import { upload } from '../middlewares/upload.middlewares.js'
import { addNewProduct, editProduct, fetchProducts, deleteProduct, fetchProductDetails, editColorAndImages, addNewColors } from '../controllers/product.controllers.js'
import { verifyAdmin, verifyAdminOrSeller, verifySeller, verifyAdminOrOwner, verifyCustomer } from '../middlewares/verifyUser.js'
import categoryRouter from '../routes/category.routes.js'
import reviewRouter from '../routes/review.routes.js'

const router = express.Router()

// http://localhost:3000/api/v1/products

router.use('/category', categoryRouter)

router.use('/review', reviewRouter)

router.route('/addnew').post(verifyAdminOrSeller, upload.any(), addNewProduct)

router.route('/get-products').get(fetchProducts)

router.route('/get-product/:id').get(fetchProductDetails)

router.route('/edit-product/:id').put(verifyAdminOrOwner, editProduct)

router.route('/edit-color-images/:id').put(verifyAdminOrOwner, upload.any(), editColorAndImages)

router.route('/add-new-colors/:id').put(verifyAdminOrOwner, upload.any(), addNewColors)

router.route('/delete-product/:id').delete(verifyAdmin, deleteProduct)

export default router;