import React, { useState, memo } from 'react'
import classnames from 'classnames'
import { makeStyles } from '@material-ui/core/styles'

import Popover from '../Popper'
import { subheaderColor, subheaderDarkColor, offColor } from '../../styling/variables'
import typographyStyles from '../typography/styles'

const { info2 } = typographyStyles

const colors = (color1, color2, color3) => {
  return {
    backgroundColor: color1,
    '&:hover': {
      backgroundColor: color2
    },
    '&:active': {
      backgroundColor: color3
    }
  }
}

const styles = {
  idButton: {
    width: 34,
    height: 28,
    display: 'flex',
    borderRadius: 4,
    padding: 0,
    border: 'none',
    cursor: 'pointer'
  },
  buttonIcon: {
    margin: 'auto',
    lineHeight: 1,
    '& svg': {
      overflow: 'visible'
    }
  },
  closed: {
    extend: colors(subheaderColor, subheaderDarkColor, offColor)
  },
  open: {
    extend: colors(offColor, offColor, offColor)
  },
  popoverContent: {
    extend: info2,
    padding: 8,
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 4,
    '& img': {
      maxHeight: 145
    }
  }
}

const useStyles = makeStyles(styles)

const IDButton = memo(({ name, className, Icon, InverseIcon, popoverWidth = 152, children, ...props }) => {
  const [anchorEl, setAnchorEl] = useState(null)

  const classes = useStyles()

  const open = Boolean(anchorEl)
  const id = open ? `simple-popper-${name}` : undefined

  const classNames = {
    [classes.idButton]: true,
    [classes.primary]: true,
    [classes.open]: open,
    [classes.closed]: !open
  }

  const iconClassNames = {
    [classes.buttonIcon]: true
  }

  const handleClick = event => {
    setAnchorEl(anchorEl ? null : event.currentTarget)
  }

  const handleClose = () => {
    setAnchorEl(null)
  }

  return (
    <>
      <button aria-describedby={id} onClick={handleClick} className={classnames(classNames, className)} {...props}>
        {Icon && !open && <div className={classnames(iconClassNames)}><Icon /></div>}
        {InverseIcon && open &&
          <div className={classnames(iconClassNames)}>
            <InverseIcon />
          </div>}
      </button>
      <Popover
        id={id}
        open={open}
        anchorEl={anchorEl}
        onClose={handleClose}
        arrowSize={3}
        placement='top'
      >
        <div className={classes.popoverContent}>
          <div>{children}</div>
        </div>
      </Popover>
    </>
  )
})

export default IDButton
