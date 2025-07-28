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

describe('Speaking Time Tracker Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Complete Court Hearing Workflow', () => {
    it('should handle a typical trial proceeding workflow', () => {
      const originalNow = Date.now;
      let mockTime = new Date('2024-01-15T09:00:00').getTime();
      Date.now = jest.fn(() => mockTime);

      // Initialize tracker for a typical trial
      let state = initializeSpeakingTime(['State', 'Defense', 'Court']);
      expect(state.parties).toHaveProperty('State');
      expect(state.parties).toHaveProperty('Defense');
      expect(state.parties).toHaveProperty('Court');

      const hearing = {
        'Case Number': '2024-CR-001',
        'Client Name': 'State v. Defendant',
        'Division': 'Criminal',
        'Time': '9:00 AM'
      };

      // 1. Court calls case to order (2 minutes)
      state = startSpeaking(state, 'Court');
      expect(state.currentSpeaker).toBe('Court');
      expect(state.isActive).toBe(true);
      
      mockTime += 2 * 60 * 1000; // 2 minutes
      Date.now.mockReturnValue(mockTime);

      // 2. State presents opening arguments (15 minutes)
      state = startSpeaking(state, 'State');
      expect(state.currentSpeaker).toBe('State');
      expect(state.parties.Court.totalTime).toBe(2 * 60 * 1000);
      
      mockTime += 15 * 60 * 1000; // 15 minutes
      Date.now.mockReturnValue(mockTime);

      // 3. Defense presents opening arguments (12 minutes)
      state = startSpeaking(state, 'Defense');
      expect(state.currentSpeaker).toBe('Defense');
      expect(state.parties.State.totalTime).toBe(15 * 60 * 1000);
      
      mockTime += 12 * 60 * 1000; // 12 minutes
      Date.now.mockReturnValue(mockTime);

      // 4. Court asks questions (3 minutes)
      state = startSpeaking(state, 'Court');
      expect(state.parties.Defense.totalTime).toBe(12 * 60 * 1000);
      
      mockTime += 3 * 60 * 1000; // 3 minutes
      Date.now.mockReturnValue(mockTime);

      // 5. State presents witnesses (20 minutes)
      state = startSpeaking(state, 'State');
      mockTime += 20 * 60 * 1000; // 20 minutes
      Date.now.mockReturnValue(mockTime);

      // 6. Defense cross-examines (18 minutes)
      state = startSpeaking(state, 'Defense');
      mockTime += 18 * 60 * 1000; // 18 minutes
      Date.now.mockReturnValue(mockTime);

      // 7. Court recess
      state = stopTracking(state);

      // Verify final state
      expect(state.isActive).toBe(false);
      expect(state.currentSpeaker).toBeNull();
      
      // Verify timeline
      expect(state.timeline).toHaveLength(6);
      expect(state.timeline[0].party).toBe('Court');
      expect(state.timeline[1].party).toBe('State');
      expect(state.timeline[2].party).toBe('Defense');

      // Calculate and verify statistics
      const stats = calculateStatistics(state);
      expect(stats.totalHearingTime).toBe(70 * 60 * 1000); // 70 minutes total
      expect(stats.parties.State.totalTime).toBe(35 * 60 * 1000); // 15 + 20 minutes
      expect(stats.parties.Defense.totalTime).toBe(30 * 60 * 1000); // 12 + 18 minutes
      expect(stats.parties.Court.totalTime).toBe(5 * 60 * 1000); // 2 + 3 minutes

      // Generate and verify report
      const report = generateTextReport(state, hearing);
      expect(report).toContain('2024-CR-001');
      expect(report).toContain('Total Hearing Duration: 1:10:00');
      expect(report).toContain('State:');
      expect(report).toContain('35:00 (50.0%)');
      expect(report).toContain('Defense:');
      expect(report).toContain('30:00 (42.9%)');

      Date.now = originalNow;
    });

    it('should handle complex hearing with multiple custom parties', () => {
      const originalNow = Date.now;
      let mockTime = 1000;
      Date.now = jest.fn(() => mockTime);

      // Initialize with default parties
      let state = initializeSpeakingTime(['State', 'Defense', 'Court']);

      // Add custom parties during hearing
      state = addParty(state, 'Expert Witness');
      state = addParty(state, 'Court Reporter');
      state = addParty(state, 'Bailiff');

      expect(Object.keys(state.parties)).toHaveLength(6);

      // Simulate complex hearing with all parties
      const speakingOrder = [
        { party: 'Court', duration: 2 * 60 * 1000 },      // 2 min
        { party: 'State', duration: 10 * 60 * 1000 },     // 10 min
        { party: 'Expert Witness', duration: 15 * 60 * 1000 }, // 15 min
        { party: 'Defense', duration: 8 * 60 * 1000 },    // 8 min
        { party: 'Court Reporter', duration: 1 * 60 * 1000 }, // 1 min (clarification)
        { party: 'Court', duration: 3 * 60 * 1000 },      // 3 min
        { party: 'Bailiff', duration: 30 * 1000 },        // 30 sec (order in court)
        { party: 'Defense', duration: 12 * 60 * 1000 },   // 12 min
        { party: 'State', duration: 5 * 60 * 1000 }       // 5 min (rebuttal)
      ];

      // Execute speaking sequence
      speakingOrder.forEach((segment, index) => {
        state = startSpeaking(state, segment.party);
        mockTime += segment.duration;
        Date.now.mockReturnValue(mockTime);
      });

      state = stopTracking(state);

      // Verify complex statistics
      const stats = calculateStatistics(state);
      expect(stats.parties.State.totalTime).toBe(15 * 60 * 1000); // 10 + 5 min
      expect(stats.parties.Defense.totalTime).toBe(20 * 60 * 1000); // 8 + 12 min
      expect(stats.parties['Expert Witness'].totalTime).toBe(15 * 60 * 1000);
      expect(stats.parties['Court Reporter'].totalTime).toBe(1 * 60 * 1000);
      expect(stats.parties.Bailiff.totalTime).toBe(30 * 1000);

      // Verify chart data generation
      const chartData = generateChartData(state);
      expect(chartData.labels).toContain('Expert Witness');
      expect(chartData.labels).toContain('Court Reporter');
      expect(chartData.datasets[0].data).toHaveLength(6);

      Date.now = originalNow;
    });

    it('should handle hearing interruptions and resumptions', () => {
      const originalNow = Date.now;
      let mockTime = 1000;
      Date.now = jest.fn(() => mockTime);

      let state = initializeSpeakingTime(['State', 'Defense', 'Court']);

      // Simulate interrupted hearing
      // State speaks
      state = startSpeaking(state, 'State');
      mockTime += 5 * 60 * 1000; // 5 minutes
      Date.now.mockReturnValue(mockTime);

      // Court interrupts
      state = startSpeaking(state, 'Court');
      mockTime += 30 * 1000; // 30 seconds
      Date.now.mockReturnValue(mockTime);

      // State resumes
      state = startSpeaking(state, 'State');
      mockTime += 10 * 60 * 1000; // 10 minutes
      Date.now.mockReturnValue(mockTime);

      // Defense objects
      state = startSpeaking(state, 'Defense');
      mockTime += 1 * 60 * 1000; // 1 minute
      Date.now.mockReturnValue(mockTime);

      // Court rules
      state = startSpeaking(state, 'Court');
      mockTime += 2 * 60 * 1000; // 2 minutes
      Date.now.mockReturnValue(mockTime);

      // State continues
      state = startSpeaking(state, 'State');
      mockTime += 3 * 60 * 1000; // 3 minutes
      Date.now.mockReturnValue(mockTime);

      state = stopTracking(state);

      // Verify State spoke in multiple segments
      expect(state.parties.State.segments).toHaveLength(3);
      expect(state.parties.State.totalTime).toBe(18 * 60 * 1000); // 5 + 10 + 3
      
      // Verify Court made multiple interventions
      expect(state.parties.Court.segments).toHaveLength(2);
      expect(state.parties.Court.totalTime).toBe(2.5 * 60 * 1000); // 0.5 + 2

      // Verify timeline order
      expect(state.timeline).toHaveLength(6);
      expect(state.timeline.map(t => t.party)).toEqual([
        'State', 'Court', 'State', 'Defense', 'Court', 'State'
      ]);

      Date.now = originalNow;
    });
  });

  describe('Real-world Scenario Tests', () => {
    it('should handle appellate court argument with time limits', () => {
      const originalNow = Date.now;
      let mockTime = 1000;
      Date.now = jest.fn(() => mockTime);

      let state = initializeSpeakingTime(['Petitioner', 'Respondent', 'Court']);

      const hearing = {
        'Case Number': '2024-SC-456',
        'Client Name': 'Petitioner v. Respondent',
        'Division': 'Supreme Court',
        'Time': '10:00 AM'
      };

      // Petitioner gets 30 minutes
      state = startSpeaking(state, 'Petitioner');
      mockTime += 20 * 60 * 1000; // 20 minutes uninterrupted
      Date.now.mockReturnValue(mockTime);

      // Court questions (10 minutes of interruption)
      state = startSpeaking(state, 'Court');
      mockTime += 10 * 60 * 1000;
      Date.now.mockReturnValue(mockTime);

      // Petitioner finishes remaining time
      state = startSpeaking(state, 'Petitioner');
      mockTime += 10 * 60 * 1000; // Remaining 10 minutes
      Date.now.mockReturnValue(mockTime);

      // Respondent gets 30 minutes
      state = startSpeaking(state, 'Respondent');
      mockTime += 25 * 60 * 1000; // 25 minutes
      Date.now.mockReturnValue(mockTime);

      // Court questions respondent
      state = startSpeaking(state, 'Court');
      mockTime += 8 * 60 * 1000; // 8 minutes
      Date.now.mockReturnValue(mockTime);

      // Respondent finishes
      state = startSpeaking(state, 'Respondent');
      mockTime += 5 * 60 * 1000; // 5 minutes
      Date.now.mockReturnValue(mockTime);

      // Petitioner rebuttal (5 minutes)
      state = startSpeaking(state, 'Petitioner');
      mockTime += 5 * 60 * 1000;
      Date.now.mockReturnValue(mockTime);

      state = stopTracking(state);

      const stats = calculateStatistics(state);
      
      // Verify time allocations
      expect(stats.parties.Petitioner.totalTime).toBe(35 * 60 * 1000); // 20 + 10 + 5
      expect(stats.parties.Respondent.totalTime).toBe(30 * 60 * 1000); // 25 + 5
      expect(stats.parties.Court.totalTime).toBe(18 * 60 * 1000); // 10 + 8

      // Generate report
      const report = generateTextReport(state, hearing);
      expect(report).toContain('Supreme Court');
      expect(report).toContain('Petitioner:');
      expect(report).toContain('35:00');

      Date.now = originalNow;
    });

    it('should handle deposition with multiple attorneys', () => {
      const originalNow = Date.now;
      let mockTime = 1000;
      Date.now = jest.fn(() => mockTime);

      let state = initializeSpeakingTime(['Plaintiff Attorney', 'Defense Attorney', 'Witness']);
      state = addParty(state, 'Court Reporter');

      // Witness testimony with questions from both sides
      const depositionSequence = [
        { party: 'Court Reporter', duration: 1 * 60 * 1000 }, // Opening
        { party: 'Plaintiff Attorney', duration: 45 * 60 * 1000 }, // Direct
        { party: 'Witness', duration: 35 * 60 * 1000 }, // Answers
        { party: 'Defense Attorney', duration: 30 * 60 * 1000 }, // Cross
        { party: 'Witness', duration: 25 * 60 * 1000 }, // Answers
        { party: 'Plaintiff Attorney', duration: 15 * 60 * 1000 }, // Re-direct
        { party: 'Witness', duration: 10 * 60 * 1000 }, // Final answers
        { party: 'Court Reporter', duration: 2 * 60 * 1000 }  // Closing
      ];

      depositionSequence.forEach(segment => {
        state = startSpeaking(state, segment.party);
        mockTime += segment.duration;
        Date.now.mockReturnValue(mockTime);
      });

      state = stopTracking(state);

      const stats = calculateStatistics(state);
      
      // Verify attorney time tracking
      expect(stats.parties['Plaintiff Attorney'].totalTime).toBe(60 * 60 * 1000); // 45 + 15
      expect(stats.parties['Defense Attorney'].totalTime).toBe(30 * 60 * 1000);
      expect(stats.parties.Witness.totalTime).toBe(70 * 60 * 1000); // 35 + 25 + 10

      // Verify segments for witness (spoke 3 separate times)
      expect(state.parties.Witness.segments).toHaveLength(3);

      Date.now = originalNow;
    });

    it('should handle administrative hearing with public comment', () => {
      const originalNow = Date.now;
      let mockTime = 1000;
      Date.now = jest.fn(() => mockTime);

      let state = initializeSpeakingTime(['Agency', 'Applicant', 'Chair']);
      
      // Add multiple public commenters
      state = addParty(state, 'Public Comment 1');
      state = addParty(state, 'Public Comment 2');
      state = addParty(state, 'Public Comment 3');

      // Administrative hearing flow
      const hearingFlow = [
        { party: 'Chair', duration: 3 * 60 * 1000 },        // Opening
        { party: 'Agency', duration: 15 * 60 * 1000 },      // Presentation
        { party: 'Applicant', duration: 20 * 60 * 1000 },   // Response
        { party: 'Chair', duration: 2 * 60 * 1000 },        // Questions
        { party: 'Public Comment 1', duration: 3 * 60 * 1000 }, // Citizen 1
        { party: 'Public Comment 2', duration: 5 * 60 * 1000 }, // Citizen 2
        { party: 'Public Comment 3', duration: 2 * 60 * 1000 }, // Citizen 3
        { party: 'Applicant', duration: 10 * 60 * 1000 },   // Rebuttal
        { party: 'Chair', duration: 5 * 60 * 1000 }         // Closing
      ];

      hearingFlow.forEach(segment => {
        state = startSpeaking(state, segment.party);
        mockTime += segment.duration;
        Date.now.mockReturnValue(mockTime);
      });

      state = stopTracking(state);

      const stats = calculateStatistics(state);
      const totalPublicComment = stats.parties['Public Comment 1'].totalTime +
                                stats.parties['Public Comment 2'].totalTime +
                                stats.parties['Public Comment 3'].totalTime;

      expect(totalPublicComment).toBe(10 * 60 * 1000); // 3 + 5 + 2 minutes
      expect(stats.parties.Applicant.totalTime).toBe(30 * 60 * 1000); // 20 + 10 minutes

      // Generate chart data
      const chartData = generateChartData(state);
      expect(chartData.labels).toContain('Public Comment 1');
      expect(chartData.labels).toHaveLength(6);

      Date.now = originalNow;
    });
  });

  describe('Data Integrity and Performance', () => {
    it('should maintain data integrity during rapid state changes', () => {
      const originalNow = Date.now;
      let mockTime = 1000;
      Date.now = jest.fn(() => mockTime);

      let state = initializeSpeakingTime(['A', 'B', 'C']);

      // Rapid speaker changes (every 100ms for 10 seconds)
      const parties = ['A', 'B', 'C'];
      let totalSegments = 0;

      for (let i = 0; i < 100; i++) {
        const party = parties[i % 3];
        state = startSpeaking(state, party);
        mockTime += 100;
        Date.now.mockReturnValue(mockTime);
        totalSegments++;
      }

      state = stopTracking(state);

      // Verify data integrity
      const totalTime = Object.values(state.parties)
        .reduce((sum, party) => sum + party.totalTime, 0);
      
      expect(totalTime).toBe(10000); // 10 seconds total
      expect(state.timeline).toHaveLength(totalSegments);

      // Verify each party got roughly equal time
      expect(state.parties.A.totalTime).toBeCloseTo(3333, -2); // ~3.33 seconds
      expect(state.parties.B.totalTime).toBeCloseTo(3333, -2);
      expect(state.parties.C.totalTime).toBeCloseTo(3334, -2);

      Date.now = originalNow;
    });

    it('should handle very long hearings efficiently', () => {
      const originalNow = Date.now;
      let mockTime = 1000;
      Date.now = jest.fn(() => mockTime);

      let state = initializeSpeakingTime(['State', 'Defense']);

      // Simulate 12-hour hearing (complex case)
      const totalDuration = 12 * 60 * 60 * 1000; // 12 hours
      const switchInterval = 10 * 60 * 1000; // Switch every 10 minutes
      let currentSpeaker = 'State';

      state = startSpeaking(state, currentSpeaker);

      for (mockTime = switchInterval; mockTime <= totalDuration; mockTime += switchInterval) {
        Date.now.mockReturnValue(mockTime);
        currentSpeaker = currentSpeaker === 'State' ? 'Defense' : 'State';
        state = startSpeaking(state, currentSpeaker);
      }

      state = stopTracking(state);

      const stats = calculateStatistics(state);
      expect(stats.totalHearingTime).toBe(totalDuration);
      expect(state.timeline.length).toBeGreaterThan(70); // Many speaker changes
      
      // Performance check - operations should complete quickly
      const startTime = Date.now();
      calculateStatistics(state);
      generateTextReport(state, { 'Case Number': 'LONG-CASE' });
      generateChartData(state);
      const endTime = Date.now();
      
      expect(endTime - startTime).toBeLessThan(100); // Should be very fast

      Date.now = originalNow;
    });
  });
});