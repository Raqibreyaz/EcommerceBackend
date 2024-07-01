// returns false when keys or values does not exists after excludes
function checker(object, excludes = {}, noOfKeys = 0) {

    if (!Object.keys(object).length || (noOfKeys && Object.keys(object).length < noOfKeys))
        return false

    for (const key of Object.keys(object)) {
        if (!excludes[key] && !object[key])
            return false
    }

    return true
}

// returns array name if it is empty otherwise true
function checkArrays(object) {
    for (const arrayName in object) {
        if (Object.hasOwnProperty.call(object, arrayName)) {
            const array = object[arrayName];
            if (array.length === 0)
                return arrayName
        }
    }
    return true
}

export {
    checkArrays,
    checker
}