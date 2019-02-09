const jwt = require('jsonwebtoken')
const JWTR = require('./JWTR')

exports.sign = jwt.sign
exports.verify = jwt.verify
exports.decode = jwt.decode
exports.JsonWebTokenError = jwt.JsonWebTokenError
exports.NotBeforeError = jwt.NotBeforeError
exports.TokenExpiredError = jwt.TokenExpiredError
exports.createJWTR = (options) => new JWTR(options)