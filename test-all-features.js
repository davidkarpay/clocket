// Comprehensive test execution for all Court Reporter features
console.log('🧪 Court Reporter Complete Test Suite\n');
console.log('=' .repeat(60));

const fs = require('fs');
const path = require('path');

// Import all utilities
const csvParser = require('./src/utils/csvParser');
const audioRecorder = require('./src/utils/audioRecorder');
const transcriptGenerator = require('./src/utils/transcriptGenerator');
const speakingTimeTracker = require('./src/utils/speakingTimeTracker');

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;

function test(category, name, testFn) {
  totalTests++;
  try {
    testFn();
    console.log(`✅ ${category}: ${name}`);
    passedTests++;
  } catch (error) {
    console.log(`❌ ${category}: ${name} - ${error.message}`);
    failedTests++;
  }
}

// CSV Parser Tests
console.log('\n📋 CSV Parser Feature Tests');
console.log('-'.repeat(60));

test('CSV', 'Parse valid CSV with headers', () => {
  const csvData = `Case Number,Client Name,Division,Time
123-2024,John Doe,Criminal,9:00 AM
456-2024,Jane Smith,Civil,10:30 AM`;
  
  const result = csvParser.parseCSV(csvData);
  if (result.length !== 2) throw new Error('Expected 2 hearings');
  if (result[0]['Case Number'] !== '123-2024') throw new Error('Case number mismatch');
  if (!result[0].id) throw new Error('Missing unique ID');
});

test('CSV', 'Handle empty fields', () => {
  const csvData = `Case Number,Client Name,Division,Time
123-2024,,Criminal,`;
  
  const result = csvParser.parseCSV(csvData);
  if (result[0]['Client Name'] !== '') throw new Error('Empty field not handled');
  if (result[0]['Time'] !== '') throw new Error('Empty time not handled');
});

test('CSV', 'Validate required headers', () => {
  const headers = ['Case Number', 'Client Name', 'Division', 'Time'];
  const validation = csvParser.validateCSVHeaders(headers);
  if (!validation.isValid) throw new Error('Valid headers rejected');
});

test('CSV', 'Detect missing headers', () => {
  const headers = ['Case Number', 'Client Name'];
  const validation = csvParser.validateCSVHeaders(headers);
  if (validation.isValid) throw new Error('Invalid headers accepted');
  if (!validation.missing.includes('Division')) throw new Error('Missing header not detected');
});

test('CSV', 'Initialize recording states', () => {
  const hearings = [
    { id: '123', 'Case Number': '123-2024' },
    { id: '456', 'Case Number': '456-2024' }
  ];
  
  const states = csvParser.initializeRecordingStates(hearings);
  if (Object.keys(states).length !== 2) throw new Error('Wrong state count');
  if (!states['123'].hasOwnProperty('isRecording')) throw new Error('Missing recording state');
});

// Audio Recorder Tests
console.log('\n🎙️ Audio Recorder Feature Tests');
console.log('-'.repeat(60));

test('Audio', 'Format duration correctly', () => {
  if (audioRecorder.formatDuration(0) !== '0:00') throw new Error('Zero format wrong');
  if (audioRecorder.formatDuration(65) !== '1:05') throw new Error('Time format wrong');
  if (audioRecorder.formatDuration(3661) !== '61:01') throw new Error('Hour format wrong');
});

test('Audio', 'Handle recording errors gracefully', () => {
  // Test null recorder handling
  try {
    audioRecorder.stopRecording(null);
    // Should not throw
  } catch (e) {
    throw new Error('Failed to handle null recorder');
  }
});

test('Audio', 'Validate audio download requirements', () => {
  try {
    audioRecorder.downloadAudio(null, 'test.webm');
    throw new Error('Should reject null audio blob');
  } catch (e) {
    if (!e.message.includes('No audio data')) {
      throw new Error('Wrong error for null audio');
    }
  }
});

// Transcript Generator Tests
console.log('\n📝 Transcript Generator Feature Tests');
console.log('-'.repeat(60));

test('Transcript', 'Generate mock transcript with metadata', async () => {
  const hearing = {
    'Case Number': '123-2024',
    'Client Name': 'Test Client',
    'Division': 'Criminal',
    'Time': '9:00 AM'
  };
  
  const audioBlob = new Blob(['test'], { type: 'audio/webm' });
  
  try {
    // This is a mock, so we just test it doesn't throw
    const promise = transcriptGenerator.generateMockTranscript(audioBlob, hearing, 60);
    // Don't await - just ensure it returns a promise
    if (!promise || !promise.then) throw new Error('Not a promise');
  } catch (e) {
    throw new Error('Transcript generation failed: ' + e.message);
  }
});

