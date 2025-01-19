import { Info } from "@mui/icons-material";
import { AppBar, IconButton, Toolbar } from "@mui/material";

interface InfoButtonProps {
  toggleInfo: () => void;
}

export const InfoButton = ({ toggleInfo }: InfoButtonProps) => {
  return (
      <Toolbar
        sx={{
          width:"10px",
          height:"10px",
          right:"10px",
          position:"absolute",
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
  );
};
