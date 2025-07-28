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
} = require('../utils/speakingTimeTracker');

describe('Speaking Time Tracker Error Handling and Edge Cases', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Input Validation and Sanitization', () => {
    it('should handle null and undefined inputs gracefully', () => {
      // Test null inputs
      expect(() => initializeSpeakingTime(null)).not.toThrow();
      expect(() => initializeSpeakingTime(undefined)).not.toThrow();

      const state = initializeSpeakingTime(['State']);
      
      expect(() => startSpeaking(null, 'State')).not.toThrow();
      expect(() => startSpeaking(state, null)).not.toThrow();
      expect(() => startSpeaking(state, undefined)).not.toThrow();
      
      expect(() => stopTracking(null)).not.toThrow();
      expect(() => calculateStatistics(null)).not.toThrow();
    });

    it('should handle malformed state objects', () => {
      const malformedState = {
        parties: null,
        currentSpeaker: 'State',
        timeline: undefined
      };

      expect(() => startSpeaking(malformedState, 'Defense')).not.toThrow();
      expect(() => stopTracking(malformedState)).not.toThrow();
      expect(() => calculateStatistics(malformedState)).not.toThrow();
    });

    it('should handle empty and invalid party names', () => {
      let state = initializeSpeakingTime(['State']);

      // Empty string
      const result1 = addParty(state, '');
      expect(Object.keys(result1.parties)).toHaveLength(1);

      // Only whitespace
      const result2 = addParty(state, '   \t\n   ');
      expect(Object.keys(result2.parties)).toHaveLength(1);

      // Very long party name
      const longName = 'A'.repeat(1000);
      const result3 = addParty(state, longName);
      expect(result3.parties).toHaveProperty(longName);

      // Special characters
      const specialName = '!@#$%^&*()_+-=[]{}|;:,.<>?';
      const result4 = addParty(state, specialName);
      expect(result4.parties).toHaveProperty(specialName);
    });

    it('should handle extreme time values', () => {
      // Test with very large timestamps
      const originalNow = Date.now;
      const extremeTime = Number.MAX_SAFE_INTEGER - 1000000;
      Date.now = jest.fn(() => extremeTime);

      let state = initializeSpeakingTime(['State']);
      state = startSpeaking(state, 'State');
      
      Date.now.mockReturnValue(Number.MAX_SAFE_INTEGER);
      state = stopTracking(state);

      expect(state.parties.State.totalTime).toBeGreaterThan(0);
      expect(state.parties.State.totalTime).toBeLessThan(Number.MAX_SAFE_INTEGER);

      // Test formatTime with extreme values
      expect(formatTime(0)).toBe('0:00');
      expect(formatTime(Number.MAX_SAFE_INTEGER)).toMatch(/^\d+:\d{2}:\d{2}$/);

      Date.now = originalNow;
    });

    it('should handle negative time values', () => {
      const originalNow = Date.now;
      let mockTime = 1000;
      Date.now = jest.fn(() => mockTime);

      let state = initializeSpeakingTime(['State']);
      state = startSpeaking(state, 'State');

      // Simulate clock going backwards (system time adjustment)
      mockTime = 500; // Earlier time
      Date.now.mockReturnValue(mockTime);

      // Should handle gracefully
      expect(() => stopTracking(state)).not.toThrow();

      Date.now = originalNow;
    });
  });

  describe('Memory and Performance Edge Cases', () => {
    it('should handle very large number of parties', () => {
      const manyParties = Array.from({ length: 1000 }, (_, i) => `Party_${i}`);
      
      const startTime = Date.now();
      const state = initializeSpeakingTime(manyParties);
      const endTime = Date.now();

      expect(Object.keys(state.parties)).toHaveLength(1000);
      expect(endTime - startTime).toBeLessThan(100); // Should be fast

      // Test operations are still efficient
      const opStart = Date.now();
      const chartData = generateChartData(state);
      const opEnd = Date.now();

      expect(chartData.labels).toHaveLength(1000);
      expect(opEnd - opStart).toBeLessThan(50);
    });

    it('should handle very large number of timeline entries', () => {
      const originalNow = Date.now;
      let mockTime = 1000;
      Date.now = jest.fn(() => mockTime);

      let state = initializeSpeakingTime(['A', 'B']);

      // Create 10,000 timeline entries
      for (let i = 0; i < 10000; i++) {
        const party = i % 2 === 0 ? 'A' : 'B';
        state = startSpeaking(state, party);
        mockTime += 100; // 100ms segments
        Date.now.mockReturnValue(mockTime);
      }

      const stopStart = Date.now();
      state = stopTracking(state);
      const stopEnd = Date.now();

      expect(state.timeline).toHaveLength(10000);
      expect(stopEnd - stopStart).toBeLessThan(100);

      // Test report generation performance
      const reportStart = Date.now();
      const report = generateTextReport(state, { 'Case Number': 'STRESS-TEST' });
      const reportEnd = Date.now();

      expect(report).toContain('STRESS-TEST');
      expect(reportEnd - reportStart).toBeLessThan(500);

      Date.now = originalNow;
    });

    it('should handle concurrent state modifications', () => {
      let state = initializeSpeakingTime(['State', 'Defense']);
      
      // Simulate concurrent modifications (race conditions)
      const state1 = startSpeaking(state, 'State');
      const state2 = startSpeaking(state, 'Defense');
      const state3 = addParty(state, 'Court');

      // All operations should complete without error
      expect(state1.currentSpeaker).toBe('State');
      expect(state2.currentSpeaker).toBe('Defense');
      expect(state3.parties).toHaveProperty('Court');

      // Original state should be unchanged
      expect(state.currentSpeaker).toBeNull();
      expect(state.parties).not.toHaveProperty('Court');
    });
  });

  describe('Browser Environment Edge Cases', () => {
    it('should handle Date.now() failures', () => {
      const originalNow = Date.now;
      
      // Simulate Date.now() returning NaN
      Date.now = jest.fn(() => NaN);

      let state = initializeSpeakingTime(['State']);
      
      expect(() => {
        state = startSpeaking(state, 'State');
      }).not.toThrow();

      expect(() => {
        state = stopTracking(state);
      }).not.toThrow();

      // Simulate Date.now() throwing error
      Date.now = jest.fn(() => {
        throw new Error('Time system failure');
      });

      expect(() => {
        startSpeaking(state, 'Defense');
      }).not.toThrow();

      Date.now = originalNow;
    });

    it('should handle Chart.js not being available', () => {
      const originalChart = global.Chart;
      delete global.Chart;

      const state = {
        hearingStartTime: 1000,
        hearingEndTime: 6000,
        parties: {
          State: { totalTime: 3000, segments: [] },
          Defense: { totalTime: 2000, segments: [] }
        }
      };

      // Should not throw error when Chart is undefined
      expect(() => generateChartData(state)).not.toThrow();

      global.Chart = originalChart;
    });

    it('should handle blob creation failures', () => {
      const originalBlob = global.Blob;
      
      // Mock Blob constructor to throw error
      global.Blob = jest.fn(() => {
        throw new Error('Blob creation failed');
      });

      const state = {
        hearingStartTime: 1000,
        hearingEndTime: 6000,
        parties: { State: { totalTime: 5000, segments: [] } },
        timeline: []
      };

      const hearing = { 'Case Number': '123' };

      // Report generation should still work
      expect(() => generateTextReport(state, hearing)).not.toThrow();

      global.Blob = originalBlob;
    });
  });

  describe('Data Corruption and Recovery', () => {
    it('should handle corrupted party data', () => {
      const corruptedState = {
        parties: {
          State: { totalTime: 'not a number', segments: 'not an array' },
          Defense: null,
          Court: { totalTime: -1000, segments: [{ invalid: 'data' }] }
        },
        currentSpeaker: 'NonExistentParty',
        hearingStartTime: 'invalid',
        hearingEndTime: null,
        timeline: 'not an array'
      };

      expect(() => calculateStatistics(corruptedState)).not.toThrow();
      expect(() => generateTextReport(corruptedState, {})).not.toThrow();
      expect(() => generateChartData(corruptedState)).not.toThrow();
    });

    it('should handle timeline corruption', () => {
      const stateWithCorruptedTimeline = {
        parties: {
          State: { totalTime: 5000, segments: [] }
        },
        timeline: [
          { party: null, duration: 'invalid' },
          { start: 'not a number', end: 'also not a number' },
          null,
          { party: 'State', duration: -1000 }
        ],
        hearingStartTime: 1000,
        hearingEndTime: 6000
      };

      const report = generateTextReport(stateWithCorruptedTimeline, {
        'Case Number': '123'
      });

      expect(report).toContain('TIMELINE');
      expect(report).toContain('123');
    });

    it('should recover from missing required fields', () => {
      const incompleteState = {
        parties: {
          State: { totalTime: 5000 } // missing segments
        }
        // missing other required fields
      };

      const stats = calculateStatistics(incompleteState);
      expect(stats).toBeDefined();
      expect(stats.parties).toBeDefined();

      const chartData = generateChartData(incompleteState);
      expect(chartData).toBeDefined();
      expect(chartData.labels).toBeDefined();
    });
  });

  describe('Mathematical Edge Cases', () => {
    it('should handle division by zero scenarios', () => {
      const stateWithZeroTime = {
        hearingStartTime: 1000,
        hearingEndTime: 1000, // Same time = zero duration
        parties: {
          State: { totalTime: 0, segments: [] },
          Defense: { totalTime: 0, segments: [] }
        }
      };

      const stats = calculateStatistics(stateWithZeroTime);
      expect(stats.parties.State.percentage).toBe('0');
      expect(stats.parties.Defense.percentage).toBe('0');
      expect(isNaN(parseFloat(stats.parties.State.percentage))).toBe(false);
    });

    it('should handle floating point precision issues', () => {
      const originalNow = Date.now;
      Date.now = jest.fn(() => 1000.1); // Floating point timestamp

      let state = initializeSpeakingTime(['State']);
      state = startSpeaking(state, 'State');

      Date.now.mockReturnValue(1000.9);
      state = stopTracking(state);

      expect(state.parties.State.totalTime).toBeCloseTo(0.8, 1);

      const stats = calculateStatistics(state);
      expect(parseFloat(stats.parties.State.percentage)).not.toBeNaN();

      Date.now = originalNow;
    });

    it('should handle very small time intervals', () => {
      const originalNow = Date.now;
      let mockTime = 1000;
      Date.now = jest.fn(() => mockTime);

      let state = initializeSpeakingTime(['State', 'Defense']);

      // Very rapid switches (1ms intervals)
      for (let i = 0; i < 100; i++) {
        const party = i % 2 === 0 ? 'State' : 'Defense';
        state = startSpeaking(state, party);
        mockTime += 1; // 1ms
        Date.now.mockReturnValue(mockTime);
      }

      state = stopTracking(state);

      const stats = calculateStatistics(state);
      expect(stats.totalHearingTime).toBe(100);
      expect(stats.parties.State.totalTime + stats.parties.Defense.totalTime).toBe(100);

      Date.now = originalNow;
    });
  });

  describe('Internationalization and Localization', () => {
    it('should handle Unicode party names', () => {
      const unicodeParties = ['État', '辩护方', 'محكمة', '裁判所', 'Ñoño & Óbélix'];
      let state = initializeSpeakingTime(unicodeParties);

      unicodeParties.forEach(party => {
        expect(state.parties).toHaveProperty(party);
      });

      const chartData = generateChartData(state);
      expect(chartData.labels).toEqual(unicodeParties);

      const report = generateTextReport(state, {
        'Case Number': 'UNICODE-TEST',
        'Client Name': 'José María',
        'Division': 'Tribunal Supremo'
      });

      expect(report).toContain('José María');
      expect(report).toContain('Tribunal Supremo');
      unicodeParties.forEach(party => {
        expect(report).toContain(party);
      });
    });

    it('should handle RTL text in party names', () => {
      const rtlParties = ['المدعي العام', 'المحامي', 'القاضي'];
      let state = initializeSpeakingTime(rtlParties);

      expect(Object.keys(state.parties)).toHaveLength(3);

      const report = generateTextReport(state, {
        'Case Number': 'RTL-TEST',
        'Client Name': 'محمد أحمد'
      });

      rtlParties.forEach(party => {
        expect(report).toContain(party);
      });
    });
  });

  describe('Version Compatibility and Migration', () => {
    it('should handle legacy state format', () => {
      // Simulate old version state format
      const legacyState = {
        parties: {
          State: { time: 5000 }, // Old field name
          Defense: { totalTime: 3000, segments: [] }
        },
        speaker: 'State', // Old field name
        active: true, // Old field name
        startedAt: 1000 // Old field name
      };

      // Should not crash on legacy format
      expect(() => calculateStatistics(legacyState)).not.toThrow();
      expect(() => generateTextReport(legacyState, {})).not.toThrow();
    });

    it('should handle future state format gracefully', () => {
      // Simulate future version with additional fields
      const futureState = {
        parties: {
          State: { 
            totalTime: 5000, 
            segments: [],
            futureField: 'future data',
            metrics: { advanced: true }
          }
        },
        currentSpeaker: 'State',
        hearingStartTime: 1000,
        hearingEndTime: 6000,
        timeline: [],
        version: '2.0',
        newFeatures: { enabled: true }
      };

      expect(() => calculateStatistics(futureState)).not.toThrow();
      expect(() => generateTextReport(futureState, {})).not.toThrow();
      expect(() => generateChartData(futureState)).not.toThrow();
    });
  });
});