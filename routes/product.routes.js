import express from 'express'
import { upload } from '../middlewares/upload.middlewares.js'
import { addNewProduct, editProduct, fetchProducts, deleteProduct, fetchProductDetails } from '../controllers/product.controllers.js'
import { verifyAdmin, verifyAdminOrSeller, verifySeller, verifyAdminOrOwner, verifyCustomer } from '../middlewares/verifyUser.js'
import categoryRouter from '../routes/category.routes.js'
import reviewRouter from '../routes/review.routes.js'

const router = express.Router()

const fields = [
    {
        name: 'thumbnail',
        maxCount: 1,
    },
    {
        name: 'images',
        maxCount: 3
    }
]

// http://localhost:3000/api/v1/products

router.use('/category', categoryRouter)

router.use('/review', reviewRouter)

router.route('/addnew').post(verifyAdminOrSeller, upload.fields(fields), addNewProduct)

router.route('/get-products').get(fetchProducts)

router.route('/get-product/:id').get(fetchProductDetails)

router.route('/edit-product/:id').put(verifyAdminOrOwner, upload.fields(fields), editProduct)

router.route('/delete-product/:id').delete(verifyAdmin, deleteProduct)

export default router;