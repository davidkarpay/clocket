import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from '../components/App';

// Import actual utilities for integration testing
import { parseCSV, initializeRecordingStates } from '../utils/csvParser';
import { formatDuration } from '../utils/audioRecorder';

describe('Court Reporter Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock browser APIs
    global.MediaRecorder = jest.fn().mockImplementation(() => ({
      start: jest.fn(),
      stop: jest.fn(),
      ondataavailable: jest.fn(),
      onstop: jest.fn(),
      state: 'inactive'
    }));

    global.navigator.mediaDevices = {
      getUserMedia: jest.fn().mockResolvedValue({
        getTracks: () => [{ stop: jest.fn() }]
      })
    };

    global.URL.createObjectURL = jest.fn(() => 'mock-url');
    global.URL.revokeObjectURL = jest.fn();
    
    global.Blob = jest.fn().mockImplementation((content, options) => ({
      content,
      type: options?.type || 'text/plain',
      size: content?.length || 0
    }));

    global.document.createElement = jest.fn((tagName) => {
      if (tagName === 'a') {
        return {
          href: '',
          download: '',
          click: jest.fn()
        };
      }
      return {};
    });

    window.alert = jest.fn();
  });

  describe('Complete CSV Upload to Recording Workflow', () => {
    it('should handle complete workflow from CSV upload to recording', async () => {
      render(<App />);

      // Step 1: Verify initial state
      expect(screen.getByTestId('empty-state')).toBeInTheDocument();
      expect(screen.getByText('No hearings loaded')).toBeInTheDocument();

      // Step 2: Upload CSV file
      const csvContent = `Case Number,Client Name,Division,Time
123-2024,John Doe,Criminal,9:00 AM
456-2024,Jane Smith,Civil,10:30 AM`;

      const fileInput = screen.getByTestId('csv-upload-input');
      const file = new File([csvContent], 'hearings.csv', { type: 'text/csv' });

      // Mock FileReader for the upload
      const mockFileReader = {
        onload: null,
        readAsText: jest.fn(function() {
          setTimeout(() => {
            this.onload({ target: { result: csvContent } });
          }, 0);
        })
      };
      global.FileReader = jest.fn(() => mockFileReader);

      await userEvent.upload(fileInput, file);

      // Step 3: Verify hearings are loaded
      await waitFor(() => {
        expect(screen.getByTestId('hearings-grid')).toBeInTheDocument();
        expect(screen.queryByTestId('empty-state')).not.toBeInTheDocument();
      });

      // Verify hearing tiles are rendered with correct data
      const hearingTiles = screen.getAllByText(/Case:/);
      expect(hearingTiles).toHaveLength(2);
      
      expect(screen.getByText('123-2024')).toBeInTheDocument();
      expect(screen.getByText('John Doe')).toBeInTheDocument();
      expect(screen.getByText('456-2024')).toBeInTheDocument();
      expect(screen.getByText('Jane Smith')).toBeInTheDocument();

      // Step 4: Test recording functionality
      const startButtons = screen.getAllByText('🟢 Start');
      expect(startButtons).toHaveLength(2);

      // Start recording for first hearing
      fireEvent.click(startButtons[0]);

      await waitFor(() => {
        expect(global.navigator.mediaDevices.getUserMedia).toHaveBeenCalledWith({ audio: true });
        expect(global.MediaRecorder).toHaveBeenCalled();
      });

      // Step 5: Verify recording state updates
      const stopButtons = screen.getAllByText('🟥 Stop');
      expect(stopButtons[0]).not.toBeDisabled();
      expect(startButtons[0]).toBeDisabled();
    });
  });

  describe('Complete Recording to Transcript Workflow', () => {
    it('should handle complete workflow from recording to transcript generation', async () => {
      render(<App />);

      // Setup hearings
      const csvContent = `Case Number,Client Name,Division,Time
123-2024,John Doe,Criminal,9:00 AM`;

      const fileInput = screen.getByTestId('csv-upload-input');
      const file = new File([csvContent], 'hearings.csv', { type: 'text/csv' });

      const mockFileReader = {
        onload: null,
        readAsText: jest.fn(function() {
          setTimeout(() => {
            this.onload({ target: { result: csvContent } });
          }, 0);
        })
      };
      global.FileReader = jest.fn(() => mockFileReader);

      await userEvent.upload(fileInput, file);

      await waitFor(() => {
        expect(screen.getByTestId('hearings-grid')).toBeInTheDocument();
      });

      // Step 1: Start recording
      const startButton = screen.getByText('🟢 Start');
      
      let mockRecorder;
      global.MediaRecorder = jest.fn().mockImplementation(() => {
        mockRecorder = {
          start: jest.fn(),
          stop: jest.fn(),
          ondataavailable: jest.fn(),
          onstop: jest.fn(),
          state: 'recording'
        };
        return mockRecorder;
      });

      fireEvent.click(startButton);

      await waitFor(() => {
        expect(mockRecorder.start).toHaveBeenCalled();
      });

      // Step 2: Stop recording
      const stopButton = screen.getByText('🟥 Stop');
      fireEvent.click(stopButton);

      // Simulate recording stop with audio data
      const mockAudioBlob = new Blob(['audio data'], { type: 'audio/webm' });
      if (mockRecorder.onstop) {
        mockRecorder.onstop();
      }

      // Step 3: Generate transcript
      await waitFor(() => {
        const transcriptButton = screen.getByText('📄 Generate Transcript');
        expect(transcriptButton).not.toBeDisabled();
      });

      const transcriptButton = screen.getByText('📄 Generate Transcript');
      fireEvent.click(transcriptButton);

      // Step 4: Verify transcript processing
      await waitFor(() => {
        expect(screen.getByText('⏳ Processing transcript...')).toBeInTheDocument();
      });

      // Step 5: Wait for transcript completion (mock implementation has 2s delay)
      jest.useFakeTimers();
      jest.advanceTimersByTime(2000);
      jest.useRealTimers();

      await waitFor(() => {
        expect(screen.getByText('✓ Transcript ready')).toBeInTheDocument();
      });
    });
  });

  describe('Error Handling Workflows', () => {
    it('should handle invalid CSV upload gracefully', async () => {
      render(<App />);

      const invalidCsvContent = 'invalid,csv,content';
      const fileInput = screen.getByTestId('csv-upload-input');
      const file = new File([invalidCsvContent], 'invalid.csv', { type: 'text/csv' });

      const mockFileReader = {
        onload: null,
        readAsText: jest.fn(function() {
          setTimeout(() => {
            this.onload({ target: { result: invalidCsvContent } });
          }, 0);
        })
      };
      global.FileReader = jest.fn(() => mockFileReader);

      await userEvent.upload(fileInput, file);

      await waitFor(() => {
        expect(window.alert).toHaveBeenCalledWith(expect.stringContaining('Error parsing CSV:'));
      });

      // Should still show empty state
      expect(screen.getByTestId('empty-state')).toBeInTheDocument();
    });

    it('should handle microphone access errors', async () => {
      render(<App />);

      // Setup hearings first
      const csvContent = `Case Number,Client Name,Division,Time
123-2024,John Doe,Criminal,9:00 AM`;

      const fileInput = screen.getByTestId('csv-upload-input');
      const file = new File([csvContent], 'hearings.csv', { type: 'text/csv' });

      const mockFileReader = {
        onload: null,
        readAsText: jest.fn(function() {
          setTimeout(() => {
            this.onload({ target: { result: csvContent } });
          }, 0);
        })
      };
      global.FileReader = jest.fn(() => mockFileReader);

      await userEvent.upload(fileInput, file);

      await waitFor(() => {
        expect(screen.getByTestId('hearings-grid')).toBeInTheDocument();
      });

      // Mock microphone access denial
      global.navigator.mediaDevices.getUserMedia.mockRejectedValue(
        new Error('Permission denied')
      );

      const startButton = screen.getByText('🟢 Start');
      fireEvent.click(startButton);

      await waitFor(() => {
        expect(window.alert).toHaveBeenCalledWith('Error accessing microphone. Please check permissions.');
      });
    });
  });

  describe('Data Persistence and State Management', () => {
    it('should maintain independent state for multiple hearings', async () => {
      render(<App />);

      const csvContent = `Case Number,Client Name,Division,Time
123-2024,John Doe,Criminal,9:00 AM
456-2024,Jane Smith,Civil,10:30 AM`;

      const fileInput = screen.getByTestId('csv-upload-input');
      const file = new File([csvContent], 'hearings.csv', { type: 'text/csv' });

      const mockFileReader = {
        onload: null,
        readAsText: jest.fn(function() {
          setTimeout(() => {
            this.onload({ target: { result: csvContent } });
          }, 0);
        })
      };
      global.FileReader = jest.fn(() => mockFileReader);

      await userEvent.upload(fileInput, file);

      await waitFor(() => {
        expect(screen.getByTestId('hearings-grid')).toBeInTheDocument();
      });

      // Get notes textareas for both hearings
      const notesTextareas = screen.getAllByPlaceholderText('Add case notes here...');
      expect(notesTextareas).toHaveLength(2);

      // Add notes to first hearing
      await userEvent.type(notesTextareas[0], 'Notes for John Doe case');

      // Add different notes to second hearing
      await userEvent.type(notesTextareas[1], 'Notes for Jane Smith case');

      // Verify notes are independent
      expect(notesTextareas[0]).toHaveValue('Notes for John Doe case');
      expect(notesTextareas[1]).toHaveValue('Notes for Jane Smith case');

      // Verify both hearings maintain their status independently
      const statuses = screen.getAllByText('Ready to record');
      expect(statuses).toHaveLength(2);
    });
  });

  describe('Utility Function Integration', () => {
    it('should correctly parse and validate CSV data', () => {
      const csvContent = `Case Number,Client Name,Division,Time
123-2024,John Doe,Criminal,9:00 AM
456-2024,Jane Smith,Civil,10:30 AM`;

      const parsedData = parseCSV(csvContent);

      expect(parsedData).toHaveLength(2);
      expect(parsedData[0]).toMatchObject({
        'Case Number': '123-2024',
        'Client Name': 'John Doe',
        'Division': 'Criminal',
        'Time': '9:00 AM'
      });
      expect(parsedData[0]).toHaveProperty('id');
    });

    it('should correctly initialize recording states', () => {
      const hearings = [
        { id: '123-1', 'Case Number': '123-2024' },
        { id: '456-2', 'Case Number': '456-2024' }
      ];

      const recordings = initializeRecordingStates(hearings);

      expect(Object.keys(recordings)).toHaveLength(2);
      expect(recordings['123-1']).toMatchObject({
        isRecording: false,
        audioBlob: null,
        transcript: '',
        notes: '',
        duration: 0,
        status: 'ready'
      });
    });

    it('should correctly format duration', () => {
      expect(formatDuration(0)).toBe('0:00');
      expect(formatDuration(65)).toBe('1:05');
      expect(formatDuration(3661)).toBe('61:01');
    });
  });
});