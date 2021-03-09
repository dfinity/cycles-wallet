import { common, deepPurple } from "@material-ui/core/colors";
import createMuiTheme from "@material-ui/core/styles/createMuiTheme";

const generateTheme = (darkState: boolean) => {
  const palletType = darkState ? "dark" : "light";
  const mainPrimaryColor = darkState ? "#292A2E" : "#292A2E";
  const mainSecondaryColor = darkState ? "#292A2E" : "#292A2E";
  //   const mainSecondaryColor = darkState ? common.white : deepPurple[500];

  return createMuiTheme({
    palette: {
      type: palletType,
      primary: {
        main: mainPrimaryColor,
      },
      secondary: {
        main: mainSecondaryColor,
      },
    },
  });
};

export default generateTheme;
