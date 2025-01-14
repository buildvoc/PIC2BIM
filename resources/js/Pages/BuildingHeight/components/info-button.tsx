import { Info } from "@mui/icons-material";
import { AppBar, IconButton, Toolbar } from "@mui/material";

interface InfoButtonProps {
  toggleInfo: () => void;
}

export const InfoButton = ({ toggleInfo }: InfoButtonProps) => {
  return (
    <AppBar elevation={0} color="transparent" position="absolute">
      <Toolbar
        sx={{
          direction: "row",
          justifyContent: "flex-end",
          alignItems: "center",
        }}
      >
        <IconButton
          onClick={toggleInfo}
          color="primary"
          edge="end"
          aria-label="Info"
        >
          <Info />
        </IconButton>
      </Toolbar>
    </AppBar>
  );
};
