import React, { useState, useMemo, useEffect } from 'react';
import { Dialog, DialogTitle, DialogContent, DialogActions, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, Button, TableSortLabel, Select, MenuItem, Chip } from '@mui/material';
import axios, { AxiosError } from 'axios';

declare var route: any; // Assuming 'route' is globally available from Ziggy

interface ValidationResult {
  feature_index: number;
  properties: Record<string, any>;
  status: 'ok' | 'warning' | 'duplicate' | 'overlap' | 'exact_match' | 'missing_osid' | 'missing_listentry';
  details: string;
  existing_osid?: string;
  existing_listentry?: string;
}

interface ValidationReportModalProps {
  open: boolean;
  onClose: () => void;
  results: ValidationResult[];
  geoJson: any; 
  onImportSuccess: () => void;
  schema: 'building' | 'site' | 'nhle' | 'buildingpart' | 'uprn' | 'land_registry_inspire' | 'osm_building_part' | 'osm_address' | 'osm_landuse_area' | 'epc_certificate' | '';
}

type Order = 'asc' | 'desc';

type FeatureAction = 'import' | 'update' | 'skip';

const ValidationReportModal = ({ open, onClose, results, geoJson, onImportSuccess, schema }: ValidationReportModalProps) => {
  const [sortConfig, setSortConfig] = useState<{ key: keyof ValidationResult; direction: Order }>({ key: 'feature_index', direction: 'asc' });
  const [featureActions, setFeatureActions] = useState<Record<number, FeatureAction>>({});

  useEffect(() => {
    if (results.length > 0) {
        const initialActions = results.reduce((acc: Record<number, FeatureAction>, result) => {
        acc[result.feature_index] = result.status === 'ok' ? 'import' : 'skip';
        return acc;
      }, {} as Record<number, FeatureAction>);
      setFeatureActions(initialActions);
    }
  }, [results]);

  const handleActionChange = (featureIndex: number, action: FeatureAction) => {
    setFeatureActions(prev => ({ ...prev, [featureIndex]: action }));
  };

  const handleSortRequest = (property: keyof ValidationResult) => {
    const isAsc = sortConfig.key === property && sortConfig.direction === 'asc';
    setSortConfig({ key: property, direction: isAsc ? 'desc' : 'asc' });
  };

  const isReadyToImport = useMemo(() => {
    return Object.values(featureActions).some(action => action === 'import' || action === 'update');
  }, [featureActions]);

  const handleImport = () => {
    if(schema === 'epc_certificate') {
      if(!geoJson || !geoJson.rows) {
        alert('Cannot import: EPC Certificate data is missing.');
        return;
      }
      const rowsToProcess = Object.entries(featureActions).map(([indexStr, action]) => {
        const rowIndex = parseInt(indexStr, 10);
        return {
          action,
          data: results[rowIndex].properties,
        };
      });

      const importUrl = route('data_map.importEpcCertificate');
      axios.post(importUrl, { rows: rowsToProcess })
        .then((response: { data: { message: string } }) => {
          alert(response.data.message);
          onImportSuccess();
          onClose();
        })
        .catch((error: AxiosError) => {
          const errorMessage = (error.response?.data as { error?: string })?.error || 'An unknown error occurred during import.';
          alert(`Import failed: ${errorMessage}`);
        });
        return;
    }

    if (!geoJson || !geoJson.features) {
      alert('Cannot import: GeoJSON data is missing.');
      return;
    }

    const featuresToProcess = Object.entries(featureActions).map(([indexStr, action]) => {
      const featureIndex = parseInt(indexStr, 10);
      return {
        action,
        feature: geoJson.features[featureIndex],
      };
    });

    const srid = geoJson.crs?.properties?.name ? parseInt(geoJson.crs.properties.name.split(':').pop() || '4326', 10) : 4326;

    let importUrl;
    switch (schema) {
      case 'building':
        importUrl = route('data_map.import_building');
        break;
      case 'site':
        importUrl = route('data_map.import_site');
        break;
      case 'nhle':
        importUrl = route('data_map.import_nhle');
        break;
      case 'buildingpart':
        importUrl = route('data_map.import_building_part');
        break;
      case 'uprn':
        importUrl = route('data_map.import_uprn');
        break;
      case 'land_registry_inspire':
        importUrl = route('data_map.import_land_registry_inspire');
        break;
      case 'osm_building_part':
        importUrl = route('data_map.import_osm_building_part');
        break;
      case 'osm_address':
        importUrl = route('data_map.import_osm_address');
        break;
      case 'osm_landuse_area':
        importUrl = route('data_map.import_osm_landuse_area');
        break;
      default:
        alert('Invalid schema selected');
        return;
    }

    axios.post(importUrl, { features: featuresToProcess, srid })
      .then((response: { data: { message: string } }) => {
        alert(response.data.message);
        onImportSuccess();
        onClose();
      })
        .catch((error: AxiosError) => {
            const errorMessage = (error.response?.data as { error?: string })?.error || 'An unknown error occurred during import.';
        alert(`Import failed: ${errorMessage}`);
      });
  };

  const downloadCsv = () => {
        const getIdHeader = () => {
      if (schema === 'nhle') return 'List Entry';
      if (schema === 'uprn') return 'UPRN';
      if (schema === 'land_registry_inspire') return 'GML ID';
      if (schema === 'osm_building_part') return 'OSM ID';
      if (schema === 'osm_address') return 'OSM ID';
      if (schema === 'osm_landuse_area') return 'OSM ID';
      return 'OSID';
    };
    
    const getIdValue = (properties: any) => {
      if (schema === 'nhle') return properties.listentry;
      if (schema === 'uprn') return properties.uprn;
      if (schema === 'land_registry_inspire') return properties.gml_id;
      if (schema === 'osm_building_part') return properties.osm_id;
      if (schema === 'osm_address') return properties.osm_id;
      if (schema === 'osm_landuse_area') return properties.osm_id;
      return properties.osid;
    };

    const idHeader = getIdHeader();
    const headers = `"Status","Feature Index","${idHeader}","Details"`;
    const sorted = sortedResults; // Use already sorted results
    const csvContent = sorted.map(r => {
      const idValue = getIdValue(r.properties);
      return `"${r.status}","${r.feature_index}","${idValue || 'N/A'}","${r.details.replace(/"/g, '""')}"`;
    }
    ).join('\n');

    const blob = new Blob([headers + '\n' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', 'validation_report.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const sortedResults = useMemo(() => {
    if (!results) return [];
    const sorted = [...results];
    sorted.sort((a, b) => {
      const key = sortConfig.key;
      let aValue = a[key];
      let bValue = b[key];

      if (key === 'properties') {
        const getIdValue = (properties: any) => {
          if (schema === 'nhle') return properties.listentry;
          if (schema === 'uprn') return properties.uprn;
          if (schema === 'land_registry_inspire') return properties.gml_id;
          if (schema === 'osm_building_part') return properties.osm_id;
          if (schema === 'osm_address') return properties.osm_id;
          if (schema === 'osm_landuse_area') return properties.osm_id;
          if (schema === 'epc_certificate') return properties.lmk_key;
          return properties.osid;
        };
        aValue = getIdValue(a.properties) || '';
        bValue = getIdValue(b.properties) || '';
      }

      const valA = aValue ?? '';
      const valB = bValue ?? '';

      if (valA < valB) {
        return sortConfig.direction === 'asc' ? -1 : 1;
      }
      if (valA > valB) {
        return sortConfig.direction === 'asc' ? 1 : -1;
      }
      return 0;
    });
    return sorted;
  }, [results, sortConfig]);

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="lg"
      fullWidth
      aria-labelledby="validation-report-dialog-title"
    >
      <DialogTitle id="validation-report-dialog-title">Import Preview</DialogTitle>
      <DialogContent dividers>
        <TableContainer component={Paper} sx={{ maxHeight: '60vh' }}>
          <Table stickyHeader aria-label="validation errors table">
            <TableHead>
              <TableRow>
                <TableCell sx={{ width: '10%' }}>
                  <TableSortLabel active={sortConfig.key === 'status'} direction={sortConfig.direction} onClick={() => handleSortRequest('status')}>Status</TableSortLabel>
                </TableCell>
                <TableCell sx={{ width: '10%' }}>
                  <TableSortLabel active={sortConfig.key === 'feature_index'} direction={sortConfig.direction} onClick={() => handleSortRequest('feature_index')}>Index</TableSortLabel>
                </TableCell>
                <TableCell sx={{ width: '20%' }}>
                  <TableSortLabel active={sortConfig.key === 'properties'} direction={sortConfig.direction} onClick={() => handleSortRequest('properties')}>
                    {(() => {
                      if (schema === 'nhle') return 'List Entry';
                      if (schema === 'uprn') return 'UPRN';
                      if (schema === 'land_registry_inspire') return 'GML ID';
                      if (schema === 'osm_building_part') return 'OSM ID';
                      if (schema === 'osm_address') return 'OSM ID';
                      if (schema === 'osm_landuse_area') return 'OSM ID';
                      if (schema === 'epc_certificate') return 'LMK Key';
                      return 'OSID';
                    })()}
                  </TableSortLabel>
                </TableCell>
                <TableCell>Details</TableCell>
                <TableCell sx={{ width: '15%' }}>Action</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {sortedResults.map((result) => (
                <TableRow key={result.feature_index}>
                  <TableCell>
                    {result.status === 'ok' && <Chip label="OK" color="success" size="small" />}
                    {result.status === 'duplicate' && <Chip label="Duplicate" color="warning" size="small" />}
                    {result.status === 'overlap' && <Chip label="Overlap" color="warning" size="small" />}
                    {result.status === 'exact_match' && <Chip label="Exact Match" color="warning" size="small" />}
                    {result.status === 'warning' && <Chip label="Warning" color="error" size="small" />}
                  </TableCell>
                  <TableCell>{result.feature_index + 1}</TableCell>
                  <TableCell>
                    {(() => {
                      if (schema === 'nhle') return result.properties.listentry;
                      if (schema === 'uprn') return result.properties.uprn;
                      if (schema === 'land_registry_inspire') return result.properties.gml_id;
                      if (schema === 'osm_building_part') return result.properties.osm_id;
                      if (schema === 'osm_address') return result.properties.osm_id;
                      if (schema === 'osm_landuse_area') return result.properties.osm_id;
                      if (schema === 'epc_certificate') return result.properties.lmk_key;
                      return result.properties.osid;
                    })() || 'N/A'}
                  </TableCell>
                  <TableCell>{result.details}</TableCell>
                  <TableCell>
                    {['duplicate', 'overlap', 'exact_match'].includes(result.status) ? (
                      <Select
                        value={featureActions[result.feature_index] || 'skip'}
                        onChange={(e) => handleActionChange(result.feature_index, e.target.value as FeatureAction)}
                        size="small"
                        variant="outlined"
                        fullWidth
                      >
                        {result.status === 'duplicate' ? (
                          <MenuItem value="update">Update Existing</MenuItem>
                        ) : (
                          <MenuItem value="import">Import Anyway</MenuItem>
                        )}
                        <MenuItem value="skip">Skip</MenuItem>
                      </Select>
                    ) : result.status === 'ok' ? (
                      <Chip label="Import" color="primary" size="small" />
                    ) : (
                      <Chip label="Skipped" size="small" />
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </DialogContent>
      <DialogActions>
        <Button onClick={downloadCsv}>Download CSV</Button>
        <Button onClick={onClose}>Cancel</Button>
        <Button 
          variant="contained" 
          color="primary" 
          onClick={handleImport} 
          disabled={!isReadyToImport}
        >
          Import
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ValidationReportModal;