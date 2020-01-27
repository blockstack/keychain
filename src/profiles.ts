import { signProfileToken, wrapProfileToken, connectToGaiaHub, makeProfileZoneFile } from 'blockstack'
import { IdentityKeyPair } from './utils'
import Identity from './identity'
import { uploadToGaiaHub } from 'blockstack/lib/storage/hub'

const PERSON_TYPE = 'Person'
const CONTEXT = 'http://schema.org'
const IMAGE_TYPE = 'ImageObject'

export interface ProfileImage {
  '@type': typeof IMAGE_TYPE
  name: string
  contentUrl: string
}

export interface Profile {
  '@type': typeof PERSON_TYPE
  '@context': typeof CONTEXT
  apps?: {
    [origin: string]: string
  }
  name?: string
  image?: ProfileImage[]
  [key: string]: any
}

export const DEFAULT_PROFILE: Profile = {
  '@type': 'Person',
  '@context': 'http://schema.org'
}

const DEFAULT_PROFILE_FILE_NAME = 'profile.json'

export enum Subdomains {
  TEST = 'test-personal.id',
  BLOCKSTACK = 'id.blockstack'
}

export const registrars = {
  [Subdomains.TEST]: {
    registerUrl: 'https://test-registrar.blockstack.org/register',
    apiUrl: 'https://test-registrar.blockstack.org/v1/names'
  },
  [Subdomains.BLOCKSTACK]: {
    registerUrl: 'https://registrar.blockstack.org/register',
    apiUrl: 'https://registrar.blockstack.org/v1/names'
  }
}

export async function signProfileForUpload(profile: any, keypair: IdentityKeyPair) {
  const privateKey = keypair.key
  const publicKey = keypair.keyID

  const token = await signProfileToken(profile, privateKey, { publicKey })
  const tokenRecord = wrapProfileToken(token)
  const tokenRecords = [tokenRecord]
  return JSON.stringify(tokenRecords, null, 2)
}

export async function uploadProfile(
  gaiaHubUrl: string,
  identity: Identity,
  signedProfileTokenData: string
) {
  const identityHubConfig = await connectToGaiaHub(gaiaHubUrl, identity.keyPair.key)

  return uploadToGaiaHub(DEFAULT_PROFILE_FILE_NAME, signedProfileTokenData, identityHubConfig, 'application/json')
}

interface SendToRegistrarParams {
  username: string
  subdomain: Subdomains
  zoneFile: string
  identity: Identity
}

const sendUsernameToRegistrar = async ({
  username,
  subdomain,
  zoneFile,
  identity
}: SendToRegistrarParams) => {
  const { registerUrl } = registrars[subdomain]

  const registrationRequestBody = JSON.stringify({
    name: username,
    owner_address: identity.address,
    zonefile: zoneFile
  })

  const requestHeaders = {
    Accept: 'application/json',
    'Content-Type': 'application/json'
  }

  const response = await fetch(registerUrl, {
    method: 'POST',
    headers: requestHeaders,
    body: registrationRequestBody
  })

  if (!response.ok) {
    return Promise.reject({
      error: 'Failed to register username',
      status: response.status
    })
  }

  return response.json()
}

interface RegisterParams {
  identity: Identity
  /** The gaia hub URL to use for profile.json upload */
  gaiaHubUrl: string
  /** The username portion of this subdomain, i.e. only the portion of the name before any periods */
  username: string
  /** The "domain" used for this subdomain. Can be any of the `Subdomains` enum. */
  subdomain: Subdomains
}

/**
 * Register a subdomain for a given identity
 */
export const registerSubdomain = async ({
  identity,
  gaiaHubUrl,
  username,
  subdomain,
}: RegisterParams) => {
  // const profile = identity.profile || DEFAULT_PROFILE
  const profile = DEFAULT_PROFILE
  const signedProfileTokenData = await signProfileForUpload(profile, identity.keyPair)
  const profileUrl = await uploadProfile(gaiaHubUrl, identity, signedProfileTokenData)
  const fullUsername = `${username}.${subdomain}`
  const zoneFile = makeProfileZoneFile(fullUsername, profileUrl)
  await sendUsernameToRegistrar({
    username,
    subdomain,
    zoneFile,
    identity
  })
  // eslint-disable-next-line require-atomic-updates
  identity.defaultUsername = fullUsername
  identity.usernames.push(fullUsername)
  return identity
}

export const fetchProfile = async ({ identity, gaiaUrl }: { identity: Identity; gaiaUrl: string; }) => {
  try {
    const url = await identity.profileUrl(gaiaUrl)
    const res = await fetch(url)
    const json = await res.json()
    const { decodedToken } = json[0]
    return decodedToken.payload?.claim as Profile
  } catch (error) {
    return null
  }
}