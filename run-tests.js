// Manual test runner to demonstrate test functionality
console.log('🧪 Running Court Reporter Tests...\n');

// Test CSV Parser
console.log('📊 Testing CSV Parser...');
const { parseCSV, validateCSVHeaders, initializeRecordingStates } = require('./src/utils/csvParser');

let passed = 0;
let failed = 0;

function test(name, testFn) {
  try {
    testFn();
    console.log(`✅ ${name}`);
    passed++;
  } catch (error) {
    console.log(`❌ ${name}: ${error.message}`);
    failed++;
  }
}

// CSV Parser Tests
test('parseCSV should parse valid CSV data correctly', () => {
  const csvData = `Case Number,Client Name,Division,Time
123-2024,John Doe,Criminal,9:00 AM
456-2024,Jane Smith,Civil,10:30 AM`;

  const result = parseCSV(csvData);
  
  if (result.length !== 2) throw new Error(`Expected 2 hearings, got ${result.length}`);
  if (result[0]['Case Number'] !== '123-2024') throw new Error('Case number mismatch');
  if (result[0]['Client Name'] !== 'John Doe') throw new Error('Client name mismatch');
  if (!result[0].id) throw new Error('Missing ID');
});

test('parseCSV should handle empty fields', () => {
  const csvData = `Case Number,Client Name,Division,Time
123-2024,,Criminal,`;

  const result = parseCSV(csvData);
  
  if (result[0]['Client Name'] !== '') throw new Error('Empty field not handled');
  if (result[0]['Time'] !== '') throw new Error('Empty field not handled');
});

test('parseCSV should throw error for invalid CSV', () => {
  const csvData = `Case Number,Client Name,Division,Time`;
  
  try {
    parseCSV(csvData);
    throw new Error('Should have thrown an error');
  } catch (error) {
    if (!error.message.includes('at least a header row and one data row')) {
      throw new Error('Wrong error message');
    }
  }
});

test('validateCSVHeaders should validate correct headers', () => {
  const headers = ['Case Number', 'Client Name', 'Division', 'Time'];
  const result = validateCSVHeaders(headers);
  
  if (!result.isValid) throw new Error('Headers should be valid');
  if (result.missing.length !== 0) throw new Error('No headers should be missing');
});

test('validateCSVHeaders should detect missing headers', () => {
  const headers = ['Case Number', 'Client Name'];
  const result = validateCSVHeaders(headers);
  
  if (result.isValid) throw new Error('Headers should be invalid');
  if (!result.missing.includes('Division')) throw new Error('Division should be missing');
  if (!result.missing.includes('Time')) throw new Error('Time should be missing');
});

test('initializeRecordingStates should create states for all hearings', () => {
  const hearings = [
    { id: '123-1', 'Case Number': '123-2024' },
    { id: '456-2', 'Case Number': '456-2024' }
  ];

  const result = initializeRecordingStates(hearings);
  
  if (Object.keys(result).length !== 2) throw new Error('Wrong number of recording states');
  if (!result['123-1']) throw new Error('Missing recording state for 123-1');
  if (result['123-1'].status !== 'ready') throw new Error('Wrong initial status');
  if (result['123-1'].isRecording !== false) throw new Error('Wrong initial recording state');
});

// Test Audio Recorder
console.log('\n🎤 Testing Audio Recorder...');
const { formatDuration } = require('./src/utils/audioRecorder');

test('formatDuration should format seconds correctly', () => {
  if (formatDuration(0) !== '0:00') throw new Error('0 seconds wrong');
  if (formatDuration(30) !== '0:30') throw new Error('30 seconds wrong');
  if (formatDuration(60) !== '1:00') throw new Error('60 seconds wrong');
  if (formatDuration(90) !== '1:30') throw new Error('90 seconds wrong');
  if (formatDuration(3661) !== '61:01') throw new Error('3661 seconds wrong');
});

test('formatDuration should pad seconds with leading zero', () => {
  if (formatDuration(5) !== '0:05') throw new Error('5 seconds not padded');
  if (formatDuration(65) !== '1:05') throw new Error('65 seconds not padded');
});

// Test Transcript Generator
console.log('\n📝 Testing Transcript Generator...');
const { generateMockTranscript, downloadTranscript } = require('./src/utils/transcriptGenerator');

test('generateMockTranscript should throw error for null audio blob', async () => {
  const mockHearing = { 'Case Number': '123-2024' };
  
  try {
    await generateMockTranscript(null, mockHearing, 60);
    throw new Error('Should have thrown an error');
  } catch (error) {
    if (!error.message.includes('No audio data available')) {
      throw new Error('Wrong error message');
    }
  }
});

test('downloadTranscript should throw error for null transcript', () => {
  const mockHearing = { 'Case Number': '123-2024' };
  
  try {
    downloadTranscript(mockHearing, null, 'notes', 60, 'test.txt');
    throw new Error('Should have thrown an error');
  } catch (error) {
    if (!error.message.includes('No transcript available')) {
      throw new Error('Wrong error message');
    }
  }
});

// Results
console.log(`\n📊 Test Results:`);
console.log(`✅ Passed: ${passed}`);
console.log(`❌ Failed: ${failed}`);
console.log(`📈 Total: ${passed + failed}`);

if (failed === 0) {
  console.log('\n🎉 All tests passed! The Court Reporter utilities are working correctly.');
} else {
  console.log('\n⚠️  Some tests failed. Check the implementation.');
}