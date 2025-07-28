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
} = require('../speakingTimeTracker');

describe('speakingTimeTracker', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('initializeSpeakingTime', () => {
    it('should initialize with default parties', () => {
      const state = initializeSpeakingTime();
      
      expect(state.parties).toHaveProperty('State');
      expect(state.parties).toHaveProperty('Defense');
      expect(state.parties).toHaveProperty('Court');
      expect(state.currentSpeaker).toBeNull();
      expect(state.isActive).toBe(false);
      expect(state.timeline).toEqual([]);
    });

    it('should initialize with custom parties', () => {
      const customParties = ['Plaintiff', 'Defendant', 'Judge'];
      const state = initializeSpeakingTime(customParties);
      
      expect(state.parties).toHaveProperty('Plaintiff');
      expect(state.parties).toHaveProperty('Defendant');
      expect(state.parties).toHaveProperty('Judge');
      expect(Object.keys(state.parties)).toEqual(customParties);
    });

    it('should initialize party data correctly', () => {
      const state = initializeSpeakingTime(['State']);
      
      expect(state.parties.State).toEqual({
        totalTime: 0,
        segments: []
      });
    });
  });

  describe('startSpeaking', () => {
    let initialState;

    beforeEach(() => {
      initialState = initializeSpeakingTime(['State', 'Defense']);
    });

    it('should start tracking for first speaker', () => {
      const beforeTime = Date.now();
      const newState = startSpeaking(initialState, 'State');
      const afterTime = Date.now();
      
      expect(newState.currentSpeaker).toBe('State');
      expect(newState.isActive).toBe(true);
      expect(newState.hearingStartTime).toBeGreaterThanOrEqual(beforeTime);
      expect(newState.hearingStartTime).toBeLessThanOrEqual(afterTime);
      expect(newState.startTime).toBe(newState.hearingStartTime);
    });

    it('should switch speakers and calculate previous speaker time', () => {
      // Start with State speaking
      const stateStartTime = Date.now();
      let state = startSpeaking(initialState, 'State');
      state.startTime = stateStartTime; // Set known time for testing
      
      // Switch to Defense after 5 seconds
      const defenseStartTime = stateStartTime + 5000;
      Date.now = jest.fn(() => defenseStartTime);
      
      const newState = startSpeaking(state, 'Defense');
      
      expect(newState.currentSpeaker).toBe('Defense');
      expect(newState.parties.State.totalTime).toBe(5000);
      expect(newState.parties.State.segments).toHaveLength(1);
      expect(newState.parties.State.segments[0]).toEqual({
        start: stateStartTime,
        end: defenseStartTime,
        duration: 5000
      });
      expect(newState.timeline).toHaveLength(1);
    });

    it('should not affect time if same speaker clicked', () => {
      const state = startSpeaking(initialState, 'State');
      const originalStartTime = state.startTime;
      
      const newState = startSpeaking(state, 'State');
      
      expect(newState.currentSpeaker).toBe('State');
      expect(newState.startTime).toBe(originalStartTime);
    });
  });

  describe('stopTracking', () => {
    it('should finalize current speaker time and stop tracking', () => {
      const startTime = Date.now();
      let state = initializeSpeakingTime(['State']);
      state = startSpeaking(state, 'State');
      state.startTime = startTime;
      
      const endTime = startTime + 10000; // 10 seconds later
      Date.now = jest.fn(() => endTime);
      
      const finalState = stopTracking(state);
      
      expect(finalState.currentSpeaker).toBeNull();
      expect(finalState.isActive).toBe(false);
      expect(finalState.isPaused).toBe(true);
      expect(finalState.hearingEndTime).toBe(endTime);
      expect(finalState.parties.State.totalTime).toBe(10000);
      expect(finalState.timeline).toHaveLength(1);
    });

    it('should handle stopping when no one is speaking', () => {
      const state = initializeSpeakingTime(['State']);
      const endTime = Date.now();
      Date.now = jest.fn(() => endTime);
      
      const finalState = stopTracking(state);
      
      expect(finalState.hearingEndTime).toBe(endTime);
      expect(finalState.isActive).toBe(false);
      expect(finalState.parties.State.totalTime).toBe(0);
    });
  });

  describe('calculateStatistics', () => {
    it('should calculate correct statistics', () => {
      const state = {
        hearingStartTime: 1000,
        hearingEndTime: 11000, // 10 seconds total
        parties: {
          State: { totalTime: 6000, segments: [{ duration: 6000 }] }, // 6 seconds
          Defense: { totalTime: 3000, segments: [{ duration: 3000 }] } // 3 seconds
        }
      };
      
      const stats = calculateStatistics(state);
      
      expect(stats.totalHearingTime).toBe(10000);
      expect(stats.totalSpeakingTime).toBe(9000);
      expect(stats.silenceTime).toBe(1000);
      
      expect(stats.parties.State.percentage).toBe('66.7'); // 6000/9000 * 100
      expect(stats.parties.Defense.percentage).toBe('33.3'); // 3000/9000 * 100
      
      expect(stats.parties.State.segmentCount).toBe(1);
      expect(stats.parties.State.averageSegmentTime).toBe(6000);
    });

    it('should handle zero speaking time', () => {
      const state = {
        hearingStartTime: 1000,
        hearingEndTime: 6000,
        parties: {
          State: { totalTime: 0, segments: [] },
          Defense: { totalTime: 0, segments: [] }
        }
      };
      
      const stats = calculateStatistics(state);
      
      expect(stats.totalSpeakingTime).toBe(0);
      expect(stats.parties.State.percentage).toBe('0');
      expect(stats.parties.Defense.percentage).toBe('0');
    });
  });

  describe('formatTime', () => {
    it('should format time correctly', () => {
      expect(formatTime(0)).toBe('0:00');
      expect(formatTime(30000)).toBe('0:30'); // 30 seconds
      expect(formatTime(60000)).toBe('1:00'); // 1 minute
      expect(formatTime(90000)).toBe('1:30'); // 1 minute 30 seconds
      expect(formatTime(3600000)).toBe('1:00:00'); // 1 hour
      expect(formatTime(3661000)).toBe('1:01:01'); // 1 hour 1 minute 1 second
    });

    it('should pad numbers correctly', () => {
      expect(formatTime(5000)).toBe('0:05');
      expect(formatTime(65000)).toBe('1:05');
      expect(formatTime(3605000)).toBe('1:00:05');
    });
  });

  describe('generateTextReport', () => {
    it('should generate comprehensive text report', () => {
      const state = {
        hearingStartTime: new Date('2024-01-15T09:00:00').getTime(),
        hearingEndTime: new Date('2024-01-15T09:10:00').getTime(),
        parties: {
          State: { 
            totalTime: 360000, // 6 minutes
            segments: [{ duration: 360000 }] 
          },
          Defense: { 
            totalTime: 240000, // 4 minutes
            segments: [{ duration: 120000 }, { duration: 120000 }] 
          }
        },
        timeline: [
          { party: 'State', start: 1000, end: 361000, duration: 360000 },
          { party: 'Defense', start: 361000, end: 481000, duration: 120000 },
          { party: 'Defense', start: 481000, end: 601000, duration: 120000 }
        ]
      };
      
      const hearingInfo = {
        'Case Number': '123-2024',
        'Client Name': 'John Doe',
        'Division': 'Criminal'
      };
      
      const report = generateTextReport(state, hearingInfo);
      
      expect(report).toContain('SPEAKING TIME REPORT');
      expect(report).toContain('Case: 123-2024');
      expect(report).toContain('Client: John Doe');
      expect(report).toContain('Division: Criminal');
      expect(report).toContain('Total Hearing Duration: 10:00');
      expect(report).toContain('State:');
      expect(report).toContain('6:00 (60.0%)');
      expect(report).toContain('Defense:');
      expect(report).toContain('4:00 (40.0%)');
      expect(report).toContain('Speaking Turns: 2');
      expect(report).toContain('TIMELINE');
    });
  });

  describe('generateChartData', () => {
    it('should generate chart data for visualization', () => {
      const state = {
        hearingStartTime: 1000,
        hearingEndTime: 11000,
        parties: {
          State: { totalTime: 6000, segments: [] },
          Defense: { totalTime: 4000, segments: [] }
        }
      };
      
      const chartData = generateChartData(state);
      
      expect(chartData.labels).toEqual(['State', 'Defense']);
      expect(chartData.datasets[0].data).toEqual([6000, 4000]);
      expect(chartData.datasets[0].backgroundColor).toHaveLength(6); // Default colors
      expect(chartData.datasets[0].borderWidth).toBe(2);
    });
  });

  describe('addParty', () => {
    it('should add new party to existing state', () => {
      const state = initializeSpeakingTime(['State', 'Defense']);
      const newState = addParty(state, 'Witness');
      
      expect(newState.parties).toHaveProperty('Witness');
      expect(newState.parties.Witness).toEqual({
        totalTime: 0,
        segments: []
      });
      expect(Object.keys(newState.parties)).toHaveLength(3);
    });

    it('should not duplicate existing party', () => {
      const state = initializeSpeakingTime(['State']);
      const newState = addParty(state, 'State');
      
      expect(Object.keys(newState.parties)).toHaveLength(1);
    });
  });

  describe('removeParty', () => {
    it('should remove party from state', () => {
      const state = initializeSpeakingTime(['State', 'Defense', 'Court']);
      const newState = removeParty(state, 'Court');
      
      expect(newState.parties).not.toHaveProperty('Court');
      expect(Object.keys(newState.parties)).toHaveLength(2);
    });

    it('should not remove currently speaking party', () => {
      let state = initializeSpeakingTime(['State', 'Defense']);
      state = startSpeaking(state, 'State');
      
      const newState = removeParty(state, 'State');
      
      expect(newState.parties).toHaveProperty('State');
      expect(newState.currentSpeaker).toBe('State');
    });

    it('should handle removing non-existent party', () => {
      const state = initializeSpeakingTime(['State']);
      const newState = removeParty(state, 'NonExistent');
      
      expect(newState.parties).toHaveProperty('State');
      expect(Object.keys(newState.parties)).toHaveLength(1);
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle rapid speaker switches', () => {
      let state = initializeSpeakingTime(['State', 'Defense', 'Court']);
      const startTime = 1000;
      let currentTime = startTime;
      
      // Mock Date.now for predictable timing
      Date.now = jest.fn(() => currentTime);
      
      // Rapid switches every 100ms
      state = startSpeaking(state, 'State');
      currentTime += 100;
      Date.now.mockReturnValue(currentTime);
      
      state = startSpeaking(state, 'Defense');
      currentTime += 100;
      Date.now.mockReturnValue(currentTime);
      
      state = startSpeaking(state, 'Court');
      currentTime += 100;
      Date.now.mockReturnValue(currentTime);
      
      state = startSpeaking(state, 'State');
      currentTime += 100;
      Date.now.mockReturnValue(currentTime);
      
      state = stopTracking(state);
      
      expect(state.parties.State.totalTime).toBe(200); // 100ms + 100ms
      expect(state.parties.Defense.totalTime).toBe(100);
      expect(state.parties.Court.totalTime).toBe(100);
      expect(state.timeline).toHaveLength(4);
    });

    it('should handle same speaker clicked multiple times', () => {
      let state = initializeSpeakingTime(['State']);
      const startTime = 1000;
      Date.now = jest.fn(() => startTime);
      
      state = startSpeaking(state, 'State');
      const originalStartTime = state.startTime;
      
      // Click same speaker again
      state = startSpeaking(state, 'State');
      
      expect(state.currentSpeaker).toBe('State');
      expect(state.startTime).toBe(originalStartTime);
      expect(state.parties.State.totalTime).toBe(0); // No additional time added
    });

    it('should handle empty party names', () => {
      let state = initializeSpeakingTime(['State']);
      
      // Try to add empty party name
      state = addParty(state, '');
      expect(Object.keys(state.parties)).toHaveLength(1);
      
      // Try to add whitespace-only party name
      state = addParty(state, '   ');
      expect(Object.keys(state.parties)).toHaveLength(1);
    });

    it('should handle very long durations', () => {
      const longDuration = 24 * 60 * 60 * 1000; // 24 hours
      expect(formatTime(longDuration)).toBe('24:00:00');
      
      const extremelyLong = 100 * 60 * 60 * 1000; // 100 hours
      expect(formatTime(extremelyLong)).toBe('100:00:00');
    });

    it('should handle stopping tracking when nothing is active', () => {
      const state = initializeSpeakingTime(['State']);
      const stoppedState = stopTracking(state);
      
      expect(stoppedState.isActive).toBe(false);
      expect(stoppedState.currentSpeaker).toBeNull();
      expect(stoppedState.hearingEndTime).toBeDefined();
    });
  });

  describe('Performance and Stress Tests', () => {
    it('should handle many parties efficiently', () => {
      const manyParties = Array.from({ length: 50 }, (_, i) => `Party${i + 1}`);
      const state = initializeSpeakingTime(manyParties);
      
      expect(Object.keys(state.parties)).toHaveLength(50);
      
      // Test adding speakers
      let testState = state;
      manyParties.forEach((party, index) => {
        Date.now = jest.fn(() => index * 1000);
        testState = startSpeaking(testState, party);
      });
      
      expect(testState.currentSpeaker).toBe('Party50');
      expect(testState.timeline).toHaveLength(49); // All but the last switch
    });

    it('should handle long hearing sessions', () => {
      let state = initializeSpeakingTime(['State', 'Defense']);
      const startTime = 0;
      let currentTime = startTime;
      Date.now = jest.fn(() => currentTime);
      
      // Simulate 8-hour hearing with speaker changes every 15 minutes
      const totalDuration = 8 * 60 * 60 * 1000; // 8 hours
      const switchInterval = 15 * 60 * 1000; // 15 minutes
      let currentSpeaker = 'State';
      
      state = startSpeaking(state, currentSpeaker);
      
      for (currentTime = switchInterval; currentTime < totalDuration; currentTime += switchInterval) {
        Date.now.mockReturnValue(currentTime);
        currentSpeaker = currentSpeaker === 'State' ? 'Defense' : 'State';
        state = startSpeaking(state, currentSpeaker);
      }
      
      Date.now.mockReturnValue(totalDuration);
      state = stopTracking(state);
      
      const stats = calculateStatistics(state);
      expect(stats.totalHearingTime).toBe(totalDuration);
      expect(state.timeline.length).toBeGreaterThan(30); // Many speaker changes
    });
  });

  describe('Report Generation Edge Cases', () => {
    it('should generate report with no speaking time', () => {
      const state = {
        hearingStartTime: 1000,
        hearingEndTime: 6000,
        parties: {
          State: { totalTime: 0, segments: [] },
          Defense: { totalTime: 0, segments: [] }
        },
        timeline: []
      };
      
      const hearing = {
        'Case Number': '123-2024',
        'Client Name': 'John Doe',
        'Division': 'Criminal'
      };
      
      const report = generateTextReport(state, hearing);
      
      expect(report).toContain('Total Speaking Time: 0:00');
      expect(report).toContain('State:');
      expect(report).toContain('0:00 (0%)');
    });

    it('should generate chart data with single party', () => {
      const state = {
        hearingStartTime: 0,
        hearingEndTime: 5000,
        parties: {
          State: { totalTime: 5000, segments: [] }
        }
      };
      
      const chartData = generateChartData(state);
      
      expect(chartData.labels).toEqual(['State']);
      expect(chartData.datasets[0].data).toEqual([5000]);
    });

    it('should handle special characters in party names', () => {
      const specialParties = ['Pro Se Defendant', 'Court-Appointed Attorney', 'Expert Witness #1'];
      const state = initializeSpeakingTime(specialParties);
      
      expect(state.parties).toHaveProperty('Pro Se Defendant');
      expect(state.parties).toHaveProperty('Court-Appointed Attorney');
      expect(state.parties).toHaveProperty('Expert Witness #1');
      
      const chartData = generateChartData(state);
      expect(chartData.labels).toContain('Pro Se Defendant');
    });
  });

  describe('Timeline and Segment Tracking', () => {
    it('should maintain accurate timeline order', () => {
      let state = initializeSpeakingTime(['A', 'B', 'C']);
      let time = 1000;
      Date.now = jest.fn(() => time);
      
      // A speaks for 2 seconds
      state = startSpeaking(state, 'A');
      time += 2000;
      Date.now.mockReturnValue(time);
      
      // B speaks for 1 second
      state = startSpeaking(state, 'B');
      time += 1000;
      Date.now.mockReturnValue(time);
      
      // C speaks for 3 seconds
      state = startSpeaking(state, 'C');
      time += 3000;
      Date.now.mockReturnValue(time);
      
      state = stopTracking(state);
      
      expect(state.timeline).toHaveLength(3);
      expect(state.timeline[0].party).toBe('A');
      expect(state.timeline[0].duration).toBe(2000);
      expect(state.timeline[1].party).toBe('B');
      expect(state.timeline[1].duration).toBe(1000);
      expect(state.timeline[2].party).toBe('C');
      expect(state.timeline[2].duration).toBe(3000);
    });

    it('should track multiple segments for same party', () => {
      let state = initializeSpeakingTime(['State', 'Defense']);
      let time = 1000;
      Date.now = jest.fn(() => time);
      
      // State speaks twice with Defense in between
      state = startSpeaking(state, 'State');
      time += 2000;
      Date.now.mockReturnValue(time);
      
      state = startSpeaking(state, 'Defense');
      time += 1000;
      Date.now.mockReturnValue(time);
      
      state = startSpeaking(state, 'State');
      time += 3000;
      Date.now.mockReturnValue(time);
      
      state = stopTracking(state);
      
      expect(state.parties.State.segments).toHaveLength(2);
      expect(state.parties.State.segments[0].duration).toBe(2000);
      expect(state.parties.State.segments[1].duration).toBe(3000);
      expect(state.parties.State.totalTime).toBe(5000);
    });
  });

  describe('State Immutability', () => {
    it('should not mutate original state in startSpeaking', () => {
      const originalState = initializeSpeakingTime(['State']);
      const originalParties = { ...originalState.parties };
      
      startSpeaking(originalState, 'State');
      
      expect(originalState.currentSpeaker).toBeNull();
      expect(originalState.isActive).toBe(false);
      expect(originalState.parties).toEqual(originalParties);
    });

    it('should not mutate original state in stopTracking', () => {
      let state = initializeSpeakingTime(['State']);
      state = startSpeaking(state, 'State');
      const preStopState = { ...state };
      
      stopTracking(state);
      
      expect(state.currentSpeaker).toBe('State');
      expect(state.isActive).toBe(true);
    });

    it('should not mutate original state in addParty', () => {
      const originalState = initializeSpeakingTime(['State']);
      const originalKeys = Object.keys(originalState.parties);
      
      addParty(originalState, 'Defense');
      
      expect(Object.keys(originalState.parties)).toEqual(originalKeys);
    });
  });
});