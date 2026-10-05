import {
  Paper,
  BottomNavigation,
  BottomNavigationAction,
  Box,
  Stack,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  SelectChangeEvent,
} from "@mui/material";
import { CameraAlt, PinDrop } from "@mui/icons-material";
import { useEffect, useState } from "react";
import { NginxFile } from "../types/nginx";
import { MapViewSelect } from "./map-view-select";
import { LAYOUT } from "../types/layout";

interface BottomNavProps {
  layout: LAYOUT;
  view: "firstPerson" | "map" | "orthographic";
  lazFile: NginxFile | null;
  onChange: (newValue: number) => void;
  onViewSet: (view: "firstPerson" | "map" | "orthographic") => void;
  onLazChange: (url: NginxFile) => void;
  drawLaz: () => void;
}

export const BottomNav = ({
  layout,
  view,
  lazFile,
  onChange,
  onViewSet,
  onLazChange,
  drawLaz,
}: BottomNavProps) => {
  const [lazList, setLazList] = useState<NginxFile[]>([]);



  const onLazChangeHandler = (event: SelectChangeEvent) => {
    const file = lazList.find((file) => file.name === event.target.value);
    if (file) {
      onLazChange(file);
    }
  };

  return (
    <>
      {layout === LAYOUT.RESULT && (
        <Box
          sx={{
            display: "flex",
            justifyContent: "center",
            width: "100vw",
            position: "absolute",
            bottom: "60px",
            paddingLeft: "56px",
          }}
        >
        </Box>
      )}
      <Paper
        sx={{ position: "fixed", bottom: 0, left: 0, right: 0 }}
        elevation={3}
      >
        {/* <BottomNavigation
          showLabels
          value={layout}
          onChange={(event, newValue) => onChange(newValue)}
        >
          <BottomNavigationAction label="Capture" icon={<CameraAlt />} />
          <BottomNavigationAction label="Result" icon={<PinDrop />} />
        </BottomNavigation> */}
        {(layout === LAYOUT.RESULT || layout === LAYOUT.SHOWCASE) && (
          <MapViewSelect view={view} onViewSet={onViewSet} />
        )}
      </Paper>
    </>
  );
};
