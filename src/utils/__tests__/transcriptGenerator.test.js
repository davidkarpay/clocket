const { generateMockTranscript, downloadTranscript } = require('../transcriptGenerator');

describe('transcriptGenerator', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset timers
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('generateMockTranscript', () => {
    const mockHearing = {
      'Case Number': '123-2024',
      'Client Name': 'John Doe',
      'Division': 'Criminal',
      'Time': '9:00 AM'
    };

    it('should generate transcript with hearing details', async () => {
      const audioBlob = new Blob(['audio data'], { type: 'audio/webm' });
      const duration = 300; // 5 minutes

      const transcriptPromise = generateMockTranscript(audioBlob, mockHearing, duration);
      
      // Fast-forward the setTimeout
      jest.advanceTimersByTime(2000);
      
      const result = await transcriptPromise;

      expect(result).toContain('123-2024');
      expect(result).toContain('John Doe');
      expect(result).toContain('Criminal');
      expect(result).toContain('9:00 AM');
      expect(result).toContain('5:00'); // Duration formatted
    });

    it('should simulate processing delay', async () => {
      const audioBlob = new Blob(['audio data'], { type: 'audio/webm' });
      
      const transcriptPromise = generateMockTranscript(audioBlob, mockHearing, 60);
      
      // Should not resolve immediately
      let resolved = false;
      transcriptPromise.then(() => { resolved = true; });
      
      // Advance by 1 second - should not be resolved yet
      jest.advanceTimersByTime(1000);
      await Promise.resolve(); // Allow microtasks to run
      expect(resolved).toBe(false);
      
      // Advance by another second - should now be resolved
      jest.advanceTimersByTime(1000);
      await Promise.resolve();
      expect(resolved).toBe(true);
    });

    it('should throw error for null audio blob', async () => {
      await expect(generateMockTranscript(null, mockHearing, 60))
        .rejects.toThrow('No audio data available for transcription');
    });

    it('should throw error for undefined audio blob', async () => {
      await expect(generateMockTranscript(undefined, mockHearing, 60))
        .rejects.toThrow('No audio data available for transcription');
    });

    it('should include mock transcript disclaimer', async () => {
      const audioBlob = new Blob(['audio data'], { type: 'audio/webm' });
      
      const transcriptPromise = generateMockTranscript(audioBlob, mockHearing, 60);
      jest.advanceTimersByTime(2000);
      const result = await transcriptPromise;

      expect(result).toContain('This is a mock transcript');
      expect(result).toContain('Whisper/Vosk model');
    });

    it('should format duration correctly in transcript', async () => {
      const audioBlob = new Blob(['audio data'], { type: 'audio/webm' });
      
      const transcriptPromise = generateMockTranscript(audioBlob, mockHearing, 125); // 2:05
      jest.advanceTimersByTime(2000);
      const result = await transcriptPromise;

      expect(result).toContain('Duration: 2:05');
    });
  });

  describe('downloadTranscript', () => {
    let mockAnchor;
    const mockHearing = {
      'Case Number': '123-2024',
      'Client Name': 'John Doe',
      'Division': 'Criminal',
      'Time': '9:00 AM'
    };

    beforeEach(() => {
      mockAnchor = {
        href: '',
        download: '',
        click: jest.fn()
      };
      document.createElement.mockReturnValue(mockAnchor);
    });

    it('should download transcript with complete case information', () => {
      const transcript = 'Mock transcript content';
      const notes = 'Important case notes';
      const duration = 300; // 5:00
      const filename = 'test-transcript.txt';

      downloadTranscript(mockHearing, transcript, notes, duration, filename);

      expect(URL.createObjectURL).toHaveBeenCalled();
      expect(document.createElement).toHaveBeenCalledWith('a');
      expect(mockAnchor.download).toBe(filename);
      expect(mockAnchor.click).toHaveBeenCalled();
      expect(URL.revokeObjectURL).toHaveBeenCalledWith('mock-url');
    });

    it('should include all hearing metadata in transcript file', () => {
      const transcript = 'Mock transcript';
      const notes = 'Test notes';
      const duration = 90; // 1:30

      downloadTranscript(mockHearing, transcript, notes, duration, 'test.txt');

      const blobCall = global.Blob.mock.calls[0];
      const content = blobCall[0][0];

      expect(content).toContain('Case: 123-2024');
      expect(content).toContain('Client: John Doe');
      expect(content).toContain('Division: Criminal');
      expect(content).toContain('Time: 9:00 AM');
      expect(content).toContain('Duration: 1:30');
      expect(content).toContain('TRANSCRIPT:\nMock transcript');
      expect(content).toContain('NOTES:\nTest notes');
    });

    it('should create blob with correct type', () => {
      downloadTranscript(mockHearing, 'transcript', 'notes', 60, 'test.txt');

      expect(global.Blob).toHaveBeenCalledWith(
        [expect.any(String)],
        { type: 'text/plain' }
      );
    });

    it('should throw error for null transcript', () => {
      expect(() => downloadTranscript(mockHearing, null, 'notes', 60, 'test.txt'))
        .toThrow('No transcript available for download');
    });

    it('should throw error for undefined transcript', () => {
      expect(() => downloadTranscript(mockHearing, undefined, 'notes', 60, 'test.txt'))
        .toThrow('No transcript available for download');
    });

    it('should throw error for empty transcript', () => {
      expect(() => downloadTranscript(mockHearing, '', 'notes', 60, 'test.txt'))
        .toThrow('No transcript available for download');
    });

    it('should handle empty notes gracefully', () => {
      downloadTranscript(mockHearing, 'transcript', '', 60, 'test.txt');

      const blobCall = global.Blob.mock.calls[0];
      const content = blobCall[0][0];

      expect(content).toContain('NOTES:\n'); // Empty notes section
      expect(mockAnchor.click).toHaveBeenCalled();
    });

    it('should clean up object URL after download', () => {
      downloadTranscript(mockHearing, 'transcript', 'notes', 60, 'test.txt');

      expect(URL.revokeObjectURL).toHaveBeenCalledWith('mock-url');
    });
  });
});