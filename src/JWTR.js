const jwt = require('jsonwebtoken')
const redis = require('redis')

const JWTR = function(options = {}) {
  const client = redis.createClient(options)
  const PREFIX = 'prefix' in client.options ? client.options.prefix : ''

  const set = (key, obj) => {
    if(!key) {
      throw new Error('argument key is undefined or empty')
    }

    if(typeof key !== 'string') {
      throw new TypeError('argument key must be a string')
    }

    if(!Object.keys(obj).length === 0 && obj.constructor === Object) {
      throw new Error('argument obj is undefined or empty')
    }

    if(typeof obj !== 'object') {
      throw new TypeError('argument obj must be a object')
    }

    return new Promise(resolve => {
      let arr = []
      Object.keys(obj).forEach(key => {
        arr.push(key)
        arr.push(obj[key])
      })
      client.hmset(key, arr)
      resolve(arr)
    })
  }

  const get = key => {
    if(!key) {
      throw new Error('argument key is undefined or empty')
    }

    if(typeof key !== 'string') {
      throw new TypeError('argument key must be a string')
    }

    return new Promise((resolve, reject) => {
      client.hgetall(key, (err, obj) => {
        if (err) reject(err)
        resolve(obj)
      })
    })
  }

  const keys = callback => {
    if(!callback) {
      throw new Error('argument callback is undefined')
    }

    if(typeof callback !== 'function') {
      throw new TypeError('argument callback must be a function')
    }

    return new Promise((resolve, reject) => {
      client
        .multi()
        .keys(`${PREFIX}*`, (err, keys) => {
          if (err) reject(err)
          callback(keys)
          resolve(true)
        })
        .exec(() => {})
    })
  }

  const forEachKey = async callback => {
    if(!callback) {
      throw new Error('argument callback is undefined')
    }

    if(typeof callback !== 'function') {
      throw new TypeError('argument callback must be a function')
    }

    return await keys(keys => {
      keys.forEach(callback)
    })
  }

  const flush = () => {
    return new Promise((resolve, reject) => {
      client.flushdb((err, succeeded) => {
        if (err) reject(err)
        if (succeeded === 'OK') {
          resolve(true)
        } else {
          resolve(false)
        }
      })
    })
  }

  const checkToken = (token) => {
    if(!token) {
      throw new Error('argument token is undefined or empty')
    }

    if(typeof token !== 'string') {
      throw new TypeError('argument token must be a string')
    }

    if(token.split('.').length !== 3) {
      throw new Error('argument token is malformed')
    }
  }

  const validate = async (token, secretOrPublicKey, options, callback) => {
    try {
      checkToken(token)
    } catch (error) {
      throw error
    }

    if(!secretOrPublicKey) {
      throw new Error('argument secretOrPublicKey is undefined or empty')
    }

    if ((typeof options === 'function') && !callback) {
      callback = options
      options = {}
    }

    if (!options) {
      options = {};
    }

    try {
      let obj = await get(token)

      if (obj && obj.status === 'invalidated') {
        return false
      }

      if (callback) {
        jwt.verify(token, secretOrPublicKey, options, callback)
      } else {
        const result = await jwt.verify(token, secretOrPublicKey, options)
        return result
      }
    } catch (error) {
      throw error
    }
  }

  const invalidate = async token => {
    try {
      checkToken(token)

      const decoded = jwt.decode(token)
      const exp = decoded.exp * 1000
      const now = new Date().getTime()

      if (exp < now) {
        return true
      }

      let obj = await get(token)

      if (obj && obj.status === 'invalidated') {
        return true
      }
  
      await set(token, {
        status: 'invalidated',
        exp: exp
      })
  
      return true
    } catch (error) {
      throw error
    }
  }

  const refresh = async ({ accessToken, refreshToken }, secretOrPublicKey, options) => {
    try {
      checkToken(accessToken)
      checkToken(refreshToken)
    } catch (error) {
      throw error
    }

    if(!secretOrPublicKey) {
      throw new Error('argument secretOrPublicKey is undefined or empty')
    }
    
    const defaultAccessOptions = {
      algorithm: 'HS256',
      expiresIn: '15m'
    }
    const defaultRefreshOptions = {
      algorithm: 'HS256',
      expiresIn: '2h'
    }
    let accessPayload = {}
    let refreshPayload = {}
    let accessOptions = defaultAccessOptions
    let refreshOptions = defaultRefreshOptions

    if (options) {
      accessPayload = 'access_payload' in options ? options.access_payload : {}
      refreshPayload =
        'refresh_payload' in options ? options.refresh_payload : {}
      accessOptions =
        'access_options' in options
          ? options.access_options
          : defaultAccessOptions
      refreshOptions =
        'refresh_options' in options
          ? options.refresh_options
          : defaultRefreshOptions
    }

    try {
      await invalidate(accessToken)
      await invalidate(refreshToken)
    } catch (error) {
      throw error
    }

    return {
      access_token: jwt.sign(accessPayload, secretOrPublicKey, accessOptions),
      refresh_token: jwt.sign(refreshPayload, secretOrPublicKey, refreshOptions)
    }
  }

  const clear = async () => {
    const now = new Date().getTime()
    return await forEachKey(async key => {
      key = PREFIX ? key.replace(PREFIX, '') : key
      let { exp } = await get(key)
      if (now > exp) {
        client.del(key)
      }
    })
  }

  const clearAll = async () => {
    return await forEachKey(key => {
      key = PREFIX ? key.replace(PREFIX, '') : key
      client.del(key)
    })
  }

  return {
    client,

    set,
    get,
    keys,
    forEachKey,
    flush,

    validate,
    invalidate,
    refresh,

    clear,
    clearAll
  }
}

module.exports = JWTR
