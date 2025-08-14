import React, { useState, useMemo } from 'react';
import { Dialog, DialogTitle, DialogContent, DialogActions, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, Button, TableSortLabel } from '@mui/material';
import axios from 'axios';

declare var route: any; // Assuming 'route' is globally available from Ziggy

interface ValidationResult {
  feature_index: number;
  properties: Record<string, any>;
  status: 'ok' | 'warning';
  details: string;
}

interface ValidationReportModalProps {
  open: boolean;
  onClose: () => void;
  results: ValidationResult[];
  geoJson: any; 
  onImportSuccess: () => void;
}

type Order = 'asc' | 'desc';

const ValidationReportModal = ({ open, onClose, results, geoJson, onImportSuccess }: ValidationReportModalProps) => {
  const [sortConfig, setSortConfig] = useState<{ key: keyof ValidationResult; direction: Order }>({ key: 'feature_index', direction: 'asc' });

  const handleSortRequest = (property: keyof ValidationResult) => {
    const isAsc = sortConfig.key === property && sortConfig.direction === 'asc';
    setSortConfig({ key: property, direction: isAsc ? 'desc' : 'asc' });
  };

  const isReadyToImport = results.length > 0 && results.every(r => r.status === 'ok');

  const handleImport = () => {
    if (!geoJson) {
      alert('Cannot import: GeoJSON data is missing.');
      return;
    }

    axios.post(route('data_map.import'), { geojson: geoJson })
      .then((response: { data: { message: string } }) => {
        alert(response.data.message);
        onImportSuccess();
        onClose();
      })
      .catch((error: any) => {
        const errorMessage = error.response?.data?.error || 'An unknown error occurred during import.';
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

      if (aValue < bValue) {
        return sortConfig.direction === 'asc' ? -1 : 1;
      }
      if (aValue > bValue) {
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
              </TableRow>
            </TableHead>
            <TableBody>
              {sortedResults.map((result, index) => (
                <TableRow key={index}>
                  <TableCell>{result.status === 'ok' ? '✅' : '⚠️'}</TableCell>
                  <TableCell>{result.feature_index}</TableCell>
                  <TableCell>{result.properties.osid || 'N/A'}</TableCell>
                  <TableCell>{result.details}</TableCell>
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