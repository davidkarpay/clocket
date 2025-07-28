import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import HearingTile from '../HearingTile';

// Mock the utility functions
jest.mock('../../utils/audioRecorder', () => ({
  startRecording: jest.fn(),
  stopRecording: jest.fn(),
  formatDuration: jest.fn(),
  downloadAudio: jest.fn()
}));

jest.mock('../../utils/transcriptGenerator', () => ({
  generateMockTranscript: jest.fn(),
  downloadTranscript: jest.fn()
}));

import { startRecording, stopRecording, formatDuration, downloadAudio } from '../../utils/audioRecorder';
import { generateMockTranscript, downloadTranscript } from '../../utils/transcriptGenerator';

describe('HearingTile', () => {
  const mockHearing = {
    id: '123-test',
    'Case Number': '123-2024',
    'Client Name': 'John Doe',
    'Division': 'Criminal',
    'Time': '9:00 AM'
  };

  const mockRecording = {
    isRecording: false,
    audioBlob: null,
    transcript: '',
    notes: '',
    duration: 0,
    status: 'ready'
  };

  const mockOnUpdateRecording = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    formatDuration.mockImplementation((seconds) => {
      const mins = Math.floor(seconds / 60);
      const secs = seconds % 60;
      return `${mins}:${secs.toString().padStart(2, '0')}`;
    });
  });

  it('should render hearing information correctly', () => {
    render(
      <HearingTile 
        hearing={mockHearing} 
        recording={mockRecording} 
        onUpdateRecording={mockOnUpdateRecording} 
      />
    );

    expect(screen.getByTestId('case-number')).toHaveTextContent('123-2024');
    expect(screen.getByTestId('client-name')).toHaveTextContent('John Doe');
    expect(screen.getByTestId('division')).toHaveTextContent('📍 Criminal');
    expect(screen.getByTestId('time')).toHaveTextContent('🕐 9:00 AM');
  });

  it('should render all control buttons', () => {
    render(
      <HearingTile 
        hearing={mockHearing} 
        recording={mockRecording} 
        onUpdateRecording={mockOnUpdateRecording} 
      />
    );

    expect(screen.getByTestId('start-recording-btn')).toBeInTheDocument();
    expect(screen.getByTestId('stop-recording-btn')).toBeInTheDocument();
    expect(screen.getByTestId('generate-transcript-btn')).toBeInTheDocument();
    expect(screen.getByTestId('download-audio-btn')).toBeInTheDocument();
    expect(screen.getByTestId('download-transcript-btn')).toBeInTheDocument();
  });

  it('should show correct initial status', () => {
    render(
      <HearingTile 
        hearing={mockHearing} 
        recording={mockRecording} 
        onUpdateRecording={mockOnUpdateRecording} 
      />
    );

    expect(screen.getByTestId('status')).toHaveTextContent('Ready to record');
  });

  it('should handle start recording', async () => {
    const mockMediaRecorder = { id: 'mock-recorder' };
    startRecording.mockResolvedValue(mockMediaRecorder);

    render(
      <HearingTile 
        hearing={mockHearing} 
        recording={mockRecording} 
        onUpdateRecording={mockOnUpdateRecording} 
      />
    );

    const startButton = screen.getByTestId('start-recording-btn');
    fireEvent.click(startButton);

    await waitFor(() => {
      expect(startRecording).toHaveBeenCalledWith(
        null,
        expect.any(Function)
      );
      expect(mockOnUpdateRecording).toHaveBeenCalledWith({
        isRecording: true,
        status: 'recording'
      });
    });
  });

  it('should handle recording errors', async () => {
    startRecording.mockRejectedValue(new Error('Microphone access denied'));
    window.alert = jest.fn();

    render(
      <HearingTile 
        hearing={mockHearing} 
        recording={mockRecording} 
        onUpdateRecording={mockOnUpdateRecording} 
      />
    );

    const startButton = screen.getByTestId('start-recording-btn');
    fireEvent.click(startButton);

    await waitFor(() => {
      expect(window.alert).toHaveBeenCalledWith('Error accessing microphone. Please check permissions.');
    });
  });

  it('should handle stop recording', () => {
    const recordingState = { ...mockRecording, isRecording: true };
    
    render(
      <HearingTile 
        hearing={mockHearing} 
        recording={recordingState} 
        onUpdateRecording={mockOnUpdateRecording} 
      />
    );

    const stopButton = screen.getByTestId('stop-recording-btn');
    fireEvent.click(stopButton);

    expect(stopRecording).toHaveBeenCalled();
  });

  it('should handle transcript generation', async () => {
    const mockTranscript = 'Generated transcript content';
    generateMockTranscript.mockResolvedValue(mockTranscript);
    
    const recordingWithAudio = {
      ...mockRecording,
      audioBlob: new Blob(['audio'], { type: 'audio/webm' }),
      duration: 120
    };

    render(
      <HearingTile 
        hearing={mockHearing} 
        recording={recordingWithAudio} 
        onUpdateRecording={mockOnUpdateRecording} 
      />
    );

    const transcriptButton = screen.getByTestId('generate-transcript-btn');
    fireEvent.click(transcriptButton);

    expect(mockOnUpdateRecording).toHaveBeenCalledWith({ status: 'processing' });

    await waitFor(() => {
      expect(generateMockTranscript).toHaveBeenCalledWith(
        recordingWithAudio.audioBlob,
        mockHearing,
        120
      );
      expect(mockOnUpdateRecording).toHaveBeenCalledWith({
        transcript: mockTranscript,
        status: 'complete'
      });
    });
  });

  it('should handle transcript generation errors', async () => {
    generateMockTranscript.mockRejectedValue(new Error('Transcription failed'));
    window.alert = jest.fn();
    
    const recordingWithAudio = {
      ...mockRecording,
      audioBlob: new Blob(['audio'], { type: 'audio/webm' })
    };

    render(
      <HearingTile 
        hearing={mockHearing} 
        recording={recordingWithAudio} 
        onUpdateRecording={mockOnUpdateRecording} 
      />
    );

    const transcriptButton = screen.getByTestId('generate-transcript-btn');
    fireEvent.click(transcriptButton);

    await waitFor(() => {
      expect(window.alert).toHaveBeenCalledWith('Error generating transcript.');
      expect(mockOnUpdateRecording).toHaveBeenCalledWith({ status: 'recorded' });
    });
  });

  it('should handle audio download', () => {
    const recordingWithAudio = {
      ...mockRecording,
      audioBlob: new Blob(['audio'], { type: 'audio/webm' })
    };

    render(
      <HearingTile 
        hearing={mockHearing} 
        recording={recordingWithAudio} 
        onUpdateRecording={mockOnUpdateRecording} 
      />
    );

    const downloadButton = screen.getByTestId('download-audio-btn');
    fireEvent.click(downloadButton);

    expect(downloadAudio).toHaveBeenCalledWith(
      recordingWithAudio.audioBlob,
      '123-2024_recording.webm'
    );
  });

  it('should handle transcript download', () => {
    const recordingWithTranscript = {
      ...mockRecording,
      transcript: 'Mock transcript',
      notes: 'Test notes',
      duration: 180
    };

    render(
      <HearingTile 
        hearing={mockHearing} 
        recording={recordingWithTranscript} 
        onUpdateRecording={mockOnUpdateRecording} 
      />
    );

    const downloadButton = screen.getByTestId('download-transcript-btn');
    fireEvent.click(downloadButton);

    expect(downloadTranscript).toHaveBeenCalledWith(
      mockHearing,
      'Mock transcript',
      'Test notes',
      180,
      '123-2024_transcript.txt'
    );
  });

  it('should update notes correctly', async () => {
    render(
      <HearingTile 
        hearing={mockHearing} 
        recording={mockRecording} 
        onUpdateRecording={mockOnUpdateRecording} 
      />
    );

    const notesTextarea = screen.getByTestId('notes-textarea');
    await userEvent.type(notesTextarea, 'Important case notes');

    expect(mockOnUpdateRecording).toHaveBeenCalledWith({ notes: 'I' });
    expect(mockOnUpdateRecording).toHaveBeenCalledWith({ notes: 'Im' });
    // ... (called for each character)
  });

  it('should show transcript preview when available', () => {
    const recordingWithTranscript = {
      ...mockRecording,
      transcript: 'This is the transcript content'
    };

    render(
      <HearingTile 
        hearing={mockHearing} 
        recording={recordingWithTranscript} 
        onUpdateRecording={mockOnUpdateRecording} 
      />
    );

    const transcriptPreview = screen.getByTestId('transcript-preview');
    expect(transcriptPreview).toBeInTheDocument();
    expect(transcriptPreview).toHaveTextContent('This is the transcript content');
  });

  it('should disable/enable buttons based on recording state', () => {
    const recordingState = { ...mockRecording, isRecording: true };
    
    render(
      <HearingTile 
        hearing={mockHearing} 
        recording={recordingState} 
        onUpdateRecording={mockOnUpdateRecording} 
      />
    );

    expect(screen.getByTestId('start-recording-btn')).toBeDisabled();
    expect(screen.getByTestId('stop-recording-btn')).not.toBeDisabled();
  });

  it('should apply correct CSS classes based on status', () => {
    const { rerender } = render(
      <HearingTile 
        hearing={mockHearing} 
        recording={{ ...mockRecording, status: 'recording' }} 
        onUpdateRecording={mockOnUpdateRecording} 
      />
    );

    expect(screen.getByTestId('status')).toHaveClass('recording');

    rerender(
      <HearingTile 
        hearing={mockHearing} 
        recording={{ ...mockRecording, status: 'processing' }} 
        onUpdateRecording={mockOnUpdateRecording} 
      />
    );

    expect(screen.getByTestId('status')).toHaveClass('processing');

    rerender(
      <HearingTile 
        hearing={mockHearing} 
        recording={{ ...mockRecording, status: 'complete' }} 
        onUpdateRecording={mockOnUpdateRecording} 
      />
    );

    expect(screen.getByTestId('status')).toHaveClass('complete');
  });
});