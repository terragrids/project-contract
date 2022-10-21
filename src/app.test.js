import { app } from './app.js'
import request from 'supertest'

const mockStdlib = {
    setProviderByName: jest.fn().mockImplementation(() => jest.fn()),
    getProvider: jest.fn().mockImplementation(() => jest.fn()),
    newAccountFromMnemonic: jest.fn().mockImplementation(() => jest.fn()),
    createAccount: jest.fn().mockImplementation(() => jest.fn()),
    protect: jest.fn().mockImplementation(() => jest.fn()),
    formatAddress: jest.fn().mockImplementation(() => jest.fn())
}

jest.mock('./provider/reach-provider.js', () =>
    jest.fn().mockImplementation(() => ({
        getStdlib: jest.fn().mockImplementation(() => ({
            setProviderByName: mockStdlib.setProviderByName,
            getProvider: mockStdlib.getProvider,
            newAccountFromMnemonic: mockStdlib.newAccountFromMnemonic,
            createAccount: mockStdlib.createAccount,
            protect: mockStdlib.protect,
            formatAddress: mockStdlib.formatAddress
        })),
        getEnv: jest.fn().mockImplementation(() => 'TestNet')
    }))
)

const mockDynamoDbRepository = {
    testConnection: jest.fn().mockImplementation(() => jest.fn())
}
jest.mock('./repository/dynamodb.repository.js', () =>
    jest.fn().mockImplementation(() => ({
        testConnection: mockDynamoDbRepository.testConnection
    }))
)

const mockProjectRepository = {
    createProject: jest.fn().mockImplementation(() => jest.fn()),
    getProject: jest.fn().mockImplementation(() => jest.fn()),
    getProjectsByCreator: jest.fn().mockImplementation(() => jest.fn())
}
jest.mock('./repository/project.repository.js', () =>
    jest.fn().mockImplementation(() => ({
        createProject: mockProjectRepository.createProject,
        getProject: mockProjectRepository.getProject,
        getProjectsByCreator: mockProjectRepository.getProjectsByCreator
    }))
)

jest.mock('../reach/project-contract/build/index.main.mjs', () => jest.fn().mockImplementation(() => ({})))

