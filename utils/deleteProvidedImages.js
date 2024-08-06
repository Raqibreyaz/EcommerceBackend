import fs from 'fs'

export const deleteProvidedImages = (req) => {

    const remover = (files) => {
        try {
            files.forEach(({ path }) => {
                fs.unlinkSync(path);
            })
        } catch (error) {
            console.log(error);
        }
    }

    if (req.files) {
        // console.log('going to delete', req.files);

        // we have 2 options 
        // req.files-->{key:[file]}-->req.files['avatar'][0].path
        // req.files-->[file]-->req.files[0].path
        if (Array.isArray(req.files)) {
            remover(req.files)
        }
        else {
            for (const files of req.files) {
                remover(files)
            }
        }
    }
    else if (req.file) {
        // console.log('going to delete ', req.file);

        // we have only one option
        // req.file-->file-->req.file.path
        remover([req.file])
    }
}