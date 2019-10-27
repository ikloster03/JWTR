const JWTR = require('../src')
jest.setTimeout(30000)

const payload = { userId: 1 }
const payload2 = { userId: 2 }
const payload3 = { userId: 3 }
const secret = 'test_secret'
const options = {
  algorithm: 'HS256',
  expiresIn: '15m'
}
const optionsRefresh = {
  algorithm: 'HS256',
  expiresIn: '2h'
}
const optionsVerify = {
  algorithms: ['HS256']
}

let jwtr, token

beforeAll(() => {
  jwtr = JWTR.createJWTR({
    prefix: 'token_'
  })

  token = JWTR.sign(payload, secret, options)
})
describe('jwt', () => {
  test('sign', () => {
    expect(typeof token).toBe('string')
    expect(token.split('.')).toHaveLength(3)
  })

  test('verify', () => {
    JWTR.verify(token, secret, optionsVerify, (err, res) => {
      expect(err).toBeNull()
      expect(res).toHaveProperty('userId', 1)
    })
  })

  test('decode', () => {
    let decoded = JWTR.decode(token)
    let completeDecoded = JWTR.decode(token, { complete: true })

    expect(typeof decoded).toBe('object')
    expect(completeDecoded).toHaveProperty('header')
    expect(completeDecoded).toHaveProperty('payload')
    expect(completeDecoded).toHaveProperty('signature')
    expect(typeof completeDecoded.signature).toBe('string')
  })
})

describe('jwt redis', () => {
  test('connect', () => {
    jwtr.client.on('connect', () => {
      expect(true).toBe(true)
    })
  })

  test('invalidate', async () => {
    const result = await jwtr.invalidate(token)
    expect(result).toBe(true)

    const value = await jwtr.get(token)
    expect(value).not.toBeNull()
    const exp = value.exp / 1000
    expect(JWTR.decode(token).exp).toBe(exp)
  })

  test('validate', async () => {
    let token2 = JWTR.sign(payload2, secret, options)

    jwtr.validate(token2, secret, optionsVerify, (err, res) => {
      expect(err).toBeNull()
      expect(res).toHaveProperty('userId', 2)
    })

    const decoded = await jwtr.validate(token2, secret, optionsVerify)
    expect(decoded).toHaveProperty('userId', 2)
  })

  test('validate with invalidate', async () => {
    let token3 = JWTR.sign(payload3, secret, options)

    await jwtr.invalidate(token3)

    jwtr.validate(token3, secret, optionsVerify, (err, res) => {
      expect(err).toBeNull()
      expect(res).toBe(false)
    })
    const decoded = await jwtr.validate(token3, secret, optionsVerify)
    expect(decoded).toBe(false)
  })

  test('refresh', async () => {
    const accessToken = JWTR.sign(payload, secret, options)
    const refreshToken = JWTR.sign(payload, secret, optionsRefresh)

    let { access_token, refresh_token } = await jwtr.refresh(
      { accessToken, refreshToken },
      secret,
      {
        access_payload: payload,
        refresh_payload: payload
      }
    )

    expect(typeof access_token).toBe('string')
    expect(access_token.split('.')).toHaveLength(3)
    const accessDecoded = JWTR.verify(access_token, secret, optionsVerify)
    expect(accessDecoded).toHaveProperty('userId', 1)

    expect(typeof refresh_token).toBe('string')
    expect(refresh_token.split('.')).toHaveLength(3)
    const refreshDecoded = JWTR.verify(refresh_token, secret, optionsVerify)
    expect(refreshDecoded).toHaveProperty('userId', 1)
  })

  test('clear', async () => {
    const result = await jwtr.clear()

    expect(result).toBe(true)
  })
  test('clearAll', async () => {
    const token1 = JWTR.sign(payload, secret, options)
    const token2 = JWTR.sign(payload2, secret, options)
    const token3 = JWTR.sign(payload3, secret, options)

    await jwtr.invalidate(token1)
    await jwtr.invalidate(token2)
    await jwtr.invalidate(token3)

    await jwtr.keys(keys => {
      expect(keys.length).toBeGreaterThan(0)
    })
    const result = await jwtr.clearAll()
    expect(result).toBe(true)

    await jwtr.keys(keys => {
      expect(keys.length).toEqual(0)
    })
  })
})