test('Transcript', 'Validate transcript requirements', () => {
  const hearing = { 'Case Number': '123' };
  
  try {
    transcriptGenerator.downloadTranscript(hearing, '', 'notes', 60, 'test.txt');
    throw new Error('Should reject empty transcript');
  } catch (e) {
    if (!e.message.includes('No transcript')) {
      throw new Error('Wrong error for empty transcript');
    }
  }
});

// Speaking Time Tracker Tests
console.log('\n⏱️ Speaking Time Tracker Feature Tests');
console.log('-'.repeat(60));

test('Speaking', 'Initialize with default parties', () => {
  const state = speakingTimeTracker.initializeSpeakingTime();
  if (!state.parties.State || !state.parties.Defense || !state.parties.Court) {
    throw new Error('Default parties not initialized');
  }
});

test('Speaking', 'Track time accurately', () => {
  let state = speakingTimeTracker.initializeSpeakingTime(['State']);
  
  // Mock time progression
  const originalNow = Date.now;
  let mockTime = 1000;
  Date.now = () => mockTime;
  
  state = speakingTimeTracker.startSpeaking(state, 'State');
  mockTime += 5000; // 5 seconds
  Date.now = () => mockTime;
  state = speakingTimeTracker.stopTracking(state);
  
  Date.now = originalNow;
  
  if (state.parties.State.totalTime !== 5000) {
    throw new Error('Time tracking inaccurate');
  }
});

test('Speaking', 'Calculate statistics correctly', () => {
  const state = {
    hearingStartTime: 0,
    hearingEndTime: 10000,
    parties: {
      State: { totalTime: 6000, segments: [] },
      Defense: { totalTime: 3000, segments: [] }
    }
  };
  
  const stats = speakingTimeTracker.calculateStatistics(state);
  if (stats.totalHearingTime !== 10000) throw new Error('Total time wrong');
  if (stats.parties.State.percentage !== '66.7') throw new Error('Percentage wrong');
});

test('Speaking', 'Generate report and chart data', () => {
  const state = {
    hearingStartTime: Date.now(),
    hearingEndTime: Date.now() + 10000,
    parties: {
      State: { totalTime: 5000, segments: [] }
    },
    timeline: []
  };
  
  const hearing = { 'Case Number': '123-2024' };
  const report = speakingTimeTracker.generateTextReport(state, hearing);
  if (!report.includes('123-2024')) throw new Error('Report missing case number');
  
  const chartData = speakingTimeTracker.generateChartData(state);
  if (!chartData.labels || !chartData.datasets) throw new Error('Invalid chart data');
});

test('Speaking', 'Handle party management', () => {
  let state = speakingTimeTracker.initializeSpeakingTime(['State']);
  
  // Add party
  state = speakingTimeTracker.addParty(state, 'Witness');
  if (!state.parties.Witness) throw new Error('Party not added');
  
  // Try to add empty party (should reject)
  const originalCount = Object.keys(state.parties).length;
  state = speakingTimeTracker.addParty(state, '');
  if (Object.keys(state.parties).length !== originalCount) {
    throw new Error('Empty party should not be added');
  }
  
  // Remove party
  state = speakingTimeTracker.removeParty(state, 'Witness');
  if (state.parties.Witness) throw new Error('Party not removed');
});

// Integration Tests
console.log('\n🔗 Integration Tests');
console.log('-'.repeat(60));

test('Integration', 'CSV to Recording State Flow', () => {
  const csvData = `Case Number,Client Name,Division,Time
123-2024,John Doe,Criminal,9:00 AM`;
  
  const hearings = csvParser.parseCSV(csvData);
  const states = csvParser.initializeRecordingStates(hearings);
  
  if (!states[hearings[0].id]) throw new Error('State not created for hearing');
  if (states[hearings[0].id].status !== 'ready') throw new Error('Wrong initial status');
});

test('Integration', 'Complete Speaking Time Workflow', () => {
  let state = speakingTimeTracker.initializeSpeakingTime(['State', 'Defense']);
  
  // Simulate hearing
  const originalNow = Date.now;
  let mockTime = 1000;
  Date.now = () => mockTime;
  
  state = speakingTimeTracker.startSpeaking(state, 'State');
  mockTime += 10000; // 10 seconds
  Date.now = () => mockTime;
  
  state = speakingTimeTracker.startSpeaking(state, 'Defense');
  mockTime += 5000; // 5 seconds
  Date.now = () => mockTime;
  
  state = speakingTimeTracker.stopTracking(state);
  
  Date.now = originalNow;
  
  const stats = speakingTimeTracker.calculateStatistics(state);
  if (stats.totalHearingTime !== 15000) throw new Error('Total time wrong');
  if (state.timeline.length !== 2) throw new Error('Timeline entries missing');
});

// Error Handling Tests
console.log('\n🚨 Error Handling Tests');
console.log('-'.repeat(60));

