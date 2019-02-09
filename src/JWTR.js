const jwt = require('jsonwebtoken')
const redis = require('redis')

const JWTR = function(options = {}) {
  const client = redis.createClient(options)
  const PREFIX = 'prefix' in client.options ? client.options.prefix : ''

  const set = (key, obj) => {
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
    return new Promise((resolve, reject) => {
      client.hgetall(key, (err, obj) => {
        if (err) reject(err)
        resolve(obj)
      })
    })
  }

  const keys = callback => {
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

  const validate = async (token, secretOrPublicKey, options, callback) => {
    let obj = await get(token)

    if (obj && obj.status === 'invalidated') {
      return false
    }

    if (callback) {
      jwt.verify(token, secretOrPublicKey, options, callback)
    } else {
      return await jwt.verify(token, secretOrPublicKey, options)
    }
  }

  const invalidate = async token => {
    const decoded = jwt.decode(token)
    const now = new Date().getTime()
    const exp = decoded.exp * 1000

    if (exp < now) {
      throw new jwt.TokenExpiredError()
    }

    let obj = await get(token)

    if (obj && obj.status === 'invalidated') {
      return true
    }

    await set(token, {
      status: 'invalidated',
      exp: decoded.exp
    })

    return true
  }

  const refresh = async ({ accessToken, refreshToken }, secretOrPrivateKey, options) => {
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

    await invalidate(accessToken)
    await invalidate(refreshToken)

    return {
      access_token: jwt.sign(accessPayload, secretOrPrivateKey, accessOptions),
      refresh_token: jwt.sign(refreshPayload, secretOrPrivateKey, refreshOptions)
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