describe('app', function () {
    const OLD_ENV = process.env

    beforeEach(() => {
        jest.clearAllMocks()
        process.env = { ...OLD_ENV } // make a copy
    })

    afterAll(() => {
        process.env = OLD_ENV // restore old env
    })

    describe('get root endpoint', function () {
        it('should return 200 when calling root endpoint', async () => {
            const response = await request(app.callback()).get('/')
            expect(response.status).toBe(200)
            expect(response.text).toBe('terragrids project contract api')
        })
    })

    describe('get health check endpoint', function () {
        it('should return 200 when calling hc endpoint and all is healthy', async () => {
            mockStdlib.getProvider.mockImplementation(() =>
                Promise.resolve({
                    algodClient: { healthCheck: () => ({ do: async () => Promise.resolve({}) }) },
                    indexer: { makeHealthCheck: () => ({ do: async () => Promise.resolve({ version: '1.2.3' }) }) }
                })
            )

            mockDynamoDbRepository.testConnection.mockImplementation(() =>
                Promise.resolve({
                    status: 200,
                    region: 'test-region'
                })
            )

            mockStdlib.newAccountFromMnemonic.mockImplementation(() => ({ networkAccount: {} }))

            const response = await request(app.callback()).get('/hc')
            expect(response.status).toBe(200)
            expect(response.status).toBe(200)
            expect(response.body).toEqual({
                env: 'dev',
                region: 'local',
                db: {
                    status: 'ok',
                    region: 'test-region'
                },
                reach: {
                    network: 'TestNet',
                    algoClient: 'ok',
                    algoIndexer: 'ok',
                    algoAccount: 'ok'
                }
            })
        })

        it('should return 200 when calling hc endpoint and algo client is faulty', async () => {
            mockStdlib.getProvider.mockImplementation(() =>
                Promise.resolve({
                    algodClient: { healthCheck: () => ({ do: async () => Promise.resolve({ error: 'error' }) }) },
                    indexer: { makeHealthCheck: () => ({ do: async () => Promise.resolve({ version: '1.2.3' }) }) }
                })
            )

            mockDynamoDbRepository.testConnection.mockImplementation(() =>
                Promise.resolve({
                    status: 200,
                    region: 'test-region'
                })
            )

            mockStdlib.newAccountFromMnemonic.mockImplementation(() => ({ networkAccount: {} }))

            const response = await request(app.callback()).get('/hc')
            expect(response.status).toBe(200)
            expect(response.status).toBe(200)
            expect(response.body).toEqual({
                env: 'dev',
                region: 'local',
                db: {
                    status: 'ok',
                    region: 'test-region'
                },
                reach: {
                    network: 'TestNet',
                    algoClient: 'error',
                    algoIndexer: 'ok',
                    algoAccount: 'ok'
                }
            })
        })

        it('should return 200 when calling hc endpoint and algo indexer is faulty', async () => {
            mockStdlib.getProvider.mockImplementation(() =>
                Promise.resolve({
                    algodClient: { healthCheck: () => ({ do: async () => Promise.resolve({}) }) },
                    indexer: { makeHealthCheck: () => ({ do: async () => Promise.resolve({}) }) }
                })
            )

            mockDynamoDbRepository.testConnection.mockImplementation(() =>
                Promise.resolve({
                    status: 200,
                    region: 'test-region'
                })
            )

            mockStdlib.newAccountFromMnemonic.mockImplementation(() => ({ networkAccount: {} }))

            const response = await request(app.callback()).get('/hc')
            expect(response.status).toBe(200)
            expect(response.status).toBe(200)
            expect(response.body).toEqual({
                env: 'dev',
                region: 'local',
                db: {
                    status: 'ok',
                    region: 'test-region'
                },
                reach: {
                    network: 'TestNet',
                    algoClient: 'ok',
                    algoIndexer: 'error',
                    algoAccount: 'ok'
                }
            })
        })

        it('should return 200 when calling hc endpoint and algo account is faulty', async () => {
            mockStdlib.getProvider.mockImplementation(() =>
                Promise.resolve({
                    algodClient: { healthCheck: () => ({ do: async () => Promise.resolve({}) }) },
                    indexer: { makeHealthCheck: () => ({ do: async () => Promise.resolve({ version: '1.2.3' }) }) }
                })
            )

            mockDynamoDbRepository.testConnection.mockImplementation(() =>
                Promise.resolve({
                    status: 200,
                    region: 'test-region'
                })
            )

            mockStdlib.newAccountFromMnemonic.mockImplementation(() => ({}))

            const response = await request(app.callback()).get('/hc')
            expect(response.status).toBe(200)
            expect(response.status).toBe(200)
            expect(response.body).toEqual({
                env: 'dev',
                region: 'local',
                db: {
                    status: 'ok',
                    region: 'test-region'
                },
                reach: {
                    network: 'TestNet',
                    algoClient: 'ok',
                    algoIndexer: 'ok',
                    algoAccount: 'error'
                }
            })
        })

        it('should return 200 when calling hc endpoint and db in faulty', async () => {
            mockStdlib.getProvider.mockImplementation(() =>
                Promise.resolve({
                    algodClient: { healthCheck: () => ({ do: async () => Promise.resolve({}) }) },
                    indexer: { makeHealthCheck: () => ({ do: async () => Promise.resolve({ version: '1.2.3' }) }) }
                })
            )

            mockDynamoDbRepository.testConnection.mockImplementation(() =>
                Promise.resolve({
                    status: 500,
                    region: 'test-region'
                })
            )

            mockStdlib.newAccountFromMnemonic.mockImplementation(() => ({ networkAccount: {} }))

            const response = await request(app.callback()).get('/hc')
            expect(response.status).toBe(200)
            expect(response.status).toBe(200)
            expect(response.body).toEqual({
                env: 'dev',
                region: 'local',
                db: {
                    status: 'error',
                    region: 'test-region'
                },
                reach: {
                    network: 'TestNet',
                    algoClient: 'ok',
                    algoIndexer: 'ok',
                    algoAccount: 'ok'
                }
            })
        })
    })

    describe('post project endpoint', function () {
        beforeEach(() => {
            mockStdlib.protect.mockImplementation(() => {})
        })

        it('should return 201 when posting new project and all is fine', async () => {
            const adminInterface = {
                Admin: ({ log, onReady }) => {
                    log('ready')
                    onReady('contract')
                }
            }
            const adminSpy = jest.spyOn(adminInterface, 'Admin')
            mockStdlib.newAccountFromMnemonic.mockImplementation(() => ({
                networkAccount: {},
                contract: () => ({
                    p: adminInterface
                })
            }))

            const response = await request(app.callback()).post('/project').send({
                name: 'project name',
                url: 'project url',
                hash: 'project hash',
                creator: 'project creator'
            })

            expect(adminSpy).toHaveBeenCalledTimes(1)
            expect(adminSpy).toHaveBeenCalledWith(
                expect.objectContaining({
                    name: 'project name',
                    url: 'project url',
                    hash: 'project hash',
                    creator: 'project creator'
                })
            )

            expect(mockProjectRepository.createProject).toHaveBeenCalledTimes(1)
            expect(mockProjectRepository.createProject).toHaveBeenCalledWith('ImNvbnRyYWN0Ig==', 'project creator')

            expect(response.status).toBe(201)
            expect(response.body).toEqual({
                contractInfo: 'ImNvbnRyYWN0Ig=='
            })
        })

        it('should return 500 when deploying contract fails', async () => {
            mockStdlib.newAccountFromMnemonic.mockImplementation(() => ({
                networkAccount: {},
                contract: () => {
                    throw new Error()
                }
            }))

            const response = await request(app.callback()).post('/project').send({
                name: 'project name',
                url: 'project url',
                hash: 'project hash',
                creator: 'project creator'
            })

            expect(response.status).toBe(500)
            expect(response.body).toEqual({
                error: 'DeployContractError',
                message: 'Unable to deploy project contract'
            })
        })

        it('should return 500 when retrieving contract info fails', async () => {
            mockStdlib.newAccountFromMnemonic.mockImplementation(() => ({
                networkAccount: {},
                contract: () => ({
                    p: {
                        Admin: ({ onReady }) => onReady(/* undefined contract */)
                    }
                })
            }))

            const response = await request(app.callback()).post('/project').send({
                name: 'project name',
                url: 'project url',
                hash: 'project hash',
                creator: 'project creator'
            })

            expect(response.status).toBe(500)
            expect(response.body).toEqual({
                error: 'DeployContractError',
                message: 'Unable to deploy project contract'
            })
        })

        it('should return 500 when saving contract in repository fails', async () => {
            mockProjectRepository.createProject.mockImplementation(() => {
                throw new Error()
            })

            mockStdlib.newAccountFromMnemonic.mockImplementation(() => ({
                networkAccount: {},
                contract: () => ({
                    p: {
                        Admin: ({ log, onReady }) => {
                            log('ready')
                            onReady('contract')
                        }
                    }
                })
            }))

            const response = await request(app.callback()).post('/project').send({
                name: 'project name',
                url: 'project url',
                hash: 'project hash',
                creator: 'project creator'
            })

            expect(response.status).toBe(500)
            expect(response.body).toEqual({
                error: 'DeployContractError',
                message: 'Unable to deploy project contract'
            })
        })

        it('should return 400 when project name is missing', async () => {
            const response = await request(app.callback()).post('/project').send({
                url: 'project url',
                hash: 'project hash',
                creator: 'project creator'
            })

            expect(response.status).toBe(400)
            expect(response.body).toEqual({
                error: 'MissingParameterError',
                message: 'name must be specified'
            })
        })

        it('should return 400 when project url is missing', async () => {
            const response = await request(app.callback()).post('/project').send({
                name: 'project name',
                hash: 'project hash',
                creator: 'project creator'
            })

            expect(response.status).toBe(400)
            expect(response.body).toEqual({
                error: 'MissingParameterError',
                message: 'url must be specified'
            })
        })

        it('should return 400 when project hash is missing', async () => {
            const response = await request(app.callback()).post('/project').send({
                name: 'project name',
                url: 'project url',
                creator: 'project creator'
            })

            expect(response.status).toBe(400)
            expect(response.body).toEqual({
                error: 'MissingParameterError',
                message: 'hash must be specified'
            })
        })

        it('should return 400 when project creator is missing', async () => {
            const response = await request(app.callback()).post('/project').send({
                name: 'project name',
                url: 'project url',
                hash: 'project hash'
            })

            expect(response.status).toBe(400)
            expect(response.body).toEqual({
                error: 'MissingParameterError',
                message: 'creator must be specified'
            })
        })

        it('should return 400 when project name is too long', async () => {
            const response = await request(app.callback())
                .post('/project')
                .send({
                    name: '#'.repeat(129),
                    url: 'project url',
                    hash: 'project hash',
                    creator: 'project creator'
                })

            expect(response.status).toBe(400)
            expect(response.body).toEqual({
                error: 'ParameterTooLongError',
                message: 'name is too long'
            })
        })

        it('should return 400 when project url is too long', async () => {
            const response = await request(app.callback())
                .post('/project')
                .send({
                    name: 'project name',
                    url: '#'.repeat(129),
                    hash: 'project hash',
                    creator: 'project creator'
                })

            expect(response.status).toBe(400)
            expect(response.body).toEqual({
                error: 'ParameterTooLongError',
                message: 'url is too long'
            })
        })

        it('should return 400 when project hash is too long', async () => {
            const response = await request(app.callback())
                .post('/project')
                .send({
                    name: 'project name',
                    url: 'project url',
                    hash: '#'.repeat(33),
                    creator: 'project creator'
                })

            expect(response.status).toBe(400)
            expect(response.body).toEqual({
                error: 'ParameterTooLongError',
                message: 'hash is too long'
            })
        })

        it('should return 400 when project creator is too long', async () => {
            const response = await request(app.callback())
                .post('/project')
                .send({
                    name: 'project name',
                    url: 'project url',
                    hash: 'project hash',
                    creator: '#'.repeat(65)
                })

            expect(response.status).toBe(400)
            expect(response.body).toEqual({
                error: 'ParameterTooLongError',
                message: 'creator is too long'
            })
        })

        it('should return 400 when project creator is malformed', async () => {
            mockStdlib.protect.mockImplementation(() => {
                throw new Error()
            })

            const response = await request(app.callback()).post('/project').send({
                name: 'project name',
                url: 'project url',
                hash: 'project hash',
                creator: 'project creator'
            })

            expect(response.status).toBe(400)
            expect(response.body).toEqual({
                error: 'AddressMalformedError',
                message: 'The specified address is malformed'
            })
        })
    })

    describe('get project endpoint', function () {
        beforeEach(() => {
            mockStdlib.formatAddress.mockImplementation(address => `formatted ${address}`)
        })

        it('should return 200 when getting project and all is fine', async () => {
            mockProjectRepository.getProject.mockImplementation(() => ({
                id: 'eyJ0eXBlIjoiQmlnTnVtYmVyIiwiaGV4IjoiMHgwNmZkMmIzMyJ9',
                created: 'creation-date',
                creator: 'creator'
            }))

            const view = {
                View: {
                    name: () => [0, 'project name'],
                    url: () => [0, 'project url'],
                    hash: () => [0, 'project hash'],
                    creator: () => [0, 'project creator']
                }
            }

            mockStdlib.createAccount.mockImplementation(() => ({
                networkAccount: {},
                contract: () => ({
                    v: view
                })
            }))

            const response = await request(app.callback()).get('/projects/contract-id')

            expect(mockProjectRepository.getProject).toHaveBeenCalledTimes(1)
            expect(mockProjectRepository.getProject).toHaveBeenCalledWith('contract-id')

            expect(response.status).toBe(200)
            expect(response.body).toEqual({
                id: 'eyJ0eXBlIjoiQmlnTnVtYmVyIiwiaGV4IjoiMHgwNmZkMmIzMyJ9',
                creator: 'formatted project creator',
                created: 'creation-date',
                name: 'project name',
                hash: 'project hash',
                url: 'project url'
            })
        })

        it('should return 500 when getting project and create account fails', async () => {
            mockProjectRepository.getProject.mockImplementation(() => ({
                id: 'eyJ0eXBlIjoiQmlnTnVtYmVyIiwiaGV4IjoiMHgwNmZkMmIzMyJ9',
                creator: 'creator'
            }))

            mockStdlib.createAccount.mockImplementation(() => {
                throw new Error()
            })

            const response = await request(app.callback()).get('/projects/contract-id')

            expect(mockProjectRepository.getProject).toHaveBeenCalledTimes(1)
            expect(mockProjectRepository.getProject).toHaveBeenCalledWith('contract-id')

            expect(response.status).toBe(500)
            expect(response.body).toEqual({
                error: 'ReadContractError',
                message: 'Unable to read project contract'
            })
        })
    })

    describe('get projects endpoint', function () {
        it('should return 200 when getting project and all is fine', async () => {
            mockProjectRepository.getProjectsByCreator.mockImplementation(() => ({
                projects: [
                    {
                        id: 'contract-id-1',
                        created: 'contract-date-1'
                    },
                    {
                        id: 'contract-id-2',
                        created: 'contract-date-2'
                    }
                ]
            }))

            const response = await request(app.callback()).get('/creators/creator-id/projects?sort=asc&pageSize=12&nextPageKey=page-key')

            expect(mockProjectRepository.getProjectsByCreator).toHaveBeenCalledTimes(1)
            expect(mockProjectRepository.getProjectsByCreator).toHaveBeenCalledWith({
                creator: 'creator-id',
                sort: 'asc',
                nextPageKey: 'page-key',
                pageSize: '12'
            })

            expect(response.status).toBe(200)
            expect(response.body).toEqual({
                projects: [
                    {
                        id: 'contract-id-1',
                        created: 'contract-date-1'
                    },
                    {
                        id: 'contract-id-2',
                        created: 'contract-date-2'
                    }
                ]
            })
        })
    })
})
