const { parseCSV, validateCSVHeaders, initializeRecordingStates } = require('../csvParser');

describe('csvParser', () => {
  describe('parseCSV', () => {
    it('should parse valid CSV data correctly', () => {
      const csvData = `Case Number,Client Name,Division,Time
123-2024,John Doe,Criminal,9:00 AM
456-2024,Jane Smith,Civil,10:30 AM`;

      const result = parseCSV(csvData);

      expect(result).toHaveLength(2);
      expect(result[0]).toMatchObject({
        'Case Number': '123-2024',
        'Client Name': 'John Doe',
        'Division': 'Criminal',
        'Time': '9:00 AM'
      });
      expect(result[0]).toHaveProperty('id');
      expect(result[0].id).toContain('123-2024');
    });

    it('should handle empty CSV fields', () => {
      const csvData = `Case Number,Client Name,Division,Time
123-2024,,Criminal,
456-2024,Jane Smith,,10:30 AM`;

      const result = parseCSV(csvData);

      expect(result).toHaveLength(2);
      expect(result[0]['Client Name']).toBe('');
      expect(result[0]['Time']).toBe('');
      expect(result[1]['Division']).toBe('');
    });

    it('should trim whitespace from fields', () => {
      const csvData = `Case Number,Client Name,Division,Time
  123-2024  ,  John Doe  ,  Criminal  ,  9:00 AM  `;

      const result = parseCSV(csvData);

      expect(result[0]['Case Number']).toBe('123-2024');
      expect(result[0]['Client Name']).toBe('John Doe');
      expect(result[0]['Division']).toBe('Criminal');
      expect(result[0]['Time']).toBe('9:00 AM');
    });

    it('should filter out empty rows', () => {
      const csvData = `Case Number,Client Name,Division,Time
123-2024,John Doe,Criminal,9:00 AM

456-2024,Jane Smith,Civil,10:30 AM
   `;

      const result = parseCSV(csvData);

      expect(result).toHaveLength(2);
    });

    it('should throw error for invalid CSV (no data rows)', () => {
      const csvData = `Case Number,Client Name,Division,Time`;

      expect(() => parseCSV(csvData)).toThrow('CSV must contain at least a header row and one data row');
    });

    it('should throw error for empty CSV', () => {
      const csvData = '';

      expect(() => parseCSV(csvData)).toThrow('CSV must contain at least a header row and one data row');
    });

    it('should generate unique IDs for each hearing', () => {
      const csvData = `Case Number,Client Name,Division,Time
123-2024,John Doe,Criminal,9:00 AM
456-2024,Jane Smith,Civil,10:30 AM`;

      const result = parseCSV(csvData);

      expect(result[0].id).not.toBe(result[1].id);
      expect(result[0].id).toContain('123-2024');
      expect(result[1].id).toContain('456-2024');
    });
  });

  describe('validateCSVHeaders', () => {
    it('should validate correct headers', () => {
      const headers = ['Case Number', 'Client Name', 'Division', 'Time'];
      const result = validateCSVHeaders(headers);

      expect(result.isValid).toBe(true);
      expect(result.missing).toHaveLength(0);
      expect(result.found).toEqual(headers);
    });

    it('should detect missing required headers', () => {
      const headers = ['Case Number', 'Client Name'];
      const result = validateCSVHeaders(headers);

      expect(result.isValid).toBe(false);
      expect(result.missing).toContain('Division');
      expect(result.missing).toContain('Time');
      expect(result.found).toEqual(headers);
    });

    it('should handle case-insensitive header matching', () => {
      const headers = ['case number', 'CLIENT NAME', 'division', 'TIME'];
      const result = validateCSVHeaders(headers);

      expect(result.isValid).toBe(true);
      expect(result.missing).toHaveLength(0);
    });

    it('should handle partial header matching', () => {
      const headers = ['Case Num', 'Client Full Name', 'Court Division', 'Hearing Time'];
      const result = validateCSVHeaders(headers);

      expect(result.isValid).toBe(true);
      expect(result.missing).toHaveLength(0);
    });

    it('should allow additional headers', () => {
      const headers = ['Case Number', 'Client Name', 'Division', 'Time', 'Attorney', 'Notes'];
      const result = validateCSVHeaders(headers);

      expect(result.isValid).toBe(true);
      expect(result.missing).toHaveLength(0);
    });
  });

  describe('initializeRecordingStates', () => {
    it('should create recording states for all hearings', () => {
      const hearings = [
        { id: '123-2024-1', 'Case Number': '123-2024' },
        { id: '456-2024-2', 'Case Number': '456-2024' }
      ];

      const result = initializeRecordingStates(hearings);

      expect(Object.keys(result)).toHaveLength(2);
      expect(result['123-2024-1']).toMatchObject({
        isRecording: false,
        audioBlob: null,
        transcript: '',
        notes: '',
        duration: 0,
        status: 'ready'
      });
      expect(result['456-2024-2']).toMatchObject({
        isRecording: false,
        audioBlob: null,
        transcript: '',
        notes: '',
        duration: 0,
        status: 'ready'
      });
    });

    it('should handle empty hearings array', () => {
      const hearings = [];
      const result = initializeRecordingStates(hearings);

      expect(result).toEqual({});
    });

    it('should create independent recording states', () => {
      const hearings = [
        { id: '123-2024-1', 'Case Number': '123-2024' },
        { id: '456-2024-2', 'Case Number': '456-2024' }
      ];

      const result = initializeRecordingStates(hearings);

      // Modify one state
      result['123-2024-1'].isRecording = true;
      result['123-2024-1'].notes = 'Test note';

      // Other state should remain unchanged
      expect(result['456-2024-2'].isRecording).toBe(false);
      expect(result['456-2024-2'].notes).toBe('');
    });
  });
});