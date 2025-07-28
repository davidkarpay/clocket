import React, { useState, useEffect, useRef } from 'react';
import { startRecording, stopRecording, formatDuration, downloadAudio } from '../utils/audioRecorder';
import { generateMockTranscript, downloadTranscript } from '../utils/transcriptGenerator';

function HearingTile({ hearing, recording, onUpdateRecording }) {
  const [recorder, setRecorder] = useState(null);
  const [startTime, setStartTime] = useState(null);
  const intervalRef = useRef(null);

  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  const handleStartRecording = async () => {
    try {
      const mediaRecorder = await startRecording(
        null, // onDataAvailable
        (blob) => {
          onUpdateRecording({ 
            audioBlob: blob, 
            isRecording: false,
            status: 'recorded'
          });
        }
      );
      
      setRecorder(mediaRecorder);
      setStartTime(Date.now());
      onUpdateRecording({ isRecording: true, status: 'recording' });
      
      // Update duration every second
      intervalRef.current = setInterval(() => {
        const duration = Math.floor((Date.now() - startTime) / 1000);
        onUpdateRecording({ duration });
      }, 1000);
    } catch (error) {
      console.error('Error starting recording:', error);
      alert('Error accessing microphone. Please check permissions.');
    }
  };

  const handleStopRecording = () => {
    if (recorder) {
      stopRecording(recorder);
      setRecorder(null);
      clearInterval(intervalRef.current);
      
      const duration = Math.floor((Date.now() - startTime) / 1000);
      onUpdateRecording({ duration });
    }
  };

  const handleGenerateTranscript = async () => {
    if (!recording.audioBlob) return;
    
    onUpdateRecording({ status: 'processing' });
    
    try {
      const transcript = await generateMockTranscript(
        recording.audioBlob, 
        hearing, 
        recording.duration
      );
      
      onUpdateRecording({ 
        transcript,
        status: 'complete'
      });
    } catch (error) {
      console.error('Error generating transcript:', error);
      onUpdateRecording({ status: 'recorded' });
      alert('Error generating transcript.');
    }
  };

  const handleDownloadRecording = () => {
    try {
      downloadAudio(recording.audioBlob, `${hearing['Case Number']}_recording.webm`);
    } catch (error) {
      console.error('Error downloading recording:', error);
      alert('Error downloading recording.');
    }
  };

  const handleDownloadTranscript = () => {
    try {
      downloadTranscript(
        hearing,
        recording.transcript,
        recording.notes,
        recording.duration,
        `${hearing['Case Number']}_transcript.txt`
      );
    } catch (error) {
      console.error('Error downloading transcript:', error);
      alert('Error downloading transcript.');
    }
  };

  const getStatusClass = () => {
    switch (recording.status) {
      case 'recording': return 'recording';
      case 'processing': return 'processing';
      case 'complete': return 'complete';
      default: return '';
    }
  };

  return (
    <div 
      className={`hearing-tile ${recording.isRecording ? 'recording' : ''}`}
      data-testid={`hearing-tile-${hearing.id}`}
    >
      <div className="case-header">
        <div className="case-number" data-testid="case-number">
          {hearing['Case Number']}
        </div>
        <div className="client-name" data-testid="client-name">
          {hearing['Client Name']}
        </div>
        <div className="case-info">
          <span data-testid="division">📍 {hearing['Division']}</span>
          <span data-testid="time">🕐 {hearing['Time']}</span>
        </div>
      </div>
      
      <div className="controls">
        <button
          className="btn btn-start"
          onClick={handleStartRecording}
          disabled={recording.isRecording}
          data-testid="start-recording-btn"
        >
          🟢 Start
        </button>
        <button
          className="btn btn-stop"
          onClick={handleStopRecording}
          disabled={!recording.isRecording}
          data-testid="stop-recording-btn"
        >
          🟥 Stop
        </button>
        <button
          className="btn btn-transcript"
          onClick={handleGenerateTranscript}
          disabled={!recording.audioBlob || recording.status === 'processing'}
          data-testid="generate-transcript-btn"
        >
          📄 Generate Transcript
        </button>
        <button
          className="btn btn-download"
          onClick={handleDownloadRecording}
          disabled={!recording.audioBlob}
          data-testid="download-audio-btn"
        >
          💾 Audio
        </button>
        <button
          className="btn btn-download"
          onClick={handleDownloadTranscript}
          disabled={!recording.transcript}
          data-testid="download-transcript-btn"
        >
          📝 Text
        </button>
      </div>
      
      <div className={`status ${getStatusClass()}`} data-testid="status">
        {recording.isRecording && (
          <>
            🔴 Recording
            <span className="recording-time">
              {formatDuration(Math.floor((Date.now() - startTime) / 1000))}
            </span>
          </>
        )}
        {recording.status === 'processing' && '⏳ Processing transcript...'}
        {recording.status === 'recorded' && `✓ Recorded (${formatDuration(recording.duration)})`}
        {recording.status === 'complete' && '✓ Transcript ready'}
        {recording.status === 'ready' && 'Ready to record'}
      </div>
      
      <div className="notes-section">
        <label className="notes-label">✏️ Notes</label>
        <textarea
          className="notes-textarea"
          placeholder="Add case notes here..."
          value={recording.notes}
          onChange={(e) => onUpdateRecording({ notes: e.target.value })}
          data-testid="notes-textarea"
        />
      </div>
      
      {recording.transcript && (
        <div className="transcript-preview" data-testid="transcript-preview">
          <strong>Transcript Preview:</strong><br />
          {recording.transcript}
        </div>
      )}
    </div>
  );
}

export default HearingTile;