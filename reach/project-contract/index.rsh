'reach 0.1'
'use strict'

/**
 * The Project Contract owns data fields which represent a Terragrids Creator's project.
 * Data fields are:
 * 1/ token: the project ARC-19 NFT with upgradable name and information about the project
 * 2/ creator: the creator wallet address
 *
 * Creators can update their project details by updating the ARC-19 NFT name, description and properties
 * outside of this smart contract.
 *
 * This smart contract:
 * 1/ Takes the NFT into its balance at deployment
 * 2/ Takes creator’s address at deployment
 * 3/ Exposes API function to deposit ALGO
 * 4/ Exposes API function to withdraw ALGO balance and NFT into admin’s wallet
 * 5/ Exposes API function to pay ALGO balance into creator’s wallet
 * 6/ Exposes API function to pay NFT into creator’s wallet
 * 7/ Exposes API function to stop the contract and pay residual balance and NFT into admin’s wallet
 */

export const main = Reach.App(() => {
    const A = Participant('Admin', {
        ...hasConsoleLogger,
        onReady: Fun(true, Null),
        token: Token,
        creator: Address
    })

    const ProjectView = View('View', {
        creator: Address,
        balance: UInt,
        token: Token,
        tokenBalance: UInt,
        approved: Bool
    })

    const Api = API('Api', {
        deposit: Fun([UInt], Bool),
        withdraw: Fun([], Bool),
        payBalance: Fun([], Bool),
        payToken: Fun([], Bool),
        setApprovalState: Fun([Bool], Bool),
        stop: Fun([], Bool)
    })

    init()

    A.only(() => {
        const [token, creator] = declassify([interact.token, interact.creator])
    })

    A.publish(token, creator)
    commit()

    A.pay([[1, token]])
    assert(balance(token) == 1, 'Balance of NFT is wrong')

    A.interact.onReady(getContract())
    A.interact.log('The project contract is ready')

    const [done, paid, tokenBalance, approved] = parallelReduce([false, 0, 1, false])
        .define(() => {
            ProjectView.creator.set(creator)
            ProjectView.balance.set(balance())
            ProjectView.token.set(token)
            ProjectView.tokenBalance.set(balance(token))
            ProjectView.approved.set(approved)
        })
        .invariant(balance() == paid && balance(token) == tokenBalance)
        .while(!done)
        /**
         * Deposit money
         */
        .api(
            Api.deposit,
            amount => amount,
            (amount, k) => {
                k(true)
                return [false, amount + paid, tokenBalance, approved]
            }
        )
        /**
         * Withdraw balance and token into admin's wallet
         */
        .api(
            Api.withdraw,
            () => {
                assume(this == A)
            },
            () => 0,
            k => {
                const isAdmin = this == A
                require(isAdmin)
                k(isAdmin)
                transfer(paid).to(A)
                transfer(tokenBalance, token).to(A)
                return [false, 0, 0, approved]
            }
        )
        /**
         * Pay balance into creator's wallet only if:
         * 1/ The caller is the admin or the project creator
         * 2/ The project has been approved
         */
        .api(
            Api.payBalance,
            () => {
                const isAdmin = this == A
                const isCreator = this == creator
                const isAllowed = isAdmin || isCreator
                assume(approved && isAllowed)
            },
            () => 0,
            k => {
                const isAdmin = this == A
                const isCreator = this == creator
                const isAllowed = isAdmin || isCreator
                require(approved && isAllowed)
                k(true)
                transfer(paid).to(creator)
                return [false, 0, tokenBalance, approved]
            }
        )
        /**
         * Pay token into creator's wallet and approve this project,
         * only if the caller is this contract's admin.
         */
        .api(
            Api.payToken,
            () => {
                assume(this == A)
            },
            () => 0,
            k => {
                const isAdmin = this == A
                require(isAdmin)
                k(isAdmin)
                transfer(tokenBalance, token).to(creator)
                return [false, paid, 0, true]
            }
        )
        /**
         * Set approval state for this project,
         * only if the caller is this contract's admin.
         */
        .api(
            Api.setApprovalState,
            _ => {
                assume(this == A)
            },
            _ => 0,
            (isApproved, k) => {
                const isAdmin = this == A
                require(isAdmin)
                k(isAdmin)
                return [false, paid, tokenBalance, isApproved]
            }
        )
        /**
         * Stop this contract
         */
        .api(
            Api.stop,
            () => {
                assume(this == A)
            },
            () => 0,
            k => {
                const isAdmin = this == A
                require(isAdmin)
                k(isAdmin)
                return [true, paid, tokenBalance, approved]
            }
        )
        .timeout(false)

    /**
     * Pay any residual balance into the admin's wallet
     */
    transfer(paid).to(A)
    transfer(tokenBalance, token).to(A)

    commit()
    A.interact.log('The project contract is closing down...')
    exit()
})
