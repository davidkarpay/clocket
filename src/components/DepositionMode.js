/**
 * Deposition Mode Component (Extracted for Testing)
 * Provides streamlined recording interface for depositions
 */

const { useState, useEffect, useRef } = require('react');

function DepositionMode() {
    const [isRecording, setIsRecording] = useState(false);
    const [isPaused, setIsPaused] = useState(false);
    const [duration, setDuration] = useState(0);
    const [audioBlob, setAudioBlob] = useState(null);
    const [recorder, setRecorder] = useState(null);
    const intervalRef = useRef(null);
    const startTimeRef = useRef(null);
    const pausedTimeRef = useRef(0);

    // Format duration for display
    const formatDuration = (seconds) => {
        const hrs = Math.floor(seconds / 3600);
        const mins = Math.floor((seconds % 3600) / 60);
        const secs = seconds % 60;
        if (hrs > 0) {
            return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
        }
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    // Start recording
    const startRecording = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const mediaRecorder = new MediaRecorder(stream);
            const chunks = [];

            mediaRecorder.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    chunks.push(event.data);
                }
            };

            mediaRecorder.onstop = () => {
                const blob = new Blob(chunks, { type: 'audio/webm' });
                setAudioBlob(blob);
                stream.getTracks().forEach(track => track.stop());
            };

            mediaRecorder.start();
            setRecorder(mediaRecorder);
            setIsRecording(true);
            setIsPaused(false);
            startTimeRef.current = Date.now();
            pausedTimeRef.current = 0;

            // Start duration timer
            intervalRef.current = setInterval(() => {
                setDuration(Math.floor((Date.now() - startTimeRef.current - pausedTimeRef.current) / 1000));
            }, 1000);

        } catch (error) {
            throw new Error('Failed to access microphone. Please check permissions.');
        }
    };

    // Pause/Resume recording
    const togglePause = () => {
        if (!recorder) return;

        if (isPaused) {
            // Resume
            recorder.resume();
            setIsPaused(false);
            startTimeRef.current = Date.now() - (duration * 1000);
            
            intervalRef.current = setInterval(() => {
                setDuration(Math.floor((Date.now() - startTimeRef.current - pausedTimeRef.current) / 1000));
            }, 1000);
        } else {
            // Pause
            recorder.pause();
            setIsPaused(true);
            clearInterval(intervalRef.current);
        }
    };

    // Stop recording
    const stopRecording = () => {
        if (recorder && recorder.state !== 'inactive') {
            recorder.stop();
        }
        setIsRecording(false);
        setIsPaused(false);
        setRecorder(null);
        clearInterval(intervalRef.current);
    };

    // Download audio file
    const downloadAudio = () => {
        if (!audioBlob) {
            throw new Error('No audio data available for download');
        }

        const url = URL.createObjectURL(audioBlob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `deposition-${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.webm`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    // Reset for new recording
    const reset = () => {
        setDuration(0);
        setAudioBlob(null);
        pausedTimeRef.current = 0;
    };

    // Get status info
    const getStatus = () => {
        if (!isRecording && !audioBlob) return { text: 'Ready', class: 'status-stopped' };
        if (isRecording && isPaused) return { text: 'Paused', class: 'status-paused' };
        if (isRecording) return { text: 'Recording', class: 'status-recording' };
        return { text: 'Completed', class: 'status-stopped' };
    };

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
            }
            if (recorder && recorder.state !== 'inactive') {
                recorder.stop();
            }
        };
    }, [recorder]);

    return {
        // State
        isRecording,
        isPaused,
        duration,
        audioBlob,
        // Actions
        startRecording,
        togglePause,
        stopRecording,
        downloadAudio,
        reset,
        // Utilities
        formatDuration,
        getStatus
    };
}

module.exports = { DepositionMode };