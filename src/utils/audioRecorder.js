/**
 * Audio recording utilities for court hearings
 */

/**
 * Starts audio recording using MediaRecorder API
 * @param {Function} onDataAvailable - Callback when recording data is available
 * @param {Function} onStop - Callback when recording stops
 * @returns {Promise<MediaRecorder>} MediaRecorder instance
 */
async function startRecording(onDataAvailable, onStop) {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const mediaRecorder = new MediaRecorder(stream);
    const chunks = [];
    
    mediaRecorder.ondataavailable = (e) => {
      chunks.push(e.data);
      if (onDataAvailable) onDataAvailable(e);
    };
    
    mediaRecorder.onstop = () => {
      const blob = new Blob(chunks, { type: 'audio/webm' });
      stream.getTracks().forEach(track => track.stop());
      if (onStop) onStop(blob);
    };
    
    mediaRecorder.start();
    return mediaRecorder;
  } catch (error) {
    console.error('Error starting recording:', error);
    throw new Error('Failed to access microphone. Please check permissions.');
  }
}

/**
 * Stops audio recording
 * @param {MediaRecorder} recorder - MediaRecorder instance to stop
 */
function stopRecording(recorder) {
  if (recorder && recorder.state !== 'inactive') {
    recorder.stop();
  }
}

/**
 * Formats duration in seconds to MM:SS format
 * @param {number} seconds - Duration in seconds
 * @returns {string} Formatted duration string
 */
function formatDuration(seconds) {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

/**
 * Creates a download link for audio blob
 * @param {Blob} audioBlob - Audio blob to download
 * @param {string} filename - Filename for download
 */
function downloadAudio(audioBlob, filename) {
  if (!audioBlob) {
    throw new Error('No audio data available for download');
  }
  
  const url = URL.createObjectURL(audioBlob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

module.exports = {
  startRecording,
  stopRecording,
  formatDuration,
  downloadAudio
};