import React, { useState, useEffect } from 'react'
import classnames from 'classnames'
import { makeStyles } from '@material-ui/core/styles'

import Calendar from './Calendar'

const styles = {
  wrapper: {
    backgroundColor: 'white',
    borderRadius: 10
  }
}

const useStyles = makeStyles(styles)

const DateRangePicker = ({ minDate, maxDate, className, onRangeChange, ...props }) => {
  const [from, setFrom] = useState(null)
  const [to, setTo] = useState(null)

  useEffect(() => {
    onRangeChange(from, to)
  }, [from, to])

  const classes = useStyles()

  const handleSelect = (day, minDate, maxDate) => {
    if ((maxDate && day.isAfter(maxDate, 'day')) || (minDate && day.isBefore(minDate, 'day'))) return

    if (from && !to && day.isBefore(from, 'day')) {
      setTo(from)
      setFrom(day)
      return
    }

    if (from && !to && day.isSameOrAfter(from, 'day')) {
      setTo(day)
      return
    }

    setFrom(day)
    setTo(null)
  }

  return (
    <>
      <div className={classnames(classes.wrapper, className)}>
        <Calendar from={from} to={to} minDate={minDate} maxDate={maxDate} handleSelect={handleSelect} />
      </div>
    </>
  )
}

export default DateRangePicker
