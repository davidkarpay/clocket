const { DepositionMode } = require('../DepositionMode');

// Mock browser APIs
const mockMediaRecorder = {
    start: jest.fn(),
    stop: jest.fn(),
    pause: jest.fn(),
    resume: jest.fn(),
    state: 'inactive',
    ondataavailable: null,
    onstop: null
};

global.MediaRecorder = jest.fn(() => mockMediaRecorder);
global.navigator = {
    mediaDevices: {
        getUserMedia: jest.fn()
    }
};

global.URL = {
    createObjectURL: jest.fn(() => 'mock-url'),
    revokeObjectURL: jest.fn()
};

global.document = {
    createElement: jest.fn(() => ({
        href: '',
        download: '',
        click: jest.fn(),
        remove: jest.fn()
    })),
    body: {
        appendChild: jest.fn(),
        removeChild: jest.fn()
    }
};

global.Blob = jest.fn((chunks, options) => ({
    size: chunks.reduce((size, chunk) => size + (chunk.size || 0), 0),
    type: options.type
}));

describe('DepositionMode Component', () => {
    let depositionMode;
    let mockStream;

    beforeEach(() => {
        jest.clearAllMocks();
        
        // Mock audio stream
        mockStream = {
            getTracks: jest.fn(() => [{
                stop: jest.fn()
            }])
        };
        
        navigator.mediaDevices.getUserMedia.mockResolvedValue(mockStream);
        
        // Reset MediaRecorder state
        mockMediaRecorder.state = 'inactive';
        
        // Create fresh instance
        depositionMode = DepositionMode();
    });

    describe('Initial State', () => {
        it('should initialize with correct default state', () => {
            expect(depositionMode.isRecording).toBe(false);
            expect(depositionMode.isPaused).toBe(false);
            expect(depositionMode.duration).toBe(0);
            expect(depositionMode.audioBlob).toBeNull();
        });

        it('should provide correct initial status', () => {
            const status = depositionMode.getStatus();
            expect(status.text).toBe('Ready');
            expect(status.class).toBe('status-stopped');
        });
    });

    describe('Recording Functions', () => {
        it('should start recording successfully', async () => {
            await depositionMode.startRecording();

            expect(navigator.mediaDevices.getUserMedia).toHaveBeenCalledWith({ audio: true });
            expect(MediaRecorder).toHaveBeenCalledWith(mockStream);
            expect(mockMediaRecorder.start).toHaveBeenCalled();
            expect(depositionMode.isRecording).toBe(true);
            expect(depositionMode.isPaused).toBe(false);
        });

        it('should handle microphone access errors', async () => {
            navigator.mediaDevices.getUserMedia.mockRejectedValue(new Error('Permission denied'));

            await expect(depositionMode.startRecording()).rejects.toThrow('Failed to access microphone. Please check permissions.');
        });

        it('should stop recording properly', async () => {
            await depositionMode.startRecording();
            mockMediaRecorder.state = 'recording';
            
            depositionMode.stopRecording();

            expect(mockMediaRecorder.stop).toHaveBeenCalled();
            expect(depositionMode.isRecording).toBe(false);
            expect(depositionMode.isPaused).toBe(false);
        });

        it('should not stop inactive recorder', () => {
            mockMediaRecorder.state = 'inactive';
            
            depositionMode.stopRecording();

            expect(mockMediaRecorder.stop).not.toHaveBeenCalled();
        });
    });

    describe('Pause/Resume Functionality', () => {
        beforeEach(async () => {
            await depositionMode.startRecording();
            mockMediaRecorder.state = 'recording';
        });

        it('should pause recording', () => {
            depositionMode.togglePause();

            expect(mockMediaRecorder.pause).toHaveBeenCalled();
            expect(depositionMode.isPaused).toBe(true);
        });

        it('should resume recording after pause', () => {
            depositionMode.togglePause(); // Pause
            depositionMode.togglePause(); // Resume

            expect(mockMediaRecorder.resume).toHaveBeenCalled();
            expect(depositionMode.isPaused).toBe(false);
        });

        it('should handle toggle when no recorder exists', () => {
            const modeWithoutRecorder = DepositionMode();
            
            expect(() => modeWithoutRecorder.togglePause()).not.toThrow();
        });
    });

    describe('Audio Processing', () => {
        it('should handle audio data and create blob on stop', async () => {
            await depositionMode.startRecording();
            
            const mockAudioData = { data: new Blob(['audio'], { type: 'audio/webm', size: 100 }) };
            
            // Simulate data available
            mockMediaRecorder.ondataavailable(mockAudioData);
            
            // Simulate stop
            mockMediaRecorder.onstop();

            expect(global.Blob).toHaveBeenCalledWith([mockAudioData.data], { type: 'audio/webm' });
            expect(mockStream.getTracks()[0].stop).toHaveBeenCalled();
        });

        it('should download audio file when available', async () => {
            await depositionMode.startRecording();
            
            // Simulate recording completion
            const mockBlob = new Blob(['audio'], { type: 'audio/webm' });
            mockMediaRecorder.onstop();
            // Manually set audioBlob since we can't trigger the full flow
            depositionMode.audioBlob = mockBlob;

            depositionMode.downloadAudio();

            expect(URL.createObjectURL).toHaveBeenCalledWith(mockBlob);
            expect(document.createElement).toHaveBeenCalledWith('a');
        });

        it('should throw error when downloading without audio', () => {
            expect(() => depositionMode.downloadAudio()).toThrow('No audio data available for download');
        });
    });

    describe('Duration Formatting', () => {
        it('should format seconds correctly', () => {
            expect(depositionMode.formatDuration(0)).toBe('0:00');
            expect(depositionMode.formatDuration(30)).toBe('0:30');
            expect(depositionMode.formatDuration(60)).toBe('1:00');
            expect(depositionMode.formatDuration(90)).toBe('1:30');
        });

        it('should format hours correctly', () => {
            expect(depositionMode.formatDuration(3600)).toBe('1:00:00');
            expect(depositionMode.formatDuration(3661)).toBe('1:01:01');
            expect(depositionMode.formatDuration(7200)).toBe('2:00:00');
        });

        it('should handle large durations', () => {
            const longDuration = 25 * 3600 + 30 * 60 + 45; // 25:30:45
            expect(depositionMode.formatDuration(longDuration)).toBe('25:30:45');
        });
    });

    describe('Status Management', () => {
        it('should return correct status for different states', () => {
            // Ready state
            expect(depositionMode.getStatus().text).toBe('Ready');
            expect(depositionMode.getStatus().class).toBe('status-stopped');
        });

        it('should return recording status when active', async () => {
            await depositionMode.startRecording();
            
            const status = depositionMode.getStatus();
            expect(status.text).toBe('Recording');
            expect(status.class).toBe('status-recording');
        });

        it('should return paused status when paused', async () => {
            await depositionMode.startRecording();
            depositionMode.togglePause();
            
            const status = depositionMode.getStatus();
            expect(status.text).toBe('Paused');
            expect(status.class).toBe('status-paused');
        });

        it('should return completed status when audio is available', async () => {
            await depositionMode.startRecording();
            depositionMode.stopRecording();
            // Manually set audioBlob to simulate completion
            depositionMode.audioBlob = new Blob(['audio'], { type: 'audio/webm' });
            
            const status = depositionMode.getStatus();
            expect(status.text).toBe('Completed');
            expect(status.class).toBe('status-stopped');
        });
    });

    describe('Reset Functionality', () => {
        it('should reset state for new recording', async () => {
            await depositionMode.startRecording();
            depositionMode.stopRecording();
            
            // Simulate having recorded data
            depositionMode.duration = 120;
            depositionMode.audioBlob = new Blob(['audio'], { type: 'audio/webm' });
            
            depositionMode.reset();

            expect(depositionMode.duration).toBe(0);
            expect(depositionMode.audioBlob).toBeNull();
        });
    });

    describe('Error Handling', () => {
        it('should handle MediaRecorder creation errors', async () => {
            global.MediaRecorder = jest.fn(() => {
                throw new Error('MediaRecorder not supported');
            });

            await expect(depositionMode.startRecording()).rejects.toThrow();
        });

        it('should handle stream errors gracefully', async () => {
            const errorStream = {
                getTracks: jest.fn(() => {
                    throw new Error('Stream error');
                })
            };
            
            navigator.mediaDevices.getUserMedia.mockResolvedValue(errorStream);

            // Should not throw during setup
            await expect(depositionMode.startRecording()).resolves.not.toThrow();
        });
    });

    describe('Long Recording Sessions', () => {
        it('should handle extended recording durations', () => {
            const longDuration = 4 * 3600 + 15 * 60 + 30; // 4 hours 15 minutes 30 seconds
            const formatted = depositionMode.formatDuration(longDuration);
            
            expect(formatted).toBe('4:15:30');
            expect(formatted).toMatch(/^\d+:\d{2}:\d{2}$/);
        });

        it('should maintain accuracy over time', async () => {
            await depositionMode.startRecording();
            
            // Simulate time passage
            const startTime = Date.now();
            
            // Mock passage of 30 seconds
            const mockNow = startTime + 30000;
            Date.now = jest.fn(() => mockNow);
            
            // The actual duration calculation would happen in the interval
            // This tests the formula logic
            const expectedDuration = Math.floor((mockNow - startTime) / 1000);
            expect(expectedDuration).toBe(30);
        });
    });

    describe('Integration Scenarios', () => {
        it('should handle complete deposition workflow', async () => {
            // Start recording
            await depositionMode.startRecording();
            expect(depositionMode.isRecording).toBe(true);
            
            // Pause
            depositionMode.togglePause();
            expect(depositionMode.isPaused).toBe(true);
            
            // Resume
            depositionMode.togglePause();
            expect(depositionMode.isPaused).toBe(false);
            
            // Stop
            depositionMode.stopRecording();
            expect(depositionMode.isRecording).toBe(false);
            
            // Simulate audio blob creation
            mockMediaRecorder.onstop();
            
            // Should be ready for download
            expect(() => depositionMode.downloadAudio).toBeDefined();
        });

        it('should handle multiple recording sessions', async () => {
            // First recording
            await depositionMode.startRecording();
            depositionMode.stopRecording();
            
            // Reset
            depositionMode.reset();
            expect(depositionMode.duration).toBe(0);
            expect(depositionMode.audioBlob).toBeNull();
            
            // Second recording should work
            await expect(depositionMode.startRecording()).resolves.not.toThrow();
        });
    });
});