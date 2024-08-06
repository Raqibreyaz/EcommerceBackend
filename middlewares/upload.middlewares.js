import multer from "multer";
import path from 'path';
import fs from 'fs'

// Ensure the tmp directory exists
const tmpDir = './tmp';
if (!fs.existsSync(tmpDir)){
    fs.mkdirSync(tmpDir);
}

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, tmpDir);
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const fileExtension = path.extname(file.originalname);
        cb(null, `${uniqueSuffix}${fileExtension}`);
    }
});

export const upload = multer({ storage: storage });