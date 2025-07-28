/**
 * Parses CSV file content and returns structured hearing data
 * @param {string} csvText - Raw CSV file content
 * @returns {Array} Array of hearing objects
 */
function parseCSV(csvText) {
  const rows = csvText.split('\n').filter(row => row.trim());
  if (rows.length < 2) {
    throw new Error('CSV must contain at least a header row and one data row');
  }
  
  const headers = rows[0].split(',').map(h => h.trim());
  
  const data = rows.slice(1).map((row, index) => {
    const values = row.split(',').map(v => v.trim());
    const hearing = {};
    
    headers.forEach((header, i) => {
      hearing[header] = values[i] || '';
    });
    
    // Generate unique ID
    hearing.id = `${hearing['Case Number']}-${Date.now()}-${Math.random()}`;
    
    return hearing;
  });
  
  return data;
}

/**
 * Validates CSV headers for required court hearing fields
 * @param {Array} headers - Array of header strings
 * @returns {Object} Validation result with isValid boolean and missing fields
 */
function validateCSVHeaders(headers) {
  const requiredHeaders = ['Case Number', 'Client Name', 'Division', 'Time'];
  const missing = requiredHeaders.filter(required => 
    !headers.some(header => header.toLowerCase().includes(required.toLowerCase()))
  );
  
  return {
    isValid: missing.length === 0,
    missing,
    found: headers
  };
}

/**
 * Creates initial recording state for hearings
 * @param {Array} hearings - Array of hearing objects
 * @returns {Object} Object with hearing IDs as keys and recording state as values
 */
function initializeRecordingStates(hearings) {
  const recordings = {};
  
  hearings.forEach(hearing => {
    recordings[hearing.id] = {
      isRecording: false,
      audioBlob: null,
      transcript: '',
      notes: '',
      duration: 0,
      status: 'ready'
    };
  });
  
  return recordings;
}

module.exports = {
  parseCSV,
  validateCSVHeaders,
  initializeRecordingStates
};