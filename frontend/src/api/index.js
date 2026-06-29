// Local-first data layer. These used to call the FastAPI backend over HTTP; the app
// is now fully on-device, so they dispatch to an IndexedDB-backed store
// (see ../local/localApi.js). Signatures are unchanged, so every page keeps calling
// get()/post()/put()/patch()/del() with the same paths.
import { dispatch } from '../local/localApi.js'

export async function get(path)         { return dispatch('GET', path) }
export async function post(path, body)  { return dispatch('POST', path, body) }
export async function put(path, body)   { return dispatch('PUT', path, body) }
export async function patch(path, body) { return dispatch('PATCH', path, body) }
export async function del(path)         { return dispatch('DELETE', path) }
