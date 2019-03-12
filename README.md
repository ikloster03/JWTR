# JWTR

[![Greenkeeper badge](https://badges.greenkeeper.io/ikloster03/JWTR.svg)](https://greenkeeper.io/)

It's a little wrapper over [Json Web Tokens](https://github.com/auth0/node-jsonwebtoken) and [Redis](https://github.com/NodeRedis/node_redis/) for Node.js is based on promises.

# Install

[npm package](https://www.npmjs.com/package/jwtr)

```bash
$ npm install jwtr --save
```

[yarn package](https://yarnpkg.com/en/package/jwtr)
```bash
$ yarn add jwtr
```

# Usage

```js
const JWTR = require('jwtr')
const token = JWTR.sign({ foo: 'bar' }, 'secret', { expiresIn: '1h' })
const decoded = JWTR.verify(token, 'secret')
const completeDecoded = JWTR.decode(token, {complete: true})
```

JWTR provides full [Json Web Tokens](https://github.com/auth0/node-jsonwebtoken)'s interface with exceptions.
[See more details](https://github.com/auth0/node-jsonwebtoken#usage).

Also JWTR provides redis's client interface via property *client*.

```js
const JWTR = require('jwtr')
const jwtr = JWTR.createJWTR({
    prefix: 'token_'
})
jwtr.client.on('connect', () => {
    console.log('Connected!')
})
```

[See more details](https://github.com/NodeRedis/node_redis/#usage-example).

For JWT via Redis was implemented next methods:

<details><summary><code>jwtr.invalidate(token)</code></summary><p>

Returns true if token was successfully stored in redis.

`token` is the JsonWebToken string

```js
const JWTR = require('jwtr')
const jwtr = JWTR.createJWTR({
    prefix: 'token_'
})
const token = JWTR.sign({ foo: 'bar' }, 'secret', { expiresIn: '1h' })
const result = await jwtr.invalidate(token) // true
```

</p></details>

<details><summary><code>jwtr.validate(token, secretOrPublicKey, [options, callback])</code></summary><p>

(Asynchronous) If a callback is supplied, function acts asynchronously. The callback is called with the decoded payload if the signature is valid and optional expiration, audience, or issuer are valid. If not, it will be called with the error.

(Synchronous) If a callback is not supplied, function acts synchronously. Returns the payload decoded if the signature is valid and optional expiration, audience, or issuer are valid. If not, it will throw the error.

`token` is the JsonWebToken string

`secretOrPublicKey` is a string or buffer containing either the secret for HMAC algorithms, or the PEM
encoded public key for RSA and ECDSA.

`options`

* `algorithms`: List of strings with the names of the allowed algorithms. For instance, `["HS256", "HS384"]`.
* `audience`: if you want to check audience (`aud`), provide a value here. The audience can be checked against a string, a regular expression or a list of strings and/or regular expressions. 
  > Eg: `"urn:foo"`, `/urn:f[o]{2}/`, `[/urn:f[o]{2}/, "urn:bar"]`
* `issuer` (optional): string or array of strings of valid values for the `iss` field.
* `ignoreExpiration`: if `true` do not validate the expiration of the token.
* `ignoreNotBefore`...
* `subject`: if you want to check subject (`sub`), provide a value here
* `clockTolerance`: number of seconds to tolerate when checking the `nbf` and `exp` claims, to deal with small clock differences among different servers
* `maxAge`: the maximum allowed age for tokens to still be valid. It is expressed in seconds or a string describing a time span [zeit/ms](https://github.com/zeit/ms). 
  > Eg: `1000`, `"2 days"`, `"10h"`, `"7d"`. A numeric value is interpreted as a seconds count. If you use a string be sure you provide the time units (days, hours, etc), otherwise milliseconds unit is used by default (`"120"` is equal to `"120ms"`).
* `clockTimestamp`: the time in seconds that should be used as the current time for all necessary comparisons.
* `nonce`: if you want to check `nonce` claim, provide a string value here. It is used on Open ID for the ID Tokens. ([Open ID implementation notes](https://openid.net/specs/openid-connect-core-1_0.html#NonceNotes))

> jwtr.validate and jwt.verify is the same, but also validate's method checks redis's store for invalid tokens.

```js
const JWTR = require('jwtr')
const jwtr = JWTR.createJWTR({
    prefix: 'token_'
})
const token = JWTR.sign({ foo: 'bar' }, 'secret', { expiresIn: '1h' })
const decoded = await jwtr.validate(token, 'secret', { algorithms: ['HS256'] })
```

</p></details>

<details><summary><code>jwtr.refresh(tokens, secretOrPrivateKey, [options])</code></summary><p>

Returns new access and refresh tokens beforehand making old tokens not valid.

`tokens`:

* `accessToken` is the JsonWebToken string
* `refreshToken` is the JsonWebToken string

`secretOrPrivateKey` is a string, buffer, or object containing either the secret for HMAC algorithms or the PEM
encoded private key for RSA and ECDSA. In case of a private key with passphrase an object `{ key, passphrase }` can be used (based on [crypto documentation](https://nodejs.org/api/crypto.html#crypto_sign_sign_private_key_output_format)), in this case be sure you pass the `algorithm` option.

`options`:

* `access_payload` (optional) could be an object literal, buffer or string representing valid JSON.
* `refresh_payload` (optional) could be an object literal, buffer or string representing valid JSON.
* `access_options` (optional):
  * `algorithm` (default: `HS256`)
  * `expiresIn`: expressed in seconds or a string describing a time span [zeit/ms](https://github.com/zeit/ms). 
    > Eg: `60`, `"2 days"`, `"10h"`, `"7d"`. A numeric value is interpreted as a seconds count. If you use a string be sure you provide the time units (days, hours, etc), otherwise milliseconds unit is used by default (`"120"` is equal to `"120ms"`).
  * `notBefore`: expressed in seconds or a string describing a time span [zeit/ms](https://github.com/zeit/ms). 
    > Eg: `60`, `"2 days"`, `"10h"`, `"7d"`. A numeric value is interpreted as a seconds count. If you use a string be sure you provide the time units (days, hours, etc), otherwise milliseconds unit is used by default (`"120"` is equal to `"120ms"`).
  * `audience`
  * `issuer`
  * `jwtid`
  * `subject`
  * `noTimestamp`
  * `header`
  * `keyid`
  * `mutatePayload`: if true, the sign function will modify the payload object directly. This is useful if you need a raw reference to the payload after claims have been applied to it but before it has been encoded into a token.
* `refresh_options` (optional)
  * `algorithm` (default: `HS256`)
  * `expiresIn`: expressed in seconds or a string describing a time span [zeit/ms](https://github.com/zeit/ms). 
    > Eg: `60`, `"2 days"`, `"10h"`, `"7d"`. A numeric value is interpreted as a seconds count. If you use a string be sure you provide the time units (days, hours, etc), otherwise milliseconds unit is used by default (`"120"` is equal to `"120ms"`).
  * `notBefore`: expressed in seconds or a string describing a time span [zeit/ms](https://github.com/zeit/ms). 
    > Eg: `60`, `"2 days"`, `"10h"`, `"7d"`. A numeric value is interpreted as a seconds count. If you use a string be sure you provide the time units (days, hours, etc), otherwise milliseconds unit is used by default (`"120"` is equal to `"120ms"`).
  * `audience`
  * `issuer`
  * `jwtid`
  * `subject`
  * `noTimestamp`
  * `header`
  * `keyid`
  * `mutatePayload`: if true, the sign function will modify the payload object directly. This is useful if you need a raw reference to the payload after claims have been applied to it but before it has been encoded into a token.

```js
const JWTR = require('jwtr')
const jwtr = JWTR.createJWTR({
    prefix: 'token_'
})
const accessToken = JWTR.sign({ foo: 'bar' }, 'secret', { expiresIn: '15m' })
const refreshToken = JWTR.sign({ foo: 'bar' }, 'secret', { expiresIn: '2h' })
let { access_token, refresh_token } = await jwtr.refresh(
    { accessToken, refreshToken },
    'secret',
    {
        access_payload: { foo: 'bar' },
        refresh_payload: { foo: 'bar' }
    }
)
```

</p></details>

Also functions to clear tokens from redis

<details><summary><code>jwtr.clear()</code></summary><p>

Clear all expired tokens from redis.

```js
const JWTR = require('jwtr')
const jwtr = JWTR.createJWTR({
    prefix: 'token_'
})
await jwtr.clear()
```

</p></details>

<details><summary><code>jwtr.clearAll()</code></summary><p>

Clear all tokens from redis.

```js
const JWTR = require('jwtr')
const jwtr = JWTR.createJWTR({
    prefix: 'token_'
})
await jwtr.clearAll()
```

</p></details>

And helpers functions

<details><summary><code>jwtr.set(key, obj)</code></summary><p>

Set object by key in redis.

```js
const JWTR = require('jwtr')
const jwtr = JWTR.createJWTR({
    prefix: 'token_'
})
await jwtr.set('token', { foo: 'bar'})
```

</p></details>

<details><summary><code>jwtr.get(key)</code></summary><p>

Get object by key from redis.

```js
const JWTR = require('jwtr')
const jwtr = JWTR.createJWTR({
    prefix: 'token_'
})
await jwtr.get('token')
```

</p></details>

<details><summary><code>jwtr.keys(callback)</code></summary><p>

Method provides access to keys from redis and performs callback with keys.

```js
const JWTR = require('jwtr')
const jwtr = JWTR.createJWTR({
    prefix: 'token_'
})
await jwtr.keys(keys => {
    console.log(keys)
})
```

</p></details>

<details><summary><code>jwtr.forEachKey(callback)</code></summary><p>

Method executes a provided function once for each array of the keys item.

```js
const JWTR = require('jwtr')
const jwtr = JWTR.createJWTR({
    prefix: 'token_'
})
await jwtr.forEachKey(key => {
    console.log(key)
})
```

</p></details>

<details><summary><code>jwtr.flush()</code></summary><p>

Delete all the keys. [See more details](https://redis.io/commands/flushdb).

```js
const JWTR = require('jwtr')
const jwtr = JWTR.createJWTR({
    prefix: 'token_'
})
await jwtr.flush()
```

</p></details>

# Dependencies

* [Json Web Tokens](https://github.com/auth0/node-jsonwebtoken)
* [Redis](https://github.com/NodeRedis/node_redis/)

# Issue Reporting

If you have found a bug or if you have a feature request, please report them at this repository issues section.

# ToDo

[Show project JWTR](https://github.com/ikloster03/JWTR/projects/1)

# Contact me

- Site: [ikloster.ru](http://ikloster.ru)
- E-mail: <ikloster@yandex.ru>
- Twitter: [twitter.com/IvanMonastyrev](https://twitter.com/IvanMonastyrev)

# [CHANGELOG](https://github.com/ikloster03/jwtr/blob/master/CHANGELOG.md)

# [LICENSE](https://github.com/ikloster03/jwtr/blob/master/LICENSE)

Copyright (c) 2019 Ivan Monastyrev <ikloster@yandex.ru>. Licensed under the [MIT license](https://github.com/ikloster03/jwtr/blob/master/LICENSE).
