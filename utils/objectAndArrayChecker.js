// returns false when keys or values does not exists after excludes
function checker(object, excludes = {}, noOfKeys = 1) {

    let requiredCounter = 0

    if (object) {
        for (const key of Object.keys(object)) {

            // the key should not be an optional key should be present with its value
            if (!excludes[key] && !object[key])
                return false
            // the key  is not an optional key and is present
            else if (!excludes[key]) {
                requiredCounter++
            }
        }
    }

    // when no of required keys are present then go forward
    return requiredCounter >= noOfKeys
}

// returns array name if it is empty otherwise true
function checkArrays(object) {
    for (const arrayName in object) {
        if (Object.hasOwnProperty.call(object, arrayName)) {
            const array = object[arrayName];
            if (!array || array.length === 0)
                return arrayName
        }
    }
    return true
}

export {
    checkArrays,
    checker
}