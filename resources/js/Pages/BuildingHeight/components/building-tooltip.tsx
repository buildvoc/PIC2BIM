import styled from "@emotion/styled";
import { Paper, Stack, Typography } from "@mui/material";
import { FC } from "react";

const StyledImg = styled.img`
  width: 200px;
  maxwidth: 100vw;
`;

export interface BuildingTooltipProps {
  x: number;
  y: number;
  show: boolean;
  imageUrl: string | null;
  altitude: number;
  heading: number;
}

export const BuildingTooltip: FC<BuildingTooltipProps> = ({
  x,
  y,
  show,
  imageUrl,
  altitude,
  heading,
}: BuildingTooltipProps) => {
  if (!show || !imageUrl) {
    return null;
  }
  return (
    <Paper
      sx={{
        position: "absolute",
        left: `${x}px`,
        bottom: `${window.innerHeight - y}px`,
        zIndex: 2,
        padding: "5px",
      }}
    >
      <Stack direction={"column"}>
        <StyledImg src={imageUrl} alt="building" />
        <Stack direction={"row"} spacing={1} alignItems={"baseline"}>
          <Typography variant={"h6"} fontSize={"1rem"}>
            Altitude:{" "}
          </Typography>
          <Typography variant="body1">{altitude.toFixed(2)}m</Typography>
        </Stack>
        <Stack direction={"row"} spacing={1} alignItems={"baseline"}>
          <Typography variant={"h6"} fontSize={"1rem"}>
            Heading:{" "}
          </Typography>
          <Typography variant="body1">{heading.toFixed(2)}°</Typography>
        </Stack>
      </Stack>
    </Paper>
  );
};
