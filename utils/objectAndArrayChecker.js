// returns false when keys or values does not exists after excludes
function checker(object, excludes = {}) {

    if (!Object.keys(object).length)
        return false

    for (const key of object) {
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