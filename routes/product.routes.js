import express from 'express'
import { upload } from '../middlewares/upload.middlewares.js'
import { addNewProduct, editProduct, fetchProducts, deleteProduct, addNewCategory, addToCart } from '../controllers/product.controllers.js'
import { verifyAdmin, verifyAdminOrSeller, verifySeller, verifyAdminOrOwner, verifyCustomer } from '../middlewares/verifyUser.js'

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

router.route('/addnew').post(verifyAdminOrSeller, upload.fields(fields), addNewProduct)

router.route('/add-category').post(verifyAdmin, addNewCategory)

router.route('/get-products').get(fetchProducts)

router.route('/edit-product/:id').put(verifyAdminOrOwner, upload.fields(fields), editProduct)

router.route('/delete-product/:id').delete(verifyAdmin, deleteProduct)

router.route('/add-to-cart/:id').put(verifyCustomer,addToCart)

export default router;