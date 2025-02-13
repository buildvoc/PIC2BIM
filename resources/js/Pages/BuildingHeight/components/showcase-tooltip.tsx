import styled from "@emotion/styled";
import { Paper, Stack, Typography, styled as styledMui } from "@mui/material";
import { FC, useEffect, useMemo } from "react";
import moment from "moment";
import MapIcon from "@mui/icons-material/Map";
import CalendarTodayIcon from "@mui/icons-material/CalendarToday";

const StyledImg = styled.img`
  width: 80px;
  height: auto;
`;

const StyledTypographyBody2FontSize10 = styledMui(Typography)`
  font-size: 10px;
`;

export interface ShowcaseTooltipProps {
  x: number;
  y: number;
  show: boolean;
  imageUrl: string | null;
  longitude: string;
  latitude: string;
  name: string;
  address: string;
  date: string;
}

export const ShowcaseTooltip: FC<ShowcaseTooltipProps> = ({
  x,
  y,
  show,
  imageUrl,
  longitude,
  latitude,
  name,
  address,
  date,
}: ShowcaseTooltipProps) => {
  const numberLatitude = useMemo(() => parseFloat(latitude), [latitude]);
  const numberLongitude = useMemo(() => parseFloat(longitude), [longitude]);
  useEffect(()=>{
    console.log("Image url---",imageUrl)
  },[])


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
        padding: "8px",
        borderRadius: "8px",
      }}
    >
      <Stack direction={"row"} alignItems={"center"}>
        <StyledImg src={imageUrl} alt="building" />
        <Stack
          direction={"column"}
          sx={{ width: "200px", marginLeft: "10px" }}
          alignItems={"start"}
          spacing={0.5}
        >
          <Typography
            variant={"subtitle2"}
            fontSize={"1rem"}
            sx={{ textAlign: "left" }}
          >
            {name}
          </Typography>
          <StyledTypographyBody2FontSize10
            variant="body2"
            sx={{ textAlign: "left" }}
          >
            {address}
          </StyledTypographyBody2FontSize10>
          <Stack
            direction={"row"}
            justifyContent={"left"}
            alignItems={"center"}
          >
            <CalendarTodayIcon sx={{ fontSize: "14px", marginRight: "4px" }} />
            <StyledTypographyBody2FontSize10 variant="body2">
              {moment(date).format("dddd, MM/DD/YY HH.mm")}
            </StyledTypographyBody2FontSize10>
          </Stack>
          <Stack
            direction={"row"}
            justifyContent={"left"}
            alignItems={"center"}
          >
            <MapIcon sx={{ fontSize: "14px", marginRight: "4px" }} />
            <StyledTypographyBody2FontSize10 variant="body2">
              {numberLatitude.toFixed(5)}, {numberLongitude.toFixed(5)}
            </StyledTypographyBody2FontSize10>
          </Stack>
        </Stack>
      </Stack>
    </Paper>
  );
};
