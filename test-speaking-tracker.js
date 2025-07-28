// Test the Speaking Time Tracker feature
console.log('🎭 Testing Speaking Time Tracker Feature...\n');

const {
  initializeSpeakingTime,
  startSpeaking,
  stopTracking,
  calculateStatistics,
  formatTime,
  generateTextReport,
  generateChartData,
  addParty,
  removeParty
} = require('./src/utils/speakingTimeTracker');

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

async function runSpeakingTrackerTests() {
  console.log('🔄 Testing Speaking Time Tracker Workflow...\n');

  // Test 1: Initialization
  console.log('📋 Step 1: Initialization');
  test('initializeSpeakingTime should create default parties', () => {
    const state = initializeSpeakingTime();
    
    if (!state.parties.State) throw new Error('State party not initialized');
    if (!state.parties.Defense) throw new Error('Defense party not initialized');
    if (!state.parties.Court) throw new Error('Court party not initialized');
    if (state.isActive !== false) throw new Error('Should not be active initially');
    if (state.currentSpeaker !== null) throw new Error('Should have no current speaker');
  });

  test('initializeSpeakingTime should create custom parties', () => {
    const customParties = ['Plaintiff', 'Defendant', 'Judge', 'Witness'];
    const state = initializeSpeakingTime(customParties);
    
    customParties.forEach(party => {
      if (!state.parties[party]) throw new Error(`${party} not initialized`);
      if (state.parties[party].totalTime !== 0) throw new Error(`${party} totalTime not zero`);
      if (state.parties[party].segments.length !== 0) throw new Error(`${party} segments not empty`);
    });
  });

  // Test 2: Speaking Time Tracking
  console.log('\n⏱️  Step 2: Speaking Time Tracking');
  test('startSpeaking should track first speaker', () => {
    const state = initializeSpeakingTime(['State', 'Defense']);
    const newState = startSpeaking(state, 'State');
    
    if (newState.currentSpeaker !== 'State') throw new Error('Current speaker not set');
    if (!newState.isActive) throw new Error('Should be active');
    if (!newState.hearingStartTime) throw new Error('Hearing start time not set');
    if (!newState.startTime) throw new Error('Start time not set');
  });

  test('startSpeaking should switch speakers and calculate time', () => {
    let state = initializeSpeakingTime(['State', 'Defense']);
    
    // Mock time for predictable testing
    const originalNow = Date.now;
    let mockTime = 1000;
    Date.now = () => mockTime;
    
    // Start with State
    state = startSpeaking(state, 'State');
    const stateStartTime = mockTime;
    
    // Advance time by 5 seconds and switch to Defense
    mockTime += 5000;
    state = startSpeaking(state, 'Defense');
    
    if (state.currentSpeaker !== 'Defense') throw new Error('Speaker not switched');
    if (state.parties.State.totalTime !== 5000) throw new Error('State time not calculated correctly');
    if (state.parties.State.segments.length !== 1) throw new Error('State segment not recorded');
    if (state.timeline.length !== 1) throw new Error('Timeline not updated');
    
    // Restore original Date.now
    Date.now = originalNow;
  });

  // Test 3: Time Calculation and Statistics
  console.log('\n📊 Step 3: Time Calculation and Statistics');
  test('calculateStatistics should provide accurate statistics', () => {
    const state = {
      hearingStartTime: 0,
      hearingEndTime: 10000, // 10 seconds
      parties: {
        State: { totalTime: 6000, segments: [{ duration: 3000 }, { duration: 3000 }] },
        Defense: { totalTime: 3000, segments: [{ duration: 3000 }] },
        Court: { totalTime: 0, segments: [] }
      }
    };
    
    const stats = calculateStatistics(state);
    
    if (stats.totalHearingTime !== 10000) throw new Error('Total hearing time incorrect');
    if (stats.totalSpeakingTime !== 9000) throw new Error('Total speaking time incorrect');
    if (stats.silenceTime !== 1000) throw new Error('Silence time incorrect');
    if (stats.parties.State.percentage !== '66.7') throw new Error('State percentage incorrect');
    if (stats.parties.Defense.percentage !== '33.3') throw new Error('Defense percentage incorrect');
    if (stats.parties.State.segmentCount !== 2) throw new Error('State segment count incorrect');
    if (stats.parties.State.averageSegmentTime !== 3000) throw new Error('State average segment time incorrect');
  });

  test('formatTime should format milliseconds correctly', () => {
    if (formatTime(0) !== '0:00') throw new Error('0ms format wrong');
    if (formatTime(30000) !== '0:30') throw new Error('30s format wrong');
    if (formatTime(90000) !== '1:30') throw new Error('1:30 format wrong');
    if (formatTime(3600000) !== '1:00:00') throw new Error('1 hour format wrong');
    if (formatTime(3661000) !== '1:01:01') throw new Error('1:01:01 format wrong');
  });

  // Test 4: Report Generation
  console.log('\n📄 Step 4: Report Generation');
  test('generateTextReport should create comprehensive report', () => {
    const state = {
      hearingStartTime: new Date('2024-01-15T09:00:00').getTime(),
      hearingEndTime: new Date('2024-01-15T09:10:00').getTime(),
      parties: {
        State: { totalTime: 300000, segments: [{ duration: 300000 }] }, // 5 minutes
        Defense: { totalTime: 180000, segments: [{ duration: 90000 }, { duration: 90000 }] } // 3 minutes
      },
      timeline: [
        { party: 'State', start: 0, end: 300000, duration: 300000 },
        { party: 'Defense', start: 300000, end: 390000, duration: 90000 },
        { party: 'Defense', start: 390000, end: 480000, duration: 90000 }
      ]
    };
    
    const hearing = {
      'Case Number': '123-2024',
      'Client Name': 'John Doe',
      'Division': 'Criminal'
    };
    
    const report = generateTextReport(state, hearing);
    
    if (!report.includes('SPEAKING TIME REPORT')) throw new Error('Report header missing');
    if (!report.includes('Case: 123-2024')) throw new Error('Case number missing');
    if (!report.includes('Client: John Doe')) throw new Error('Client name missing');
    if (!report.includes('Division: Criminal')) throw new Error('Division missing');
    if (!report.includes('Total Hearing Duration: 10:00')) throw new Error('Total duration wrong');
    if (!report.includes('State:')) throw new Error('State section missing');
    if (!report.includes('Defense:')) throw new Error('Defense section missing');
    if (!report.includes('TIMELINE')) throw new Error('Timeline section missing');
  });

  test('generateChartData should create chart-ready data', () => {
    const state = {
      hearingStartTime: 0,
      hearingEndTime: 10000,
      parties: {
        State: { totalTime: 6000, segments: [] },
        Defense: { totalTime: 4000, segments: [] }
      }
    };
    
    const chartData = generateChartData(state);
    
    if (!Array.isArray(chartData.labels)) throw new Error('Labels should be array');
    if (chartData.labels.length !== 2) throw new Error('Should have 2 labels');
    if (!chartData.labels.includes('State')) throw new Error('State label missing');
    if (!chartData.labels.includes('Defense')) throw new Error('Defense label missing');
    if (!chartData.datasets[0].data) throw new Error('Chart data missing');
    if (chartData.datasets[0].data.length !== 2) throw new Error('Should have 2 data points');
  });

  // Test 5: Party Management
  console.log('\n👥 Step 5: Party Management');
  test('addParty should add new party correctly', () => {
    let state = initializeSpeakingTime(['State', 'Defense']);
    state = addParty(state, 'Witness');
    
    if (!state.parties.Witness) throw new Error('Witness party not added');
    if (state.parties.Witness.totalTime !== 0) throw new Error('New party time not zero');
    if (state.parties.Witness.segments.length !== 0) throw new Error('New party segments not empty');
    if (Object.keys(state.parties).length !== 3) throw new Error('Wrong number of parties');
  });

  test('removeParty should remove party correctly', () => {
    let state = initializeSpeakingTime(['State', 'Defense', 'Court']);
    state = removeParty(state, 'Court');
    
    if (state.parties.Court) throw new Error('Court party not removed');
    if (Object.keys(state.parties).length !== 2) throw new Error('Wrong number of parties after removal');
  });

  test('removeParty should not remove active speaker', () => {
    let state = initializeSpeakingTime(['State', 'Defense']);
    state = startSpeaking(state, 'State');
    state = removeParty(state, 'State');
    
    if (!state.parties.State) throw new Error('Active speaker was removed');
    if (state.currentSpeaker !== 'State') throw new Error('Current speaker changed');
  });

  // Test 6: Complete Workflow
  console.log('\n🔄 Step 6: Complete Workflow Test');
  test('Complete workflow should work end-to-end', () => {
    const originalNow = Date.now;
    let mockTime = 0;
    Date.now = () => mockTime;
    
    // Initialize tracker
    let state = initializeSpeakingTime(['State', 'Defense', 'Court']);
    
    // State speaks for 3 seconds
    mockTime = 1000;
    state = startSpeaking(state, 'State');
    mockTime = 4000;
    
    // Defense speaks for 2 seconds
    state = startSpeaking(state, 'Defense');
    mockTime = 6000;
    
    // Court speaks for 1 second
    state = startSpeaking(state, 'Court');
    mockTime = 7000;
    
    // End hearing
    state = stopTracking(state);
    
    // Verify final state
    if (state.parties.State.totalTime !== 3000) throw new Error('State time incorrect');
    if (state.parties.Defense.totalTime !== 2000) throw new Error('Defense time incorrect');
    if (state.parties.Court.totalTime !== 1000) throw new Error('Court time incorrect');
    if (state.timeline.length !== 3) throw new Error('Timeline should have 3 entries');
    if (state.isActive !== false) throw new Error('Should not be active after stop');
    if (state.currentSpeaker !== null) throw new Error('Should have no current speaker after stop');
    
    // Verify statistics
    const stats = calculateStatistics(state);
    if (stats.totalHearingTime !== 6000) throw new Error('Total hearing time wrong');
    if (stats.totalSpeakingTime !== 6000) throw new Error('Total speaking time wrong');
    if (stats.silenceTime !== 0) throw new Error('Silence time should be zero');
    
    Date.now = originalNow;
  });

  console.log(`\n📊 Speaking Time Tracker Test Results:`);
  console.log(`✅ Passed: ${passed}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`📈 Total: ${passed + failed}`);

  if (failed === 0) {
    console.log('\n🎉 All Speaking Time Tracker tests passed!');
    console.log('⏱️  The speaking time tracking feature is working correctly');
    console.log('📊 Statistics calculation is accurate');
    console.log('📄 Report generation is functional');
    console.log('👥 Party management works as expected');
    console.log('🔄 Complete workflow is validated');
    return true;
  } else {
    console.log('\n⚠️  Some tests failed. Check the implementation.');
    return false;
  }
}

// Run the tests
runSpeakingTrackerTests()
  .then(success => {
    if (success) {
      console.log('\n✨ Speaking Time Tracker feature is ready for use!');
      process.exit(0);
    } else {
      console.log('\n💥 Speaking Time Tracker tests failed!');
      process.exit(1);
    }
  })
  .catch(error => {
    console.error('\n💥 Test error:', error.message);
    process.exit(1);
  });