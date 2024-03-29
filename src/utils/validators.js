import { TypePositiveNumberError } from '../error/type-positive-number.error.js'

export const isNumber = number => {
    if (isNaN(number) || typeof number !== 'number') return false
    else return true
}

export const isNumberOrUndef = number => {
    if (number === undefined) return true
    return isNumber(number)
}

export const isPositiveNumber = number => {
    if (isNumber(number) && number > 0) return true
    else return false
}

export const isPositiveOrZeroNumber = number => {
    if (isNumber(number) && number >= 0) return true
    else return false
}

export const isValidTrackerType = type => {
    return type === 'electricity-meter' || type === 'gas-meter'
}

export const getPositiveNumberOrDefault = (value, defaultValue) => {
    if (value) {
        const n = parseInt(value)
        if (!isPositiveNumber(n)) throw new TypePositiveNumberError()
        return n
    } else {
        return defaultValue
    }
}
