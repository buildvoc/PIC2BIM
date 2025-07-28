import { memo, useState } from 'react';
import "mapbox-gl/dist/mapbox-gl.css";
import { Head, usePage, } from '@inertiajs/react';
import type { PageProps } from '@/types';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import Accordion from '@mui/material/Accordion';
import AccordionSummary from '@mui/material/AccordionSummary';
import AccordionDetails from '@mui/material/AccordionDetails';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import Button from '@mui/material/Button';
import * as checkGeoJson from '@placemarkio/check-geojson';
import NhleViewer from './NhleViewer';

export function NhleLoader({ auth }: PageProps) {

  const [error, setError] = useState<string|null>(null);
  const [fileContent, setFileContent] = useState<string|null>(null);
  const [geoJsonKey, setGeoJsonKey] = useState<string>('');
  const [geoJson, setGeoJson] = useState<any>(null);

  const handleFileChange = (event: any) => {
    const file = event.target.files[0];
    if (!file) return;

    setError(null);

    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const content = JSON.parse(e.target?.result as string);
        
        if (content.type !== 'FeatureCollection' || !Array.isArray(content.features)) {
          setError('Invalid GeoJSON format. Expected FeatureCollection.');
          throw new Error('Invalid GeoJSON format. Expected FeatureCollection.');
        }
        setFileContent(content);
      } catch (err: any) {
        setError(`Error parsing GeoJSON: ${err.message}`);
        setFileContent(null);
      }
    };

    reader.onerror = () => {
      setError('Error reading file');
      setFileContent(null);
    };

    reader.readAsText(file);
  };

  const handleClick = () => {
    if (!fileContent) {
      setError('Invalid GeoJson file!');
      return;
    }

    try {
      const result = checkGeoJson.check(JSON.stringify(fileContent));
      setGeoJsonKey(geoJsonKey+1);
      setGeoJson(result);
    } catch (e: any) {
      console.log(e.issues);
      setError(e.issues);
    }
  }
  
  return (
    <>
      <Head title="Load and validate GeoJSON files" />
      <AuthenticatedLayout user={auth.user}>
        <>
          <Accordion style={{margin: 0}}>
            <AccordionSummary
              expandIcon={<ExpandMoreIcon />}
              aria-controls="panel1-content"
              id="panel1-header"
            >
              Load GeoJson file
            </AccordionSummary>
            <AccordionDetails>
              <div className='flex flex-col gap-4 md:flex-row'>
                <input type='file' placeholder="Select files" onChange={handleFileChange} accept='.geojson' />
                <Button size='small' variant="contained" onClick={handleClick}>Draw</Button>
              </div>
              {error && <p className='text-red-500'>{error}</p>}
            </AccordionDetails>
          </Accordion>

          <NhleViewer geoJsonKey={geoJsonKey} geoJson={geoJson} />
        </>
      </AuthenticatedLayout>
    </>
  );
}

export default memo(NhleLoader);