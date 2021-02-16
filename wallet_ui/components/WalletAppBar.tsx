import React, { useEffect, useState } from "react";
import { useRouteMatch } from "react-router-dom";
import clsx from "clsx";
import AppBar from "@material-ui/core/AppBar";
import FormControlLabel from "@material-ui/core/FormControlLabel";
import IconButton from "@material-ui/core/IconButton";
import Menu from "@material-ui/core/Menu";
import MenuIcon from "@material-ui/icons/Menu";
import MenuItem from "@material-ui/core/MenuItem";
import Switch from "@material-ui/core/Switch";
import Toolbar from "@material-ui/core/Toolbar";
import Typography from "@material-ui/core/Typography";

import { makeStyles } from "@material-ui/core/styles";
import AccountCircle from "@material-ui/icons/AccountCircle";

import { getWalletId, Principal } from "../canister";

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
    marginRight: "auto",
    justifyContent: "start",
  },
  menuButtonHidden: {
    display: "none",
  },
  toolbar: {
    paddingRight: 24, // keep right padding when drawer closed
  },
  title: {
    marginLeft: "auto",
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
  const [walletId, setWalletId] = useState<Principal | null>();
  useEffect(() => {
    const walletId = getWalletId(null);
    if (walletId === null) {
      return;
    }
    setWalletId(walletId);
  }, []);
  const classes = useStyles();
  const menu = !useRouteMatch("/authorize");

  const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null);

  const isMenuOpen = Boolean(anchorEl);

  const handleProfileMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const menuId = "primary-search-account-menu";

  const renderMenu = (
    <Menu
      anchorEl={anchorEl}
      anchorOrigin={{ vertical: "top", horizontal: "right" }}
      id={menuId}
      keepMounted
      transformOrigin={{ vertical: "top", horizontal: "right" }}
      open={isMenuOpen}
      onClose={handleMenuClose}
    >
      <MenuItem onClick={handleMenuClose}>
        <FormControlLabel control={<Switch checked={dark} onChange={onDarkToggle} />} label="Dark Mode" />
      </MenuItem>
    </Menu>
  );

  return (
    <AppBar position="absolute" className={clsx(classes.appBar, open && menu && classes.appBarShift)}>
      <Toolbar className={classes.toolbar}>
        <MenuItem className={clsx(classes.menuButton, (open || !menu) && classes.menuButtonHidden)}>
          <IconButton edge="start" color="inherit" aria-label="open drawer" onClick={onOpenToggle}>
            <MenuIcon />
          </IconButton>
        </MenuItem>
        <MenuItem className={classes.title}>
          <Typography variant="h6" color="inherit" noWrap className={classes.title}>
            {walletId && walletId.toText()}
          </Typography>
        </MenuItem>
        <MenuItem onClick={handleProfileMenuOpen}>
          <IconButton
            aria-label="account of current user"
            aria-controls="primary-search-account-menu"
            aria-haspopup="true"
            color="inherit"
          >
            <AccountCircle />
          </IconButton>
        </MenuItem>
      </Toolbar>
      {renderMenu}
    </AppBar>
  );
}
