import React, { useState } from 'react'
import moment from 'moment'
import QRCode from 'qrcode.react'
import BigNumber from 'bignumber.js'
import useAxios from '@use-hooks/axios'
import { makeStyles } from '@material-ui/core/styles'

import { Tr, Td, THead, TBody, Table } from '../components/fake-table/Table'
import { H3, Info1, Info2, Info3, Mono, Label1, Label3 } from '../components/typography'
import Title from '../components/Title'
import TableLabel from '../components/TableLabel'
import Sidebar from '../components/Sidebar'
import { primaryColor } from '../styling/variables'

import styles from './Funding.styles'
import classnames from 'classnames'

const useStyles = makeStyles(styles)
const sizes = {
  big: 165,
  time: 140,
  date: 130
}

const formatAddress = (address = '') => {
  return address.replace(/(.{4})/g, '$1 ')
}

const sumReducer = (acc, value) => acc.plus(value)

const formatNumber = it => {
  return new BigNumber(it).toFormat(2)
}

const getConfirmedTotal = list => {
  return formatNumber(
    list.map(it => new BigNumber(it.fiatConfirmedBalance)).reduce(sumReducer, new BigNumber(0))
  )
}

const getPendingTotal = list => {
  return formatNumber(
    list.map(it => new BigNumber(it.fiatPending)).reduce(sumReducer, new BigNumber(0))
  )
}

const Funding = () => {
  const [data, setData] = useState(null)
  const [selected, setSelected] = useState(null)
  const [viewHistory, setViewHistory] = useState(false)
  const classes = useStyles()
  const fundingHistory = [
    {
      cryptoAmount: 2.00,
      balance: 10.23,
      fiatValue: 1000.00,
      date: new Date(),
      performedBy: null,
      pending: true
    },
    {
      cryptoAmount: 10.00,
      balance: 12.23,
      fiatValue: 12000.00,
      date: new Date(),
      performedBy: null
    },
    {
      cryptoAmount: 5.00,
      balance: 5.00,
      fiatValue: 50000.00,
      date: new Date(),
      performedBy: null
    }
  ]

  const isSelected = it => {
    return selected && selected.cryptoCode === it.cryptoCode
  }

  useAxios({
    url: 'http://localhost:8070/api/funding',
    method: 'GET',
    trigger: [],
    customHandler: (err, res) => {
      if (err) return
      if (res) {
        setData(res.data)
        setSelected(res.data && res.data[0])
      }
    }
  })

  const itemRender = (it) => {
    return (
      <div className={classes.itemWrapper}>
        <div className={classes.firstItem}>{it.display}</div>
        <div className={classes.item}>{it.fiatConfirmedBalance} {it.fiatCode}</div>
        <div className={classes.item}>{it.confirmedBalance} {it.cryptoCode}</div>
      </div>
    )
  }

  return (
    <>
      <div>
        <Title>Funding</Title>
        {/* <button onClick={it => setViewHistory(!viewHistory)}>hehe</button> */}
      </div>
      <div className={classes.wrapper}>
        <Sidebar
          data={data}
          isSelected={isSelected}
          onClick={setSelected}
          displayName={it => it.display}
          itemRender={itemRender}
        >
          {data && data.length && (
            <div className={classes.total}>
              <Label1 className={classes.totalTitle}>Total Crypto Balance</Label1>
              <Info1 noMargin>
                {getConfirmedTotal(data)} {data[0].fiatCode}
              </Info1>
              <Label1 className={classes.totalPending}>(+{getPendingTotal(data)} pending)</Label1>
            </div>
          )}
        </Sidebar>
        {selected && !viewHistory && (
          <div className={classes.main}>
            <div className={classes.firstSide}>
              <H3>Balance ({selected.display})</H3>
              <div className={classes.coinTotal}>
                <Info1 inline noMargin>
                  {`${selected.confirmedBalance} ${selected.cryptoCode}`}
                </Info1>
                <Info2 inline noMargin className={classes.leftSpacer}>
                  {`(+ ${selected.pending} pending)`}
                </Info2>
              </div>

              <div className={classes.coinTotal}>
                <Info3 inline noMargin>
                  {`= ${formatNumber(selected.fiatConfirmedBalance)} ${selected.fiatCode}`}
                </Info3>
                <Label3 inline noMargin className={classes.leftSpacer}>
                  {`(+${formatNumber(selected.fiatPending)} pending)`}
                </Label3>
              </div>

              <H3 className={classes.topSpacer}>Address</H3>
              <div className={classes.addressWrapper}>
                <Mono className={classes.address}>
                  <strong>{formatAddress(selected.fundingAddress)}</strong>
                </Mono>
              </div>
            </div>

            <div className={classes.secondSide}>
              <Label1>Scan to send {selected.display}</Label1>
              <QRCode size={240} fgColor={primaryColor} value={selected.fundingAddressUrl} />
            </div>
          </div>
        )}
        {selected && viewHistory && (
          <div>
            <TableLabel className={classes.tableLabel} label='Pending' color='#cacaca' />
            <Table className={classes.table}>
              <THead>
                <Td header size={sizes.big}>Amount Entered</Td>
                <Td header size={sizes.big}>Balance After</Td>
                <Td header size={sizes.big}>Cash Value</Td>
                <Td header size={sizes.date}>Date</Td>
                <Td header size={sizes.time}>Time (h:m:s)</Td>
                <Td header size={sizes.big}>Performed By</Td>
              </THead>
              <TBody>
                {fundingHistory.map((it, idx) => (
                  <Tr key={idx} className={classnames({ [classes.pending]: it.pending })}>
                    <Td size={sizes.big}>{it.cryptoAmount} {selected.cryptoCode}</Td>
                    <Td size={sizes.big}>{it.balance} {selected.cryptoCode}</Td>
                    <Td size={sizes.big}>{it.fiatValue} {selected.fiatCode}</Td>
                    <Td size={sizes.date}>{moment(it.date).format('YYYY-MM-DD')}</Td>
                    <Td size={sizes.time}>{moment(it.date).format('hh:mm:ss')}</Td>
                    <Td size={sizes.big}>add</Td>
                  </Tr>
                ))}
              </TBody>
            </Table>
          </div>
        )}
      </div>
    </>
  )
}

export default Funding
