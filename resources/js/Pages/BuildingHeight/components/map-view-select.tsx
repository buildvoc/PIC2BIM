import { IconButton, Paper, Popover, Stack } from "@mui/material";
import Badge from "@mui/material/Badge";
import VideocamIcon from "@mui/icons-material/Videocam";
import styled from "@emotion/styled";
import { MouseEvent, useMemo, useState } from "react";

const StyledIconButton = styled(IconButton)`
  position: absolute;
  right: 2px;
  bottom: 2px;
`;

interface MapViewSelectProps {
  view: "firstPerson" | "map" | "orthographic";
  onViewSet: (view: "firstPerson" | "map" | "orthographic") => void;
}

export const MapViewSelect = ({ view, onViewSet }: MapViewSelectProps) => {
  const [anchorEl, setAnchorEl] = useState<HTMLButtonElement | null>(null);

  const handleClick = (event: MouseEvent<HTMLButtonElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const open = Boolean(anchorEl);
  const id = open ? "camera-popover" : undefined;

  const activeBadge = useMemo(() => {
    switch (view) {
      case "firstPerson":
        return "D";
      case "map":
        return "P";
      default:
        return "T";
    }
  }, [view]);

  const onViewSelect = (view: "firstPerson" | "map" | "orthographic") => {
    onViewSet(view);
    handleClose();
  };

  return (
    <>
      <StyledIconButton size="medium" onClick={handleClick}>
        <Badge
          color="secondary"
          badgeContent={activeBadge}
          anchorOrigin={{
            vertical: "bottom",
            horizontal: "left",
          }}
          overlap="circular"
        >
          <VideocamIcon fontSize="large" />
        </Badge>
      </StyledIconButton>
      <Popover
        id={id}
        open={open}
        anchorEl={anchorEl}
        onClose={handleClose}
        anchorOrigin={{
          vertical: "top",
          horizontal: "center",
        }}
        transformOrigin={{
          vertical: "bottom",
          horizontal: "center",
        }}
      >
        <Paper sx={{ padding: "9px" }}>
          <Stack
            direction={"row"}
            spacing={0.5}
            sx={{ maxWidth: "calc(100vw - 80px)" }}
          >
            <IconButton
              size="medium"
              onClick={() => onViewSelect("orthographic")}
            >
              <Badge
                color={view === "orthographic" ? "primary" : "disabled"}
                badgeContent={"T"}
                anchorOrigin={{
                  vertical: "bottom",
                  horizontal: "left",
                }}
                overlap="circular"
              >
                <VideocamIcon fontSize="large" />
              </Badge>
            </IconButton>
            <IconButton size="medium" onClick={() => onViewSelect("map")}>
              <Badge
                color={view === "map" ? "primary" : "disabled"}
                badgeContent={"P"}
                anchorOrigin={{
                  vertical: "bottom",
                  horizontal: "left",
                }}
                overlap="circular"
              >
                <VideocamIcon fontSize="large" />
              </Badge>
            </IconButton>
            <IconButton
              size="medium"
              onClick={() => onViewSelect("firstPerson")}
            >
              <Badge
                color={view === "firstPerson" ? "primary" : "disabled"}
                badgeContent={"D"}
                anchorOrigin={{
                  vertical: "bottom",
                  horizontal: "left",
                }}
                overlap="circular"
              >
                <VideocamIcon fontSize="large" />
              </Badge>
            </IconButton>
          </Stack>
        </Paper>
      </Popover>
    </>
  );
};
