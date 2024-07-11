import express from "express"
import { fetchCategories,addNewCategory, editCategory, deleteCategory } from "../controllers/category.controllers.js"
import { verifyAdmin } from "../middlewares/verifyUser.js"

const router = express.Router()

router.route('/add-category').post(verifyAdmin,addNewCategory)
router.route('/get-categories').get(fetchCategories)
router.route('/edit-category').put(editCategory)
router.route('/delete-category/:id').delete(deleteCategory)

export default router;