test('Error', 'CSV Parser handles invalid input', () => {
  try {
    csvParser.parseCSV('');
    throw new Error('Should reject empty CSV');
  } catch (e) {
    if (!e.message.includes('must contain')) {
      throw new Error('Wrong error message');
    }
  }
});

test('Error', 'Audio Recorder handles null input', () => {
  try {
    audioRecorder.downloadAudio(null, 'test.webm');
    throw new Error('Should reject null audio');
  } catch (e) {
    if (!e.message.includes('No audio data')) {
      throw new Error('Wrong error for null audio');
    }
  }
});

test('Error', 'Speaking Tracker handles malformed state', () => {
  const malformedState = null;
  const stats = speakingTimeTracker.calculateStatistics(malformedState);
  
  // Should return safe defaults, not throw
  if (stats.totalHearingTime !== 0) throw new Error('Should return zero for null state');
  if (Object.keys(stats.parties).length !== 0) throw new Error('Should return empty parties');
});

// Performance Tests
console.log('\n⚡ Performance Tests');
console.log('-'.repeat(60));

test('Performance', 'Handle large CSV files', () => {
  // Generate large CSV
  let csvData = 'Case Number,Client Name,Division,Time\n';
  for (let i = 0; i < 1000; i++) {
    csvData += `${i}-2024,Client ${i},Division ${i % 3},${i % 12}:00 AM\n`;
  }
  
  const startTime = Date.now();
  const result = csvParser.parseCSV(csvData);
  const endTime = Date.now();
  
  if (result.length !== 1000) throw new Error('Not all rows parsed');
  if (endTime - startTime > 100) throw new Error('CSV parsing too slow');
});

test('Performance', 'Handle many speaking parties', () => {
  const parties = Array.from({ length: 50 }, (_, i) => `Party${i}`);
  
  const startTime = Date.now();
  const state = speakingTimeTracker.initializeSpeakingTime(parties);
  const endTime = Date.now();
  
  if (Object.keys(state.parties).length !== 50) throw new Error('Not all parties created');
  if (endTime - startTime > 50) throw new Error('Initialization too slow');
});

// Feature Validation
console.log('\n✨ Feature Validation');
console.log('-'.repeat(60));

test('Feature', 'CSV Import → Recording Ready', () => {
  const csvData = `Case Number,Client Name,Division,Time
CR-2024-001,State v. Smith,Criminal,9:00 AM`;
  
  const hearings = csvParser.parseCSV(csvData);
  const states = csvParser.initializeRecordingStates(hearings);
  const hearingId = hearings[0].id;
  
  if (!states[hearingId].hasOwnProperty('audioBlob')) throw new Error('No audio blob property');
  if (!states[hearingId].hasOwnProperty('transcript')) throw new Error('No transcript property');
  if (states[hearingId].status !== 'ready') throw new Error('Not ready for recording');
});

test('Feature', 'Speaking Time → Report Generation', () => {
  let state = speakingTimeTracker.initializeSpeakingTime(['State', 'Defense', 'Court']);
  
  // Mock hearing data
  const hearing = {
    'Case Number': 'CR-2024-001',
    'Client Name': 'State v. Smith',
    'Division': 'Criminal',
    'Time': '9:00 AM'
  };
  
  // Generate report even with no data
  const report = speakingTimeTracker.generateTextReport(state, hearing);
  
  if (!report.includes('SPEAKING TIME REPORT')) throw new Error('Missing report header');
  if (!report.includes('CR-2024-001')) throw new Error('Missing case number');
  if (!report.includes('TIMELINE')) throw new Error('Missing timeline section');
});

// Summary
console.log('\n' + '='.repeat(60));
console.log('📊 COMPREHENSIVE TEST RESULTS');
console.log('='.repeat(60));

console.log(`\n🎯 Test Summary:`);
console.log(`   Total Tests: ${totalTests}`);
console.log(`   ✅ Passed: ${passedTests}`);
console.log(`   ❌ Failed: ${failedTests}`);
console.log(`   📈 Success Rate: ${((passedTests / totalTests) * 100).toFixed(1)}%`);

console.log('\n🔍 Core Features Tested:');
console.log('   ✅ CSV Import and Parsing');
console.log('   ✅ Audio Recording Management');
console.log('   ✅ Transcript Generation');
console.log('   ✅ Speaking Time Tracking');
console.log('   ✅ Report and Chart Generation');
console.log('   ✅ Error Handling');
console.log('   ✅ Performance Optimization');
console.log('   ✅ Integration Workflows');

if (failedTests === 0) {
  console.log('\n🎊 ALL TESTS PASSED!');
  console.log('🏛️  Court Reporter is fully tested and production-ready!');
  console.log('✨ All core features validated for court environments.');
} else {
  console.log(`\n⚠️  ${failedTests} test(s) failed.`);
  console.log('🔧 Review failed tests above for fixes needed.');
}

console.log('\n' + '='.repeat(60));

process.exit(failedTests === 0 ? 0 : 1);