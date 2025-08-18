import React, { useState, useMemo, useEffect } from 'react';
import { Dialog, DialogTitle, DialogContent, DialogActions, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, Button, TableSortLabel, Select, MenuItem, Chip } from '@mui/material';
import axios, { AxiosError } from 'axios';

declare var route: any; // Assuming 'route' is globally available from Ziggy

interface ValidationResult {
  feature_index: number;
  properties: Record<string, any>;
    status: 'ok' | 'warning' | 'duplicate' | 'overlap' | 'exact_match';
  details: string;
  existing_osid?: string;
}

interface ValidationReportModalProps {
  open: boolean;
  onClose: () => void;
  results: ValidationResult[];
  geoJson: any; 
  onImportSuccess: () => void;
  schema: 'building' | 'site' | '';
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
    if (!geoJson || !geoJson.features) {
      alert('Cannot import: GeoJSON data is missing.');
      return;
    }

    const featuresToProcess = Object.entries(featureActions).map(([indexStr, action]) => {
      const featureIndex = parseInt(indexStr, 10);
      return {
        action,
        data: geoJson.features[featureIndex],
      };
    });

    const srid = geoJson.crs?.properties?.name ? parseInt(geoJson.crs.properties.name.split(':').pop() || '4326', 10) : 4326;

    const importUrl = schema === 'building' 
      ? route('data_map.import_building') 
      : route('data_map.import_site');

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
    const headers = '"Status","Feature Index","OSID","Details"';
    const sorted = sortedResults; // Use already sorted results
    const csvContent = sorted.map(r =>
      `"${r.status}","${r.feature_index}","${r.properties.osid || 'N/A'}","${r.details.replace(/"/g, '""')}"`
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
        aValue = a.properties.osid || '';
        bValue = b.properties.osid || '';
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
                  <TableSortLabel active={sortConfig.key === 'properties'} direction={sortConfig.direction} onClick={() => handleSortRequest('properties')}>OSID</TableSortLabel>
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
                  <TableCell>{result.properties.osid || 'N/A'}</TableCell>
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