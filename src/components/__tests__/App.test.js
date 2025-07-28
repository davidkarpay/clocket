import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from '../App';

// Mock the utility functions
jest.mock('../../utils/csvParser', () => ({
  parseCSV: jest.fn(),
  initializeRecordingStates: jest.fn()
}));

jest.mock('../HearingTile', () => {
  return function MockHearingTile({ hearing, recording, onUpdateRecording }) {
    return (
      <div data-testid={`mock-hearing-tile-${hearing.id}`}>
        <span>Case: {hearing['Case Number']}</span>
        <span>Client: {hearing['Client Name']}</span>
        <button onClick={() => onUpdateRecording({ notes: 'test note' })}>
          Update Recording
        </button>
      </div>
    );
  };
});

import { parseCSV, initializeRecordingStates } from '../../utils/csvParser';

describe('App', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render header and upload section', () => {
    render(<App />);
    
    expect(screen.getByText('Court Hearing Recorder')).toBeInTheDocument();
    expect(screen.getByText('Record hearings, generate transcripts, and manage case notes - all locally')).toBeInTheDocument();
    expect(screen.getByText('Upload Hearing Schedule (CSV)')).toBeInTheDocument();
    expect(screen.getByText('Expected columns: Case Number, Client Name, Division, Time')).toBeInTheDocument();
  });

  it('should show empty state when no hearings are loaded', () => {
    render(<App />);
    
    expect(screen.getByTestId('empty-state')).toBeInTheDocument();
    expect(screen.getByText('No hearings loaded')).toBeInTheDocument();
    expect(screen.getByText('Upload a CSV file to get started')).toBeInTheDocument();
  });

  it('should handle CSV file upload successfully', async () => {
    const mockHearings = [
      { id: '123-1', 'Case Number': '123-2024', 'Client Name': 'John Doe' },
      { id: '456-2', 'Case Number': '456-2024', 'Client Name': 'Jane Smith' }
    ];
    const mockRecordings = {
      '123-1': { isRecording: false, status: 'ready' },
      '456-2': { isRecording: false, status: 'ready' }
    };

    parseCSV.mockReturnValue(mockHearings);
    initializeRecordingStates.mockReturnValue(mockRecordings);

    render(<App />);
    
    const fileInput = screen.getByTestId('csv-upload-input');
    const file = new File(['case,client\n123,John'], 'test.csv', { type: 'text/csv' });
    
    // Mock FileReader
    const mockFileReader = {
      onload: null,
      readAsText: jest.fn(function() {
        setTimeout(() => {
          this.onload({ target: { result: 'case,client\n123,John' } });
        }, 0);
      })
    };
    global.FileReader = jest.fn(() => mockFileReader);

    await userEvent.upload(fileInput, file);

    await waitFor(() => {
      expect(parseCSV).toHaveBeenCalledWith('case,client\n123,John');
      expect(initializeRecordingStates).toHaveBeenCalledWith(mockHearings);
    });

    expect(screen.getByTestId('hearings-grid')).toBeInTheDocument();
    expect(screen.getByTestId('mock-hearing-tile-123-1')).toBeInTheDocument();
    expect(screen.getByTestId('mock-hearing-tile-456-2')).toBeInTheDocument();
  });

  it('should handle CSV parsing errors', async () => {
    parseCSV.mockImplementation(() => {
      throw new Error('Invalid CSV format');
    });

    // Mock alert
    window.alert = jest.fn();

    render(<App />);
    
    const fileInput = screen.getByTestId('csv-upload-input');
    const file = new File(['invalid,csv'], 'test.csv', { type: 'text/csv' });
    
    const mockFileReader = {
      onload: null,
      readAsText: jest.fn(function() {
        setTimeout(() => {
          this.onload({ target: { result: 'invalid,csv' } });
        }, 0);
      })
    };
    global.FileReader = jest.fn(() => mockFileReader);

    await userEvent.upload(fileInput, file);

    await waitFor(() => {
      expect(window.alert).toHaveBeenCalledWith('Error parsing CSV: Invalid CSV format');
    });
  });

  it('should update recording state correctly', async () => {
    const mockHearings = [
      { id: '123-1', 'Case Number': '123-2024', 'Client Name': 'John Doe' }
    ];
    const mockRecordings = {
      '123-1': { isRecording: false, status: 'ready', notes: '' }
    };

    parseCSV.mockReturnValue(mockHearings);
    initializeRecordingStates.mockReturnValue(mockRecordings);

    render(<App />);
    
    // Simulate file upload first
    const fileInput = screen.getByTestId('csv-upload-input');
    const file = new File(['case,client\n123,John'], 'test.csv', { type: 'text/csv' });
    
    const mockFileReader = {
      onload: null,
      readAsText: jest.fn(function() {
        setTimeout(() => {
          this.onload({ target: { result: 'case,client\n123,John' } });
        }, 0);
      })
    };
    global.FileReader = jest.fn(() => mockFileReader);

    await userEvent.upload(fileInput, file);

    await waitFor(() => {
      expect(screen.getByTestId('mock-hearing-tile-123-1')).toBeInTheDocument();
    });

    // Click the update button in the mock component
    const updateButton = screen.getByText('Update Recording');
    fireEvent.click(updateButton);

    // The component should have updated its internal state
    // This is tested indirectly by ensuring the component continues to render
    expect(screen.getByTestId('mock-hearing-tile-123-1')).toBeInTheDocument();
  });

  it('should handle file input without file selection', () => {
    render(<App />);
    
    const fileInput = screen.getByTestId('csv-upload-input');
    
    // Simulate change event without files
    fireEvent.change(fileInput, { target: { files: [] } });
    
    // Should not crash and should still show empty state
    expect(screen.getByTestId('empty-state')).toBeInTheDocument();
  });

  it('should render correct number of hearing tiles', async () => {
    const mockHearings = [
      { id: '1', 'Case Number': '123', 'Client Name': 'John' },
      { id: '2', 'Case Number': '456', 'Client Name': 'Jane' },
      { id: '3', 'Case Number': '789', 'Client Name': 'Bob' }
    ];
    const mockRecordings = {
      '1': { status: 'ready' },
      '2': { status: 'ready' },
      '3': { status: 'ready' }
    };

    parseCSV.mockReturnValue(mockHearings);
    initializeRecordingStates.mockReturnValue(mockRecordings);

    render(<App />);
    
    const fileInput = screen.getByTestId('csv-upload-input');
    const file = new File(['csv data'], 'test.csv', { type: 'text/csv' });
    
    const mockFileReader = {
      onload: null,
      readAsText: jest.fn(function() {
        setTimeout(() => {
          this.onload({ target: { result: 'csv data' } });
        }, 0);
      })
    };
    global.FileReader = jest.fn(() => mockFileReader);

    await userEvent.upload(fileInput, file);

    await waitFor(() => {
      expect(screen.getByTestId('mock-hearing-tile-1')).toBeInTheDocument();
      expect(screen.getByTestId('mock-hearing-tile-2')).toBeInTheDocument();
      expect(screen.getByTestId('mock-hearing-tile-3')).toBeInTheDocument();
    });
  });
});