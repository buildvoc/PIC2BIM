import {
  Box,
  Button,
  Grid,
  List,
  ListItem,
  ListItemText,
  Modal,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableRow,
  Typography,
} from "@mui/material";

const infoStyle = {
  position: "absolute" as "absolute",
  top: "50%",
  left: "50%",
  transform: "translate(-50%, -50%)",
  width: 400,
  bgcolor: "background.paper",
  border: "2px solid #f5f5f5",
  overflow: "hidden",
  boxShadow: 24,
  maxHeight: "100vh",
  p: 4,
};

interface InfoModalProps {
  infoOpen: boolean;
  toggleInfo: () => void;
}

export const InfoModal = ({ infoOpen, toggleInfo }: InfoModalProps) => {
  return (
    <Modal
      open={infoOpen}
      onClose={toggleInfo}
      aria-labelledby="modal-modal-title"
      aria-describedby="modal-modal-description"
    >
      <Box sx={infoStyle}>
        <Box sx={{ maxHeight: "calc(100vh - 162px)", overflow: "auto" }}>
          <Typography id="modal-modal-title" variant="h6" component="h2">
            Identify building height from a photo
          </Typography>
          <Typography
            paragraph
            variant={"caption"}
            id="modal-modal-description"
            sx={{ mt: 2 }}
          >
            Building-Height is a system that can determine the attributes of
            historical buildings in England. The building part can be defined
            just by uploading a photo.
          </Typography>
          <Grid container spacing={2}>
            <Grid item xs={12} md={12}>
              <List dense={true}>
                <ListItem sx={{ paddingLeft: 0 }}>
                  <ListItemText
                    primary="1. Upload an image"
                    secondary={
                      "You can upload or capture from your camera with active GPS"
                    }
                  />
                </ListItem>
                <ListItem sx={{ paddingLeft: 0 }}>
                  <ListItemText
                    primary="2. Image metadata will be displayed"
                    secondary={
                      "Extracted metadata from the image you uploaded will be displayed"
                    }
                  />
                </ListItem>
                <ListItem sx={{ paddingLeft: 0 }}>
                  <ListItemText
                    primary="3. Building height will be identified"
                    secondary={
                      "The building height, map location of the building and its attributes will be displayed"
                    }
                  />
                </ListItem>
              </List>
            </Grid>
            <Grid item xs={12} md={12}>
              <Typography>3D Navigation</Typography>
              <TableContainer>
                <Table
                  sx={{ width: "100%" }}
                  aria-label="3D Navigation controlls"
                >
                  <TableBody>
                    <TableRow>
                      <TableCell>Pan</TableCell>
                      <TableCell>Mouse Left</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>Rotate</TableCell>
                      <TableCell>Mouse Right</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell></TableCell>
                      <TableCell>Shift + Mouse Left</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>Top-down Camera</TableCell>
                      <TableCell>T</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>Perspective Camera</TableCell>
                      <TableCell>P</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>Driver Camera</TableCell>
                      <TableCell>D</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>Recenter Camera</TableCell>
                      <TableCell>R</TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </TableContainer>
            </Grid>
          </Grid>
        </Box>
        <Button
          onClick={toggleInfo}
          sx={{ mt: 4, float: "right" }}
          variant="outlined"
        >
          Close
        </Button>
      </Box>
    </Modal>
  );
};
