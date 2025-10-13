import { catchError } from "../middlewares/catchError.js";
import database from "../db/db.js";
import ErrorHandler from "../middlewares/errorMiddleware.js";
import { v2 as cloudinary } from "cloudinary";



//create Product
export const createProduct = catchError(async (req, res, next) => {
    const { name, description, price, category, stock } = req.body;

    const created_by = req.user.id;

    if (!name || !description || !price || !stock || !category) {
        return next(new ErrorHandler("please provide all details of product!", 400))
    }


    let uploadedImages = [];

    if (req.files && req.files.images) {
        const images = Array.isArray(req.files.images) ? req.files.images : [req.files.images];
        for (const image of images) {
            const result = cloudinary.uploader.upload(image.tempFilePath, {
                folder: 'Product_images',
                width: 1000,
                crop: "scale"
            })

            uploadedImages.push({
                public_id: await result.public_id,
                url: await result.secure_url
            })
        }

    }


    const product = await database.query(`INSERT INTO users  (name, description, price, category, stock, images , created_by ) values($1,$2,$3,$4,$5,$6,$7) RETURNING *`, [name, description, price, category, stock, JSON.stringify(uploadedImages), created_by]);


    res.status(201).json({
        success: true,
        message: "Product Created Successfully",
        product: product.rows[0]
    })

})

//get product 
export const getProductById = catchError(async (req, res, next) => {
    const { id } = req.body || {};

    if (!id) {
        next(new ErrorHandler('Id is required!', 400));
    }

    const product = await database.query(`SELECT * FROM products WHERE id = $1`, [id]);
    if (product.fength < 0) {
        return new ErrorHandler('no produts were found!', 400);
    }



    res.status(200).json({
        success: true,
        message: "Product Fetched Succesfully.",
        product
    })

})

//fetch allproducts


export const fetchAllProducts = catchError(async (req, res, next) => {
    const { availability, price, ratings, category, search } = req.query;
    const page = parseInt(req.query.page) || 1;
    const limit = 10;
    const offset = (page - 1) * limit;

    const conditions = [];
    const values = [];

    let index = 1;
    const paginationPlaceholders = [];



    //availibility filter product
    if (availability === 'in-stock') {
        conditions.push(`stock > 5`)

    }

    else if (availability === 'limited') {
        conditions.push(`stock > 0 AND stock <= 5`)
    }

    else if (availability === 'out-of-stock') {
        conditions.push('stock = 0')
    }



    //filter product by price
    if (price) {
        const [minPrice, maxPrice] = price.split('-');
        if (minPrice && maxPrice) {
            conditions.push(`price IN BETWEEN $${index} AND $${index + 1}`)
            values.push(minPrice, maxPrice);
            index += 2;
        }
    }



    //filter product by category 
    if (category) {
        conditions.push(`category ILIKE $${index}`)
        values.push(`%${category}%`)
        index++;
    }
})