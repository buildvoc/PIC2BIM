import { Box, styled } from "@mui/material";

export const MapWrapper = styled(Box)(({ theme }) => ({
  backgroundColor:
    theme.palette.mode === "light"
      ? theme.palette.grey[100]
      : theme.palette.grey[900],
  position: "absolute",
  height: "100vh",
  width: "100vw",
  overflow: "hidden",
}));
