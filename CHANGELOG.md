# `@blockstack/keychain` Changelog

## 0.2.3 - 2020/2/4

- Added `Wallet#walletConfig`, which allows storing private settings and information related to the current wallet. Data is stored in Gaia, and is encrypted with a uniquely derived wallet-level private key.

## 0.2.0 - 2020/1/27

- All included in PR [#15](https://github.com/blockstack/blockstack-keychain/pull/15)
- Fetch and store a profile.json
- Register subdomains
- Fetch existing usernames
- Update profile.json `apps` section with the `publish_data` scope

## 0.1.1 - 2019/12/2

- Export `encrypt` and `decrypt` from `index.ts`

## 0.1.0 - 2019/11/25

- Integrate asynchronous code from `blockstack.js`
- Use `tsdx` for deployment
- MVP keychain-related methods