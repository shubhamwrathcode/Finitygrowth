/**
 * TEAM (static sample): everyone who joined through the member, up to 5 levels.
 *
 *  level 1 = joined with the member's code (direct)
 *  level 2 = joined with a level-1 member's code, and so on.
 *  firstPackage = null → signed up but never bought (does not unlock levels).
 */
export const teamMembers = [
  // Level 1 (directs)
  { id: 'STX100231', name: 'Aman Verma', level: 1, sponsor: 'STX100000', joinedOn: '2026-07-10', firstPackage: { amount: 1000, date: '2026-07-15' } },
  { id: 'STX100587', name: 'Priya Nair', level: 1, sponsor: 'STX100000', joinedOn: '2026-10-01', firstPackage: { amount: 500, date: '2026-10-05' } },
  { id: 'STX100612', name: 'Karan Mehta', level: 1, sponsor: 'STX100000', joinedOn: '2026-10-14', firstPackage: null },

  // Level 2
  { id: 'STX100344', name: 'Neha Gupta', level: 2, sponsor: 'STX100231', joinedOn: '2026-07-28', firstPackage: { amount: 250, date: '2026-08-01' } },
  { id: 'STX100402', name: 'Rohit Das', level: 2, sponsor: 'STX100231', joinedOn: '2026-08-29', firstPackage: { amount: 1000, date: '2026-09-01' } },
  { id: 'STX100655', name: 'Sana Khan', level: 2, sponsor: 'STX100587', joinedOn: '2026-10-10', firstPackage: { amount: 100, date: '2026-10-12' } },
  { id: 'STX100671', name: 'Vikram Rao', level: 2, sponsor: 'STX100587', joinedOn: '2026-10-19', firstPackage: null },

  // Level 3 (level 3 is still locked for the member, so these pay nothing yet)
  { id: 'STX100498', name: 'Arjun Pillai', level: 3, sponsor: 'STX100344', joinedOn: '2026-09-15', firstPackage: { amount: 200, date: '2026-09-18' } },
  { id: 'STX100533', name: 'Meera Joshi', level: 3, sponsor: 'STX100402', joinedOn: '2026-09-24', firstPackage: null },
];
