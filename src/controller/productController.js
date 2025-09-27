import { catchError } from "../middlewares/catchError.js";
import database from "../db/db.js";
import ErrorHandler from "../middlewares/errorMiddleware.js";
import { v2 as cloudinary  } from "cloudinary";
export const createProduct = catchError(async (req, res ,next) => {
    const {name, description, price,category, stock} = req.body; 

    const created_by = req.user.id;

    if(!name || !description || !price || !stock || !category)
    {
        return next(new ErrorHandler("please provide all details of product!", 400))
    }


    let uploadedImages = [];

    if(req.files && req.files.images) 
    {
        const images = Array.isArray(req.files.images) ?  req.files.images : [req.files.images];
        for(const image of images){
            const result = cloudinary.uploader.upload(image.tempFilePath, {
                folder: 'Product_images',
                width : 1000,
                crop: "scale"
            })

            uploadedImages.push({
                public_id: await result.public_id,
                url: await result.secure_url
            })
        }
    
    }


    const product = await database.query(`INSERT INTO users  (name, description, price,category, stock, images , created_by ) values($1,$2,$3,$4,$5,$6,$7 RETURNING * )`)
    
})