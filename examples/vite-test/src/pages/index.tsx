import { useState } from 'react'
import {
  Endless,
  EndlessConfig,
  Network,
  AccountAddress
} from '../../../../src'
import {
  Button
} from '@douyinfe/semi-ui'

const config = new EndlessConfig({
  network: Network.TESTNET
})

const endless = new Endless(config)

const HomePage = () => {
  const [ balance, setBalance ] = useState('')

  const getBalanceHandler = async () => {
    const balanceRes = await endless.getAccountEDSAmount({
      accountAddress: AccountAddress.fromBs58String('3ykQg7FegmL69JeVJsfDxyFU6o4rPEj1v5vvD34ZS367'),
    })
    setBalance(balanceRes.toString())
    console.log('balanceRes', balanceRes)
  }

  return (
    <div>
      <h1>Home Page</h1>
      <p>Balance: { balance }</p>
      <Button
        onClick={ getBalanceHandler }
      >
        Get Balance
      </Button>
    </div>
  )
}

export default HomePage
