import { BorderColor, ChevronLeft, ChevronRight } from "@mui/icons-material";
import {
  Box,
  Button,
  Divider,
  Drawer,
  FormControl,
  ListItemText,
  ListItem,
  InputLabel,
  IconButton,
  Select,
  Link,
  Stack,
  MenuItem,
  List,
  Toolbar,
  Typography,
  styled,
  Paper,
  SelectChangeEvent,
} from "@mui/material";
import CloudUploadIcon from "@mui/icons-material/CloudUpload";
import CollectionsIcon from "@mui/icons-material/Collections";
import MetricDisplay from "./metric-display/metric-display";
import { useState, useEffect,useMemo,useRef } from "react";
import { NginxFile } from "../types/nginx";
import { LAZ_FILES_LIST_URL } from "../constants";
import {
  Menu as MenuIcon,
  Close as CloseIcon,
  Close,
  LogoutRounded,
  CameraAlt,
  DocumentScanner
} from "@mui/icons-material";
import { FileContents } from "../types/file";
import heritageTrail from "../data/heritage-trail";
import { Metrics } from "../types/metrics";

const DRAWER_WIDTH: number = 300;
const SECONDARY_DRAWER_WIDTH: number = 300;

const VisuallyHiddenInput = styled("input")({
  clip: "rect(0 0 0 0)",
  clipPath: "inset(50%)",
  height: 1,
  overflow: "hidden",
  position: "absolute",
  bottom: 0,
  left: 0,
  whiteSpace: "nowrap",
  width: 1,
});

const StyledDrawer = styled(Drawer, {
  shouldForwardProp: (prop) => prop !== "open",
})(({ theme, open }) => ({
  "& .MuiDrawer-paper": {
    position: "relative",
    whiteSpace: "nowrap",
    width: open ? DRAWER_WIDTH : 0, // Set width to 0 when closed
    backgroundColor: "rgba(255, 255, 255, 0.0)",
    border: "none",
    transition: theme.transitions.create("width", {
      easing: theme.transitions.easing.sharp,
      duration: theme.transitions.duration.enteringScreen,
    }),
    boxSizing: "border-box",
    ...(!open && {
      overflowX: "hidden",

      transition: theme.transitions.create("width", {
        easing: theme.transitions.easing.sharp,
        duration: theme.transitions.duration.leavingScreen,
      }),
      width: theme.spacing(7),
      [theme.breakpoints.up("sm")]: {
        width: theme.spacing(5),
      },
    }),
  },
}));
interface Tag {
  description?: string;
}
interface BuildingAttributesProps {
  geojsonFileContents: FileContents;
  tags: Record<string, Tag[] | Tag>;
  previewImg?: string | null;
  onImageChange: (value: File | null | undefined) => void;
  onShowcaseClick: () => void;
  extractedDrawerOpen: boolean;
  setExtractedDrawerOpen: (value: boolean) => void;
  isUploadTriggered:boolean
  lazFile: NginxFile | null;
  metrics: Metrics;
  handleFileRead: (
    isFileUpload: boolean,
    customFileData?: string | ArrayBuffer | null
  ) => void;
  onLazChange: (url: NginxFile) => void;
  drawLaz_: () => void;
  isMetadataResultsTriggered:boolean}
// Secondary drawer
// Secondary drawer
const SecondaryDrawer = styled(Drawer)(({ theme }) => ({
  "& .MuiDrawer-paper": {
    width: SECONDARY_DRAWER_WIDTH,
    boxSizing: "border-box",
    alignItems: "start",
    position: "absolute", // Ensure it overlaps the main drawer
    height: "100vh", // Make it cover the full screen height
    backgroundColor: "rgb(50, 173, 230)",
    
  },
}));

