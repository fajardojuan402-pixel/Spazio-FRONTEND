// Selector del ApiClient: mock en memoria o adaptador al backend real, según
// VITE_USE_MOCK. El adaptador (backendClient) traduce el contrato del frontend
// (español) al contrato del backend de SPAZIO (FastAPI async, inglés, /api/v1).
import type { ApiClient } from './contract'
import { BackendApiClient } from './backend/backendClient'
import { MockApiClient } from './mock/mockClient'

const useMock = import.meta.env.VITE_USE_MOCK === 'true'
const baseUrl = import.meta.env.VITE_API_URL ?? ''

export const api: ApiClient = useMock ? new MockApiClient() : new BackendApiClient(baseUrl)

export const IS_MOCK = useMock
