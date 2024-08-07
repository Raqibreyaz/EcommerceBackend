export const converter = (object, toParseInJson = false, defaultValues = {}) => {

    const operations = {
        jsonParseOperation: {
            keys: {
                'keyHighlights': true,
                'sizes': true,
                'colors': true,
                "stocks": true,
                'address': true,
                pickupAddress: true,
                deliveryAddress: true
            },
            operation: (key, value) => value ? JSON.parse(value) : (defaultValues[key] ?? [])
        },
        integerConvertOperation: {
            keys: {
                price: true,
                discount: true,
                totalStocks: true,
                page: true,
                limit: true,
                min_discount: true,
                min_price: true,
                max_price: true,
                rating: true,
                quantity: true,
                refundAmount: true,
                totalAmount: true,
                totalDiscount: true,
                totalPrice: true
            },
            operation: (key, value) => isNaN(value) ? (defaultValues[key] ?? 0) : parseInt(value)
        },
        booleanConvertOperation: {
            keys: { 'isReturnable': true, toReplace: true },
            operation: (key, value) => (value === 'true' || value === 'false' || value === false || value === true) ? Boolean(value) : (defaultValues[key] ?? false)
        }
    }

    const newObject = {}

    const objectKeys = Object.keys(object)
    // adds key to newObject by performing specific operation on its value
    objectKeys.forEach((key) => {

        const value = object[key];

        // performing the operation on the keys value
        for (const operation in operations) {

            const pair = operations[operation];

            if (operation === 'jsonParseOperation' && !toParseInJson)
                continue;

            // checking whether the key is present to perform that specific operation
            if (pair.keys[key]) {
                newObject[key] = pair.operation(key, value)
            }
        }

        // when the key is not present in any operation then directly add the key
        if (newObject[key] !== false && !newObject[key])
            newObject[key] = value
    })

    return newObject
}