export const BuildingAttributes = ({
  geojsonFileContents,
  metrics,
  lazFile,
  handleFileRead,
  previewImg,
  onImageChange,
  tags,
  onShowcaseClick,
  setExtractedDrawerOpen,
  extractedDrawerOpen,
  drawLaz_,
  onLazChange,
  isUploadTriggered,
  isMetadataResultsTriggered
}: BuildingAttributesProps) => {
  const [open, setOpen] = useState(true);
  const toggleDrawer = () => {
    setOpen(!open);
  };
  const [fileName, setFileName] = useState<string>("");
  const [lazList, setLazList] = useState<NginxFile[]>([]);
  const [secondaryDrawerOpen, setSecondaryDrawerOpen] = useState(false);
  const { landArea, buildingArea, volume, buildingHeight } = metrics;
  const [hasMounted, setHasMounted] = useState(false);
  const fileInputRef = useRef<any>(null);
  const metaDataBtnRef = useRef<any>(null);

  useEffect(()=>{
    if (!hasMounted) {
      setHasMounted(true);
      return;
    }
    fileInputRef.current.click()
  },[isUploadTriggered])

  useEffect(()=>{
    if (!hasMounted) {
      setHasMounted(true);
      return;
    }
    previewImg && tags ?  metaDataBtnRef.current.click():alert('Please Upload Photo!');


  },[isMetadataResultsTriggered])


  useEffect(() => {
    const getLazFilesList = async () => {
      const response = await fetch(LAZ_FILES_LIST_URL);
      const result = await response.json();
      setLazList(result as NginxFile[]);
    };
    getLazFilesList();
  }, []);
  const onImageChangeHandler = (e: any) => {
    if (!e.target.files || e.target.files.length === 0) {
      onImageChange(undefined);
      return;
    }
    onImageChange(e.target.files[0]);
  };
  const toggleExtractedDrawer =
    (open: boolean) => (event: React.KeyboardEvent | React.MouseEvent) => {
      if (
        event.type === "keydown" &&
        ((event as React.KeyboardEvent).key === "Tab" ||
          (event as React.KeyboardEvent).key === "Shift")
      ) {
        return;
      }
      setExtractedDrawerOpen(open);
      setSecondaryDrawerOpen(false)
    };
  const onFileSelectHandler = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const { name } = e.target.files[0];
      let allowedExtension = /.geojson/;
      if (!allowedExtension.exec(name)) {
        alert("Invalid File type uploaded. Only .geojson files supported");
        return;
      }

      const fileReader = new FileReader();
      fileReader.onloadend = () => handleFileRead(true, fileReader.result);
      fileReader.readAsText(e.target.files[0]);
      setFileName(e.target.files[0].name);
    }
  };

  const toggleSecondaryDrawer = () => {
    setSecondaryDrawerOpen(!secondaryDrawerOpen);
  };

  const genHrefAttribute = <T,>(city: T) => {
    let data =
      "text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(city));
    return "data:" + data;
  };
  const onLazChangeHandler = (event: SelectChangeEvent) => {
    const file = lazList.find((file) => file.name === event.target.value);
    if (file) {
      onLazChange(file);
    }
  };

  const tagLists = useMemo(() => {
    if (!tags) {
      return null;
    }
    return Object.keys(tags).map((keyName: any, i: any) => (
      <ListItem key={i}>
        <ListItemText
          primary={
            Array.isArray(tags[keyName])
              ? (tags[keyName] as Tag[])
                  .map((item: any) => item.description)
                  .join(", ")
              : (tags[keyName] as Tag)?.description || "-"
          }
          secondary={keyName}
        />
      </ListItem>
    ));
  }, [tags]);

  return (
    <>
      <StyledDrawer variant="permanent" open={open}>
        <Box sx={{ display: "flex", flex: 1 }}>
          <Box
            sx={{
              background: "white",
              display: open ? "flex" : "none",
              flexDirection: "column",
              flex: 1,
              width: DRAWER_WIDTH - 50,
              boxShadow: 1,
            }}
          >
            <Toolbar
              sx={{
                display: "flex",
                alignItems: "center",
                px: [1],
              }}
            >
              {/* <IconButton onClick={toggleSecondaryDrawer}>
                <MenuIcon />
              </IconButton> */}
              {open && "Building attributes"}
            </Toolbar>
            <Divider />
            <List dense={true}>
              {open && (
                <div
                  style={{
                    paddingLeft: "16px",
                    paddingRight: "16px",
                    paddingTop: "16px",
                  }}
                >
                  <div className="button">
                    {!geojsonFileContents.type ? (
                      <Typography gutterBottom>No file loaded</Typography>
                    ) : null}
                    <Button variant="contained" component="label">
                      LOAD GEOJSON
                      <input
                        hidden
                        accept=".geojson"
                        onChange={onFileSelectHandler}
                        type="file"
                      />
                    </Button>
                    <Typography>{fileName}</Typography>
                  </div>
                  <section style={{ marginTop: "16px" }}>
                    <Typography variant="h6" gutterBottom>
                      Download sample data
                    </Typography>
                    <Box
                      sx={{
                        display: "flex",
                        flexWrap: "wrap",
                        justifyContent: "center",
                        typography: "body1",
                        "& > :not(style) ~ :not(style)": {
                          ml: 2,
                        },
                      }}
                    >
                      <Link
                        href={genHrefAttribute(heritageTrail)}
                        download="heritageTrail.geojson"
                      >
                        Heritage Trail
                      </Link>
                    </Box>
                  </section>

                  <Divider variant="middle" />
                  <Paper
                    sx={{ flexBasis: "200px", padding: "9px", margin: "20px" }}
                  >
                    <Stack
                      direction={"row"}
                      spacing={0.5}
                      sx={{ minWidth: "200px", maxWidth: "calc(100vw - 80px)" }}
                    >
                      <Button onClick={drawLaz_}>Draw</Button>
                      <FormControl fullWidth size="small">
                        <InputLabel id="select-laz">Laz file</InputLabel>
                        <Select
                          labelId="select-laz"
                          value={lazFile?.name || ""}
                          label="Laz file"
                          onChange={onLazChangeHandler}
                        >
                          {lazList.map((file) => (
                            <MenuItem key={file.name} value={file.name}>
                              {file.name}
                            </MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                    </Stack>
                  </Paper>

                  <Divider variant="middle" />

                  <Box sx={{ mt: 4, mb: 4 }}>
                    <Typography id="input-slider" variant="h6" gutterBottom>
                      Statistiques
                    </Typography>
                    <MetricDisplay
                      value={landArea}
                      unit="m2"
                      label="Land Area"
                    />
                    <MetricDisplay
                      value={buildingArea}
                      unit="m2"
                      label="Building Area"
                    />
                    <MetricDisplay
                      value={buildingArea}
                      unit="m2"
                      label="Building Floor Area"
                    />
                    <MetricDisplay value={volume} unit="m3" label="Volume" />
                    <MetricDisplay
                      value={buildingHeight}
                      unit="m"
                      label="Building Height"
                    />
                  </Box>
                </div>
              )}
            </List>
          </Box>

          <Box
            onClick={toggleDrawer}
            sx={{
              alignSelf: "start",
              borderTopRightRadius: "5px",
              borderBottomRightRadius: "5px",
              marginTop: "20px",
              background: "white",
              boxShadow: 1,
            }}
          >
            {open ? <ChevronLeft /> : <ChevronRight />}
          </Box>
        </Box>
      </StyledDrawer>
      <SecondaryDrawer
        anchor="top" 
        variant="persistent"
        open={secondaryDrawerOpen}
        onClose={toggleSecondaryDrawer}
      >
        <Toolbar
          sx={{
            display: "flex",
            alignItems: "center",
            px: [1],
          }}
        >
          <IconButton onClick={toggleSecondaryDrawer}>
            <CloseIcon sx={{ color: "white" }} /> {/* Cross mark icon */}
          </IconButton>
        </Toolbar>
        <Divider />
        <List
          dense={true}
          sx={{
            marginLeft: "20px",
            display: "flex",
            flexDirection: "column",
            alignItems: "start",
          }}
        >
          <Link
            href={""}
            underline="none"
            sx={{ marginBottom: "10px", color: "white", fontWeight: 500 }}
          >
            Home
          </Link>
          <Link
            href={""}
            underline="none"
            sx={{ color: "white", fontWeight: 500, marginBottom: "40px" }}
          >
            Release notes
          </Link>

        <Stack spacing={2} direction="column" style={{marginBottom: "40px" }}>
              <Button
                component="label"
                variant="outlined"
                sx={{color:"white",borderColor:"white"}}
                startIcon={<CameraAlt />}
              >
                {previewImg ? "Take again" : "Take a picture"}{" "}
                <VisuallyHiddenInput
                  onChange={onImageChangeHandler}
                  sx={{color:"white",borderColor:"white"}}
                  type="file"
                  accept="image/*"
                  capture
                />
              </Button>
              <Button
                ref={fileInputRef}
                component="label"
                variant="outlined"
                sx={{color:"white",borderColor:"white"}}
                startIcon={<CloudUploadIcon />}
              >
                {previewImg ? "Upload again" : "Upload image"}{" "}
                <VisuallyHiddenInput
                  onChange={onImageChangeHandler}
                  type="file"
                  accept="image/*"
                />
              </Button>
   
              {previewImg && tags && (
                <Button
                  ref={metaDataBtnRef}
                  component="label"
                  variant="outlined"
                  sx={{color:"white",borderColor:"white"}}
                  startIcon={<DocumentScanner />}
                  onClick={toggleExtractedDrawer(true)}
                >
                  {"Metadata results"}
                </Button>
              )}
            </Stack>

          <Link
            href={""}
            underline="none"
            sx={{ color: "white", fontWeight: 500, marginBottom: "10px" }}
          >
            Change Password
          </Link>

          <Link
                      href={""}

          sx={{ color: "white" }} underline="none">
            CZ
          </Link>
          <Link 
                      href={""}

          sx={{ color: "white" }} underline="none">
            EN
          </Link>
          <Link 
                      href={""}

          sx={{ color: "white", marginBottom: "10px" }} underline="none">
            IT
          </Link>
          <Link
            href={""}
            underline="none"
            sx={{ color: "white", fontWeight: 500, marginBottom: "10px" }}
          >
            User Name
          </Link>
        </List>
        <Box
          sx={{
            display: "flex",
            flex: 1,
            width: SECONDARY_DRAWER_WIDTH,
            flexDirection: "column",
            justifyContent: "end",
            alignItems: "end",
            paddingBottom: "20px",
            paddingRight: "20px",
          }}
        >
          <Link
            href={""}
            underline="none"
            sx={{ color: "white", fontWeight: 600 }}
          >
            <LogoutRounded  sx={{ color: "white",fontSize:"20px" }} /> {/* Cross mark icon */}
            Logout
          </Link>
        </Box>
      </SecondaryDrawer>
      <Drawer
        anchor={"left"}
        variant="persistent"
        onClose={toggleExtractedDrawer(false)}
        open={extractedDrawerOpen}
      >
        <Toolbar
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "flex-end",
            px: [1],
          }}
        >
          Extracted Metadata
          <IconButton onClick={toggleExtractedDrawer(false)}>
            {<Close />}
          </IconButton>
        </Toolbar>
        <Divider />
        <List
          dense={true}
          sx={{ width: 300, maxWidth: 300, bgcolor: "background.paper" }}
        >
          {tagLists}
        </List>
      </Drawer>
    </>
  );
};
