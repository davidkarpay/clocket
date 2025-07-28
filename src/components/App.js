import React, { useState, useRef } from 'react';
import { parseCSV, initializeRecordingStates } from '../utils/csvParser';
import HearingTile from './HearingTile';

function App() {
  const [hearings, setHearings] = useState([]);
  const [recordings, setRecordings] = useState({});
  const fileInputRef = useRef(null);

  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target.result;
        const data = parseCSV(text);
        setHearings(data);
        
        const newRecordings = initializeRecordingStates(data);
        setRecordings(newRecordings);
      } catch (error) {
        alert(`Error parsing CSV: ${error.message}`);
      }
    };

    reader.readAsText(file);
  };

  const updateRecording = (hearingId, update) => {
    setRecordings(prev => ({
      ...prev,
      [hearingId]: { ...prev[hearingId], ...update }
    }));
  };

  return (
    <div className="app-container">
      <div className="header">
        <h1>Court Hearing Recorder</h1>
        <p>Record hearings, generate transcripts, and manage case notes - all locally</p>
      </div>
      
      <div className="file-upload">
        <h2>Upload Hearing Schedule (CSV)</h2>
        <p style={{marginBottom: '20px', color: '#7f8c8d'}}>
          Expected columns: Case Number, Client Name, Division, Time
        </p>
        <div className="file-input-wrapper">
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv"
            onChange={handleFileUpload}
            className="file-input"
            id="csv-upload"
            data-testid="csv-upload-input"
          />
          <label htmlFor="csv-upload" className="file-input-label">
            Choose CSV File
          </label>
        </div>
      </div>
      
      {hearings.length > 0 ? (
        <div className="hearings-grid" data-testid="hearings-grid">
          {hearings.map(hearing => (
            <HearingTile
              key={hearing.id}
              hearing={hearing}
              recording={recordings[hearing.id]}
              onUpdateRecording={(update) => updateRecording(hearing.id, update)}
            />
          ))}
        </div>
      ) : (
        <div className="empty-state" data-testid="empty-state">
          <h3>No hearings loaded</h3>
          <p>Upload a CSV file to get started</p>
        </div>
      )}
    </div>
  );
}

export default App;