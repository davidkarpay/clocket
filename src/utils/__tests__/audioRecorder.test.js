const { startRecording, stopRecording, formatDuration, downloadAudio } = require('../audioRecorder');

describe('audioRecorder', () => {
  beforeEach(() => {
    // Reset mocks before each test
    jest.clearAllMocks();
  });

  describe('startRecording', () => {
    it('should start recording successfully', async () => {
      const onDataAvailable = jest.fn();
      const onStop = jest.fn();

      const recorder = await startRecording(onDataAvailable, onStop);

      expect(navigator.mediaDevices.getUserMedia).toHaveBeenCalledWith({ audio: true });
      expect(MediaRecorder).toHaveBeenCalled();
      expect(recorder.start).toHaveBeenCalled();
    });

    it('should handle microphone access errors', async () => {
      navigator.mediaDevices.getUserMedia.mockRejectedValue(new Error('Permission denied'));

      await expect(startRecording()).rejects.toThrow('Failed to access microphone. Please check permissions.');
    });

    it('should set up event handlers correctly', async () => {
      const onDataAvailable = jest.fn();
      const onStop = jest.fn();

      const recorder = await startRecording(onDataAvailable, onStop);

      // Simulate data available event
      const mockEvent = { data: new Blob(['test'], { type: 'audio/webm' }) };
      recorder.ondataavailable(mockEvent);
      expect(onDataAvailable).toHaveBeenCalledWith(mockEvent);

      // Simulate stop event
      recorder.onstop();
      expect(onStop).toHaveBeenCalledWith(expect.any(Blob));
    });

    it('should stop stream tracks when recording stops', async () => {
      const mockTrack = { stop: jest.fn() };
      navigator.mediaDevices.getUserMedia.mockResolvedValue({
        getTracks: () => [mockTrack]
      });

      const onStop = jest.fn();
      const recorder = await startRecording(null, onStop);

      // Simulate stop event
      recorder.onstop();

      expect(mockTrack.stop).toHaveBeenCalled();
    });

    it('should create blob with correct type when stopping', async () => {
      const onStop = jest.fn();
      const recorder = await startRecording(null, onStop);

      // Mock chunks data
      const chunks = [new Blob(['chunk1']), new Blob(['chunk2'])];
      recorder.ondataavailable({ data: chunks[0] });
      recorder.ondataavailable({ data: chunks[1] });

      recorder.onstop();

      expect(global.Blob).toHaveBeenCalledWith(chunks, { type: 'audio/webm' });
      expect(onStop).toHaveBeenCalledWith(expect.any(Object));
    });
  });

  describe('stopRecording', () => {
    it('should stop active recorder', () => {
      const mockRecorder = {
        state: 'recording',
        stop: jest.fn()
      };

      stopRecording(mockRecorder);

      expect(mockRecorder.stop).toHaveBeenCalled();
    });

    it('should not stop inactive recorder', () => {
      const mockRecorder = {
        state: 'inactive',
        stop: jest.fn()
      };

      stopRecording(mockRecorder);

      expect(mockRecorder.stop).not.toHaveBeenCalled();
    });

    it('should handle null recorder', () => {
      expect(() => stopRecording(null)).not.toThrow();
    });

    it('should handle undefined recorder', () => {
      expect(() => stopRecording(undefined)).not.toThrow();
    });
  });

  describe('formatDuration', () => {
    it('should format seconds correctly', () => {
      expect(formatDuration(0)).toBe('0:00');
      expect(formatDuration(30)).toBe('0:30');
      expect(formatDuration(60)).toBe('1:00');
      expect(formatDuration(90)).toBe('1:30');
      expect(formatDuration(3661)).toBe('61:01');
    });

    it('should pad seconds with leading zero', () => {
      expect(formatDuration(5)).toBe('0:05');
      expect(formatDuration(65)).toBe('1:05');
    });

    it('should handle large durations', () => {
      expect(formatDuration(7200)).toBe('120:00'); // 2 hours
      expect(formatDuration(7265)).toBe('121:05'); // 2 hours 1 minute 5 seconds
    });
  });

  describe('downloadAudio', () => {
    let mockAnchor;

    beforeEach(() => {
      mockAnchor = {
        href: '',
        download: '',
        click: jest.fn()
      };
      document.createElement.mockReturnValue(mockAnchor);
    });

    it('should download audio blob successfully', () => {
      const audioBlob = new Blob(['audio data'], { type: 'audio/webm' });
      const filename = 'test-recording.webm';

      downloadAudio(audioBlob, filename);

      expect(URL.createObjectURL).toHaveBeenCalledWith(audioBlob);
      expect(document.createElement).toHaveBeenCalledWith('a');
      expect(mockAnchor.href).toBe('mock-url');
      expect(mockAnchor.download).toBe(filename);
      expect(mockAnchor.click).toHaveBeenCalled();
      expect(URL.revokeObjectURL).toHaveBeenCalledWith('mock-url');
    });

    it('should throw error for null audio blob', () => {
      expect(() => downloadAudio(null, 'test.webm')).toThrow('No audio data available for download');
    });

    it('should throw error for undefined audio blob', () => {
      expect(() => downloadAudio(undefined, 'test.webm')).toThrow('No audio data available for download');
    });

    it('should clean up object URL after download', () => {
      const audioBlob = new Blob(['audio data'], { type: 'audio/webm' });

      downloadAudio(audioBlob, 'test.webm');

      expect(URL.revokeObjectURL).toHaveBeenCalledWith('mock-url');
    });
  });
});