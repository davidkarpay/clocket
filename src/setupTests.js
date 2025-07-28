import '@testing-library/jest-dom';

// Mock MediaRecorder for testing
global.MediaRecorder = jest.fn().mockImplementation(() => ({
  start: jest.fn(),
  stop: jest.fn(),
  ondataavailable: jest.fn(),
  onstop: jest.fn(),
  state: 'inactive'
}));

// Mock getUserMedia
Object.defineProperty(global.navigator, 'mediaDevices', {
  value: {
    getUserMedia: jest.fn().mockResolvedValue({
      getTracks: () => [{ stop: jest.fn() }]
    })
  }
});

// Mock FileReader
global.FileReader = class FileReader {
  constructor() {
    this.onload = null;
    this.readAsText = jest.fn((file) => {
      setTimeout(() => {
        if (this.onload) {
          this.onload({ target: { result: file.content || '' } });
        }
      }, 0);
    });
  }
};

// Mock URL.createObjectURL and revokeObjectURL
global.URL = {
  ...global.URL,
  createObjectURL: jest.fn(() => 'mock-url'),
  revokeObjectURL: jest.fn()
};

// Mock Blob
global.Blob = jest.fn().mockImplementation((content, options) => ({
  content,
  type: options?.type || 'text/plain',
  size: content?.length || 0
}));

// Mock DOM methods for downloads
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