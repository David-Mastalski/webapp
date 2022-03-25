import { makeStyles, Theme } from '@material-ui/core/styles'
import { typography, colors } from '@static/theme'

const useStyles = makeStyles((theme: Theme) => ({
  wrapper: {
    maxWidth: 1120
  },
  subheader: {
    ...typography.heading4,
    color: colors.white.main,
    marginBottom: 16
  },
  plotsRow: {
    marginBottom: 24,
    flexDirection: 'row',

    [theme.breakpoints.down('sm')]: {
      flexDirection: 'column'
    }
  },
  row: {
    marginBottom: 16
  },
  loading: {
    ...typography.heading1,
    textAlign: 'center',
    color: colors.white.main
  },
  plot: {
    flex: '1 1 0%',

    '&:first-child': {
      marginRight: 24
    },

    [theme.breakpoints.down('sm')]: {
      '&:first-child': {
        marginRight: 0,
        marginBottom: 24
      }
    }
  }
}))

export default useStyles
