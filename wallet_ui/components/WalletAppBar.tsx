import clsx from "clsx";
import AppBar from "@material-ui/core/AppBar";
import Toolbar from "@material-ui/core/Toolbar";
import IconButton from "@material-ui/core/IconButton";
import MenuIcon from "@material-ui/icons/Menu";
import Typography from "@material-ui/core/Typography";
import Switch from "@material-ui/core/Switch";
import React from "react";
import { makeStyles } from "@material-ui/core/styles";
import { useRouteMatch } from "react-router-dom";

// Assets
const logo = require("../img/logo.png").default;

const drawerWidth = 240;

const useStyles = makeStyles((theme) => ({
  appBar: {
    zIndex: theme.zIndex.drawer + 1,
    transition: theme.transitions.create(["width", "margin"], {
      easing: theme.transitions.easing.sharp,
      duration: theme.transitions.duration.leavingScreen,
    }),
  },
  appBarShift: {
    marginLeft: drawerWidth,
    width: `calc(100% - ${drawerWidth}px)`,
    transition: theme.transitions.create(["width", "margin"], {
      easing: theme.transitions.easing.sharp,
      duration: theme.transitions.duration.enteringScreen,
    }),
  },
  menuButton: {
    marginRight: 36,
  },
  menuButtonHidden: {
    display: "none",
  },
  toolbar: {
    paddingRight: 24, // keep right padding when drawer closed
  },
  title: {
    flexGrow: 1,
  },
  logo: {
    height: 16,
    marginRight: 12,
  },
}));

export function WalletAppBar(props: {
  dark: boolean;
  open: boolean;
  onOpenToggle: () => void;
  onDarkToggle: () => void;
}) {
  const { dark, open, onOpenToggle, onDarkToggle } = props;
  const classes = useStyles();
  const menu = !useRouteMatch("/authorize");

  return (
    <AppBar
      position="absolute"
      className={clsx(classes.appBar, open && menu && classes.appBarShift)}
    >
      <Toolbar className={classes.toolbar}>
        <IconButton
          edge="start"
          color="inherit"
          aria-label="open drawer"
          onClick={onOpenToggle}
          className={clsx(
            classes.menuButton,
            (open || !menu) && classes.menuButtonHidden
          )}
        >
          <MenuIcon />
        </IconButton>
        <Typography
          component="h1"
          variant="h6"
          color="inherit"
          noWrap
          className={classes.title}
        >
          <img alt="DFINITY Logo" src={logo} className={classes.logo} />
          Wallet
        </Typography>
        <Switch checked={dark} onChange={onDarkToggle} />
      </Toolbar>
    </AppBar>
  );
}
