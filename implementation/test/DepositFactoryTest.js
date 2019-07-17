const DepositFactory = artifacts.require('DepositFactory')
const KeepStub = artifacts.require('KeepStub')
const TBTCStub = artifacts.require('TBTCStub')
const TBTCSystemStub = artifacts.require('TBTCSystemStub')
const Deposit = artifacts.require('Deposit')

const BN = require('bn.js')
const utils = require('./utils')
const chai = require('chai')
const expect = chai.expect
const bnChai = require('bn-chai')
chai.use(bnChai(BN))

const TEST_DEPOSIT_DEPLOY = [
  { name: 'TBTCStub', contract: TBTCStub },
  { name: 'TBTCSystemStub', contract: TBTCSystemStub }]


contract('DepositFactory', (accounts) => {
  let deployed
  let factory
  let clone1
  let clone2
  let keep1
  let keep2
  let deposit1
  let deposit2
  let masterDeposit

  before(async () => {
    factory = await DepositFactory.deployed()
    masterDeposit = await Deposit.deployed()
    deployed = await utils.deploySystem(TEST_DEPOSIT_DEPLOY)
  })

  describe('createDeposit()', async () => {
    it('creates new clone instances', async () => {
      keep1 = await KeepStub.new()
      keep2 = await KeepStub.new()
      const blockNumber = await web3.eth.getBlockNumber()

      await factory.createDeposit(
        deployed.TBTCSystemStub.address,
        deployed.TBTCStub.address,
        keep1.address,
        1,
        1)
        .catch((err) => {
          assert.fail(`cannot create clone: ${err}`)
        })

      await factory.createDeposit(
        deployed.TBTCSystemStub.address,
        deployed.TBTCStub.address,
        keep2.address,
        1,
        1)
        .catch((err) => {
          assert.fail(`cannot create clone: ${err}`)
        })

      const eventList = await factory.getPastEvents('DepositCloneCreated', { fromBlock: blockNumber, toBlock: 'latest' })

      assert.equal(eventList.length, 2)

      clone1 = eventList[0].returnValues.depositCloneAddress
      clone2 = eventList[1].returnValues.depositCloneAddress
    })
  })

  describe('Deposit clones have unique state', async () => {
    it('deposit 2 is not affected by state changes to deposit 1', async () => {
      deposit1 = await Deposit.at(clone1)
      deposit2 = await Deposit.at(clone2)

      await deposit1.retrieveSignerPubkey()

      // deposit1 should be AWAITING_BTC_FUNDING_PROOF (2)
      // deposit2 should be AWAITING_SIGNER_SETUP (1)
      const deposit1state = await deposit1.getCurrentState()
      const deposit2state = await deposit2.getCurrentState()

      expect(deposit1state, 'Deposit 1 should be in AWAITING_BTC_FUNDING_PROOF').to.eq.BN(utils.states.AWAITING_BTC_FUNDING_PROOF)
      expect(deposit2state, 'Deposit 2 should be in AWAITING_SIGNER_SETUP').to.eq.BN(utils.states.AWAITING_SIGNER_SETUP)
    })

    it('deposit 1 is not affected by state changes to deposit 2', async () => {
      const tx = '0x01000000000101913e39197867de39bff2c93c75173e086388ee7e8707c90ce4a02dd23f7d2c0d0000000000ffffffff012040351d0000000016001486e7303082a6a21d5837176bc808bf4828371ab602473044022046c3c852a2042ee01ffd7d8d252f297ccc67ae2aa1fac4170f50e8a90af5398802201585ffbbed6e812fb60c025d2f82ae115774279369610b0c76165b6c7132f2810121020c67643b5c862a1aa1afe0a77a28e51a21b08396a0acae69965b22d2a403fd1c4ec10800'
      const currentDifficulty = 6353030562983
      const _txIndexInBlock = 130
      const _bitcoinHeaders = '0x00e0ff3fd877ad23af1d0d3e0eb6a700d85b692975dacd36e47b1b00000000000000000095ba61df5961d7fa0a45cd7467e11f20932c7a0b74c59318e86581c6b509554876f6c65c114e2c17e42524d300000020994d3802da5adf80345261bcff2eb87ab7b70db786cb0000000000000000000003169efc259f6e4b5e1bfa469f06792d6f07976a098bff2940c8e7ed3105fdc5eff7c65c114e2c170c4dffc30000c020f898b7ea6a405728055b0627f53f42c57290fe78e0b91900000000000000000075472c91a94fa2aab73369c0686a58796949cf60976e530f6eb295320fa15a1b77f8c65c114e2c17387f1df00000002069137421fc274aa2c907dbf0ec4754285897e8aa36332b0000000000000000004308f2494b702c40e9d61991feb7a15b3be1d73ce988e354e52e7a4e611bd9c2a2f8c65c114e2c1740287df200000020ab63607b09395f856adaa69d553755d9ba5bd8d15da20a000000000000000000090ea7559cda848d97575cb9696c8e33ba7f38d18d5e2f8422837c354aec147839fbc65c114e2c175cf077d6000000200ab3612eac08a31a8fb1d9b5397f897db8d26f6cd83a230000000000000000006f4888720ecbf980ff9c983a8e2e60ad329cc7b130916c2bf2300ea54e412a9ed6fcc65c114e2c17d4fbb88500000020d3e51560f77628a26a8fad01c88f98bd6c9e4bc8703b180000000000000000008e2c6e62a1f4d45dd03be1e6692df89a4e3b1223a4dbdfa94cca94c04c22049992fdc65c114e2c17463edb5e'
      const _pubKey = '0xd4aee75e57179f7cd18adcbaa7e2fca4ff7b1b446df88bf0b4398e4a26965a6ee8bfb23428a4efecb3ebdc636139de9a568ed427fff20d28baa33ed48e9c44e1'
      const _merkleProof = '0x5f40bccf997d221cd0e9cb6564643f9808a89a5e1c65ea5e6530c0b51c18487c886f7da48f4ccfe49283c678dedb376c89853ba46d9a297fe39e8dd557d1f8deb0fb1a28c03f71b267f3a33459b2566975b1653a1238947ed05edca17ef64181b1f09d858a6e25bae4b0e245993d4ea77facba8ed0371bb9b8a6724475bcdc9edf9ead30b61cf6714758b7c93d1b725f86c2a66a07dd291ef566eaa5a59516823d57fd50557f1d938cc2fb61fe0e1acee6f9cb618a9210688a2965c52feabee66d660a5e7f158e363dc464fca2bb1cc856173366d5d20b5cd513a3aab8ebc5be2bd196b783b8773af2472abcea3e32e97938283f7b454769aa1c064c311c3342a755029ee338664999bd8d432080eafae3ca86b52ad2e321e9e634a46c1bd0d174e38bcd4c59a0f0a78c5906c015ef4daf6beb0500a59f4cae00cd46069ce60db2182e74561028e4462f59f639c89b8e254602d6ad9c212b7c2af5db9275e48c467539c6af678d6f09214182df848bd79a06df706f7c3fddfdd95e6f27326c6217ee446543a443f82b711f48c173a769ae8d1e92a986bc76fca732f088bbe04995ba61df5961d7fa0a45cd7467e11f20932c7a0b74c59318e86581c6b5095548'

      await keep2.setPubkey(_pubKey)
      await deposit2.retrieveSignerPubkey()
      await deployed.TBTCSystemStub.setCurrentDiff(currentDifficulty)
      await deposit2.provideBTCFundingProof(tx, _merkleProof, _txIndexInBlock, _bitcoinHeaders)

      // deposit1 should be AWAITING_BTC_FUNDING_PROOF (2)
      // deposit2 should be ACTIVE (5)
      const deposit1state = await deposit1.getCurrentState()
      const deposit2state = await deposit2.getCurrentState()

      expect(deposit1state, 'Deposit 1 should be in AWAITING_BTC_FUNDING_PROOF').to.eq.BN(utils.states.AWAITING_BTC_FUNDING_PROOF)
      expect(deposit2state, 'Deposit 2 should be in ACTIVE').to.eq.BN(utils.states.ACTIVE)
    })
  })

  describe('Master state cheange does not impact clones', async () => {
    it('master state change does not affect new clone', async () => {
      const keepDep = await KeepStub.new()

      await masterDeposit.createNewDeposit(
        deployed.TBTCSystemStub.address,
        deployed.TBTCStub.address,
        keepDep.address,
        1,
        1)
        .catch((err) => {
          assert.fail(`cannot create clone: ${err}`)
        })

      await masterDeposit.retrieveSignerPubkey()

      // master deposit should now be in AWAITING_BTC_FUNDING_PROOF
      const masterState = await masterDeposit.getCurrentState()

      const blockNumber = await web3.eth.getBlockNumber()
      const keepNew = await KeepStub.new()
      await factory.createDeposit(
        deployed.TBTCSystemStub.address,
        deployed.TBTCStub.address,
        keepNew.address,
        1,
        1)
        .catch((err) => {
          assert.fail(`cannot create clone: ${err}`)
        })

      const eventList = await factory.getPastEvents('DepositCloneCreated', { fromBlock: blockNumber, toBlock: 'latest' })
      const cloneNew = eventList[0].returnValues.depositCloneAddress
      const depositNew = await Deposit.at(cloneNew)

      // should be behind Master, at AWAITING_SIGNER_SETUP
      const newCloneState = await depositNew.getCurrentState()

      expect(masterState, 'Master deposit should be in AWAITING_BTC_FUNDING_PROOF').to.eq.BN(utils.states.AWAITING_BTC_FUNDING_PROOF)
      expect(newCloneState, 'New clone should be in AWAITING_SIGNER_SETUP').to.eq.BN(utils.states.AWAITING_SIGNER_SETUP)
    })
  })
})
